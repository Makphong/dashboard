from __future__ import annotations

import json
import os
from collections import Counter, defaultdict

from ...contracts.constants import (
    ALGORITHM_VERSION,
    APP_VERSION,
    CORE_USER_SESSION_SEGMENT_TYPES,
    DB_PATH,
    FIELD_ALIASES,
    SERVER_STARTED_AT,
)
from ...db.sqlite_store import current_unified_rows_signature, get_conn
from ...firebase_sync import is_firestore_enabled
from ..segmentation.engine import (
    build_canonical_map,
    build_segments_for_document,
    countable_segment_seconds,
    fetch_normalized_events,
    looks_like_workflow_status,
    normalize_text,
    parse_datetime,
    pick_field,
    seconds_between,
)
def format_duration(seconds: float) -> str:
    sec = max(0, int(round(seconds)))
    hours, remainder = divmod(sec, 3600)
    minutes, seconds_only = divmod(remainder, 60)
    if hours > 0:
        return f"{hours}h {minutes}m"
    if minutes > 0:
        return f"{minutes}m {seconds_only}s"
    return f"{seconds_only}s"


def format_percent(value: float) -> str:
    return f"{value * 100:.1f}%"


_USER_PERFORMANCE_CACHE_SIGNATURE: tuple[int, int] | None = None
_USER_PERFORMANCE_CACHE_VALUE: dict | None = None

def empty_user_performance_response() -> dict:
    return {
        "kpis": {
            "activeUserTimeSeconds": 0,
            "activeUserTimeDisplay": "0s",
            "contributingUsers": 0,
            "avgUserSessionSeconds": 0,
            "avgUserSessionDisplay": "0s",
            "idleWaitingSeconds": 0,
            "idleWaitingDisplay": "0s",
            "idleWaitingOccurrences": 0,
            "reworkRate": 0,
            "reworkRateDisplay": "0.0%",
            "autoClosedSessions": 0,
            "scheduledWaitSeconds": 0,
            "scheduledWaitDisplay": "0s",
            "reprocessCycleElapsedSeconds": 0,
            "reprocessCycleElapsedDisplay": "0s",
            "systemTimeSeconds": 0,
            "systemTimeDisplay": "0s",
            "idleTimeSeconds": 0,
            "idleTimeDisplay": "0s",
        },
        "summary": {
            "files": 0,
            "pages": 0,
            "rows": 0,
            "algorithmVersion": ALGORITHM_VERSION,
        },
        "contribution": [],
        "flow": [],
        "matrix": [],
        "segments": [],
    }


def compute_user_performance() -> dict:
    global _USER_PERFORMANCE_CACHE_SIGNATURE, _USER_PERFORMANCE_CACHE_VALUE
    signature = current_unified_rows_signature()
    if (
        _USER_PERFORMANCE_CACHE_VALUE is not None
        and _USER_PERFORMANCE_CACHE_SIGNATURE == signature
    ):
        return _USER_PERFORMANCE_CACHE_VALUE

    events = fetch_normalized_events(signature=signature)
    if not events:
        empty = empty_user_performance_response()
        _USER_PERFORMANCE_CACHE_SIGNATURE = signature
        _USER_PERFORMANCE_CACHE_VALUE = empty
        return empty

    source_summary = {
        "files": 0,
        "pages": 0,
        "rows": 0,
        "algorithmVersion": ALGORITHM_VERSION,
    }
    with get_conn() as conn:
        row = conn.execute(
            "SELECT COUNT(*) AS files, COALESCE(SUM(total_pages),0) AS pages, COALESCE(SUM(total_rows),0) AS rows FROM source_files"
        ).fetchone()
        source_summary = {
            "files": int(row["files"] if row else 0),
            "pages": int(row["pages"] if row else 0),
            "rows": int(row["rows"] if row else 0),
            "algorithmVersion": ALGORITHM_VERSION,
        }

    grouped_events: dict[str, list[dict]] = defaultdict(list)
    for event in events:
        grouped_events[event["document_id"]].append(event)

    all_segments: list[dict] = []
    transitions: dict[str, list[float]] = defaultdict(lambda: [0.0, 0.0])
    user_stats: dict[str, dict] = defaultdict(
        lambda: {
            "review_seconds": 0.0,
            "edit_seconds": 0.0,
            "upload_seconds": 0.0,
            "total_effective_seconds": 0.0,
            "total_observed_seconds": 0.0,
            "sessions": 0,
            "rework_sessions": 0,
            "auto_timeout_sessions": 0,
            "documents": set(),
        }
    )

    for doc_id, doc_events in grouped_events.items():
        all_segments.extend(build_segments_for_document(doc_events))

        ordered = sorted(
            doc_events, key=lambda item: (item["event_time"], -int(item["row_number"]))
        )
        status_events = [
            event
            for event in ordered
            if event["is_status_event"] and event["to_status"]
        ]
        for idx in range(len(status_events) - 1):
            current = status_events[idx]
            nxt = status_events[idx + 1]
            transition_key = f"{current['to_status']} -> {nxt['to_status']}"
            duration_seconds = seconds_between(nxt["event_time"], current["event_time"])
            transitions[transition_key][0] += duration_seconds
            transitions[transition_key][1] += 1

    all_segments.sort(
        key=lambda segment: (
            segment["__start_dt"],
            segment["__end_dt"],
            segment["segmentType"],
            segment["documentId"],
        )
    )

    total_active_user_seconds = 0.0
    total_idle_waiting_seconds = 0.0
    total_system_seconds = 0.0
    total_scheduled_wait_seconds = 0.0
    total_reprocess_cycle_elapsed_seconds = 0.0
    idle_waiting_occurrences = 0
    auto_timeout_count = 0
    total_user_sessions = 0
    total_rework_sessions = 0
    users_involved: set[str] = set()

    for segment in all_segments:
        counted_seconds = countable_segment_seconds(segment)
        segment_type = str(segment.get("segmentType") or "")
        time_group = str(segment.get("timeGroup") or "")
        user_name = str(segment.get("userName") or "").strip()
        is_user_segment = segment_type.startswith("USER_")
        is_system_actor = (
            user_name.lower() == "system" or segment.get("actorType") == "System"
        )

        if time_group == "User" and is_user_segment:
            total_active_user_seconds += counted_seconds
            if (
                user_name
                and not is_system_actor
                and user_name.lower() != "unknown user"
            ):
                users_involved.add(user_name)
        elif time_group == "System":
            total_system_seconds += counted_seconds
        elif time_group == "Idle Time":
            total_idle_waiting_seconds += counted_seconds
            if segment.get("timeGroupCountable"):
                idle_waiting_occurrences += 1

        if segment_type == "IDLE_WAITING_FOR_SCHEDULED_REPROCESS":
            total_scheduled_wait_seconds += counted_seconds
        if segment_type == "SYSTEM_SCHEDULED_REPROCESSING":
            total_reprocess_cycle_elapsed_seconds += counted_seconds
        if segment_type == "USER_REVIEW_AUTO_TIMEOUT":
            auto_timeout_count += 1

        if not is_user_segment or is_system_actor:
            continue

        stats = user_stats[user_name or "Unknown User"]
        stats["total_effective_seconds"] += counted_seconds
        stats["total_observed_seconds"] += max(
            0.0, float(segment.get("durationSeconds") or 0.0)
        )
        stats["documents"].add(
            segment.get("documentId")
            or f"{segment.get('fileName', '')}::{segment.get('pageName', '')}"
        )

        if segment_type == "USER_UPLOADING":
            stats["upload_seconds"] += counted_seconds
            continue

        if segment_type in CORE_USER_SESSION_SEGMENT_TYPES:
            stats["sessions"] += 1
            total_user_sessions += 1

        if segment_type in {
            "USER_EDITING_CORRECTION",
            "USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL",
        }:
            stats["edit_seconds"] += counted_seconds
            stats["rework_sessions"] += 1
            total_rework_sessions += 1
        elif segment_type == "USER_COMPLETION_APPROVAL":
            stats["review_seconds"] += counted_seconds
        else:
            stats["review_seconds"] += counted_seconds

        if segment.get("autoTimeout") or segment_type == "USER_REVIEW_AUTO_TIMEOUT":
            stats["auto_timeout_sessions"] += 1

    avg_user_session_seconds = (
        total_active_user_seconds / total_user_sessions
        if total_user_sessions > 0
        else 0.0
    )
    rework_rate = (
        total_rework_sessions / total_user_sessions if total_user_sessions > 0 else 0.0
    )
    # Edit rate based on time duration: Edit Time / Total Active User Time
    time_based_edit_rate = (
        sum(stats["edit_seconds"] for stats in user_stats.values()) / total_active_user_seconds
        if total_active_user_seconds > 0
        else 0.0
    )

    contribution_rows = []
    for user_name, stats in user_stats.items():
        sessions = stats["sessions"] or 1
        contribution_rows.append(
            {
                "user": user_name,
                "reviewSeconds": stats["review_seconds"],
                "editSeconds": stats["edit_seconds"],
                "completeSeconds": stats["complete_seconds"],
                "uploadSeconds": stats["upload_seconds"],
                "totalSeconds": stats["total_effective_seconds"],
                "sessionCount": stats["sessions"],
                "reworkRate": stats["rework_sessions"] / sessions,
                "autoClosedRate": stats["auto_timeout_sessions"] / sessions,
                "documents": len(stats["documents"]),
            }
        )
    contribution_rows.sort(key=lambda item: item["totalSeconds"], reverse=True)

    flow_rows = []
    for transition, (duration_sum, count) in transitions.items():
        if count <= 0:
            continue
        flow_rows.append(
            {
                "transition": transition,
                "avgSeconds": duration_sum / count,
                "count": int(count),
            }
        )
    flow_rows.sort(key=lambda item: item["avgSeconds"], reverse=True)

    matrix_rows = []
    for user_name, stats in user_stats.items():
        sessions = stats["sessions"] or 1
        docs_count = len(stats["documents"]) or 1
        matrix_rows.append(
            {
                "user": user_name,
                "avgTimePerDocSeconds": stats["total_effective_seconds"] / docs_count,
                "reworkRate": stats["rework_sessions"] / sessions,
                "autoClosedRate": stats["auto_timeout_sessions"] / sessions,
                "totalActiveSeconds": stats["total_effective_seconds"],
                "documents": len(stats["documents"]),
                "sessionCount": stats["sessions"],
            }
        )
    matrix_rows.sort(key=lambda item: item["totalActiveSeconds"], reverse=True)

    response_segments = []
    for segment in all_segments[:1200]:
        clean = {
            key: value for key, value in segment.items() if not key.startswith("__")
        }
        response_segments.append(clean)

    result = {
        "kpis": {
            "activeUserTimeSeconds": total_active_user_seconds,
            "activeUserTimeDisplay": format_duration(total_active_user_seconds),
            "contributingUsers": len(users_involved),
            "avgUserSessionSeconds": avg_user_session_seconds,
            "avgUserSessionDisplay": format_duration(avg_user_session_seconds),
            "idleWaitingSeconds": total_idle_waiting_seconds,
            "idleWaitingDisplay": format_duration(total_idle_waiting_seconds),
            "idleWaitingOccurrences": idle_waiting_occurrences,
            "reworkRate": time_based_edit_rate,
            "reworkRateDisplay": format_percent(time_based_edit_rate),
            "autoClosedSessions": auto_timeout_count,
            "scheduledWaitSeconds": total_scheduled_wait_seconds,
            "scheduledWaitDisplay": format_duration(total_scheduled_wait_seconds),
            "reprocessCycleElapsedSeconds": total_reprocess_cycle_elapsed_seconds,
            "reprocessCycleElapsedDisplay": format_duration(
                total_reprocess_cycle_elapsed_seconds
            ),
            "systemTimeSeconds": total_system_seconds,
            "systemTimeDisplay": format_duration(total_system_seconds),
            "idleTimeSeconds": total_idle_waiting_seconds,
            "idleTimeDisplay": format_duration(total_idle_waiting_seconds),
        },
        "summary": source_summary,
        "contribution": contribution_rows,
        "flow": flow_rows[:12],
        "matrix": matrix_rows,
        "segments": response_segments,
    }
    _USER_PERFORMANCE_CACHE_SIGNATURE = signature
    _USER_PERFORMANCE_CACHE_VALUE = result
    return result


def _counter_to_rows(counter: Counter, limit: int = 10) -> list[dict]:
    return [
        {"value": str(key), "count": int(count)}
        for key, count in counter.most_common(limit)
    ]


def build_debug_snapshot() -> dict:
    with get_conn() as conn:
        source_row = conn.execute(
            "SELECT COUNT(*) AS files, COALESCE(SUM(total_pages),0) AS pages, COALESCE(SUM(total_rows),0) AS rows FROM source_files"
        ).fetchone()
        unified_count_row = conn.execute(
            "SELECT COUNT(*) AS c FROM unified_rows"
        ).fetchone()
        raw_rows = conn.execute(
            """
            SELECT file_name, page_name, row_number, data_json
            FROM unified_rows
            ORDER BY row_id ASC
            """
        ).fetchall()

    parse_stats = {
        "rawRows": int(unified_count_row["c"] if unified_count_row else 0),
        "jsonDecodeErrors": 0,
        "rowsWithEventTime": 0,
        "rowsWithWorkflowStatusTo": 0,
        "rowsWithWorkflowStatusFrom": 0,
        "rowsWithSpreadStatusChangeType": 0,
    }
    action_counter: Counter = Counter()
    to_status_counter: Counter = Counter()
    from_status_counter: Counter = Counter()
    sample_keys: list[dict] = []

    for idx, row in enumerate(raw_rows):
        try:
            raw = json.loads(row["data_json"])
        except json.JSONDecodeError:
            parse_stats["jsonDecodeErrors"] += 1
            continue
        canonical = build_canonical_map(raw)

        if idx < 3:
            sample_keys.append(
                {
                    "fileName": row["file_name"],
                    "pageName": row["page_name"],
                    "rowNumber": row["row_number"],
                    "keys": list(raw.keys())[:30],
                }
            )

        event_time_raw = pick_field(raw, FIELD_ALIASES["event_time"], canonical)
        if parse_datetime(event_time_raw):
            parse_stats["rowsWithEventTime"] += 1

        action_type = str(
            pick_field(raw, FIELD_ALIASES["action_type"], canonical) or ""
        ).strip()
        if action_type:
            action_counter[action_type] += 1
        if "status" in normalize_text(action_type):
            parse_stats["rowsWithSpreadStatusChangeType"] += 1

        from_status = str(
            pick_field(raw, FIELD_ALIASES["from_status"], canonical) or ""
        ).strip()
        to_status = str(
            pick_field(raw, FIELD_ALIASES["to_status"], canonical) or ""
        ).strip()
        if from_status:
            from_status_counter[from_status] += 1
            if looks_like_workflow_status(from_status):
                parse_stats["rowsWithWorkflowStatusFrom"] += 1
        if to_status:
            to_status_counter[to_status] += 1
            if looks_like_workflow_status(to_status):
                parse_stats["rowsWithWorkflowStatusTo"] += 1

    events = fetch_normalized_events()
    events_with_to_status = sum(1 for e in events if e.get("to_status"))
    files = int(source_row["files"] if source_row else 0)
    pages = int(source_row["pages"] if source_row else 0)
    rows = int(source_row["rows"] if source_row else 0)

    return {
        "version": APP_VERSION,
        "serverStartedAt": SERVER_STARTED_AT,
        "processId": os.getpid(),
        "dbPath": str(DB_PATH),
        "dbSummary": {
            "files": files,
            "pages": pages,
            "rows": rows,
            "unifiedRows": parse_stats["rawRows"],
        },
        "parseStats": {
            **parse_stats,
            "normalizedEvents": len(events),
            "normalizedEventsWithToStatus": int(events_with_to_status),
        },
        "topActionTypes": _counter_to_rows(action_counter, 12),
        "topFromStatus": _counter_to_rows(from_status_counter, 12),
        "topToStatus": _counter_to_rows(to_status_counter, 12),
        "sampleRowKeys": sample_keys,
    }


def build_health_payload() -> dict:
    from pathlib import Path
    import datetime as dt

    return {
        "ok": True,
        "db": str(DB_PATH.name),
        "dbPath": str(DB_PATH),
        "dbExists": DB_PATH.exists(),
        "version": APP_VERSION,
        "processId": os.getpid(),
        "serverStartedAt": SERVER_STARTED_AT,
        "appFileMtime": dt.datetime.fromtimestamp(Path(__file__).stat().st_mtime).isoformat(),
        "storageMode": "firestore+sqlite" if is_firestore_enabled() else "sqlite",
    }


def clear_user_performance_cache() -> None:
    global _USER_PERFORMANCE_CACHE_SIGNATURE, _USER_PERFORMANCE_CACHE_VALUE
    _USER_PERFORMANCE_CACHE_SIGNATURE = None
    _USER_PERFORMANCE_CACHE_VALUE = None

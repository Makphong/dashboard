from __future__ import annotations

import datetime as dt
import json
import re

from ...contracts.constants import (
    ACTIVITY_GRACE_MINUTES_DEFAULT,
    COMPLETED_STATE,
    COMPLETED_STATUSES,
    FIELD_ALIASES,
    IDLE_TIME_SEGMENT_TYPES,
    IN_REVIEW_STATE,
    IN_REVIEW_STATUSES,
    PENDING_REREVIEW_STATUSES,
    PENDING_REVIEW_STATUSES,
    PENDING_STATES,
    SESSION_TIMEOUT_MINUTES_DEFAULT,
    SYSTEM_DETAIL_EVIDENCE_CHANGE_TYPES,
    SYSTEM_TIME_SEGMENT_TYPES,
    USER_EDIT_CHANGE_TYPES,
    USER_TIME_SEGMENT_TYPES,
)
from ...db.sqlite_store import current_unified_rows_signature, get_conn
def normalize_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", (value or "").strip().lower())


def normalize_text(value: str | None) -> str:
    if value is None:
        return ""
    return re.sub(r"[^a-z0-9]+", "", str(value).lower())


def canonicalize_workflow_state(value: str | None) -> str:
    token = normalize_text(value)
    if not token:
        return ""
    if "upload" in token:
        return "Uploading"
    if "process" in token:
        return "Processing"
    if token in PENDING_REREVIEW_STATUSES or "pendingrereview" in token:
        return "Pending Re-Review by Moodys"
    if token in PENDING_REVIEW_STATUSES or "pendingreview" in token:
        return "Pending Review by Moodys"
    if token in IN_REVIEW_STATUSES or "inreview" in token:
        return "In Review by Moodys"
    if token in COMPLETED_STATUSES or "complete" in token:
        return "Completed"
    return str(value).strip() if value is not None else ""


def status_bucket(status: str | None) -> str:
    canonical = canonicalize_workflow_state(status)
    token = normalize_text(canonical)
    if token == normalize_text("Pending Re-Review by Moodys"):
        return "pending_rereview"
    if token == normalize_text("Pending Review by Moodys"):
        return "pending_review"
    if token == normalize_text("In Review by Moodys"):
        return "in_review"
    if token == normalize_text("Completed"):
        return "completed"
    if token == normalize_text("Uploading"):
        return "uploading"
    if token == normalize_text("Processing"):
        return "processing"
    return "other"


def looks_like_workflow_status(value: str | None) -> bool:
    return bool(canonicalize_workflow_state(value))


def normalize_workflow_status(value: str | None) -> str:
    return canonicalize_workflow_state(value)


def is_upload_status(value: str | None) -> bool:
    token = normalize_text(value)
    return bool(token) and "upload" in token


def infer_actor_type(actor_type: str | None, actor_name: str | None) -> str:
    joined = f"{actor_type or ''} {actor_name or ''}".lower()
    if "system" in joined or "ai " in joined or joined.startswith("ai"):
        return "System"
    if "user" in joined or "cognize" in joined or "moodys" in joined:
        return "User"
    if (actor_name or "").strip():
        # In most audit files, non-system named actors are human users.
        return "User"
    return "User"


def seconds_between(end_time: dt.datetime, start_time: dt.datetime) -> float:
    return max(0.0, (end_time - start_time).total_seconds())


def parse_bool(value) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    token = str(value).strip().lower()
    return token in {"1", "true", "yes", "y", "t", "on"}


def parse_int(value) -> int | None:
    if value is None or value == "":
        return None
    try:
        return int(float(str(value).strip()))
    except (TypeError, ValueError):
        return None


def parse_datetime(value) -> dt.datetime | None:
    if value is None or value == "":
        return None
    if isinstance(value, dt.datetime):
        return value
    if isinstance(value, dt.date):
        return dt.datetime.combine(value, dt.time())
    if isinstance(value, (int, float)):
        return excel_serial_to_datetime(float(value))

    text = str(value).strip()
    if not text:
        return None

    if text.endswith("Z"):
        text = text[:-1]
    text = text.replace("T", " ")

    datetime_formats = [
        "%m/%d/%Y %I:%M:%S %p",
        "%m/%d/%Y %I:%M %p",
        "%m/%d/%Y %H:%M:%S",
        "%m/%d/%Y %H:%M",
        "%d/%m/%Y %H:%M:%S",
        "%d/%m/%Y %H:%M",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y/%m/%d %H:%M:%S",
        "%Y/%m/%d %H:%M",
        "%Y-%m-%d",
    ]

    for fmt in datetime_formats:
        try:
            return dt.datetime.strptime(text, fmt)
        except ValueError:
            continue

    try:
        return dt.datetime.fromisoformat(text)
    except ValueError:
        return None


_NORMALIZED_EVENTS_CACHE_SIGNATURE: tuple[int, int] | None = None
_NORMALIZED_EVENTS_CACHE_VALUE: list[dict] | None = None

def build_canonical_map(row: dict) -> dict[str, object]:
    result: dict[str, object] = {}
    for key, value in row.items():
        result[normalize_key(str(key))] = value
    return result


def pick_field(
    row: dict, aliases: set[str], canonical: dict[str, object] | None = None
):
    canonical_row = canonical if canonical is not None else build_canonical_map(row)
    for alias in aliases:
        if alias in canonical_row:
            return canonical_row[alias]
    return None


def assign_time_group(
    segment_type: str,
    actor_type: str,
    is_milestone: bool = False,
    metric_only: bool = False,
    is_queue_wait: bool = False,
) -> tuple[str, str, str, bool]:
    if segment_type in SYSTEM_TIME_SEGMENT_TYPES:
        return (
            "System",
            "SYSTEM_SEGMENT_TYPE",
            "SYSTEM_ACTIVE_TIME",
            not (metric_only or is_milestone),
        )
    if segment_type in USER_TIME_SEGMENT_TYPES:
        return (
            "User",
            "USER_SEGMENT_TYPE",
            "USER_ACTIVE_TIME",
            not (metric_only or is_milestone),
        )
    if segment_type in IDLE_TIME_SEGMENT_TYPES:
        original_bucket = (
            "QUEUE_OR_SCHEDULED_WAIT_TIME" if is_queue_wait else "IDLE_WAITING_TIME"
        )
        return (
            "Idle Time",
            "IDLE_SEGMENT_TYPE",
            original_bucket,
            not (metric_only or is_milestone),
        )
    if segment_type in {"REOPEN_MARKER", "REOPEN_TO_REVIEW_HANDOFF_MARKER"}:
        group = "User" if actor_type == "User" else "System"
        return group, "REOPEN_OR_HANDOFF_MARKER_BY_ACTOR", "MILESTONE_OR_MARKER", False
    return (
        "Idle Time",
        "UNKNOWN_FALLBACK_TO_IDLE",
        "UNKNOWN_OR_LOW_CONFIDENCE",
        not (metric_only or is_milestone),
    )


def fetch_normalized_events(signature: tuple[int, int] | None = None) -> list[dict]:
    global _NORMALIZED_EVENTS_CACHE_SIGNATURE, _NORMALIZED_EVENTS_CACHE_VALUE
    cache_signature = signature or current_unified_rows_signature()
    if (
        _NORMALIZED_EVENTS_CACHE_VALUE is not None
        and _NORMALIZED_EVENTS_CACHE_SIGNATURE == cache_signature
    ):
        return [event.copy() for event in _NORMALIZED_EVENTS_CACHE_VALUE]

    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT source_id, file_name, page_name, row_number, data_json
            FROM unified_rows
            ORDER BY file_name ASC, page_name ASC, row_number DESC
            """
        ).fetchall()

    events: list[dict] = []
    for db_row in rows:
        try:
            raw = json.loads(db_row["data_json"])
        except json.JSONDecodeError:
            raw = {}
        canonical = build_canonical_map(raw)

        event_time = parse_datetime(
            pick_field(raw, FIELD_ALIASES["event_time"], canonical)
        )
        if not event_time:
            continue

        actor_name_raw = pick_field(raw, FIELD_ALIASES["actor_name"], canonical)
        actor_type_raw = pick_field(raw, FIELD_ALIASES["actor_type"], canonical)
        actor_name = str(actor_name_raw).strip() if actor_name_raw is not None else ""
        actor_type = infer_actor_type(
            str(actor_type_raw).strip() if actor_type_raw is not None else "",
            actor_name,
        )

        change_type_raw = pick_field(raw, FIELD_ALIASES["change_type"], canonical)
        if change_type_raw is None:
            change_type_raw = pick_field(raw, FIELD_ALIASES["action_type"], canonical)
        statement_type_raw = pick_field(raw, FIELD_ALIASES["statement_type"], canonical)
        changed_value_raw = pick_field(raw, FIELD_ALIASES["changed_value"], canonical)
        from_value_raw = pick_field(raw, FIELD_ALIASES["from_value"], canonical)
        to_value_raw = pick_field(raw, FIELD_ALIASES["to_value"], canonical)

        change_type = (
            str(change_type_raw).strip() if change_type_raw is not None else ""
        )
        statement_type = (
            str(statement_type_raw).strip() if statement_type_raw is not None else ""
        )
        changed_value_text = (
            str(changed_value_raw).strip() if changed_value_raw is not None else ""
        )
        from_status_text = (
            str(from_value_raw).strip() if from_value_raw is not None else ""
        )
        to_status_text = str(to_value_raw).strip() if to_value_raw is not None else ""

        is_status_event = (
            normalize_text(change_type) == "spreadstatus"
            and normalize_text(changed_value_text) == "status"
        )
        workflow_from_state = (
            canonicalize_workflow_state(from_status_text) if is_status_event else ""
        )
        workflow_to_state = (
            canonicalize_workflow_state(to_status_text) if is_status_event else ""
        )

        document_id_raw = pick_field(raw, FIELD_ALIASES["document_id"], canonical)
        document_id = (
            str(document_id_raw).strip()
            if document_id_raw is not None and str(document_id_raw).strip()
            else f"{db_row['file_name']}::{db_row['page_name']}"
        )

        events.append(
            {
                "event_id": f"{db_row['file_name']}::{db_row['page_name']}#{db_row['row_number']}",
                "source_id": db_row["source_id"],
                "file_name": db_row["file_name"],
                "page_name": db_row["page_name"],
                "row_number": int(db_row["row_number"]),
                "event_time": event_time,
                "actor_name": actor_name
                or ("System" if actor_type == "System" else "Unknown User"),
                "actor_type": actor_type,
                "document_id": document_id,
                "change_type": change_type,
                "statement_type": statement_type,
                "changed_value": changed_value_raw,
                "from_value": from_value_raw,
                "to_value": to_value_raw,
                "from_status": workflow_from_state,
                "to_status": workflow_to_state,
                "from_status_raw": from_status_text,
                "to_status_raw": to_status_text,
                "action_type": change_type,
                "submitted_for_reanalysis": parse_bool(
                    pick_field(
                        raw, FIELD_ALIASES["submitted_for_reanalysis"], canonical
                    )
                ),
                "auto_closed": parse_bool(
                    pick_field(raw, FIELD_ALIASES["auto_closed"], canonical)
                ),
                "timeout_minutes": parse_int(
                    pick_field(raw, FIELD_ALIASES["timeout_minutes"], canonical)
                ),
                "is_status_event": is_status_event,
                "is_detail_event": not is_status_event,
                "order_index": -1,
                "raw": raw,
            }
        )
    _NORMALIZED_EVENTS_CACHE_SIGNATURE = cache_signature
    _NORMALIZED_EVENTS_CACHE_VALUE = events
    return [event.copy() for event in events]


def is_system_evidence(event: dict) -> bool:
    if (
        event["actor_type"] == "System"
        and event["change_type"] in SYSTEM_DETAIL_EVIDENCE_CHANGE_TYPES
    ):
        return True
    if (
        event["actor_type"] == "System"
        and event["is_status_event"]
        and event["from_status"] in PENDING_STATES
        and event["to_status"] == IN_REVIEW_STATE
    ):
        return True
    if (
        event["actor_type"] == "System"
        and event["is_status_event"]
        and event["from_status"] == IN_REVIEW_STATE
        and event["to_status"] == COMPLETED_STATE
    ):
        return True
    if (
        event["actor_type"] == "System"
        and event["is_status_event"]
        and event["from_status"] == "Processing"
    ):
        return True
    return False


def first_system_evidence(events: list[dict]) -> dict | None:
    for event in sorted(events, key=lambda item: item["order_index"]):
        if is_system_evidence(event):
            return event
    return None


def previous_system_event_before(
    events: list[dict], before_order_index: int
) -> dict | None:
    candidates = [
        event
        for event in events
        if event["order_index"] < before_order_index and event["actor_type"] == "System"
    ]
    if not candidates:
        return None
    return sorted(candidates, key=lambda item: item["order_index"])[-1]


def next_system_detail_after(events: list[dict], after_order_index: int) -> dict | None:
    candidates = [
        event
        for event in events
        if event["order_index"] > after_order_index
        and event["actor_type"] == "System"
        and event["change_type"] in SYSTEM_DETAIL_EVIDENCE_CHANGE_TYPES
    ]
    if not candidates:
        return None
    return sorted(candidates, key=lambda item: item["order_index"])[0]


def last_system_event_after(events: list[dict], after_order_index: int) -> dict | None:
    candidates = [
        event
        for event in events
        if event["order_index"] >= after_order_index and event["actor_type"] == "System"
    ]
    if not candidates:
        return None
    return sorted(candidates, key=lambda item: item["order_index"])[-1]


def find_system_reprocess_cycle_end(
    first_system_event: dict, events: list[dict]
) -> dict:
    ordered = sorted(events, key=lambda item: item["order_index"])
    for event in ordered:
        if event["order_index"] < first_system_event["order_index"]:
            continue
        if (
            event["is_status_event"]
            and event["actor_type"] == "System"
            and event["from_status"] == IN_REVIEW_STATE
            and event["to_status"] == COMPLETED_STATE
        ):
            return event
        if (
            event["is_status_event"]
            and event["actor_type"] == "System"
            and event["from_status"] == IN_REVIEW_STATE
            and event["to_status"] in PENDING_STATES
        ):
            if next_system_detail_after(ordered, event["order_index"]) is None:
                return event
        if (
            event["is_status_event"]
            and event["actor_type"] == "User"
            and event["from_status"] in PENDING_STATES
            and event["to_status"] == IN_REVIEW_STATE
        ):
            previous_system = previous_system_event_before(
                ordered, event["order_index"]
            )
            return previous_system or first_system_event
    return (
        last_system_event_after(ordered, first_system_event["order_index"])
        or first_system_event
    )


def calculate_effective_user_duration(interval: dict, is_auto_timeout: bool) -> float:
    if not is_auto_timeout:
        return interval["duration_seconds"]
    user_details = [
        event for event in interval["inner_events"] if event["actor_type"] == "User"
    ]
    if user_details:
        last_user_detail = sorted(user_details, key=lambda item: item["order_index"])[
            -1
        ]
        effective_end = min(
            interval["end_time"],
            last_user_detail["event_time"]
            + dt.timedelta(minutes=ACTIVITY_GRACE_MINUTES_DEFAULT),
        )
    else:
        effective_end = min(
            interval["end_time"],
            interval["start_time"]
            + dt.timedelta(minutes=SESSION_TIMEOUT_MINUTES_DEFAULT),
        )
    return seconds_between(effective_end, interval["start_time"])


def is_same_timestamp_reopen_to_review_handoff(interval: dict) -> bool:
    if interval["duration_seconds"] != 0:
        return False
    transitions = {
        (interval["start_event"]["from_status"], interval["start_event"]["to_status"]),
        (interval["end_event"]["from_status"], interval["end_event"]["to_status"]),
    }
    return ("Completed", "Pending Re-Review by Moodys") in transitions and (
        "Pending Re-Review by Moodys",
        "In Review by Moodys",
    ) in transitions


def build_segment(
    interval: dict,
    segment_type: str,
    start_event: dict,
    end_event: dict,
    *,
    actor_name: str | None,
    actor_type: str,
    is_active_work: bool,
    is_idle: bool,
    is_queue_wait: bool = False,
    is_milestone: bool = False,
    metric_only: bool = False,
    is_auto_timeout: bool = False,
    same_timestamp_handoff: bool = False,
) -> dict:
    start_time = start_event["event_time"]
    end_time = end_event["event_time"]
    duration_seconds = 0.0 if is_milestone else seconds_between(end_time, start_time)

    effective_duration_seconds = duration_seconds
    if is_auto_timeout:
        effective_duration_seconds = calculate_effective_user_duration(interval, True)

    time_group, time_group_rule_id, original_bucket, time_group_countable = (
        assign_time_group(
            segment_type,
            actor_type,
            is_milestone=is_milestone,
            metric_only=metric_only,
            is_queue_wait=is_queue_wait,
        )
    )

    user_name = actor_name or ""
    if not user_name:
        if actor_type == "System":
            user_name = "System"
        elif time_group == "Idle Time":
            user_name = "Idle"
        else:
            user_name = "Unknown User"

    return {
        "id": (
            f"{interval['document_id']}|{segment_type}|"
            f"{start_event['row_number']}->{end_event['row_number']}|"
            f"{start_event['order_index']}->{end_event['order_index']}"
        ),
        "segmentType": segment_type,
        "timeGroup": time_group,
        "timeGroupRuleId": time_group_rule_id,
        "timeGroupCountable": time_group_countable,
        "originalTimeBucket": original_bucket,
        "metricOnly": metric_only,
        "isActiveWork": is_active_work,
        "isIdle": is_idle,
        "isQueueWait": is_queue_wait,
        "isMilestone": is_milestone,
        "sameTimestampHandoff": same_timestamp_handoff,
        "start": start_time.isoformat(),
        "end": end_time.isoformat(),
        "durationSeconds": duration_seconds,
        "effectiveDurationSeconds": effective_duration_seconds,
        "documentId": interval["document_id"],
        "userName": user_name,
        "actorType": actor_type,
        "fileName": start_event["file_name"],
        "pageName": start_event["page_name"],
        "autoTimeout": is_auto_timeout,
        "__start_dt": start_time,
        "__end_dt": end_time,
    }


def segment_events_between(
    events: list[dict], start_event: dict, end_event: dict
) -> list[dict]:
    return [
        event
        for event in events
        if start_event["order_index"]
        <= event["order_index"]
        <= end_event["order_index"]
    ]


def build_interval_segments(interval: dict, all_events: list[dict]) -> list[dict]:
    state = interval["state"]

    if is_same_timestamp_reopen_to_review_handoff(interval):
        actor_name = interval["exit_actor"] or interval["enter_actor"]
        actor_type = (
            interval["exit_actor_type"]
            if interval["exit_actor_type"] in {"System", "User"}
            else interval["enter_actor_type"]
        )
        return [
            build_segment(
                interval,
                "REOPEN_TO_REVIEW_HANDOFF_MARKER",
                interval["start_event"],
                interval["end_event"],
                actor_name=actor_name,
                actor_type=actor_type,
                is_active_work=False,
                is_idle=False,
                is_milestone=True,
                same_timestamp_handoff=True,
            )
        ]

    if state == "Uploading":
        return [
            build_segment(
                interval,
                "USER_UPLOADING",
                interval["start_event"],
                interval["end_event"],
                actor_name=interval["enter_actor"],
                actor_type=interval["enter_actor_type"],
                is_active_work=True,
                is_idle=False,
            )
        ]

    if state == "Processing":
        return [
            build_segment(
                interval,
                "SYSTEM_INITIAL_PROCESSING",
                interval["start_event"],
                interval["end_event"],
                actor_name="System",
                actor_type="System",
                is_active_work=True,
                is_idle=False,
            )
        ]

    if state in PENDING_STATES:
        first_system = first_system_evidence(interval["inner_events"])
        if first_system is not None:
            segments: list[dict] = []
            cycle_end = find_system_reprocess_cycle_end(first_system, all_events)

            if first_system["event_time"] > interval["start_time"]:
                segments.append(
                    build_segment(
                        interval,
                        "IDLE_WAITING_FOR_SCHEDULED_REPROCESS",
                        interval["start_event"],
                        first_system,
                        actor_name=None,
                        actor_type="None",
                        is_active_work=False,
                        is_idle=True,
                        is_queue_wait=True,
                    )
                )

            segments.append(
                build_segment(
                    interval,
                    "SYSTEM_SCHEDULED_REPROCESSING",
                    first_system,
                    cycle_end,
                    actor_name="System",
                    actor_type="System",
                    is_active_work=True,
                    is_idle=False,
                )
            )

            if (
                cycle_end["event_time"] < interval["end_time"]
                and interval["exit_actor_type"] == "User"
                and interval["exit_to"] == IN_REVIEW_STATE
            ):
                segments.append(
                    build_segment(
                        interval,
                        "IDLE_AFTER_SYSTEM_REPROCESS",
                        cycle_end,
                        interval["end_event"],
                        actor_name=None,
                        actor_type="None",
                        is_active_work=False,
                        is_idle=True,
                    )
                )
            return segments

        idle_segment_type = (
            "IDLE_WAITING_FOR_REVIEW"
            if state == "Pending Review by Moodys"
            else "IDLE_WAITING_FOR_REREVIEW"
        )
        return [
            build_segment(
                interval,
                idle_segment_type,
                interval["start_event"],
                interval["end_event"],
                actor_name=None,
                actor_type="None",
                is_active_work=False,
                is_idle=True,
            )
        ]

    if state == IN_REVIEW_STATE:
        user_edit_count = len(
            [
                event
                for event in interval["inner_events"]
                if event["actor_type"] == "User"
                and event["change_type"] in USER_EDIT_CHANGE_TYPES
            ]
        )

        if (
            interval["enter_actor_type"] == "User"
            and interval["exit_actor_type"] == "System"
            and interval["exit_to"] in PENDING_STATES
        ):
            return [
                build_segment(
                    interval,
                    "USER_REVIEW_AUTO_TIMEOUT",
                    interval["start_event"],
                    interval["end_event"],
                    actor_name=interval["enter_actor"],
                    actor_type="User",
                    is_active_work=True,
                    is_idle=False,
                    is_auto_timeout=True,
                ),
                build_segment(
                    interval,
                    "AUTO_TIMEOUT_MARKER",
                    interval["end_event"],
                    interval["end_event"],
                    actor_name="System",
                    actor_type="System",
                    is_active_work=False,
                    is_idle=False,
                    is_milestone=True,
                    is_auto_timeout=True,
                ),
            ]

        if (
            interval["enter_actor_type"] == "User"
            and interval["exit_to"] == COMPLETED_STATE
            and user_edit_count > 0
        ):
            return [
                build_segment(
                    interval,
                    "USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL",
                    interval["start_event"],
                    interval["end_event"],
                    actor_name=interval["enter_actor"],
                    actor_type="User",
                    is_active_work=True,
                    is_idle=False,
                )
            ]

        if (
            interval["enter_actor_type"] == "User"
            and interval["exit_to"] == COMPLETED_STATE
            and user_edit_count == 0
        ):
            return [
                build_segment(
                    interval,
                    "USER_COMPLETION_APPROVAL",
                    interval["start_event"],
                    interval["end_event"],
                    actor_name=interval["enter_actor"],
                    actor_type="User",
                    is_active_work=True,
                    is_idle=False,
                )
            ]

        if (
            interval["enter_actor_type"] == "User"
            and interval["exit_to"] != COMPLETED_STATE
            and user_edit_count > 0
        ):
            return [
                build_segment(
                    interval,
                    "USER_EDITING_CORRECTION",
                    interval["start_event"],
                    interval["end_event"],
                    actor_name=interval["enter_actor"],
                    actor_type="User",
                    is_active_work=True,
                    is_idle=False,
                )
            ]

        if (
            interval["enter_actor_type"] == "User"
            and interval["exit_to"] != COMPLETED_STATE
            and not (
                interval["exit_actor_type"] == "System"
                and interval["exit_to"] in PENDING_STATES
            )
            and user_edit_count == 0
        ):
            return [
                build_segment(
                    interval,
                    "USER_REVIEW_COMMENT_CHECK",
                    interval["start_event"],
                    interval["end_event"],
                    actor_name=interval["enter_actor"],
                    actor_type="User",
                    is_active_work=True,
                    is_idle=False,
                )
            ]

        if interval["enter_actor_type"] == "System":
            return [
                build_segment(
                    interval,
                    "SYSTEM_INTERNAL_TRANSITION",
                    interval["start_event"],
                    interval["end_event"],
                    actor_name="System",
                    actor_type="System",
                    is_active_work=True,
                    is_idle=False,
                )
            ]

    if state == COMPLETED_STATE:
        segments = [
            build_segment(
                interval,
                "POST_COMPLETED_ELAPSED",
                interval["start_event"],
                interval["end_event"],
                actor_name=None,
                actor_type="None",
                is_active_work=False,
                is_idle=True,
            )
        ]
        if (
            interval["exit_from"] == COMPLETED_STATE
            and interval["exit_to"] == "Pending Re-Review by Moodys"
        ):
            segments.append(
                build_segment(
                    interval,
                    "REOPEN_MARKER",
                    interval["end_event"],
                    interval["end_event"],
                    actor_name=interval["exit_actor"],
                    actor_type=interval["exit_actor_type"],
                    is_active_work=False,
                    is_idle=False,
                    is_milestone=True,
                )
            )
        return segments

    return [
        build_segment(
            interval,
            "UNKNOWN_OR_LOW_CONFIDENCE",
            interval["start_event"],
            interval["end_event"],
            actor_name=interval["enter_actor"],
            actor_type=interval["enter_actor_type"],
            is_active_work=False,
            is_idle=False,
        )
    ]


def resolve_overlaps(segments: list[dict]) -> list[dict]:
    if not segments:
        return []

    sorted_segments = sorted(
        segments,
        key=lambda segment: (
            segment["__start_dt"],
            segment["__end_dt"],
            segment["segmentType"],
        ),
    )
    resolved: list[dict] = []
    reprocess_windows: list[tuple[dt.datetime, dt.datetime]] = []

    for segment in sorted_segments:
        if segment["segmentType"] == "SYSTEM_SCHEDULED_REPROCESSING":
            reprocess_windows.append((segment["__start_dt"], segment["__end_dt"]))
            resolved.append(segment)
            continue

        if segment["segmentType"] == "SYSTEM_INTERNAL_TRANSITION":
            fully_covered = False
            for start_dt, end_dt in reprocess_windows:
                if start_dt <= segment["__start_dt"] and segment["__end_dt"] <= end_dt:
                    fully_covered = True
                    break
            if fully_covered:
                continue

        resolved.append(segment)

    return sorted(
        resolved,
        key=lambda segment: (
            segment["__start_dt"],
            segment["__end_dt"],
            segment["segmentType"],
        ),
    )


def build_segments_for_document(doc_events: list[dict]) -> list[dict]:
    if not doc_events:
        return []

    ordered = sorted(
        doc_events, key=lambda item: (item["event_time"], -int(item["row_number"]))
    )
    for idx, event in enumerate(ordered):
        event["order_index"] = idx

    status_events = [
        event for event in ordered if event["is_status_event"] and event["to_status"]
    ]
    if len(status_events) < 2:
        return []

    intervals: list[dict] = []

    first_status_event = status_events[0]
    if first_status_event["from_status"] == "Processing":
        first_pre_status_event = next(
            (
                event
                for event in ordered
                if event["order_index"] < first_status_event["order_index"]
            ),
            None,
        )
        if (
            first_pre_status_event is not None
            and first_pre_status_event["event_time"] < first_status_event["event_time"]
        ):
            bootstrap_inner = [
                event
                for event in ordered
                if first_pre_status_event["order_index"]
                < event["order_index"]
                < first_status_event["order_index"]
            ]
            intervals.append(
                {
                    "document_id": first_status_event["document_id"],
                    "start_event": first_pre_status_event,
                    "end_event": first_status_event,
                    "inner_events": bootstrap_inner,
                    "start_time": first_pre_status_event["event_time"],
                    "end_time": first_status_event["event_time"],
                    "duration_seconds": seconds_between(
                        first_status_event["event_time"],
                        first_pre_status_event["event_time"],
                    ),
                    "state": "Processing",
                    "enter_from": "Processing",
                    "enter_to": "Processing",
                    "enter_actor": first_pre_status_event["actor_name"],
                    "enter_actor_type": first_pre_status_event["actor_type"],
                    "exit_from": first_status_event["from_status"],
                    "exit_to": first_status_event["to_status"],
                    "exit_actor": first_status_event["actor_name"],
                    "exit_actor_type": first_status_event["actor_type"],
                }
            )

    for idx in range(len(status_events) - 1):
        current = status_events[idx]
        nxt = status_events[idx + 1]
        inner = [
            event
            for event in ordered
            if current["order_index"] < event["order_index"] < nxt["order_index"]
        ]
        intervals.append(
            {
                "document_id": current["document_id"],
                "start_event": current,
                "end_event": nxt,
                "inner_events": inner,
                "start_time": current["event_time"],
                "end_time": nxt["event_time"],
                "duration_seconds": seconds_between(
                    nxt["event_time"], current["event_time"]
                ),
                "state": current["to_status"],
                "enter_from": current["from_status"],
                "enter_to": current["to_status"],
                "enter_actor": current["actor_name"],
                "enter_actor_type": current["actor_type"],
                "exit_from": nxt["from_status"],
                "exit_to": nxt["to_status"],
                "exit_actor": nxt["actor_name"],
                "exit_actor_type": nxt["actor_type"],
            }
        )

    segments: list[dict] = []
    for interval in intervals:
        segments.extend(build_interval_segments(interval, ordered))
    return resolve_overlaps(segments)


def countable_segment_seconds(segment: dict) -> float:
    if not segment.get("timeGroupCountable"):
        return 0.0
    if (
        segment.get("timeGroup") == "User"
        and segment.get("segmentType") == "USER_REVIEW_AUTO_TIMEOUT"
    ):
        return max(0.0, float(segment.get("effectiveDurationSeconds") or 0.0))
    return max(0.0, float(segment.get("durationSeconds") or 0.0))


def clear_normalized_events_cache() -> None:
    global _NORMALIZED_EVENTS_CACHE_SIGNATURE, _NORMALIZED_EVENTS_CACHE_VALUE
    _NORMALIZED_EVENTS_CACHE_SIGNATURE = None
    _NORMALIZED_EVENTS_CACHE_VALUE = None

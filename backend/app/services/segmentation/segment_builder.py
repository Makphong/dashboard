from __future__ import annotations

import datetime as dt

from ...contracts.constants import (
    ACTIVITY_GRACE_MINUTES_DEFAULT,
    COMPLETED_STATE,
    IN_REVIEW_STATE,
    PENDING_STATES,
    SESSION_TIMEOUT_MINUTES_DEFAULT,
    SYSTEM_DETAIL_EVIDENCE_CHANGE_TYPES,
    USER_EDIT_CHANGE_TYPES,
)
from .engine_utils import assign_time_group, seconds_between


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


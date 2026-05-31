from __future__ import annotations

from ....contracts.constants_workflow import (
    COMPLETED_STATE,
    IN_REVIEW_STATE,
    PENDING_STATES,
    USER_EDIT_CHANGE_TYPES,
)
from .factory import build_segment
from .helpers import (
    find_system_reprocess_cycle_end,
    first_system_evidence,
    is_same_timestamp_reopen_to_review_handoff,
)


def _same_timestamp_handoff_segments(interval: dict) -> list[dict]:
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


def _pending_segments(interval: dict, all_events: list[dict]) -> list[dict]:
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
        if interval["state"] == "Pending Review by Moodys"
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


def _in_review_segments(interval: dict) -> list[dict]:
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

    return []


def _completed_segments(interval: dict) -> list[dict]:
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


def build_interval_segments(interval: dict, all_events: list[dict]) -> list[dict]:
    state = interval["state"]

    if is_same_timestamp_reopen_to_review_handoff(interval):
        return _same_timestamp_handoff_segments(interval)

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
        return _pending_segments(interval, all_events)

    if state == IN_REVIEW_STATE:
        segments = _in_review_segments(interval)
        if segments:
            return segments

    if state == COMPLETED_STATE:
        return _completed_segments(interval)

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

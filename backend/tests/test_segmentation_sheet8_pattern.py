from __future__ import annotations

import datetime as dt
import unittest

from backend.app.services.segmentation.segment_builder.document import (
    build_segments_for_document,
)


def _event(
    row_number: int,
    event_time: dt.datetime,
    actor_name: str,
    actor_type: str,
    *,
    change_type: str,
    from_status: str = "",
    to_status: str = "",
    from_value: str = "",
    to_value: str = "",
) -> dict:
    is_status_event = change_type == "Spread Status"
    return {
        "event_id": f"sheet8#{row_number}",
        "source_id": 1,
        "file_name": "gsheet_1bXaHSLaUAkW.csv",
        "page_name": "ชีต8",
        "row_number": row_number,
        "event_time": event_time,
        "actor_name": actor_name,
        "actor_type": actor_type,
        "document_id": "gsheet_1bXaHSLaUAkW.csv::ชีต8",
        "change_type": change_type,
        "statement_type": "N/A",
        "changed_value": "Status" if is_status_event else "Depreciation for the year",
        "from_value": from_status if is_status_event else from_value,
        "to_value": to_status if is_status_event else to_value,
        "from_status": from_status if is_status_event else "",
        "to_status": to_status if is_status_event else "",
        "from_status_raw": from_status,
        "to_status_raw": to_status,
        "action_type": change_type,
        "submitted_for_reanalysis": False,
        "auto_closed": False,
        "is_status_event": is_status_event,
        "is_detail_event": not is_status_event,
        "order_index": -1,
        "raw": {},
    }


class Sheet8PatternSegmentationTest(unittest.TestCase):
    def test_placeholder_pending_exit_does_not_split_single_edit_session(self) -> None:
        events = [
            _event(
                30,
                dt.datetime(2026, 4, 28, 3, 49, 28),
                "User5",
                "User",
                change_type="Spread Status",
                from_status="Completed",
                to_status="Pending Re-Review by Moodys",
            ),
            _event(
                29,
                dt.datetime(2026, 4, 28, 3, 49, 28),
                "User5",
                "User",
                change_type="Spread Status",
                from_status="Pending Re-Review by Moodys",
                to_status="In Review by Moodys",
            ),
            _event(
                28,
                dt.datetime(2026, 4, 28, 3, 51, 10),
                "User5",
                "User",
                change_type="Account Value",
                from_value="-70450000",
                to_value="-189000",
            ),
            _event(
                4,
                dt.datetime(2026, 4, 28, 4, 1, 4),
                "User0",
                "User",
                change_type="Spread Status",
                from_status="In Review by Moodys",
                to_status="Pending Re-Review by Moodys",
            ),
            _event(
                3,
                dt.datetime(2026, 4, 28, 4, 1, 5),
                "User5",
                "User",
                change_type="Account Value",
                from_value="75100000",
                to_value="-3838000",
            ),
            _event(
                2,
                dt.datetime(2026, 4, 28, 4, 1, 9),
                "User5",
                "User",
                change_type="Spread Status",
                from_status="Pending Re-Review by Moodys",
                to_status="Completed",
            ),
        ]

        segments = build_segments_for_document(events)
        user_segments = [
            segment
            for segment in segments
            if segment["segmentType"].startswith("USER_")
        ]

        self.assertEqual(len(user_segments), 1)
        self.assertEqual(
            user_segments[0]["segmentType"],
            "USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL",
        )
        self.assertEqual(user_segments[0]["start"], "2026-04-28T03:49:28")
        self.assertEqual(user_segments[0]["end"], "2026-04-28T04:01:09")
        self.assertFalse(
            any(segment["segmentType"] == "IDLE_WAITING_FOR_REREVIEW" for segment in segments)
        )


if __name__ == "__main__":
    unittest.main()

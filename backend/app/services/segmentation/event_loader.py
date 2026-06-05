from __future__ import annotations

import json

from ...config.constants.constants_parsing import FIELD_ALIASES
from ...infrastructure.db.sqlite_store import current_unified_rows_signature, get_conn
from .engine_utils import (
    build_canonical_map,
    canonicalize_workflow_state,
    infer_actor_type,
    normalize_text,
    parse_bool,
    parse_datetime,
    parse_int,
    pick_field,
)

_NORMALIZED_EVENTS_CACHE_SIGNATURE: tuple[int, int] | None = None
_NORMALIZED_EVENTS_CACHE_VALUE: tuple[list[dict], dict[str, int]] | None = None


def fetch_normalized_events(
    signature: tuple[int, int] | None = None,
) -> tuple[list[dict], dict[str, int]]:
    global _NORMALIZED_EVENTS_CACHE_SIGNATURE, _NORMALIZED_EVENTS_CACHE_VALUE
    cache_signature = signature or current_unified_rows_signature()
    if (
        _NORMALIZED_EVENTS_CACHE_VALUE is not None
        and _NORMALIZED_EVENTS_CACHE_SIGNATURE == cache_signature
    ):
        events_cache, invalid_counts_cache = _NORMALIZED_EVENTS_CACHE_VALUE
        return [event.copy() for event in events_cache], invalid_counts_cache.copy()

    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT source_id, file_name, page_name, row_number, data_json
            FROM unified_rows
            ORDER BY file_name ASC, page_name ASC, row_number DESC
            """
        ).fetchall()

    events: list[dict] = []
    invalid_counts: dict[str, int] = {}

    for db_row in rows:
        sheet_key = f"{db_row['file_name']}::{db_row['page_name']}"
        try:
            raw = json.loads(db_row["data_json"])
        except json.JSONDecodeError:
            raw = {}
        canonical = build_canonical_map(raw)

        event_time = parse_datetime(
            pick_field(raw, FIELD_ALIASES["event_time"], canonical)
        )
        if not event_time:
            invalid_counts[sheet_key] = invalid_counts.get(sheet_key, 0) + 1
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
                    pick_field(raw, FIELD_ALIASES["submitted_for_reanalysis"], canonical)
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
    _NORMALIZED_EVENTS_CACHE_VALUE = (events, invalid_counts)
    return [event.copy() for event in events], invalid_counts.copy()


def clear_normalized_events_cache() -> None:
    global _NORMALIZED_EVENTS_CACHE_SIGNATURE, _NORMALIZED_EVENTS_CACHE_VALUE
    _NORMALIZED_EVENTS_CACHE_SIGNATURE = None
    _NORMALIZED_EVENTS_CACHE_VALUE = None

from __future__ import annotations

import sqlite3

from ...config.constants.constants_paths import DB_PATH
from ..firebase_sync import (
    fetch_dashboard_meta_state,
    hydrate_sqlite_from_firestore,
    is_firestore_enabled,
    sync_sqlite_to_firestore,
)

_FIREBASE_BOOTSTRAPPED = False
_FIRESTORE_META_SIGNATURE: tuple[str, int, int] | None = None


def get_conn() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def current_unified_rows_signature(
    conn: sqlite3.Connection | None = None,
) -> tuple[int, int]:
    owns_conn = conn is None
    local_conn = conn or get_conn()
    try:
        row = local_conn.execute(
            "SELECT COUNT(*) AS c, COALESCE(MAX(row_id), 0) AS max_row_id FROM unified_rows"
        ).fetchone()
        count = int(row["c"] if row else 0)
        max_row_id = int(row["max_row_id"] if row else 0)
        return count, max_row_id
    finally:
        if owns_conn:
            local_conn.close()


def _bootstrap_from_firestore_if_needed() -> None:
    global _FIREBASE_BOOTSTRAPPED, _FIRESTORE_META_SIGNATURE
    if _FIREBASE_BOOTSTRAPPED:
        return
    if not is_firestore_enabled():
        _FIREBASE_BOOTSTRAPPED = True
        return
    try:
        hydrate_sqlite_from_firestore(DB_PATH)
        remote_state = fetch_dashboard_meta_state() or {}
        _FIRESTORE_META_SIGNATURE = (
            str(remote_state.get("updated_at") or ""),
            int(remote_state.get("row_count") or 0),
            int(remote_state.get("source_count") or 0),
        )
    except Exception as exc:
        print(f"[Firebase] Bootstrap skipped: {exc}")
    finally:
        _FIREBASE_BOOTSTRAPPED = True


def ensure_fresh_from_firestore_if_enabled() -> None:
    global _FIRESTORE_META_SIGNATURE

    if not is_firestore_enabled():
        return

    try:
        remote_state = fetch_dashboard_meta_state()
    except Exception as exc:
        print(f"[Firebase] Metadata read skipped: {exc}")
        return

    if not remote_state:
        return

    remote_signature = (
        str(remote_state.get("updated_at") or ""),
        int(remote_state.get("row_count") or 0),
        int(remote_state.get("source_count") or 0),
    )

    if _FIRESTORE_META_SIGNATURE == remote_signature:
        return

    try:
        hydrate_sqlite_from_firestore(DB_PATH)
    except Exception as exc:
        print(f"[Firebase] Refresh hydrate skipped: {exc}")
        return

    _FIRESTORE_META_SIGNATURE = remote_signature


def _sync_to_firestore_if_enabled() -> None:
    if not is_firestore_enabled():
        return
    try:
        sync_sqlite_to_firestore(DB_PATH)
    except Exception as exc:
        print(f"[Firebase] Sync failed: {exc}")


def init_db() -> None:
    with get_conn() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS source_files (
                source_id TEXT PRIMARY KEY,
                file_name TEXT NOT NULL UNIQUE,
                file_ext TEXT,
                uploaded_at TEXT NOT NULL,
                total_rows INTEGER NOT NULL DEFAULT 0,
                total_pages INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS source_pages (
                source_id TEXT NOT NULL,
                page_name TEXT NOT NULL,
                row_count INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY (source_id, page_name),
                FOREIGN KEY (source_id) REFERENCES source_files(source_id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS unified_rows (
                row_id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_id TEXT NOT NULL,
                file_name TEXT NOT NULL,
                page_name TEXT NOT NULL,
                row_number INTEGER NOT NULL,
                data_json TEXT NOT NULL,
                ingested_at TEXT NOT NULL,
                FOREIGN KEY (source_id) REFERENCES source_files(source_id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_unified_file_page ON unified_rows(file_name, page_name);
            CREATE INDEX IF NOT EXISTS idx_unified_source ON unified_rows(source_id);
            CREATE TABLE IF NOT EXISTS connected_sheets (
                connection_id TEXT PRIMARY KEY,
                url TEXT NOT NULL,
                spreadsheet_id TEXT NOT NULL,
                label TEXT NOT NULL,
                connected_at TEXT NOT NULL,
                last_sync_at TEXT,
                last_sync_rows INTEGER DEFAULT 0,
                last_sync_pages INTEGER DEFAULT 0,
                is_active INTEGER NOT NULL DEFAULT 1
            );
            """
        )
    _bootstrap_from_firestore_if_needed()

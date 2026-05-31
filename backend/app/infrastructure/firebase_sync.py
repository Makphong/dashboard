from __future__ import annotations

import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
except Exception:  # pragma: no cover - optional runtime dependency
    firebase_admin = None
    credentials = None
    firestore = None

_COLLECTIONS = {
    "source_files": "source_files",
    "source_pages": "source_pages",
    "unified_rows": "unified_rows",
    "connected_sheets": "connected_sheets",
}

_client = None
_enabled_cache: bool | None = None


def is_firestore_enabled() -> bool:
    global _enabled_cache
    if _enabled_cache is not None:
        return _enabled_cache

    has_inline_json = bool(os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON"))
    has_split_key = bool(os.getenv("FIREBASE_CLIENT_EMAIL") and os.getenv("FIREBASE_PRIVATE_KEY"))
    has_adc = bool(os.getenv("GOOGLE_APPLICATION_CREDENTIALS"))
    has_project = bool(os.getenv("FIREBASE_PROJECT_ID"))
    has_app = firebase_admin is not None and firestore is not None

    _enabled_cache = bool(has_app and has_project and (has_inline_json or has_split_key or has_adc))
    return _enabled_cache


def _get_service_account_dict() -> dict[str, Any] | None:
    raw_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON", "").strip()
    if raw_json:
        payload = json.loads(raw_json)
        if "private_key" in payload and isinstance(payload["private_key"], str):
            payload["private_key"] = payload["private_key"].replace("\\n", "\n")
        return payload

    client_email = os.getenv("FIREBASE_CLIENT_EMAIL", "").strip()
    private_key = os.getenv("FIREBASE_PRIVATE_KEY", "").strip()
    project_id = os.getenv("FIREBASE_PROJECT_ID", "").strip()
    private_key_id = os.getenv("FIREBASE_PRIVATE_KEY_ID", "").strip()
    client_id = os.getenv("FIREBASE_CLIENT_ID", "").strip()

    if client_email and private_key and project_id:
        return {
            "type": "service_account",
            "project_id": project_id,
            "private_key_id": private_key_id,
            "private_key": private_key.replace("\\n", "\n"),
            "client_email": client_email,
            "client_id": client_id,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_x509_cert_url": f"https://www.googleapis.com/robot/v1/metadata/x509/{client_email}",
            "universe_domain": "googleapis.com",
        }

    return None


def _get_client():
    global _client
    if _client is not None:
        return _client

    if not is_firestore_enabled():
        return None

    if not firebase_admin._apps:
        service_account_dict = _get_service_account_dict()
        if service_account_dict:
            cred = credentials.Certificate(service_account_dict)
            firebase_admin.initialize_app(cred, {"projectId": os.getenv("FIREBASE_PROJECT_ID")})
        else:
            firebase_admin.initialize_app(options={"projectId": os.getenv("FIREBASE_PROJECT_ID")})

    _client = firestore.client()
    return _client


def fetch_dashboard_meta_state() -> dict[str, Any] | None:
    client = _get_client()
    if client is None:
        return None

    doc = client.collection("dashboard_meta").document("state").get()
    if not doc.exists:
        return None

    payload = doc.to_dict() or {}
    return {
        "updated_at": str(payload.get("updated_at") or ""),
        "row_count": int(payload.get("row_count") or 0),
        "source_count": int(payload.get("source_count") or 0),
    }


def _fetch_table_rows(conn: sqlite3.Connection, table_name: str, order_by: str | None = None) -> list[dict[str, Any]]:
    query = f"SELECT * FROM {table_name}"
    if order_by:
        query = f"{query} ORDER BY {order_by}"
    rows = conn.execute(query).fetchall()
    return [dict(row) for row in rows]


def _chunk(items: list[dict[str, Any]], chunk_size: int = 400):
    for idx in range(0, len(items), chunk_size):
        yield items[idx : idx + chunk_size]


def _doc_id_for_row(table_name: str, row: dict[str, Any]) -> str:
    if table_name == "source_files":
        return str(row["source_id"])
    if table_name == "source_pages":
        return f"{row['source_id']}::{row['page_name']}"
    if table_name == "unified_rows":
        return str(row["row_id"])
    if table_name == "connected_sheets":
        return str(row["connection_id"])
    raise ValueError(f"Unsupported table: {table_name}")


def sync_sqlite_to_firestore(db_path: Path) -> bool:
    client = _get_client()
    if client is None:
        return False

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        tables = {
            "source_files": _fetch_table_rows(conn, "source_files", "uploaded_at DESC"),
            "source_pages": _fetch_table_rows(conn, "source_pages"),
            "unified_rows": _fetch_table_rows(conn, "unified_rows", "row_id ASC"),
            "connected_sheets": _fetch_table_rows(conn, "connected_sheets", "connected_at DESC"),
        }
    finally:
        conn.close()

    for table_name, collection_name in _COLLECTIONS.items():
        docs = list(client.collection(collection_name).stream())
        for doc_batch in _chunk([{"id": d.id} for d in docs], chunk_size=400):
            batch = client.batch()
            for ref in doc_batch:
                batch.delete(client.collection(collection_name).document(ref["id"]))
            batch.commit()

        rows = tables[table_name]
        for row_batch in _chunk(rows, chunk_size=350):
            batch = client.batch()
            for row in row_batch:
                doc_id = _doc_id_for_row(table_name, row)
                batch.set(client.collection(collection_name).document(doc_id), row)
            batch.commit()

    client.collection("dashboard_meta").document("state").set(
        {
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "row_count": len(tables["unified_rows"]),
            "source_count": len(tables["source_files"]),
        }
    )
    return True


def _create_empty_schema(conn: sqlite3.Connection) -> None:
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


def hydrate_sqlite_from_firestore(db_path: Path) -> bool:
    client = _get_client()
    if client is None:
        return False

    source_docs = list(client.collection(_COLLECTIONS["source_files"]).stream())
    if not source_docs:
        return False

    page_docs = list(client.collection(_COLLECTIONS["source_pages"]).stream())
    row_docs = list(client.collection(_COLLECTIONS["unified_rows"]).stream())
    connection_docs = list(client.collection(_COLLECTIONS["connected_sheets"]).stream())

    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    try:
        _create_empty_schema(conn)
        conn.executescript(
            """
            DELETE FROM unified_rows;
            DELETE FROM source_pages;
            DELETE FROM connected_sheets;
            DELETE FROM source_files;
            """
        )

        for doc in source_docs:
            row = doc.to_dict() or {}
            conn.execute(
                """
                INSERT OR REPLACE INTO source_files (source_id, file_name, file_ext, uploaded_at, total_rows, total_pages)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    row.get("source_id"),
                    row.get("file_name"),
                    row.get("file_ext"),
                    row.get("uploaded_at"),
                    int(row.get("total_rows") or 0),
                    int(row.get("total_pages") or 0),
                ),
            )

        for doc in page_docs:
            row = doc.to_dict() or {}
            conn.execute(
                """
                INSERT OR REPLACE INTO source_pages (source_id, page_name, row_count)
                VALUES (?, ?, ?)
                """,
                (
                    row.get("source_id"),
                    row.get("page_name"),
                    int(row.get("row_count") or 0),
                ),
            )

        for doc in row_docs:
            row = doc.to_dict() or {}
            conn.execute(
                """
                INSERT OR REPLACE INTO unified_rows (row_id, source_id, file_name, page_name, row_number, data_json, ingested_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    int(row.get("row_id") or 0),
                    row.get("source_id"),
                    row.get("file_name"),
                    row.get("page_name"),
                    int(row.get("row_number") or 0),
                    row.get("data_json") or "{}",
                    row.get("ingested_at") or "",
                ),
            )

        for doc in connection_docs:
            row = doc.to_dict() or {}
            conn.execute(
                """
                INSERT OR REPLACE INTO connected_sheets (
                    connection_id, url, spreadsheet_id, label, connected_at,
                    last_sync_at, last_sync_rows, last_sync_pages, is_active
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    row.get("connection_id"),
                    row.get("url"),
                    row.get("spreadsheet_id"),
                    row.get("label"),
                    row.get("connected_at"),
                    row.get("last_sync_at"),
                    int(row.get("last_sync_rows") or 0),
                    int(row.get("last_sync_pages") or 0),
                    int(row.get("is_active") or 1),
                ),
            )

        seq_row = conn.execute("SELECT COALESCE(MAX(row_id), 0) FROM unified_rows").fetchone()
        max_row_id = int(seq_row[0] if seq_row else 0)
        try:
            conn.execute(
                "INSERT OR REPLACE INTO sqlite_sequence(name, seq) VALUES ('unified_rows', ?)",
                (max_row_id,),
            )
        except sqlite3.OperationalError:
            # sqlite_sequence might not exist yet in some SQLite builds.
            pass

        conn.commit()
    finally:
        conn.close()

    return True

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
_last_error: str = ""


def _set_last_error(message: str) -> None:
    global _last_error
    _last_error = message.strip()


def _clear_last_error() -> None:
    global _last_error
    _last_error = ""


def _build_firestore_config() -> dict[str, Any]:
    raw_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON", "").strip()
    client_email = os.getenv("FIREBASE_CLIENT_EMAIL", "").strip()
    private_key = os.getenv("FIREBASE_PRIVATE_KEY", "").strip()
    env_project_id = os.getenv("FIREBASE_PROJECT_ID", "").strip()

    has_inline_json = bool(raw_json)
    has_split_key = bool(client_email and private_key)
    has_adc = bool(os.getenv("GOOGLE_APPLICATION_CREDENTIALS"))
    has_app = firebase_admin is not None and firestore is not None

    json_error = ""
    json_project_id = ""
    if raw_json:
        try:
            payload = json.loads(raw_json)
            json_project_id = str(payload.get("project_id") or "").strip()
        except Exception as exc:
            json_error = f"Invalid FIREBASE_SERVICE_ACCOUNT_JSON: {exc}"

    project_id = env_project_id or json_project_id
    has_credentials = has_inline_json or has_split_key or has_adc
    enabled = bool(has_app and bool(project_id) and has_credentials and not json_error)
    configured = bool(has_credentials or env_project_id)

    reasons: list[str] = []
    if json_error:
        reasons.append(json_error)
    if not has_app:
        reasons.append("firebase-admin package is not available in runtime")
    if has_credentials and not project_id:
        reasons.append("Missing FIREBASE_PROJECT_ID (or project_id in FIREBASE_SERVICE_ACCOUNT_JSON)")
    if not has_credentials:
        reasons.append(
            "Missing Firebase credentials: set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY"
        )

    return {
        "configured": configured,
        "enabled": enabled,
        "project_id": project_id,
        "has_sdk": has_app,
        "has_inline_json": has_inline_json,
        "has_split_key": has_split_key,
        "has_adc": has_adc,
        "reason": "; ".join(reasons),
    }


def is_firestore_enabled() -> bool:
    global _enabled_cache
    if _enabled_cache is not None:
        return _enabled_cache

    _enabled_cache = bool(_build_firestore_config()["enabled"])
    return _enabled_cache


def _get_service_account_dict() -> dict[str, Any] | None:
    raw_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON", "").strip()
    if raw_json:
        try:
            payload = json.loads(raw_json)
        except Exception as exc:
            raise ValueError(f"Invalid FIREBASE_SERVICE_ACCOUNT_JSON: {exc}") from exc
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


def get_firestore_status(probe_client: bool = True) -> dict[str, Any]:
    config = _build_firestore_config()
    status = {
        "configured": bool(config["configured"]),
        "enabled": bool(config["enabled"]),
        "projectId": str(config["project_id"] or ""),
        "clientReady": False,
        "error": "",
        "reason": str(config["reason"] or ""),
    }

    if not status["enabled"]:
        if status["configured"] and status["reason"]:
            status["error"] = status["reason"]
        return status

    if not probe_client:
        status["clientReady"] = _client is not None
        status["error"] = _last_error
        return status

    client = _get_client()
    status["clientReady"] = client is not None
    status["error"] = _last_error
    return status


def _get_client():
    global _client
    if _client is not None:
        _clear_last_error()
        return _client

    config = _build_firestore_config()
    if not config["enabled"]:
        if config["configured"]:
            _set_last_error(str(config["reason"] or "Firestore is not enabled due to invalid configuration"))
        else:
            _clear_last_error()
        return None

    project_id = str(config["project_id"] or os.getenv("FIREBASE_PROJECT_ID") or "").strip()

    try:
        if not firebase_admin._apps:
            service_account_dict = _get_service_account_dict()
            if service_account_dict:
                cred = credentials.Certificate(service_account_dict)
                firebase_admin.initialize_app(cred, {"projectId": project_id})
            else:
                firebase_admin.initialize_app(options={"projectId": project_id})

        _client = firestore.client()
        _clear_last_error()
    except Exception as exc:
        _client = None
        _set_last_error(f"{type(exc).__name__}: {exc}")
        return None

    return _client


def fetch_dashboard_meta_state() -> dict[str, Any] | None:
    client = _get_client()
    if client is None:
        return None

    try:
        doc = client.collection("dashboard_meta").document("state").get()
    except Exception as exc:
        _set_last_error(f"{type(exc).__name__}: {exc}")
        raise

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
        error_message = _last_error or "Firestore client is not ready"
        _mark_sync_failure(error_message)
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

    try:
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
    except Exception as exc:
        _set_last_error(f"{type(exc).__name__}: {exc}")
        raise

    _clear_last_error()
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

    try:
        source_docs = list(client.collection(_COLLECTIONS["source_files"]).stream())
        page_docs = list(client.collection(_COLLECTIONS["source_pages"]).stream())
        row_docs = list(client.collection(_COLLECTIONS["unified_rows"]).stream())
        connection_docs = list(client.collection(_COLLECTIONS["connected_sheets"]).stream())
    except Exception as exc:
        _set_last_error(f"{type(exc).__name__}: {exc}")
        raise

    if not source_docs:
        return False

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

    _clear_last_error()
    return True

from __future__ import annotations

import argparse
import base64
import csv
import datetime as dt
import io
import json
import os
import re
import sqlite3
import threading
import uuid
import zipfile
from collections import Counter, defaultdict
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlparse
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "local_dashboard.db"
DEFAULT_TIMEOUT_SECONDS = 30 * 60
APP_VERSION = "2026-05-24-perf-1"
SERVER_STARTED_AT = dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
ALGORITHM_VERSION = (
    "1.3_RAW_3_TIME_GROUP_EDIT_COMPLETED_SAME_TIMESTAMP_HANDOFF_PROCESSING_BACKFILL_1"
)

# In-memory caches for expensive reads; invalidated on upload/delete.
_NORMALIZED_EVENTS_CACHE_SIGNATURE: tuple[int, int] | None = None
_NORMALIZED_EVENTS_CACHE_VALUE: list[dict] | None = None
_USER_PERFORMANCE_CACHE_SIGNATURE: tuple[int, int] | None = None
_USER_PERFORMANCE_CACHE_VALUE: dict | None = None

WORKFLOW_STATE_ORDER = [
    "Uploading",
    "Processing",
    "Pending Review by Moodys",
    "In Review by Moodys",
    "Pending Re-Review by Moodys",
    "Completed",
]

WORKFLOW_STATES = set(WORKFLOW_STATE_ORDER)
PENDING_STATES = {"Pending Review by Moodys", "Pending Re-Review by Moodys"}
IN_REVIEW_STATE = "In Review by Moodys"
COMPLETED_STATE = "Completed"

SYSTEM_DETAIL_EVIDENCE_CHANGE_TYPES = {
    "AI Account Mapping",
    "Account Value",
    "Mapped Account",
    "Remapped Account",
    "Unmapped Account",
    "Spread Metadata",
}
USER_EDIT_CHANGE_TYPES = {
    "Account Value",
    "Mapped Account",
    "Remapped Account",
    "Unmapped Account",
    "Spread Metadata",
}

SYSTEM_TIME_SEGMENT_TYPES = {
    "SYSTEM_INITIAL_PROCESSING",
    "SYSTEM_SCHEDULED_REPROCESSING",
    "SYSTEM_INTERNAL_TRANSITION",
    "AUTO_TIMEOUT_MARKER",
}
USER_TIME_SEGMENT_TYPES = {
    "USER_UPLOADING",
    "USER_REVIEW_AUTO_TIMEOUT",
    "USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL",
    "USER_COMPLETION_APPROVAL",
    "USER_EDITING_CORRECTION",
    "USER_REVIEW_COMMENT_CHECK",
}
IDLE_TIME_SEGMENT_TYPES = {
    "IDLE_WAITING_FOR_REVIEW",
    "IDLE_WAITING_FOR_REREVIEW",
    "IDLE_WAITING_FOR_SCHEDULED_REPROCESS",
    "IDLE_AFTER_SYSTEM_REPROCESS",
    "POST_COMPLETED_ELAPSED",
    "UNKNOWN_OR_LOW_CONFIDENCE",
}

CORE_USER_SESSION_SEGMENT_TYPES = {
    "USER_REVIEW_AUTO_TIMEOUT",
    "USER_EDITING_CORRECTION_AND_COMPLETION_APPROVAL",
    "USER_COMPLETION_APPROVAL",
    "USER_EDITING_CORRECTION",
    "USER_REVIEW_COMMENT_CHECK",
}

SESSION_TIMEOUT_MINUTES_DEFAULT = 35
ACTIVITY_GRACE_MINUTES_DEFAULT = 10

PENDING_REVIEW_STATUSES = {
    "pendingreviewbymoodys",
    "pendingreview",
}
PENDING_REREVIEW_STATUSES = {
    "pendingrereviewbymoodys",
    "pendingrereview",
}
IN_REVIEW_STATUSES = {
    "inreviewbymoodys",
    "inreview",
}
COMPLETED_STATUSES = {
    "completed",
}

DATE_NUMBER_FORMAT_IDS = {
    14,
    15,
    16,
    17,
    18,
    19,
    20,
    21,
    22,
    27,
    30,
    36,
    45,
    46,
    47,
    50,
    57,
}

FIELD_ALIASES = {
    "change_type": {
        "changetype",
        "change",
        "actiontype",
        "action",
    },
    "statement_type": {
        "statementtype",
        "statement",
    },
    "changed_value": {
        "value",
        "changedvalue",
        "field",
    },
    "from_value": {
        "from",
        "fromvalue",
        "oldvalue",
    },
    "to_value": {
        "to",
        "tovalue",
        "newvalue",
    },
    "event_time": {
        "eventtime",
        "timestamp",
        "datetime",
        "eventdatetime",
        "time",
        "createdat",
        "updatedat",
        "eventdate",
        "date",
    },
    "actor_type": {
        "actortype",
        "typeactor",
        "bytype",
        "updatedbytype",
        "usertype",
    },
    "actor_name": {
        "actor",
        "actorname",
        "username",
        "user",
        "updatedby",
        "owner",
        "operator",
    },
    "from_status": {
        "fromstatus",
        "oldstatus",
        "previousstatus",
        "statusfrom",
        "statusbefore",
        "from",
    },
    "to_status": {
        "tostatus",
        "newstatus",
        "status",
        "statusto",
        "statusafter",
        "to",
    },
    "document_id": {
        "documentid",
        "docid",
        "caseid",
        "fileid",
        "requestid",
        "recordid",
        "document",
        "workflowid",
    },
    "action_type": {
        "action",
        "activity",
        "event",
        "operation",
        "eventtype",
        "detail",
        "description",
        "actiontype",
    },
    "submitted_for_reanalysis": {
        "submittedforreanalysis",
        "reanalysis",
        "isrework",
        "reworkflag",
        "submitted_for_reanalysis",
    },
    "auto_closed": {
        "autoclosed",
        "autoclose",
        "isautoclosed",
        "autotimeout",
        "auto_timeout",
    },
    "timeout_minutes": {
        "timeoutminutes",
        "sessiontimeoutminutes",
        "timeoutconfigminutes",
        "timeout",
    },
}

CSV_DECODE_CANDIDATES = (
    "utf-8-sig",
    "utf-8",
    "utf-16",
    "utf-16-le",
    "utf-16-be",
    "cp874",
    "tis-620",
    "cp1252",
)
MOJIBAKE_MARKERS = (
    "\u00c3",
    "\u00c2",
    "\u00e0\u00b8",
    "\u00e0\u00b9",
    "\u00e1\u00bb",
    "\u00e1\u00ba",
    "\u00ef\u00bb\u00bf",
)


def utc_now_iso() -> str:
    return dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


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


def excel_serial_to_datetime(serial: float) -> dt.datetime:
    # Excel 1900 date system with leap-year bug compensation
    epoch = dt.datetime(1899, 12, 30)
    return epoch + dt.timedelta(days=serial)


def col_to_index(col: str) -> int:
    result = 0
    for ch in col:
        result = result * 26 + (ord(ch) - ord("A") + 1)
    return result


def index_to_col(index: int) -> str:
    if index <= 0:
        return "A"
    chars: list[str] = []
    while index:
        index, rem = divmod(index - 1, 26)
        chars.append(chr(rem + ord("A")))
    return "".join(reversed(chars))


def get_conn() -> sqlite3.Connection:
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


def invalidate_runtime_caches() -> None:
    global _NORMALIZED_EVENTS_CACHE_SIGNATURE, _NORMALIZED_EVENTS_CACHE_VALUE
    global _USER_PERFORMANCE_CACHE_SIGNATURE, _USER_PERFORMANCE_CACHE_VALUE
    _NORMALIZED_EVENTS_CACHE_SIGNATURE = None
    _NORMALIZED_EVENTS_CACHE_VALUE = None
    _USER_PERFORMANCE_CACHE_SIGNATURE = None
    _USER_PERFORMANCE_CACHE_VALUE = None


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


def is_date_number_format(code: str) -> bool:
    lower = code.lower()
    # Keep this conservative: require date tokens and avoid plain numbers
    return any(token in lower for token in ["yy", "dd", "mm", "hh", "ss"])


def parse_shared_strings(zf: zipfile.ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in zf.namelist():
        return []
    root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
    ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    values: list[str] = []
    for si in root.findall("m:si", ns):
        # shared string can have multiple runs
        parts = [node.text or "" for node in si.findall(".//m:t", ns)]
        values.append("".join(parts))
    return values


def parse_date_style_indexes(zf: zipfile.ZipFile) -> set[int]:
    if "xl/styles.xml" not in zf.namelist():
        return set()

    root = ET.fromstring(zf.read("xl/styles.xml"))
    ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}

    custom_num_formats: dict[int, str] = {}
    for num_fmt in root.findall(".//m:numFmts/m:numFmt", ns):
        fmt_id = parse_int(num_fmt.attrib.get("numFmtId"))
        fmt_code = num_fmt.attrib.get("formatCode", "")
        if fmt_id is not None:
            custom_num_formats[fmt_id] = fmt_code

    date_style_indexes: set[int] = set()
    for idx, xf in enumerate(root.findall(".//m:cellXfs/m:xf", ns)):
        num_fmt_id = parse_int(xf.attrib.get("numFmtId")) or 0
        is_date = num_fmt_id in DATE_NUMBER_FORMAT_IDS
        if not is_date and num_fmt_id in custom_num_formats:
            is_date = is_date_number_format(custom_num_formats[num_fmt_id])
        if is_date:
            date_style_indexes.add(idx)
    return date_style_indexes


def parse_cell_value(
    cell: ET.Element,
    shared_strings: list[str],
    date_style_indexes: set[int],
    header_hint: str | None = None,
) -> str | float | int | bool | None:
    ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    cell_type = cell.attrib.get("t")
    style_index = parse_int(cell.attrib.get("s")) or 0

    if cell_type == "inlineStr":
        parts = [node.text or "" for node in cell.findall(".//m:t", ns)]
        return "".join(parts).strip()

    value_node = cell.find("m:v", ns)
    if value_node is None:
        return None
    raw = (value_node.text or "").strip()
    if raw == "":
        return None

    if cell_type == "s":
        idx = parse_int(raw)
        if idx is None or idx < 0 or idx >= len(shared_strings):
            return raw
        return shared_strings[idx]

    if cell_type == "b":
        return raw == "1"

    # numeric or general string
    try:
        number = float(raw)
        is_date_style = style_index in date_style_indexes
        if not is_date_style and header_hint:
            hint = normalize_text(header_hint)
            is_date_style = any(
                token in hint for token in ("date", "time", "timestamp")
            )
        if is_date_style:
            return excel_serial_to_datetime(number).strftime("%Y-%m-%d %H:%M:%S")
        if number.is_integer():
            return int(number)
        return number
    except ValueError:
        return raw


def dedupe_headers(headers: dict[int, str]) -> dict[int, str]:
    used: dict[str, int] = {}
    result: dict[int, str] = {}
    for col_idx, header in headers.items():
        cleaned = (header or "").strip()
        if not cleaned:
            cleaned = f"column_{index_to_col(col_idx)}"
        base = cleaned
        if base not in used:
            used[base] = 1
            result[col_idx] = base
            continue
        used[base] += 1
        result[col_idx] = f"{base}_{used[base]}"
    return result


def detect_header_row(rows: list[tuple[int, dict[int, object]]]) -> int:
    for idx, (_, row_values) in enumerate(rows):
        non_empty = [v for v in row_values.values() if v not in (None, "")]
        text_cells = [
            v for v in non_empty if isinstance(v, str) and not str(v).strip().isdigit()
        ]
        if len(non_empty) >= 2 and len(text_cells) >= 1:
            return idx
    return 0


def parse_xlsx_bytes(payload: bytes) -> list[tuple[str, list[dict]]]:
    with zipfile.ZipFile(io.BytesIO(payload)) as zf:
        workbook = ET.fromstring(zf.read("xl/workbook.xml"))
        ns = {
            "m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
            "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
        }
        rel_ns = {"r": "http://schemas.openxmlformats.org/package/2006/relationships"}

        shared_strings = parse_shared_strings(zf)
        date_style_indexes = parse_date_style_indexes(zf)

        rel_root = ET.fromstring(zf.read("xl/_rels/workbook.xml.rels"))
        rel_map: dict[str, str] = {}
        for rel in rel_root.findall("r:Relationship", rel_ns):
            rel_map[rel.attrib["Id"]] = rel.attrib["Target"]

        result_pages: list[tuple[str, list[dict]]] = []
        for sheet in workbook.findall("m:sheets/m:sheet", ns):
            sheet_name = sheet.attrib.get("name", "Sheet")
            rel_id = sheet.attrib.get(
                "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
            )
            if not rel_id:
                continue

            target = rel_map.get(rel_id, "")
            if not target:
                continue
            if target.startswith("/"):
                sheet_path = target.lstrip("/")
            else:
                sheet_path = f"xl/{target}" if not target.startswith("xl/") else target
            if sheet_path not in zf.namelist():
                continue

            sheet_root = ET.fromstring(zf.read(sheet_path))
            row_nodes = sheet_root.findall(".//m:sheetData/m:row", ns)
            parsed_rows: list[tuple[int, dict[int, object]]] = []

            for row_node in row_nodes:
                row_number = parse_int(row_node.attrib.get("r")) or 0
                row_values: dict[int, object] = {}
                for cell in row_node.findall("m:c", ns):
                    ref = cell.attrib.get("r", "")
                    match = re.match(r"([A-Z]+)", ref)
                    if not match:
                        continue
                    col_idx = col_to_index(match.group(1))
                    value = parse_cell_value(cell, shared_strings, date_style_indexes)
                    if value not in (None, ""):
                        row_values[col_idx] = value
                if row_values:
                    parsed_rows.append((row_number, row_values))

            if not parsed_rows:
                result_pages.append((sheet_name, []))
                continue

            header_row_index = detect_header_row(parsed_rows)
            header_row_num, header_values = parsed_rows[header_row_index]
            headers = {
                col_idx: str(value).strip() for col_idx, value in header_values.items()
            }
            headers = dedupe_headers(headers)

            page_rows: list[dict] = []
            for row_num, row_values in parsed_rows[header_row_index + 1 :]:
                row_obj: dict[str, object] = {"__sheet_row_number": row_num}
                data_cells = 0
                for col_idx, value in row_values.items():
                    key = headers.get(col_idx, f"column_{index_to_col(col_idx)}")
                    if value not in (None, ""):
                        row_obj[key] = value
                        data_cells += 1
                if data_cells > 0:
                    page_rows.append(row_obj)

            # If there is no data row after header, keep page but empty list.
            result_pages.append((sheet_name, page_rows))

    return result_pages


def score_text_quality(text: str) -> int:
    score = 0
    score += text.count("\ufffd") * 10
    score += text.count("\x00") * 10
    for marker in MOJIBAKE_MARKERS:
        score += text.count(marker) * 4
    score += sum(1 for ch in text if ch not in "\r\n\t" and ord(ch) < 32) * 6

    thai_codes = [ord(ch) for ch in text if "\u0e00" <= ch <= "\u0e7f"]
    if thai_codes:
        thai_consonants = sum(1 for code in thai_codes if 0x0E01 <= code <= 0x0E2E)
        thai_total = len(thai_codes)
        # cp1252 decoded as cp874 often yields Thai marks but almost no consonants.
        if thai_total >= 2 and thai_consonants == 0:
            score += thai_total * 8
        elif thai_total >= 4 and thai_consonants * 3 < thai_total:
            score += (thai_total - (thai_consonants * 3)) * 3

    return score


def decode_csv_payload(payload: bytes) -> str:
    candidates: list[tuple[int, int, str]] = []
    for priority, encoding in enumerate(CSV_DECODE_CANDIDATES):
        try:
            decoded = payload.decode(encoding)
        except UnicodeDecodeError:
            continue
        candidates.append((score_text_quality(decoded), priority, decoded))
        if priority <= 1 and candidates[-1][0] == 0:
            break

    if not candidates:
        return payload.decode("utf-8", errors="replace")

    candidates.sort(key=lambda item: (item[0], item[1]))
    return candidates[0][2]


def parse_csv_bytes(payload: bytes) -> list[dict]:
    text = decode_csv_payload(payload)

    sample = text[:4096]
    delimiter = ","
    try:
        dialect = csv.Sniffer().sniff(sample)
        delimiter = dialect.delimiter
    except csv.Error:
        delimiter = ","

    stream = io.StringIO(text)
    reader = csv.DictReader(stream, delimiter=delimiter)
    rows: list[dict] = []
    for idx, row in enumerate(reader, start=2):
        normalized = {"__sheet_row_number": idx}
        for key, value in row.items():
            cleaned_key = (key or "").strip()
            if not cleaned_key:
                continue
            normalized[cleaned_key] = (value or "").strip()
        if len(normalized) > 1:
            rows.append(normalized)
    return rows


def parse_uploaded_file(file_name: str, payload: bytes) -> list[tuple[str, list[dict]]]:
    suffix = Path(file_name).suffix.lower()
    if suffix in {".xlsx", ".xlsm"}:
        return parse_xlsx_bytes(payload)
    if suffix == ".csv":
        return [("CSV", parse_csv_bytes(payload))]
    if suffix == ".xls":
        raise ValueError(
            "Unsupported .xls format. Please save as .xlsx and upload again."
        )
    raise ValueError(f"Unsupported file type: {suffix or '(no extension)'}")


def clear_source_by_file_name(conn: sqlite3.Connection, file_name: str) -> None:
    row = conn.execute(
        "SELECT source_id FROM source_files WHERE file_name = ?",
        (file_name,),
    ).fetchone()
    if not row:
        return
    source_id = row["source_id"]
    conn.execute("DELETE FROM unified_rows WHERE source_id = ?", (source_id,))
    conn.execute("DELETE FROM source_pages WHERE source_id = ?", (source_id,))
    conn.execute("DELETE FROM source_files WHERE source_id = ?", (source_id,))


def _extract_gsheet_id(url: str) -> str | None:
    """Extract the spreadsheet ID from various Google Sheets URL formats."""
    m = re.search(r"/spreadsheets/d/([a-zA-Z0-9_-]+)", url)
    if m:
        return m.group(1)
    m = re.match(r"^([a-zA-Z0-9_-]{20,})$", url.strip())
    if m:
        return m.group(1)
    return None


def _fetch_url_bytes(url: str, timeout: int = 60) -> bytes:
    """Download a URL and return raw bytes. Follows redirects."""
    import urllib.request
    import urllib.error

    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def _discover_gsheet_gids(spreadsheet_id: str) -> list[tuple[str, int]]:
    """Try to discover sheet names and gids from a public Google Sheet.
    Returns list of (sheet_name, gid) tuples.
    Falls back to [(\"Sheet1\", 0)] if discovery fails."""
    try:
        html_url = (
            f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}/edit?usp=sharing"
        )
        html_bytes = _fetch_url_bytes(html_url, timeout=30)
        html_text = html_bytes.decode("utf-8", errors="replace")
        # Google embeds sheet metadata in the HTML in various patterns
        # Pattern: "name":"SheetName" ... "id":123456
        sheets: list[tuple[str, int]] = []
        # Try ritz/bootstrapData pattern
        for m in re.finditer(
            r'\{[^}]*"name"\s*:\s*"([^"]+)"[^}]*"id"\s*:\s*(\d+)', html_text
        ):
            sheets.append((m.group(1), int(m.group(2))))
        if not sheets:
            # Try reversed pattern: "id":X ... "name":"Y"
            for m in re.finditer(
                r'\{[^}]*"id"\s*:\s*(\d+)[^}]*"name"\s*:\s*"([^"]+)"', html_text
            ):
                sheets.append((m.group(2), int(m.group(1))))
        if sheets:
            # Remove duplicates preserving order
            seen = set()
            unique = []
            for name, gid in sheets:
                if gid not in seen:
                    seen.add(gid)
                    unique.append((name, gid))
            return unique
    except Exception:
        pass
    return [("Sheet1", 0)]


def _download_gsheet_pages(spreadsheet_id: str) -> list[tuple[str, list[dict]]]:
    """Download all tabs from a public Google Sheet as parsed CSV rows."""
    sheet_tabs = _discover_gsheet_gids(spreadsheet_id)
    all_pages: list[tuple[str, list[dict]]] = []
    for sheet_name, gid in sheet_tabs:
        export_url = (
            f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}"
            f"/export?format=csv&gid={gid}"
        )
        try:
            csv_bytes = _fetch_url_bytes(export_url, timeout=120)
            if not csv_bytes or len(csv_bytes) < 5:
                continue
            rows = parse_csv_bytes(csv_bytes)
            if rows:
                all_pages.append((sheet_name, rows))
        except Exception as exc:
            print(
                f"[GSheet] Failed to download sheet '{sheet_name}' (gid={gid}): {exc}"
            )
            continue
    return all_pages


def _ingest_gsheet_pages(
    spreadsheet_id: str, all_pages: list[tuple[str, list[dict]]]
) -> dict:
    """Ingest downloaded Google Sheet pages into the DB (replaces existing data for this sheet)."""
    file_name = f"gsheet_{spreadsheet_id[:12]}.csv"
    now = utc_now_iso()
    source_id = uuid.uuid4().hex
    total_rows = 0
    with get_conn() as conn:
        clear_source_by_file_name(conn, file_name)
        conn.execute(
            """
            INSERT INTO source_files (source_id, file_name, file_ext, uploaded_at, total_rows, total_pages)
            VALUES (?, ?, ?, ?, 0, 0)
            """,
            (source_id, file_name, ".gsheet", now),
        )
        for page_name, rows in all_pages:
            conn.execute(
                "INSERT INTO source_pages (source_id, page_name, row_count) VALUES (?, ?, ?)",
                (source_id, page_name, len(rows)),
            )
            for idx, row in enumerate(rows, start=1):
                row_number = parse_int(row.get("__sheet_row_number")) or idx
                data_json = json.dumps(row, ensure_ascii=False)
                conn.execute(
                    """
                    INSERT INTO unified_rows (source_id, file_name, page_name, row_number, data_json, ingested_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (source_id, file_name, page_name, row_number, data_json, now),
                )
            total_rows += len(rows)
        conn.execute(
            "UPDATE source_files SET total_rows = ?, total_pages = ? WHERE source_id = ?",
            (total_rows, len(all_pages), source_id),
        )
    invalidate_runtime_caches()
    return {"total_rows": total_rows, "total_pages": len(all_pages)}


def connect_gsheet(url: str) -> dict:
    """Persistently connect a Google Sheet. Saves URL to DB and performs initial sync."""
    spreadsheet_id = _extract_gsheet_id(url)
    if not spreadsheet_id:
        raise ValueError(
            "Invalid Google Sheet URL. Please provide a valid URL like: "
            "https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit"
        )
    # Check if already connected
    with get_conn() as conn:
        existing = conn.execute(
            "SELECT connection_id FROM connected_sheets WHERE spreadsheet_id = ? AND is_active = 1",
            (spreadsheet_id,),
        ).fetchone()
        if existing:
            raise ValueError("This Google Sheet is already connected.")

    # Download data first to validate the sheet is accessible
    all_pages = _download_gsheet_pages(spreadsheet_id)
    if not all_pages:
        raise ValueError(
            "Could not download any data. Make sure the Google Sheet is shared as "
            "'Anyone with the link' (Viewer)."
        )

    # Ingest data
    result = _ingest_gsheet_pages(spreadsheet_id, all_pages)

    # Save connection to DB
    connection_id = uuid.uuid4().hex
    now = utc_now_iso()
    label = f"Google Sheet ({spreadsheet_id[:8]}…)"
    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO connected_sheets (connection_id, url, spreadsheet_id, label, connected_at, last_sync_at, last_sync_rows, last_sync_pages, is_active)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
            """,
            (
                connection_id,
                url,
                spreadsheet_id,
                label,
                now,
                now,
                result["total_rows"],
                result["total_pages"],
            ),
        )

    return {
        "connection_id": connection_id,
        "spreadsheet_id": spreadsheet_id,
        "label": label,
        "total_rows": result["total_rows"],
        "total_pages": result["total_pages"],
        "connected_at": now,
    }


def _sync_single_gsheet(connection_row: dict) -> dict:
    """Re-download and replace data for one connected sheet."""
    spreadsheet_id = connection_row["spreadsheet_id"]
    connection_id = connection_row["connection_id"]
    try:
        all_pages = _download_gsheet_pages(spreadsheet_id)
        if not all_pages:
            return {
                "connection_id": connection_id,
                "status": "no_data",
                "error": "No data returned",
            }
        result = _ingest_gsheet_pages(spreadsheet_id, all_pages)
        now = utc_now_iso()
        with get_conn() as conn:
            conn.execute(
                "UPDATE connected_sheets SET last_sync_at = ?, last_sync_rows = ?, last_sync_pages = ? WHERE connection_id = ?",
                (now, result["total_rows"], result["total_pages"], connection_id),
            )
        return {
            "connection_id": connection_id,
            "status": "ok",
            "total_rows": result["total_rows"],
            "total_pages": result["total_pages"],
            "synced_at": now,
        }
    except Exception as exc:
        return {"connection_id": connection_id, "status": "error", "error": str(exc)}


def sync_all_gsheets() -> list[dict]:
    """Sync all active connected Google Sheets. Called on every page load/refresh."""
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT connection_id, url, spreadsheet_id, label FROM connected_sheets WHERE is_active = 1"
        ).fetchall()
    if not rows:
        return []
    results = []
    for row in rows:
        r = _sync_single_gsheet(dict(row))
        results.append(r)
    return results


def disconnect_gsheet(connection_id: str) -> None:
    """Remove a connected Google Sheet and its data."""
    with get_conn() as conn:
        row = conn.execute(
            "SELECT spreadsheet_id FROM connected_sheets WHERE connection_id = ?",
            (connection_id,),
        ).fetchone()
        if row:
            file_name = f"gsheet_{row['spreadsheet_id'][:12]}.csv"
            clear_source_by_file_name(conn, file_name)
        conn.execute(
            "DELETE FROM connected_sheets WHERE connection_id = ?", (connection_id,)
        )
    invalidate_runtime_caches()


def list_gsheet_connections() -> list[dict]:
    """Return all active Google Sheet connections."""
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT connection_id, url, spreadsheet_id, label, connected_at, last_sync_at, last_sync_rows, last_sync_pages FROM connected_sheets WHERE is_active = 1 ORDER BY connected_at DESC"
        ).fetchall()
    return [
        {
            "connectionId": r["connection_id"],
            "url": r["url"],
            "spreadsheetId": r["spreadsheet_id"],
            "label": r["label"],
            "connectedAt": r["connected_at"],
            "lastSyncAt": r["last_sync_at"],
            "lastSyncRows": r["last_sync_rows"],
            "lastSyncPages": r["last_sync_pages"],
        }
        for r in rows
    ]


# Keep legacy import function for backward compat
def import_google_sheet(url: str) -> dict:
    return connect_gsheet(url)


def ingest_file(file_name: str, payload: bytes) -> dict:
    pages = parse_uploaded_file(file_name, payload)
    now = utc_now_iso()
    source_id = uuid.uuid4().hex
    file_ext = Path(file_name).suffix.lower()

    total_rows = 0
    with get_conn() as conn:
        clear_source_by_file_name(conn, file_name)
        conn.execute(
            """
            INSERT INTO source_files (source_id, file_name, file_ext, uploaded_at, total_rows, total_pages)
            VALUES (?, ?, ?, ?, 0, 0)
            """,
            (source_id, file_name, file_ext, now),
        )

        for page_name, rows in pages:
            conn.execute(
                "INSERT INTO source_pages (source_id, page_name, row_count) VALUES (?, ?, ?)",
                (source_id, page_name, len(rows)),
            )
            for idx, row in enumerate(rows, start=1):
                row_number = parse_int(row.get("__sheet_row_number")) or idx
                data_json = json.dumps(row, ensure_ascii=False)
                conn.execute(
                    """
                    INSERT INTO unified_rows (source_id, file_name, page_name, row_number, data_json, ingested_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (source_id, file_name, page_name, row_number, data_json, now),
                )
            total_rows += len(rows)

        conn.execute(
            "UPDATE source_files SET total_rows = ?, total_pages = ? WHERE source_id = ?",
            (total_rows, len(pages), source_id),
        )

    invalidate_runtime_caches()
    return {
        "source_id": source_id,
        "file_name": file_name,
        "total_rows": total_rows,
        "total_pages": len(pages),
        "pages": [name for name, _ in pages],
        "uploaded_at": now,
    }


def list_sources() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT sf.source_id, sf.file_name, sf.file_ext, sf.uploaded_at, sf.total_rows, sf.total_pages,
                   GROUP_CONCAT(sp.page_name, ' | ') AS page_names
            FROM source_files sf
            LEFT JOIN source_pages sp ON sf.source_id = sp.source_id
            GROUP BY sf.source_id, sf.file_name, sf.file_ext, sf.uploaded_at, sf.total_rows, sf.total_pages
            ORDER BY sf.uploaded_at DESC
            """
        ).fetchall()

    result = []
    for row in rows:
        page_names = []
        if row["page_names"]:
            page_names = [
                name.strip() for name in row["page_names"].split("|") if name.strip()
            ]
        result.append(
            {
                "sourceId": row["source_id"],
                "name": row["file_name"],
                "fileName": row["file_name"],
                "type": (row["file_ext"] or "").replace(".", "") or "file",
                "rows": row["total_rows"],
                "pageCount": row["total_pages"],
                "pages": page_names,
                "status": "Active",
                "date": row["uploaded_at"],
            }
        )
    return result


def delete_source(source_id: str) -> None:
    with get_conn() as conn:
        conn.execute("DELETE FROM unified_rows WHERE source_id = ?", (source_id,))
        conn.execute("DELETE FROM source_pages WHERE source_id = ?", (source_id,))
        conn.execute("DELETE FROM source_files WHERE source_id = ?", (source_id,))
    invalidate_runtime_caches()


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
            "complete_seconds": 0.0,
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
            stats["complete_seconds"] += counted_seconds
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
            "reworkRate": rework_rate,
            "reworkRateDisplay": format_percent(rework_rate),
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


def json_response(
    handler: SimpleHTTPRequestHandler, payload: dict, status: int = 200
) -> None:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def read_json_body(handler: SimpleHTTPRequestHandler) -> dict:
    length = parse_int(handler.headers.get("Content-Length")) or 0
    raw = handler.rfile.read(length) if length > 0 else b"{}"
    if not raw:
        return {}
    return json.loads(raw.decode("utf-8"))


class DashboardHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".html": "text/html; charset=utf-8",
        ".htm": "text/html; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".js": "application/javascript; charset=utf-8",
        ".mjs": "application/javascript; charset=utf-8",
        ".jsx": "application/javascript; charset=utf-8",
        ".json": "application/json; charset=utf-8",
        ".txt": "text/plain; charset=utf-8",
        ".md": "text/markdown; charset=utf-8",
        ".csv": "text/csv; charset=utf-8",
        ".svg": "image/svg+xml; charset=utf-8",
    }

    def end_headers(self) -> None:
        # Avoid stale cached JSX/HTML in browsers; always fetch latest local file.
        self.send_header(
            "Cache-Control", "no-store, no-cache, must-revalidate, max-age=0"
        )
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt: str, *args) -> None:
        # Keep logs compact but still visible in terminal
        super().log_message(fmt, *args)

    def _handle_api_get(self, parsed) -> bool:
        if parsed.path == "/api/health":
            db_exists = DB_PATH.exists()
            json_response(
                self,
                {
                    "ok": True,
                    "db": str(DB_PATH.name),
                    "dbExists": db_exists,
                    "version": APP_VERSION,
                    "processId": os.getpid(),
                    "serverStartedAt": SERVER_STARTED_AT,
                    "appFileMtime": dt.datetime.fromtimestamp(
                        Path(__file__).stat().st_mtime
                    ).isoformat(),
                },
            )
            return True

        if parsed.path == "/api/sources":
            json_response(self, {"sources": list_sources()})
            return True

        if parsed.path == "/api/debug":
            json_response(self, build_debug_snapshot())
            return True

        if parsed.path == "/api/user-performance":
            json_response(self, compute_user_performance())
            return True

        if parsed.path == "/api/gsheet/connections":
            json_response(self, {"connections": list_gsheet_connections()})
            return True

        return False

    def _handle_api_post(self, parsed) -> bool:
        if parsed.path == "/api/upload":
            try:
                payload = read_json_body(self)
                files = payload.get("files", [])
                if not isinstance(files, list) or not files:
                    raise ValueError("Request must include files[]")

                uploaded = []
                for item in files:
                    if not isinstance(item, dict):
                        continue
                    name = str(item.get("name", "")).strip()
                    content_b64 = item.get("contentBase64")
                    if not name or not content_b64:
                        continue
                    binary = base64.b64decode(content_b64)
                    uploaded.append(ingest_file(name, binary))

                json_response(self, {"uploaded": uploaded, "sources": list_sources()})
                return True
            except Exception as exc:
                json_response(
                    self,
                    {"error": str(exc)},
                    status=HTTPStatus.BAD_REQUEST,
                )
                return True

        if parsed.path == "/api/gsheet/connect":
            try:
                payload = read_json_body(self)
                url = str(payload.get("url", "")).strip()
                if not url:
                    raise ValueError(
                        "Request must include a 'url' field with the Google Sheet URL."
                    )
                result = connect_gsheet(url)
                json_response(
                    self,
                    {
                        "connected": result,
                        "connections": list_gsheet_connections(),
                        "sources": list_sources(),
                    },
                )
                return True
            except Exception as exc:
                json_response(
                    self,
                    {"error": str(exc)},
                    status=HTTPStatus.BAD_REQUEST,
                )
                return True

        if parsed.path == "/api/gsheet/sync":
            try:
                results = sync_all_gsheets()
                json_response(
                    self,
                    {
                        "synced": results,
                        "sources": list_sources(),
                        "connections": list_gsheet_connections(),
                    },
                )
                return True
            except Exception as exc:
                json_response(
                    self,
                    {"error": str(exc)},
                    status=HTTPStatus.BAD_REQUEST,
                )
                return True

        return False

    def _handle_api_delete(self, parsed) -> bool:
        if parsed.path.startswith("/api/sources/"):
            source_id = unquote(parsed.path.replace("/api/sources/", "", 1)).strip()
            if not source_id:
                json_response(self, {"error": "Missing source id"}, status=400)
                return True
            delete_source(source_id)
            json_response(self, {"ok": True, "sources": list_sources()})
            return True
        if parsed.path.startswith("/api/gsheet/"):
            connection_id = unquote(parsed.path.replace("/api/gsheet/", "", 1)).strip()
            if not connection_id:
                json_response(self, {"error": "Missing connection id"}, status=400)
                return True
            disconnect_gsheet(connection_id)
            json_response(
                self,
                {
                    "ok": True,
                    "connections": list_gsheet_connections(),
                    "sources": list_sources(),
                },
            )
            return True
        return False

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/"):
            if self._handle_api_get(parsed):
                return
            json_response(self, {"error": "Not found"}, status=404)
            return
        super().do_GET()

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/"):
            if self._handle_api_post(parsed):
                return
            json_response(self, {"error": "Not found"}, status=404)
            return
        json_response(self, {"error": "Not found"}, status=404)

    def do_DELETE(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/"):
            if self._handle_api_delete(parsed):
                return
            json_response(self, {"error": "Not found"}, status=404)
            return
        json_response(self, {"error": "Not found"}, status=404)


def run_server(port: int) -> None:
    init_db()
    handler = DashboardHandler
    server = ThreadingHTTPServer(("0.0.0.0", port), handler)
    print(f"Dashboard server running at http://localhost:{port}")
    print(f"SQLite database: {DB_PATH}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
    finally:
        server.server_close()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Dashboard local server with SQLite backend"
    )
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    run_server(args.port)


if __name__ == "__main__":
    main()

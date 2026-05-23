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
APP_VERSION = "2026-05-22-debug-2"
SERVER_STARTED_AT = dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"

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
    14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 30, 36, 45, 46, 47, 50, 57,
}

FIELD_ALIASES = {
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
        "actiontype",
        "detail",
        "description",
        "changetype",
        "statementtype",
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


def status_bucket(status: str | None) -> str:
    token = normalize_text(status)
    if token in PENDING_REREVIEW_STATUSES:
        return "pending_rereview"
    if token in PENDING_REVIEW_STATUSES:
        return "pending_review"
    if token in IN_REVIEW_STATUSES:
        return "in_review"
    if token in COMPLETED_STATUSES:
        return "completed"

    if "pendingrereview" in token:
        return "pending_rereview"
    if "pendingreview" in token:
        return "pending_review"
    if "inreview" in token:
        return "in_review"
    if "complete" in token:
        return "completed"
    return "other"


def looks_like_workflow_status(value: str | None) -> bool:
    token = normalize_text(value)
    if not token:
        return False
    return (
        "pendingreview" in token
        or "pendingrereview" in token
        or "inreview" in token
        or "complete" in token
    )


def normalize_workflow_status(value: str | None) -> str:
    text = str(value).strip() if value is not None else ""
    if not text:
        return ""
    return text if looks_like_workflow_status(text) else ""


def is_upload_status(value: str | None) -> bool:
    token = normalize_text(value)
    return bool(token) and "upload" in token


def infer_actor_type(actor_type: str | None, actor_name: str | None) -> str:
    joined = f"{actor_type or ''} {actor_name or ''}".lower()
    if "system" in joined or "ai " in joined or joined.startswith("ai"):
        return "system"
    if "user" in joined or "cognize" in joined or "moodys" in joined:
        return "user"
    if (actor_name or "").strip():
        # In most audit files, non-system named actors are human users.
        return "user"
    return "unknown"


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
            is_date_style = any(token in hint for token in ("date", "time", "timestamp"))
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
        text_cells = [v for v in non_empty if isinstance(v, str) and not str(v).strip().isdigit()]
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
            rel_id = sheet.attrib.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id")
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
            headers = {col_idx: str(value).strip() for col_idx, value in header_values.items()}
            headers = dedupe_headers(headers)

            page_rows: list[dict] = []
            for row_num, row_values in parsed_rows[header_row_index + 1:]:
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
        raise ValueError("Unsupported .xls format. Please save as .xlsx and upload again.")
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
            page_names = [name.strip() for name in row["page_names"].split("|") if name.strip()]
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


def build_canonical_map(row: dict) -> dict[str, object]:
    result: dict[str, object] = {}
    for key, value in row.items():
        result[normalize_key(str(key))] = value
    return result


def pick_field(row: dict, aliases: set[str]):
    canonical = build_canonical_map(row)
    for alias in aliases:
        if alias in canonical:
            return canonical[alias]
    return None


def fetch_normalized_events() -> list[dict]:
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT source_id, file_name, page_name, row_number, data_json
            FROM unified_rows
            ORDER BY file_name ASC, page_name ASC, row_number DESC
            """
        ).fetchall()

    events = []
    for db_row in rows:
        try:
            raw = json.loads(db_row["data_json"])
        except json.JSONDecodeError:
            raw = {}

        event_time_raw = pick_field(raw, FIELD_ALIASES["event_time"])
        event_time = parse_datetime(event_time_raw)
        if not event_time:
            continue

        actor_type_raw = pick_field(raw, FIELD_ALIASES["actor_type"])
        actor_name_raw = pick_field(raw, FIELD_ALIASES["actor_name"])
        from_status_raw = pick_field(raw, FIELD_ALIASES["from_status"])
        to_status_raw = pick_field(raw, FIELD_ALIASES["to_status"])
        document_id = pick_field(raw, FIELD_ALIASES["document_id"])
        action_type_raw = pick_field(raw, FIELD_ALIASES["action_type"])
        submitted_for_reanalysis = parse_bool(
            pick_field(raw, FIELD_ALIASES["submitted_for_reanalysis"])
        )
        auto_closed = parse_bool(pick_field(raw, FIELD_ALIASES["auto_closed"]))
        timeout_minutes = parse_int(pick_field(raw, FIELD_ALIASES["timeout_minutes"]))

        actor_name = str(actor_name_raw).strip() if actor_name_raw is not None else ""
        actor_type = infer_actor_type(
            str(actor_type_raw).strip() if actor_type_raw is not None else "",
            actor_name,
        )
        doc_id = (
            str(document_id).strip()
            if document_id is not None and str(document_id).strip()
            else f"{db_row['file_name']}::{db_row['page_name']}"
        )
        action_type = str(action_type_raw).strip() if action_type_raw is not None else ""

        from_status_text = str(from_status_raw).strip() if from_status_raw is not None else ""
        to_status_text = str(to_status_raw).strip() if to_status_raw is not None else ""

        is_spread_status_row = "status" in normalize_text(action_type)
        from_status = normalize_workflow_status(from_status_text)
        to_status = normalize_workflow_status(to_status_text)

        # Keep status boundaries only for workflow transitions.
        if is_spread_status_row and not from_status and looks_like_workflow_status(from_status_text):
            from_status = from_status_text
        if is_spread_status_row and not to_status and looks_like_workflow_status(to_status_text):
            to_status = to_status_text

        events.append(
            {
                "source_id": db_row["source_id"],
                "file_name": db_row["file_name"],
                "page_name": db_row["page_name"],
                "row_number": db_row["row_number"],
                "event_time": event_time,
                "actor_name": actor_name or "Unknown User",
                "actor_type": actor_type,
                "from_status": from_status,
                "to_status": to_status,
                "from_status_raw": from_status_text,
                "to_status_raw": to_status_text,
                "document_id": doc_id,
                "action_type": action_type,
                "submitted_for_reanalysis": submitted_for_reanalysis,
                "auto_closed": auto_closed,
                "timeout_minutes": timeout_minutes,
                "raw": raw,
            }
        )
    return events


def compute_user_performance() -> dict:
    events = fetch_normalized_events()
    if not events:
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
            },
            "summary": {"files": 0, "pages": 0, "rows": 0},
            "contribution": [],
            "flow": [],
            "matrix": [],
            "segments": [],
        }

    source_summary = {"files": 0, "pages": 0, "rows": 0}
    with get_conn() as conn:
        row = conn.execute(
            "SELECT COUNT(*) AS files, COALESCE(SUM(total_pages),0) AS pages, COALESCE(SUM(total_rows),0) AS rows FROM source_files"
        ).fetchone()
        source_summary = {
            "files": row["files"] if row else 0,
            "pages": row["pages"] if row else 0,
            "rows": row["rows"] if row else 0,
        }

    grouped: dict[str, list[dict]] = defaultdict(list)
    for event in events:
        grouped[event["document_id"]].append(event)

    segments: list[dict] = []
    transitions: dict[str, list[float]] = defaultdict(lambda: [0.0, 0.0])  # duration_sum, count
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

    total_active_user_seconds = 0.0
    total_idle_waiting_seconds = 0.0
    total_scheduled_wait_seconds = 0.0
    total_reprocess_cycle_elapsed_seconds = 0.0
    idle_waiting_occurrences = 0
    auto_timeout_count = 0
    total_user_sessions = 0
    total_rework_sessions = 0
    users_involved: set[str] = set()

    for _, doc_events in grouped.items():
        ordered = sorted(
            doc_events,
            key=lambda e: (e["event_time"], -int(e["row_number"])),
        )

        for idx, current in enumerate(ordered):
            if current["actor_type"] != "user":
                continue
            if not is_upload_status(current.get("to_status_raw")):
                continue
            if idx >= len(ordered) - 1:
                continue
            next_event = ordered[idx + 1]
            start = current["event_time"]
            end = next_event["event_time"]
            duration_seconds = (end - start).total_seconds()
            if duration_seconds <= 0:
                continue

            user_name = current["actor_name"] or "Unknown User"
            segments.append(
                {
                    "segmentType": "USER_UPLOADING",
                    "start": start.isoformat(),
                    "end": end.isoformat(),
                    "durationSeconds": duration_seconds,
                    "effectiveDurationSeconds": duration_seconds,
                    "documentId": current["document_id"],
                    "userName": user_name,
                    "fileName": current["file_name"],
                    "pageName": current["page_name"],
                    "autoTimeout": False,
                }
            )

            users_involved.add(user_name)
            total_active_user_seconds += duration_seconds
            stats = user_stats[user_name]
            stats["upload_seconds"] += duration_seconds
            stats["total_effective_seconds"] += duration_seconds
            stats["total_observed_seconds"] += duration_seconds
            stats["documents"].add(current["document_id"])

        status_indices = [idx for idx, ev in enumerate(ordered) if ev["to_status"]]
        if len(status_indices) < 2:
            continue

        for pos in range(len(status_indices) - 1):
            current_idx = status_indices[pos]
            next_idx = status_indices[pos + 1]
            current = ordered[current_idx]
            next_event = ordered[next_idx]
            start = current["event_time"]
            end = next_event["event_time"]
            duration_seconds = (end - start).total_seconds()
            if duration_seconds <= 0:
                continue

            current_bucket = status_bucket(current["to_status"])
            next_bucket = status_bucket(next_event["to_status"])
            transition_key = f"{current['to_status']} -> {next_event['to_status']}"
            transitions[transition_key][0] += duration_seconds
            transitions[transition_key][1] += 1

            inner_events = ordered[current_idx + 1: next_idx]

            if current_bucket in {"pending_review", "pending_rereview"}:
                idle_waiting_occurrences += 1
                first_system_detail = None
                for candidate in inner_events:
                    if candidate["actor_type"] == "system":
                        first_system_detail = candidate
                        break

                if first_system_detail and first_system_detail["event_time"] > start:
                    queue_seconds = (first_system_detail["event_time"] - start).total_seconds()
                    system_seconds = (end - first_system_detail["event_time"]).total_seconds()
                    if queue_seconds > 0:
                        segments.append(
                            {
                                "segmentType": "IDLE_WAITING_FOR_SCHEDULED_REPROCESS",
                                "start": start.isoformat(),
                                "end": first_system_detail["event_time"].isoformat(),
                                "durationSeconds": queue_seconds,
                                "documentId": current["document_id"],
                                "userName": current["actor_name"],
                                "fileName": current["file_name"],
                                "pageName": current["page_name"],
                            }
                        )
                        total_scheduled_wait_seconds += queue_seconds
                    if system_seconds > 0:
                        segments.append(
                            {
                                "segmentType": "SYSTEM_SCHEDULED_REPROCESSING_ROUND_2",
                                "start": first_system_detail["event_time"].isoformat(),
                                "end": end.isoformat(),
                                "durationSeconds": system_seconds,
                                "documentId": current["document_id"],
                                "userName": "System",
                                "fileName": current["file_name"],
                                "pageName": current["page_name"],
                            }
                        )
                    total_reprocess_cycle_elapsed_seconds += duration_seconds
                else:
                    if current_bucket == "pending_review":
                        segment_type = "IDLE_WAITING_FOR_REVIEW"
                    else:
                        segment_type = "IDLE_WAITING_FOR_REREVIEW"
                    segments.append(
                        {
                            "segmentType": segment_type,
                            "start": start.isoformat(),
                            "end": end.isoformat(),
                            "durationSeconds": duration_seconds,
                            "documentId": current["document_id"],
                            "userName": current["actor_name"],
                            "fileName": current["file_name"],
                            "pageName": current["page_name"],
                        }
                    )
                    total_idle_waiting_seconds += duration_seconds
                continue

            if current_bucket == "in_review" and current["actor_type"] == "user":
                user_name = current["actor_name"] or "Unknown User"
                timeout_seconds = DEFAULT_TIMEOUT_SECONDS
                timeout_minutes = current.get("timeout_minutes")
                if timeout_minutes and timeout_minutes > 0:
                    timeout_seconds = timeout_minutes * 60

                segment_type = "USER_REVIEW_COMMENT_CHECK"
                is_rework = False
                is_auto_timeout = False

                if next_bucket == "pending_rereview" or current["submitted_for_reanalysis"] or next_event["submitted_for_reanalysis"]:
                    segment_type = "USER_EDITING_CORRECTION"
                    is_rework = True
                elif next_bucket == "completed":
                    segment_type = "USER_COMPLETION_APPROVAL"

                if next_event["actor_type"] == "system" and next_bucket in {"pending_review", "pending_rereview"}:
                    segment_type = "USER_REVIEW_AUTO_TIMEOUT"
                    is_auto_timeout = True
                    auto_timeout_count += 1

                effective_seconds = duration_seconds
                if is_auto_timeout:
                    effective_seconds = min(duration_seconds, timeout_seconds)

                segments.append(
                    {
                        "segmentType": segment_type,
                        "start": start.isoformat(),
                        "end": end.isoformat(),
                        "durationSeconds": duration_seconds,
                        "effectiveDurationSeconds": effective_seconds,
                        "documentId": current["document_id"],
                        "userName": user_name,
                        "fileName": current["file_name"],
                        "pageName": current["page_name"],
                        "autoTimeout": is_auto_timeout,
                    }
                )

                users_involved.add(user_name)
                total_user_sessions += 1
                total_active_user_seconds += effective_seconds

                stats = user_stats[user_name]
                stats["sessions"] += 1
                stats["total_effective_seconds"] += effective_seconds
                stats["total_observed_seconds"] += duration_seconds
                stats["documents"].add(current["document_id"])
                if segment_type in {"USER_REVIEW_COMMENT_CHECK", "USER_REVIEW_AUTO_TIMEOUT"}:
                    stats["review_seconds"] += effective_seconds
                elif segment_type == "USER_EDITING_CORRECTION":
                    stats["edit_seconds"] += effective_seconds
                elif segment_type == "USER_COMPLETION_APPROVAL":
                    stats["complete_seconds"] += effective_seconds

                if is_rework:
                    total_rework_sessions += 1
                    stats["rework_sessions"] += 1
                if is_auto_timeout:
                    stats["auto_timeout_sessions"] += 1
                continue

            # Marker for reopen path (not active workload)
            if current_bucket == "completed" and next_bucket == "pending_rereview":
                segments.append(
                    {
                        "segmentType": "REOPEN_MARKER",
                        "start": start.isoformat(),
                        "end": end.isoformat(),
                        "durationSeconds": duration_seconds,
                        "documentId": current["document_id"],
                        "userName": current["actor_name"],
                        "fileName": current["file_name"],
                        "pageName": current["page_name"],
                    }
                )

    avg_user_session_seconds = (
        total_active_user_seconds / total_user_sessions if total_user_sessions > 0 else 0.0
    )
    rework_rate = total_rework_sessions / total_user_sessions if total_user_sessions > 0 else 0.0

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
    contribution_rows.sort(key=lambda row: row["totalSeconds"], reverse=True)

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
    flow_rows.sort(key=lambda row: row["avgSeconds"], reverse=True)

    matrix_rows = []
    for user_name, stats in user_stats.items():
        sessions = stats["sessions"] or 1
        docs_count = len(stats["documents"]) or 1
        avg_time_per_doc = stats["total_effective_seconds"] / docs_count
        matrix_rows.append(
            {
                "user": user_name,
                "avgTimePerDocSeconds": avg_time_per_doc,
                "reworkRate": stats["rework_sessions"] / sessions,
                "autoClosedRate": stats["auto_timeout_sessions"] / sessions,
                "totalActiveSeconds": stats["total_effective_seconds"],
                "documents": len(stats["documents"]),
                "sessionCount": stats["sessions"],
            }
        )
    matrix_rows.sort(key=lambda row: row["totalActiveSeconds"], reverse=True)

    return {
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
            "reprocessCycleElapsedDisplay": format_duration(total_reprocess_cycle_elapsed_seconds),
        },
        "summary": source_summary,
        "contribution": contribution_rows,
        "flow": flow_rows[:12],
        "matrix": matrix_rows,
        "segments": segments[:1200],
    }


def _counter_to_rows(counter: Counter, limit: int = 10) -> list[dict]:
    return [{"value": str(key), "count": int(count)} for key, count in counter.most_common(limit)]


def build_debug_snapshot() -> dict:
    with get_conn() as conn:
        source_row = conn.execute(
            "SELECT COUNT(*) AS files, COALESCE(SUM(total_pages),0) AS pages, COALESCE(SUM(total_rows),0) AS rows FROM source_files"
        ).fetchone()
        unified_count_row = conn.execute("SELECT COUNT(*) AS c FROM unified_rows").fetchone()
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

        if idx < 3:
            sample_keys.append(
                {
                    "fileName": row["file_name"],
                    "pageName": row["page_name"],
                    "rowNumber": row["row_number"],
                    "keys": list(raw.keys())[:30],
                }
            )

        event_time_raw = pick_field(raw, FIELD_ALIASES["event_time"])
        if parse_datetime(event_time_raw):
            parse_stats["rowsWithEventTime"] += 1

        action_type = str(pick_field(raw, FIELD_ALIASES["action_type"]) or "").strip()
        if action_type:
            action_counter[action_type] += 1
        if "status" in normalize_text(action_type):
            parse_stats["rowsWithSpreadStatusChangeType"] += 1

        from_status = str(pick_field(raw, FIELD_ALIASES["from_status"]) or "").strip()
        to_status = str(pick_field(raw, FIELD_ALIASES["to_status"]) or "").strip()
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


def json_response(handler: SimpleHTTPRequestHandler, payload: dict, status: int = 200) -> None:
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
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
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
                    "appFileMtime": dt.datetime.fromtimestamp(Path(__file__).stat().st_mtime).isoformat(),
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
    parser = argparse.ArgumentParser(description="Dashboard local server with SQLite backend")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    run_server(args.port)


if __name__ == "__main__":
    main()

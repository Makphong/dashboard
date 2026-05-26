from __future__ import annotations

import datetime as dt
import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[3]
ROOT = PROJECT_ROOT
DATA_DIR = PROJECT_ROOT / "data"
LEGACY_DB_PATH = PROJECT_ROOT / "local_dashboard.db"
DEFAULT_DB_PATH = DATA_DIR / "local_dashboard.db"
DB_PATH = Path(
    os.getenv(
        "LOCAL_DB_PATH",
        str(DEFAULT_DB_PATH if DEFAULT_DB_PATH.exists() else LEGACY_DB_PATH),
    )
)
DEFAULT_TIMEOUT_SECONDS = 30 * 60
APP_VERSION = "2026-05-24-perf-1"
SERVER_STARTED_AT = dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
ALGORITHM_VERSION = (
    "1.3_RAW_3_TIME_GROUP_EDIT_COMPLETED_SAME_TIMESTAMP_HANDOFF_PROCESSING_BACKFILL_1"
)

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


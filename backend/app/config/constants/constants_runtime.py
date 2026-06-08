from __future__ import annotations

import datetime as dt

DEFAULT_TIMEOUT_SECONDS = 30 * 60
APP_VERSION = "2026-05-24-perf-1"
SERVER_STARTED_AT = dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
ALGORITHM_VERSION = (
    "1.6_SPLIT_EDIT_DATA_AND_METADATA"
)

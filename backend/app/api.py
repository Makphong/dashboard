from __future__ import annotations

import base64
import binascii
import hmac
import os
from http import HTTPStatus
from pathlib import Path, PurePosixPath

from flask import Flask, jsonify, request, send_from_directory

from . import core

PROJECT_ROOT = core.PROJECT_ROOT
WRITE_TOKEN_ENV_NAME = "DASHBOARD_WRITE_TOKEN"
MAX_UPLOAD_REQUEST_BODY_BYTES = 40 * 1024 * 1024
MAX_UPLOAD_TOTAL_DECODED_BYTES = 25 * 1024 * 1024
MAX_UPLOAD_FILE_BYTES = 10 * 1024 * 1024
MAX_UPLOAD_FILES = 10
UPLOAD_ALLOWED_EXTENSIONS = {".csv", ".xlsx"}
ROOT_STATIC_ALLOWLIST = {"favicon.ico", "robots.txt", "manifest.webmanifest", "Krungthai.ttf", "Krungthai-Bold.ttf"}
FRONTEND_STATIC_PREFIX = "frontend/src/"
FRONTEND_STATIC_EXTENSIONS = {".js", ".jsx", ".mjs", ".css", ".json", ".map"}


class RequestLimitError(ValueError):
    """Raised when request size exceeds configured limits."""


def _int_env(name: str, default_value: int) -> int:
    raw_value = os.getenv(name, "").strip()
    if not raw_value:
        return default_value
    try:
        parsed = int(raw_value)
    except ValueError:
        return default_value
    return parsed if parsed > 0 else default_value


def _configured_write_token() -> str:
    return os.getenv(WRITE_TOKEN_ENV_NAME, "").strip()


def _extract_write_token_from_request() -> str:
    authorization = request.headers.get("Authorization", "").strip()
    if authorization.lower().startswith("bearer "):
        return authorization[7:].strip()
    return (
        request.headers.get("X-Write-Token", "").strip()
        or request.headers.get("X-API-Key", "").strip()
    )


def _require_write_auth():
    expected_token = _configured_write_token()
    if not expected_token:
        return None

    provided_token = _extract_write_token_from_request()
    if provided_token and hmac.compare_digest(provided_token, expected_token):
        return None

    return (
        jsonify(
            {
                "error": (
                    "Unauthorized write request. Provide Authorization: Bearer <token> "
                    "or X-Write-Token header."
                )
            }
        ),
        HTTPStatus.UNAUTHORIZED,
    )


def _normalize_relative_url_path(url_path: str) -> str | None:
    if not isinstance(url_path, str):
        return None

    normalized = PurePosixPath(url_path.strip().lstrip("/")).as_posix()
    if not normalized:
        return None

    path_parts = PurePosixPath(normalized).parts
    if any(part in ("", ".", "..") for part in path_parts):
        return None
    if "\\" in normalized or ":" in normalized:
        return None

    return normalized


def _is_allowed_static_path(normalized_path: str) -> bool:
    if normalized_path in ROOT_STATIC_ALLOWLIST:
        return True
    if normalized_path.startswith(FRONTEND_STATIC_PREFIX):
        suffix = Path(normalized_path).suffix.lower()
        return suffix in FRONTEND_STATIC_EXTENSIONS
    return False


def _resolve_static_file(url_path: str) -> Path | None:
    normalized_path = _normalize_relative_url_path(url_path)
    if not normalized_path or not _is_allowed_static_path(normalized_path):
        return None

    candidate = (PROJECT_ROOT / normalized_path).resolve()
    try:
        candidate.relative_to(PROJECT_ROOT)
    except ValueError:
        return None

    return candidate if candidate.is_file() else None


def _serve_static_file(url_path: str):
    static_file = _resolve_static_file(url_path)
    if static_file is None:
        return None

    mimetype = (
        "application/javascript"
        if static_file.suffix.lower() in {".js", ".jsx", ".mjs"}
        else None
    )
    return send_from_directory(static_file.parent, static_file.name, mimetype=mimetype)


def _validate_upload_payload(
    payload: object,
    *,
    max_files: int,
    max_file_bytes: int,
    max_total_bytes: int,
) -> list[tuple[str, bytes]]:
    if not isinstance(payload, dict):
        raise ValueError("Request body must be a JSON object.")

    files = payload.get("files")
    if not isinstance(files, list) or not files:
        raise ValueError("Request must include files[].")
    if len(files) > max_files:
        raise RequestLimitError(f"Too many files. Maximum is {max_files}.")

    decoded_files: list[tuple[str, bytes]] = []
    total_decoded_bytes = 0
    for index, item in enumerate(files):
        if not isinstance(item, dict):
            raise ValueError(f"files[{index}] must be an object.")

        name = str(item.get("name", "")).strip()
        content_base64 = item.get("contentBase64")
        if not name or not isinstance(content_base64, str) or not content_base64.strip():
            raise ValueError(f"files[{index}] must include 'name' and 'contentBase64'.")

        suffix = Path(name).suffix.lower()
        if suffix not in UPLOAD_ALLOWED_EXTENSIONS:
            allowed_suffixes = ", ".join(sorted(UPLOAD_ALLOWED_EXTENSIONS))
            raise ValueError(
                f"files[{index}] has unsupported extension '{suffix}'. Allowed: {allowed_suffixes}."
            )

        try:
            binary = base64.b64decode(content_base64, validate=True)
        except (binascii.Error, ValueError):
            raise ValueError(f"files[{index}] has invalid base64 content.") from None

        if not binary:
            raise ValueError(f"files[{index}] is empty after decode.")
        if len(binary) > max_file_bytes:
            raise RequestLimitError(
                f"files[{index}] exceeds max file size ({max_file_bytes} bytes)."
            )

        total_decoded_bytes += len(binary)
        if total_decoded_bytes > max_total_bytes:
            raise RequestLimitError(
                f"Decoded payload exceeds max total size ({max_total_bytes} bytes)."
            )

        decoded_files.append((name, binary))

    return decoded_files


def create_app() -> Flask:
    app = Flask(__name__, static_folder=None)
    core.init_db()

    max_upload_request_body_bytes = _int_env(
        "DASHBOARD_MAX_UPLOAD_REQUEST_BODY_BYTES", MAX_UPLOAD_REQUEST_BODY_BYTES
    )
    max_upload_total_decoded_bytes = _int_env(
        "DASHBOARD_MAX_UPLOAD_TOTAL_DECODED_BYTES", MAX_UPLOAD_TOTAL_DECODED_BYTES
    )
    max_upload_file_bytes = _int_env("DASHBOARD_MAX_UPLOAD_FILE_BYTES", MAX_UPLOAD_FILE_BYTES)
    max_upload_files = _int_env("DASHBOARD_MAX_UPLOAD_FILES", MAX_UPLOAD_FILES)

    @app.after_request
    def add_no_cache_headers(response):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response

    @app.get("/api/health")
    def api_health():
        return jsonify(core.build_health_payload())

    @app.get("/api/sources")
    def api_sources():
        return jsonify(core.api_sources_payload())

    @app.get("/api/debug")
    def api_debug():
        return jsonify(core.build_debug_snapshot())

    @app.get("/api/user-performance")
    def api_user_performance():
        return jsonify(core.compute_user_performance())

    @app.get("/api/gsheet/connections")
    def api_gsheet_connections():
        return jsonify(core.api_gsheet_connections_payload())

    @app.post("/api/upload")
    def api_upload():
        auth_error = _require_write_auth()
        if auth_error is not None:
            return auth_error

        try:
            content_length = request.content_length or 0
            if content_length > max_upload_request_body_bytes:
                raise RequestLimitError(
                    f"Request body exceeds limit ({max_upload_request_body_bytes} bytes)."
                )

            payload = request.get_json(silent=True)
            files = _validate_upload_payload(
                payload,
                max_files=max_upload_files,
                max_file_bytes=max_upload_file_bytes,
                max_total_bytes=max_upload_total_decoded_bytes,
            )

            return jsonify(core.api_upload_payload(files))
        except RequestLimitError as exc:
            return jsonify({"error": str(exc)}), HTTPStatus.REQUEST_ENTITY_TOO_LARGE
        except Exception as exc:  # pragma: no cover - runtime path
            return jsonify({"error": str(exc)}), HTTPStatus.BAD_REQUEST

    @app.post("/api/gsheet/connect")
    def api_gsheet_connect():
        auth_error = _require_write_auth()
        if auth_error is not None:
            return auth_error

        try:
            payload = request.get_json(silent=True) or {}
            url = str(payload.get("url", "")).strip()
            if not url:
                raise ValueError(
                    "Request must include a 'url' field with the Google Sheet URL."
                )
            return jsonify(core.api_connect_gsheet_payload(url))
        except Exception as exc:  # pragma: no cover - runtime path
            return jsonify({"error": str(exc)}), HTTPStatus.BAD_REQUEST

    @app.post("/api/gsheet/sync")
    def api_gsheet_sync():
        auth_error = _require_write_auth()
        if auth_error is not None:
            return auth_error

        try:
            return jsonify(core.api_sync_gsheet_payload())
        except Exception as exc:  # pragma: no cover - runtime path
            return jsonify({"error": str(exc)}), HTTPStatus.BAD_REQUEST

    @app.delete("/api/sources/<path:source_id>")
    def api_source_delete(source_id: str):
        auth_error = _require_write_auth()
        if auth_error is not None:
            return auth_error

        source_id = source_id.strip()
        if not source_id:
            return jsonify({"error": "Missing source id"}), HTTPStatus.BAD_REQUEST
        return jsonify(core.api_delete_source_payload(source_id))

    @app.delete("/api/gsheet/<path:connection_id>")
    def api_gsheet_delete(connection_id: str):
        auth_error = _require_write_auth()
        if auth_error is not None:
            return auth_error

        connection_id = connection_id.strip()
        if not connection_id:
            return jsonify({"error": "Missing connection id"}), HTTPStatus.BAD_REQUEST
        return jsonify(core.api_delete_gsheet_payload(connection_id))

    @app.get("/")
    def web_index():
        return send_from_directory(PROJECT_ROOT, "index.html")

    @app.get("/frontend/src/app.jsx")
    def serve_app_jsx():
        # Fail-Safe Auto-bundler for Phase 3 (No Node.js)
        src_dir = PROJECT_ROOT / "frontend" / "src"
        
        files_to_bundle = [
            "lib/constants.js",
            "lib/numberUtils.js", "lib/durationFormatters.js", "lib/dateFormatters.js",
            "lib/excelExport.js", "lib/segmentUtils.js", "lib/kpiUtils.js",
            "lib/api.js", "hooks/usePersistentState.js",
            "hooks/useDashboardData.js", "hooks/useAppController.js",
            "components/shared/KpiSubtext.jsx", "components/shared/Sidebar.jsx",
            "components/shared/FilterPopover.jsx", "components/shared/DropdownSearch.jsx",
            "components/shared/EmptyState.jsx", 
            "features/dashboard/FilterBar.jsx",
            "features/timeline/timelineUtils.js",
            "features/timeline/ganttLayoutUtils.js",
            "features/timeline/GanttTimelineParts.jsx",
            "features/timeline/GanttTimelineChart.jsx",
            "features/charts/DurationBarChart.jsx", "features/charts/SystemProcessingTrendChart.jsx",
            "features/charts/SystemParetoChart.jsx", "features/charts/SystemBottleneckTable.jsx",
            "features/charts/FlowDelayComparisonTable.jsx", "features/charts/DonutWorkloadChart.jsx",
            "features/charts/UserContributionStackChart.jsx", "features/charts/ReworkMatrixScatterChart.jsx",
            "features/charts/ProcessTimeBreakdownChart.jsx",
            "features/data-management/DataManagementView.jsx",
            "features/dashboard/DashboardLayout.jsx", "features/dashboard/DashboardView.jsx",
            "features/dashboard/views/SystemPerformanceView.jsx",
            "features/dashboard/components/ExpandedVisualizationModal.jsx",
            "features/dashboard/components/ExportConfirmModal.jsx",
            "features/dashboard/components/SegmentDetailPopup.jsx",
            "app.jsx"
        ]
        
        import re
        # Match any import statement including multi-line
        import_pattern = re.compile(r'^import\s+.*?\s+from\s+[\'"].*?[\'"];?', re.DOTALL | re.MULTILINE)
        
        bundle_body = []
        for rel_path in files_to_bundle:
            file_path = src_dir / rel_path
            if not file_path.exists(): continue
            
            content = file_path.read_text(encoding="utf-8")
            
            # Remove all import statements
            clean_content = import_pattern.sub("", content)
            
            # Process remaining lines for exports
            lines = clean_content.splitlines()
            processed_lines = []
            for line in lines:
                stripped = line.strip()
                if stripped.startswith("export "):
                    if stripped.startswith("export default "): continue
                    line = line.replace("export ", "", 1)
                processed_lines.append(line)
            
            bundle_body.append(f"// --- {rel_path} ---")
            bundle_body.extend(processed_lines)
            bundle_body.append("\n")
            
        # Hardcoded Global Import Header (Ensures no duplicates and correct symbols)
        header = [
            "// AUTO-GENERATED FAIL-SAFE BUNDLE",
            "import React, { useState, useEffect, useMemo, useRef, useLayoutEffect, useCallback } from 'react';",
            "import { createRoot } from 'react-dom/client';",
            "import { createPortal } from 'react-dom';",
            "import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList, ResponsiveContainer } from 'recharts';",
            "import { ",
            "  Users, Server, Clock, Timer, RefreshCw, AlertTriangle, Star, Search, ",
            "  Calendar, LayoutDashboard, Menu, X, ChevronLeft, ChevronRight, Database, ",
            "  UploadCloud, Link2, FileText, FileSpreadsheet, Trash2, CheckCircle2, ",
            "  Plus, Maximize2, SlidersHorizontal, Eye, EyeOff, ChevronDown, User",
            "} from 'lucide-react';",
            "\n"
        ]
        
        final_content = header + bundle_body
        return "\n".join(final_content), 200, {"Content-Type": "application/javascript"}

    @app.get("/frontend/src/<path:filename>")
    def web_frontend_src(filename: str):
        static_response = _serve_static_file(f"frontend/src/{filename}")
        if static_response is None:
            return jsonify({"error": "Not found"}), HTTPStatus.NOT_FOUND
        return static_response

    @app.get("/<path:filename>")
    def web_static(filename: str):
        head_segment = filename.split("/", 1)[0].lower()
        if head_segment == "api":
            return jsonify({"error": "Not found"}), HTTPStatus.NOT_FOUND

        static_response = _serve_static_file(filename)
        if static_response is not None:
            return static_response

        if "." in Path(filename).name:
            return jsonify({"error": "Not found"}), HTTPStatus.NOT_FOUND

        return send_from_directory(PROJECT_ROOT, "index.html")

    return app


app = create_app()

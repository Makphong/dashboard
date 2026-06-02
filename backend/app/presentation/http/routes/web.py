from __future__ import annotations

from http import HTTPStatus
from pathlib import Path

from flask import Blueprint, current_app, jsonify, send_from_directory

from ....application import dashboard_service
from ....infrastructure.frontend_bundle import (
    build_frontend_bundle,
    get_frontend_bundle_version,
)
from ....infrastructure.static_files import serve_static_file

web_bp = Blueprint("web", __name__)
FRONTEND_BUILD_VERSION_PLACEHOLDER = "__FRONTEND_BUILD_VERSION__"


@web_bp.get("/")
def web_index():
    project_root = dashboard_service.PROJECT_ROOT
    index_path = project_root / "frontend" / "public" / "index.html"
    html = index_path.read_text(encoding="utf-8")
    build_version = get_frontend_bundle_version(project_root)
    return html.replace(FRONTEND_BUILD_VERSION_PLACEHOLDER, build_version), 200, {
        "Content-Type": "text/html; charset=utf-8",
    }


@web_bp.get("/frontend/src/app.jsx")
def serve_app_jsx():
    cache = current_app.extensions.setdefault(
        "frontend_bundle_cache",
        {"signature": None, "content": None},
    )
    content, cache_status = build_frontend_bundle(dashboard_service.PROJECT_ROOT, cache)
    return content, 200, {
        "Content-Type": "application/javascript",
        "X-Frontend-Bundle-Cache": cache_status,
    }


@web_bp.get("/frontend/src/<path:filename>")
def web_frontend_src(filename: str):
    static_response = serve_static_file(
        dashboard_service.PROJECT_ROOT, f"frontend/src/{filename}"
    )
    if static_response is None:
        return jsonify({"error": "Not found"}), HTTPStatus.NOT_FOUND
    return static_response


@web_bp.get("/<path:filename>")
def web_static(filename: str):
    head_segment = filename.split("/", 1)[0].lower()
    if head_segment == "api":
        return jsonify({"error": "Not found"}), HTTPStatus.NOT_FOUND

    static_response = serve_static_file(dashboard_service.PROJECT_ROOT, filename)
    if static_response is not None:
        return static_response

    if "." in Path(filename).name:
        return jsonify({"error": "Not found"}), HTTPStatus.NOT_FOUND

    return send_from_directory(
        dashboard_service.PROJECT_ROOT / "frontend" / "public", "index.html"
    )

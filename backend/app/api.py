from __future__ import annotations

import base64
from http import HTTPStatus
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory

from . import core

PROJECT_ROOT = core.PROJECT_ROOT
FRONTEND_SRC_DIR = PROJECT_ROOT / "frontend" / "src"


def create_app() -> Flask:
    app = Flask(__name__, static_folder=None)
    core.init_db()

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
        return jsonify({"sources": core.list_sources()})

    @app.get("/api/debug")
    def api_debug():
        return jsonify(core.build_debug_snapshot())

    @app.get("/api/user-performance")
    def api_user_performance():
        return jsonify(core.compute_user_performance())

    @app.get("/api/gsheet/connections")
    def api_gsheet_connections():
        return jsonify({"connections": core.list_gsheet_connections()})

    @app.post("/api/upload")
    def api_upload():
        try:
            payload = request.get_json(silent=True) or {}
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
                uploaded.append(core.ingest_file(name, binary))

            return jsonify({"uploaded": uploaded, "sources": core.list_sources()})
        except Exception as exc:  # pragma: no cover - runtime path
            return jsonify({"error": str(exc)}), HTTPStatus.BAD_REQUEST

    @app.post("/api/gsheet/connect")
    def api_gsheet_connect():
        try:
            payload = request.get_json(silent=True) or {}
            url = str(payload.get("url", "")).strip()
            if not url:
                raise ValueError(
                    "Request must include a 'url' field with the Google Sheet URL."
                )
            result = core.connect_gsheet(url)
            return jsonify(
                {
                    "connected": result,
                    "connections": core.list_gsheet_connections(),
                    "sources": core.list_sources(),
                }
            )
        except Exception as exc:  # pragma: no cover - runtime path
            return jsonify({"error": str(exc)}), HTTPStatus.BAD_REQUEST

    @app.post("/api/gsheet/sync")
    def api_gsheet_sync():
        try:
            results = core.sync_all_gsheets()
            return jsonify(
                {
                    "synced": results,
                    "sources": core.list_sources(),
                    "connections": core.list_gsheet_connections(),
                }
            )
        except Exception as exc:  # pragma: no cover - runtime path
            return jsonify({"error": str(exc)}), HTTPStatus.BAD_REQUEST

    @app.delete("/api/sources/<path:source_id>")
    def api_source_delete(source_id: str):
        source_id = source_id.strip()
        if not source_id:
            return jsonify({"error": "Missing source id"}), HTTPStatus.BAD_REQUEST
        core.delete_source(source_id)
        return jsonify({"ok": True, "sources": core.list_sources()})

    @app.delete("/api/gsheet/<path:connection_id>")
    def api_gsheet_delete(connection_id: str):
        connection_id = connection_id.strip()
        if not connection_id:
            return jsonify({"error": "Missing connection id"}), HTTPStatus.BAD_REQUEST
        core.disconnect_gsheet(connection_id)
        return jsonify(
            {
                "ok": True,
                "connections": core.list_gsheet_connections(),
                "sources": core.list_sources(),
            }
        )

    @app.get("/")
    def web_index():
        return send_from_directory(PROJECT_ROOT, "index.html")

    @app.get("/frontend/src/<path:filename>")
    def web_frontend_src(filename: str):
        mimetype = "application/javascript" if filename.endswith(".jsx") else None
        return send_from_directory(FRONTEND_SRC_DIR, filename, mimetype=mimetype)

    @app.get("/<path:filename>")
    def web_static(filename: str):
        if filename.startswith("api/"):
            return jsonify({"error": "Not found"}), HTTPStatus.NOT_FOUND

        target_path = PROJECT_ROOT / filename
        if target_path.is_file():
            parent_dir = target_path.parent
            mimetype = "application/javascript" if target_path.suffix == ".jsx" else None
            return send_from_directory(parent_dir, target_path.name, mimetype=mimetype)

        return send_from_directory(PROJECT_ROOT, "index.html")

    return app


app = create_app()

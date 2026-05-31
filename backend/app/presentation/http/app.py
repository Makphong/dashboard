from __future__ import annotations

from flask import Flask

from ...application import dashboard_service
from .routes import register_blueprints
from ...config.settings import build_upload_limits


def create_app() -> Flask:
    app = Flask(__name__, static_folder=None)
    dashboard_service.init_db()

    app.config["UPLOAD_LIMITS"] = build_upload_limits()
    app.extensions["frontend_bundle_cache"] = {"signature": None, "content": None}

    @app.after_request
    def add_no_cache_headers(response):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response

    register_blueprints(app)
    return app


app = create_app()

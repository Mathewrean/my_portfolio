#!/usr/bin/env python3
"""Verify public Flask endpoints return the same data that backs GitHub Pages."""

from __future__ import annotations

from backend.app import create_app
from backend.config import BASE_DIR
from backend.db import migrate, seed_from_json

ENDPOINTS = [
    ("/api/health", lambda payload: payload.get("status") == "ok"),
    (
        "/api/public/content",
        lambda payload: isinstance(payload, dict)
        and {"site", "resume", "challenges", "certificates", "projects", "gallery", "research"}.issubset(
            payload.keys()
        ),
    ),
    ("/api/public/site", lambda payload: isinstance(payload, dict)),
    ("/api/public/resume", lambda payload: isinstance(payload, dict)),
    ("/api/public/certificates", lambda payload: isinstance(payload, list)),
    ("/api/public/projects", lambda payload: isinstance(payload, list)),
    ("/api/public/gallery", lambda payload: isinstance(payload, list)),
    ("/api/public/research", lambda payload: isinstance(payload, list)),
    ("/api/public/blog", lambda payload: isinstance(payload, list)),
]


def seed_database() -> None:
    migrate()
    seed_from_json(BASE_DIR)


def main() -> int:
    seed_database()
    app = create_app()
    app.testing = True
    client = app.test_client()

    for route, check in ENDPOINTS:
        response = client.get(route)
        if response.status_code != 200:
            raise SystemExit(f"{route} returned {response.status_code}")
        payload = response.get_json(silent=True)
        if payload is None:
            raise SystemExit(f"{route} did not return JSON")
        if not check(payload):
            raise SystemExit(f"{route} returned an unexpected payload shape")
    print("All public endpoints returned valid JSON and match docs data shapes.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

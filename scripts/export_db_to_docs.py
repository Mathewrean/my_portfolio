#!/usr/bin/env python3
"""Export the Flask-backed database into the JSON files that power GitHub Pages."""

from __future__ import annotations

import json
from pathlib import Path

from backend.config import BASE_DIR
from backend.db import migrate
from backend.repository import (
    get_resume,
    get_site_settings,
    list_certificates,
    list_gallery,
    list_projects,
    list_research,
    list_challenges,
)


OUT_DIR = BASE_DIR / "docs" / "data"


def _write(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2))


def _serialize_challenge(challenge: dict[str, object]) -> dict[str, object]:
    return {
        "id": challenge.get("id"),
        "title": challenge.get("title"),
        "platform": challenge.get("platform"),
        "description": challenge.get("description", ""),
        "thumbnail": challenge.get("hero_image") or challenge.get("badge_thumbnail") or "",
        "badgeThumbnail": challenge.get("badge_thumbnail"),
        "screenshots": challenge.get("screenshots", []),
        "attachments": challenge.get("attachments", []),
        "medium_link": challenge.get("medium_link"),
        "github_link": challenge.get("github_link"),
        "live_link": challenge.get("live_link"),
        "date_completed": challenge.get("date_completed"),
        "categories": challenge.get("categories", []),
        "difficulty": challenge.get("difficulty"),
        "status": challenge.get("status"),
        "source_site": challenge.get("source_site"),
        "ctf_name": challenge.get("ctf_name"),
        "published": challenge.get("published", True),
    }


def _serialize_cert(cert: dict[str, object]) -> dict[str, object]:
    return {
        "name": cert.get("title"),
        "issuer": cert.get("issuer"),
        "date": cert.get("issue_date"),
        "image": cert.get("image_path"),
    }


def _serialize_project(project: dict[str, object]) -> dict[str, object]:
    return {
        "title": project.get("title"),
        "description": project.get("description"),
        "technologies": project.get("technologies") or [],
        "github": project.get("github_link"),
        "demo": project.get("live_link"),
        "image": project.get("image_path"),
    }


def _serialize_gallery(item: dict[str, object]) -> dict[str, object]:
    return {
        "url": item.get("image_path"),
        "caption": item.get("caption"),
    }


def _serialize_research(item: dict[str, object]) -> dict[str, object]:
    return {
        "title": item.get("title"),
        "description": item.get("description"),
        "link": item.get("link"),
        "date": item.get("publication_date"),
    }


def export_site() -> None:
    data = get_site_settings()
    payload = {
        "heroTitle": data.get("heroTitle"),
        "heroSummary": data.get("heroSummary"),
        "about": data.get("about"),
        "contact": data.get("contact") or [],
    }
    _write(OUT_DIR / "site.json", payload)


def export_resume() -> None:
    _write(OUT_DIR / "resume.json", get_resume() or {})


def export_certificates() -> None:
    rows = list_certificates(admin=False)
    _write(OUT_DIR / "certificates.json", [_serialize_cert(r) for r in rows])


def export_projects() -> None:
    rows = list_projects(admin=False)
    _write(OUT_DIR / "projects.json", [_serialize_project(r) for r in rows])


def export_gallery() -> None:
    rows = list_gallery(admin=False)
    _write(OUT_DIR / "gallery.json", [_serialize_gallery(r) for r in rows])


def export_research() -> None:
    rows = list_research(admin=False)
    _write(OUT_DIR / "research.json", [_serialize_research(r) for r in rows])


def export_challenges() -> None:
    bundle = list_challenges(admin=False, page=1, page_size=5000)
    rows = bundle.get("items", [])
    tryhackme = get_site_settings().get("tryhackme") or {}
    payload = {
        "tryhackme": tryhackme,
        "challenges": [_serialize_challenge(row) for row in rows],
    }
    _write(OUT_DIR / "challenges.json", payload)


def main() -> int:
    migrate()
    export_site()
    export_resume()
    export_certificates()
    export_projects()
    export_gallery()
    export_research()
    export_challenges()
    print("Exported db content to docs/data/*.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

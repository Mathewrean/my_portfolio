import json
from datetime import datetime

from .db import get_conn, now_iso


def _to_bool(v):
    if isinstance(v, bool):
        return v
    return str(v).lower() in {"1", "true", "yes", "on"}


def _parse_json(value, default):
    if not value:
        return default
    try:
        return json.loads(value)
    except Exception:
        return default


def get_site_settings():
    with get_conn() as conn:
        rows = conn.execute("SELECT key, value FROM site_settings").fetchall()
        data = {}
        for row in rows:
            data[row["key"]] = _parse_json(row["value"], row["value"])
        return {
            "heroTitle": data.get("heroTitle", ""),
            "heroSummary": data.get("heroSummary", ""),
            "about": data.get("about", ""),
            "contact": data.get("contact", []),
            "tryhackme": data.get("tryhackme_profile", {}),
        }


def update_site_settings(payload):
    allowed = {"heroTitle", "heroSummary", "about", "contact", "tryhackme_profile"}
    with get_conn() as conn:
        for key, value in payload.items():
            if key not in allowed:
                continue
            conn.execute(
                "INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)",
                (key, json.dumps(value)),
            )


def get_resume():
    with get_conn() as conn:
        row = conn.execute("SELECT value FROM resume_data WHERE id=1").fetchone()
        return _parse_json(row["value"], {}) if row else {}


def update_resume(payload):
    with get_conn() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO resume_data (id, value) VALUES (1, ?)",
            (json.dumps(payload),),
        )


def get_categories():
    with get_conn() as conn:
        return conn.execute(
            "SELECT key, label, description, sort_order FROM challenge_categories ORDER BY sort_order ASC"
        ).fetchall()


def _format_challenge(row, conn):
    row["tags"] = _parse_json(row.get("tags"), [])
    row["published"] = bool(row.get("published", 0))
    row["screenshots"] = [
        x["file_path"]
        for x in conn.execute(
            "SELECT file_path FROM challenge_screenshots WHERE challenge_id=? ORDER BY sort_order ASC",
            (row["id"],),
        ).fetchall()
    ]
    row["attachments"] = [
        x["file_path"]
        for x in conn.execute(
            "SELECT file_path FROM challenge_attachments WHERE challenge_id=?",
            (row["id"],),
        ).fetchall()
    ]
    return row


def list_challenges(admin=False, search="", category="", status="", page=1, page_size=10):
    where = []
    params = []

    if not admin:
        where.append("published = 1")

    if search:
        where.append("(title LIKE ? OR description LIKE ? OR platform LIKE ?)")
        token = f"%{search}%"
        params.extend([token, token, token])

    if category:
        where.append("category = ?")
        params.append(category)

    if status:
        where.append("status = ?")
        params.append(status)

    where_sql = f"WHERE {' AND '.join(where)}" if where else ""
    offset = (page - 1) * page_size

    with get_conn() as conn:
        total = conn.execute(
            f"SELECT COUNT(*) AS c FROM challenges {where_sql}",
            params,
        ).fetchone()["c"]
        rows = conn.execute(
            f"""
            SELECT * FROM challenges
            {where_sql}
            ORDER BY date_completed DESC, id DESC
            LIMIT ? OFFSET ?
            """,
            [*params, page_size, offset],
        ).fetchall()

        items = [_format_challenge(row, conn) for row in rows]
        return {"items": items, "total": total, "page": page, "pageSize": page_size}


def create_challenge(payload):
    now = now_iso()
    tags = payload.get("tags", [])
    if isinstance(tags, str):
        tags = [x.strip() for x in tags.split(",") if x.strip()]

    with get_conn() as conn:
        cur = conn.execute(
            """
            INSERT INTO challenges
            (title, description, category, platform, difficulty, status, date_completed, medium_link, github_link, live_link,
             badge_thumbnail, hero_image, source_site, ctf_name, tags, published, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                payload.get("title", ""),
                payload.get("description", ""),
                payload.get("category", "others"),
                payload.get("platform", ""),
                payload.get("difficulty", ""),
                payload.get("status", "Completed"),
                payload.get("date_completed", ""),
                payload.get("medium_link", ""),
                payload.get("github_link", ""),
                payload.get("live_link", ""),
                payload.get("badge_thumbnail", ""),
                payload.get("hero_image", ""),
                payload.get("source_site", ""),
                payload.get("ctf_name", ""),
                json.dumps(tags),
                1 if _to_bool(payload.get("published", True)) else 0,
                now,
                now,
            ),
        )
        challenge_id = cur.lastrowid

        for idx, p in enumerate(payload.get("screenshots", [])):
            conn.execute(
                "INSERT INTO challenge_screenshots (challenge_id, file_path, sort_order) VALUES (?, ?, ?)",
                (challenge_id, p, idx),
            )
        for p in payload.get("attachments", []):
            conn.execute(
                "INSERT INTO challenge_attachments (challenge_id, file_path) VALUES (?, ?)",
                (challenge_id, p),
            )

        row = conn.execute("SELECT * FROM challenges WHERE id=?", (challenge_id,)).fetchone()
        return _format_challenge(row, conn)


def update_challenge(challenge_id: int, payload):
    now = now_iso()
    tags = payload.get("tags", [])
    if isinstance(tags, str):
        tags = [x.strip() for x in tags.split(",") if x.strip()]

    with get_conn() as conn:
        current = conn.execute("SELECT * FROM challenges WHERE id=?", (challenge_id,)).fetchone()
        if not current:
            return None

        merged = {**current, **payload}
        conn.execute(
            """
            UPDATE challenges SET
             title=?, description=?, category=?, platform=?, difficulty=?, status=?, date_completed=?,
             medium_link=?, github_link=?, live_link=?, badge_thumbnail=?, hero_image=?, source_site=?, ctf_name=?,
             tags=?, published=?, updated_at=?
            WHERE id=?
            """,
            (
                merged.get("title", ""),
                merged.get("description", ""),
                merged.get("category", "others"),
                merged.get("platform", ""),
                merged.get("difficulty", ""),
                merged.get("status", "Completed"),
                merged.get("date_completed", ""),
                merged.get("medium_link", ""),
                merged.get("github_link", ""),
                merged.get("live_link", ""),
                merged.get("badge_thumbnail", ""),
                merged.get("hero_image", ""),
                merged.get("source_site", ""),
                merged.get("ctf_name", ""),
                json.dumps(tags),
                1 if _to_bool(merged.get("published", True)) else 0,
                now,
                challenge_id,
            ),
        )

        if payload.get("replace_screenshots"):
            conn.execute("DELETE FROM challenge_screenshots WHERE challenge_id=?", (challenge_id,))
            for idx, p in enumerate(payload.get("screenshots", [])):
                conn.execute(
                    "INSERT INTO challenge_screenshots (challenge_id, file_path, sort_order) VALUES (?, ?, ?)",
                    (challenge_id, p, idx),
                )
        elif payload.get("screenshots"):
            next_idx = conn.execute(
                "SELECT COALESCE(MAX(sort_order), -1) + 1 AS idx FROM challenge_screenshots WHERE challenge_id=?",
                (challenge_id,),
            ).fetchone()["idx"]
            for idx, p in enumerate(payload.get("screenshots", [])):
                conn.execute(
                    "INSERT INTO challenge_screenshots (challenge_id, file_path, sort_order) VALUES (?, ?, ?)",
                    (challenge_id, p, next_idx + idx),
                )

        if payload.get("attachments"):
            for p in payload.get("attachments", []):
                conn.execute(
                    "INSERT INTO challenge_attachments (challenge_id, file_path) VALUES (?, ?)",
                    (challenge_id, p),
                )

        row = conn.execute("SELECT * FROM challenges WHERE id=?", (challenge_id,)).fetchone()
        return _format_challenge(row, conn)


def delete_challenge(challenge_id: int) -> bool:
    with get_conn() as conn:
        cur = conn.execute("DELETE FROM challenges WHERE id=?", (challenge_id,))
        return cur.rowcount > 0


def toggle_published(table: str, item_id: int):
    with get_conn() as conn:
        row = conn.execute(f"SELECT published FROM {table} WHERE id=?", (item_id,)).fetchone()
        if not row:
            return None
        val = 0 if row["published"] else 1
        conn.execute(f"UPDATE {table} SET published=?, updated_at=? WHERE id=?", (val, now_iso(), item_id))
        return bool(val)


def _list_basic(table: str, admin=False):
    where = "" if admin else "WHERE published=1"
    with get_conn() as conn:
        rows = conn.execute(f"SELECT * FROM {table} {where} ORDER BY id DESC").fetchall()
        for row in rows:
            row["published"] = bool(row.get("published", 0))
        return rows


def list_certificates(admin=False):
    rows = _list_basic("certificates", admin=admin)
    for r in rows:
        r["name"] = r.get("title")
        r["date"] = r.get("issue_date")
        r["image"] = r.get("image_path")
    return rows


def create_or_update_simple(table: str, payload, item_id=None):
    now = now_iso()
    with get_conn() as conn:
        if table == "projects":
            payload["technologies"] = json.dumps(payload.get("technologies", []))

        if item_id is None:
            cols = ", ".join(payload.keys()) + ", created_at, updated_at"
            placeholders = ", ".join(["?"] * len(payload)) + ", ?, ?"
            cur = conn.execute(
                f"INSERT INTO {table} ({cols}) VALUES ({placeholders})",
                [*payload.values(), now, now],
            )
            item_id = cur.lastrowid
        else:
            current = conn.execute(f"SELECT * FROM {table} WHERE id=?", (item_id,)).fetchone()
            if not current:
                return None
            merged = {**current, **payload, "updated_at": now}
            sets = ", ".join([f"{k}=?" for k in merged.keys() if k != "id"])
            values = [merged[k] for k in merged.keys() if k != "id"]
            conn.execute(f"UPDATE {table} SET {sets} WHERE id=?", [*values, item_id])

        row = conn.execute(f"SELECT * FROM {table} WHERE id=?", (item_id,)).fetchone()
        if table == "projects":
            row["technologies"] = _parse_json(row.get("technologies"), [])
        row["published"] = bool(row.get("published", 0))
        return row


def delete_simple(table: str, item_id: int):
    with get_conn() as conn:
        cur = conn.execute(f"DELETE FROM {table} WHERE id=?", (item_id,))
        return cur.rowcount > 0


def list_projects(admin=False):
    rows = _list_basic("projects", admin=admin)
    for row in rows:
        row["technologies"] = _parse_json(row.get("technologies"), [])
        row["github"] = row.get("github_link")
        row["demo"] = row.get("live_link")
        row["image"] = row.get("image_path")
    return rows


def list_gallery(admin=False):
    rows = _list_basic("gallery_items", admin=admin)
    for row in rows:
        row["url"] = row.get("image_path")
    return rows


def list_research(admin=False):
    rows = _list_basic("research_items", admin=admin)
    for row in rows:
        row["date"] = row.get("publication_date")
    return rows


def list_blog(admin=False):
    return _list_basic("blog_posts", admin=admin)


def public_bundle():
    categories = get_categories()
    challenges = list_challenges(admin=False, page=1, page_size=500)["items"]
    cat_map = {
        c["key"]: {"label": c["label"], "description": c["description"], "entries": []}
        for c in categories
    }
    for item in challenges:
        cat_map.setdefault(
            item["category"],
            {"label": item["category"].title(), "description": "", "entries": []},
        )["entries"].append(
            {
                "id": item["id"],
                "title": item["title"],
                "description": item["description"],
                "image": item["hero_image"],
                "badgeThumbnail": item["badge_thumbnail"],
                "screenshots": item["screenshots"],
                "attachments": item["attachments"],
                "mediumLink": item["medium_link"],
                "githubLink": item["github_link"],
                "liveLink": item["live_link"],
                "dateCompleted": item["date_completed"],
                "difficulty": item["difficulty"],
                "status": item["status"],
                "platform": item["platform"],
                "sourceSite": item["source_site"],
                "ctfName": item["ctf_name"],
                "tags": item["tags"],
            }
        )

    settings = get_site_settings()
    return {
        "site": {
            "heroTitle": settings.get("heroTitle", ""),
            "heroSummary": settings.get("heroSummary", ""),
            "about": settings.get("about", ""),
            "contact": settings.get("contact", []),
        },
        "resume": get_resume(),
        "challenges": {
            "tryhackme": settings.get("tryhackme", {}),
            "categories": cat_map,
        },
        "certificates": list_certificates(admin=False),
        "projects": list_projects(admin=False),
        "gallery": list_gallery(admin=False),
        "research": list_research(admin=False),
        "blog": list_blog(admin=False),
    }

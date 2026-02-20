import sqlite3
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
import json

from .config import DB_PATH, CHALLENGE_CATEGORIES


def now_iso() -> str:
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def dict_factory(cursor, row):
    return {col[0]: row[idx] for idx, col in enumerate(cursor.description)}


@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = dict_factory
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def migrate():
    with get_conn() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS site_settings (
              key TEXT PRIMARY KEY,
              value TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS resume_data (
              id INTEGER PRIMARY KEY CHECK (id = 1),
              value TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS challenge_categories (
              key TEXT PRIMARY KEY,
              label TEXT NOT NULL,
              description TEXT NOT NULL,
              sort_order INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS challenges (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              title TEXT NOT NULL,
              description TEXT NOT NULL,
              category TEXT NOT NULL,
              platform TEXT,
              difficulty TEXT,
              status TEXT NOT NULL DEFAULT 'Completed',
              date_completed TEXT,
              medium_link TEXT,
              github_link TEXT,
              live_link TEXT,
              badge_thumbnail TEXT,
              hero_image TEXT,
              source_site TEXT,
              ctf_name TEXT,
              tags TEXT NOT NULL DEFAULT '[]',
              published INTEGER NOT NULL DEFAULT 1,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              FOREIGN KEY(category) REFERENCES challenge_categories(key) ON DELETE RESTRICT
            );

            CREATE TABLE IF NOT EXISTS challenge_screenshots (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              challenge_id INTEGER NOT NULL,
              file_path TEXT NOT NULL,
              sort_order INTEGER NOT NULL DEFAULT 0,
              FOREIGN KEY(challenge_id) REFERENCES challenges(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS challenge_attachments (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              challenge_id INTEGER NOT NULL,
              file_path TEXT NOT NULL,
              FOREIGN KEY(challenge_id) REFERENCES challenges(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS certificates (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              title TEXT NOT NULL,
              issuer TEXT NOT NULL,
              issue_date TEXT,
              credential_id TEXT,
              verification_link TEXT,
              image_path TEXT,
              published INTEGER NOT NULL DEFAULT 1,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS projects (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              title TEXT NOT NULL,
              description TEXT NOT NULL,
              technologies TEXT NOT NULL DEFAULT '[]',
              github_link TEXT,
              live_link TEXT,
              image_path TEXT,
              published INTEGER NOT NULL DEFAULT 1,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS gallery_items (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              caption TEXT,
              image_path TEXT NOT NULL,
              event_date TEXT,
              published INTEGER NOT NULL DEFAULT 1,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS research_items (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              title TEXT NOT NULL,
              description TEXT NOT NULL,
              link TEXT,
              publication_date TEXT,
              published INTEGER NOT NULL DEFAULT 1,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS blog_posts (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              title TEXT NOT NULL,
              excerpt TEXT,
              content TEXT,
              link TEXT,
              published_at TEXT,
              published INTEGER NOT NULL DEFAULT 0,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );
            """
        )

        for key, label, description, sort_order in CHALLENGE_CATEGORIES:
            conn.execute(
                """
                INSERT INTO challenge_categories (key, label, description, sort_order)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET
                  label=excluded.label,
                  description=excluded.description,
                  sort_order=excluded.sort_order
                """,
                (key, label, description, sort_order),
            )


def _load_json(path: Path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def seed_from_json(base_dir: Path):
    data_dir = base_dir / "docs" / "data"
    with get_conn() as conn:
        row = conn.execute("SELECT COUNT(*) AS c FROM challenges").fetchone()
        if row["c"] > 0:
            return

        now = now_iso()

        site = _load_json(data_dir / "site.json", {})
        for key, value in site.items():
            conn.execute(
                "INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)",
                (key, json.dumps(value)),
            )

        resume = _load_json(data_dir / "resume.json", {})
        conn.execute(
            "INSERT OR REPLACE INTO resume_data (id, value) VALUES (1, ?)",
            (json.dumps(resume),),
        )

        certs = _load_json(data_dir / "certificates.json", [])
        for cert in certs:
            conn.execute(
                """
                INSERT INTO certificates
                (title, issuer, issue_date, credential_id, verification_link, image_path, published, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
                """,
                (
                    cert.get("name") or cert.get("title") or "Certificate",
                    cert.get("issuer", ""),
                    cert.get("date", ""),
                    cert.get("credentialId", ""),
                    cert.get("verificationLink", ""),
                    cert.get("image", ""),
                    now,
                    now,
                ),
            )

        projects = _load_json(data_dir / "projects.json", [])
        for p in projects:
            conn.execute(
                """
                INSERT INTO projects
                (title, description, technologies, github_link, live_link, image_path, published, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
                """,
                (
                    p.get("title", "Project"),
                    p.get("description", ""),
                    json.dumps(p.get("technologies", [])),
                    p.get("github", ""),
                    p.get("demo", ""),
                    p.get("image", ""),
                    now,
                    now,
                ),
            )

        gallery = _load_json(data_dir / "gallery.json", [])
        for g in gallery:
            conn.execute(
                """
                INSERT INTO gallery_items
                (caption, image_path, event_date, published, created_at, updated_at)
                VALUES (?, ?, ?, 1, ?, ?)
                """,
                (g.get("caption", ""), g.get("url", ""), g.get("date", ""), now, now),
            )

        research = _load_json(data_dir / "research.json", [])
        for r in research:
            conn.execute(
                """
                INSERT INTO research_items
                (title, description, link, publication_date, published, created_at, updated_at)
                VALUES (?, ?, ?, ?, 1, ?, ?)
                """,
                (r.get("title", "Research"), r.get("description", ""), r.get("link", ""), r.get("date", ""), now, now),
            )

        challenges = _load_json(data_dir / "challenges.json", {})
        for key, cat in (challenges.get("categories") or {}).items():
            for entry in cat.get("entries", []):
                cur = conn.execute(
                    """
                    INSERT INTO challenges
                    (title, description, category, platform, difficulty, status, date_completed, medium_link, github_link, live_link,
                     badge_thumbnail, hero_image, source_site, ctf_name, tags, published, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
                    """,
                    (
                        entry.get("title", "Challenge"),
                        entry.get("description", ""),
                        key,
                        entry.get("platform") or cat.get("label") or key,
                        entry.get("difficulty", ""),
                        entry.get("status", "Completed"),
                        entry.get("dateCompleted", ""),
                        entry.get("mediumLink", ""),
                        entry.get("githubLink", ""),
                        entry.get("liveLink", ""),
                        entry.get("badgeThumbnail", ""),
                        entry.get("image", ""),
                        entry.get("sourceSite", ""),
                        entry.get("ctfName", ""),
                        json.dumps(entry.get("tags", [])),
                        now,
                        now,
                    ),
                )
                challenge_id = cur.lastrowid

                for idx, screenshot in enumerate(entry.get("screenshots", [])):
                    conn.execute(
                        "INSERT INTO challenge_screenshots (challenge_id, file_path, sort_order) VALUES (?, ?, ?)",
                        (challenge_id, screenshot, idx),
                    )

                for attachment in entry.get("attachments", []):
                    conn.execute(
                        "INSERT INTO challenge_attachments (challenge_id, file_path) VALUES (?, ?)",
                        (challenge_id, attachment),
                    )

        thm = challenges.get("tryhackme", {})
        if thm:
            conn.execute(
                "INSERT OR REPLACE INTO site_settings (key, value) VALUES ('tryhackme_profile', ?)",
                (json.dumps(thm),),
            )

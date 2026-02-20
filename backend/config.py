from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "portfolio.db"
DOCS_DIR = BASE_DIR / "docs"
UPLOAD_ROOT = DOCS_DIR / "uploads"
MAX_UPLOAD_MB = 8
MAX_CONTENT_LENGTH = MAX_UPLOAD_MB * 1024 * 1024

ADMIN_PASSWORD_HASH = os.environ.get(
    "PORTFOLIO_ADMIN_HASH",
    "d9493bb755938219730159f498106289738e5bb6ee443a8466df328ad3a630ea",
)

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_DOC_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}

CHALLENGE_CATEGORIES = [
    ("tryhackme", "TryHackMe", "Hands-on room walkthroughs and blue/red team challenge writeups.", 1),
    ("hackthebox", "HackTheBox", "Machine and challenge writeups from HackTheBox labs.", 2),
    ("picoctf", "PicoCTF", "Beginner to intermediate CTF challenge solutions.", 3),
    ("ctfroom", "CTFROOM", "Room-based challenge notes from CTFROOM platform.", 4),
    ("ctfzone", "CTFZone", "Challenge walkthroughs and labs from CTFZone events and practice sets.", 5),
    ("others", "Others", "Custom entries from any CTF or challenge source.", 6),
]

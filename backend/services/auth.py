import hashlib
import secrets
from functools import wraps
from flask import request, jsonify

from ..config import ADMIN_PASSWORD_HASH

TOKENS = set()


def verify_password(password: str) -> bool:
    digest = hashlib.sha256(password.encode("utf-8")).hexdigest()
    return secrets.compare_digest(digest, ADMIN_PASSWORD_HASH)


def issue_token() -> str:
    token = secrets.token_urlsafe(32)
    TOKENS.add(token)
    return token


def requires_auth(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        token = request.headers.get("X-Admin-Token", "")
        if token not in TOKENS:
            return jsonify({"error": "Unauthorized"}), 401
        return fn(*args, **kwargs)

    return wrapper

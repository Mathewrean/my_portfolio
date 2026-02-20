from pathlib import Path
from uuid import uuid4
from werkzeug.utils import secure_filename

from ..config import (
    UPLOAD_ROOT,
    DOCS_DIR,
    ALLOWED_IMAGE_EXTENSIONS,
    ALLOWED_DOC_EXTENSIONS,
)


def ensure_upload_dirs():
    for folder in [
        "challenges",
        "certificates",
        "projects",
        "gallery",
        "research",
        "blog",
        "attachments",
    ]:
        (UPLOAD_ROOT / folder).mkdir(parents=True, exist_ok=True)


def _safe_ext(filename: str):
    return Path(filename).suffix.lower()


def save_file(file_storage, bucket: str, allow_docs: bool = False):
    if not file_storage or not file_storage.filename:
        return ""

    ext = _safe_ext(file_storage.filename)
    allowed = ALLOWED_DOC_EXTENSIONS if allow_docs else ALLOWED_IMAGE_EXTENSIONS
    if ext not in allowed:
        raise ValueError(f"Unsupported file type: {ext}")

    safe_name = secure_filename(Path(file_storage.filename).stem)
    unique_name = f"{safe_name}-{uuid4().hex[:12]}{ext}"

    target_dir = UPLOAD_ROOT / bucket
    target_dir.mkdir(parents=True, exist_ok=True)
    target_path = target_dir / unique_name
    file_storage.save(target_path)

    return f"uploads/{bucket}/{unique_name}"


def save_many(file_storages, bucket: str, allow_docs: bool = False):
    paths = []
    for file_storage in file_storages:
        if file_storage and file_storage.filename:
            paths.append(save_file(file_storage, bucket=bucket, allow_docs=allow_docs))
    return paths


def save_static_image(file_storage, bucket: str = "challenges"):
    if not file_storage or not file_storage.filename:
        return ""

    ext = _safe_ext(file_storage.filename)
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise ValueError(f"Unsupported file type: {ext}")

    safe_name = secure_filename(Path(file_storage.filename).stem)
    unique_name = f"{safe_name}-{uuid4().hex[:12]}{ext}"

    target_dir = DOCS_DIR / "assets" / "images" / bucket
    target_dir.mkdir(parents=True, exist_ok=True)
    target_path = target_dir / unique_name
    file_storage.save(target_path)

    return f"assets/images/{bucket}/{unique_name}"

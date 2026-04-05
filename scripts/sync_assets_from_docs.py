#!/usr/bin/env python3
"""Mirror docs/assets into assets/ so local rendering matches GitHub Pages."""

from __future__ import annotations

from argparse import ArgumentParser, Namespace
from pathlib import Path
from shutil import copy2

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "docs" / "assets"
DST = ROOT / "assets"


def parse_args() -> Namespace:
    parser = ArgumentParser(description="Sync files from docs/assets to assets/")
    parser.add_argument("--dry-run", action="store_true", help="Show what would change without writing")
    return parser.parse_args()


def build_expected_paths(base: Path) -> set[Path]:
    return {path.relative_to(base) for path in sorted(base.rglob("*"))}


def sync(expected_src: Path, target_dst: Path, dry_run: bool) -> int:
    if not expected_src.exists():
        raise SystemExit(f"Source directory {expected_src} does not exist")

    changed = 0
    for src_path in sorted(expected_src.rglob("*")):
        rel = src_path.relative_to(expected_src)
        dst_path = target_dst / rel
        if src_path.is_dir():
            if not dry_run:
                dst_path.mkdir(parents=True, exist_ok=True)
            continue
        if not dry_run:
            dst_path.parent.mkdir(parents=True, exist_ok=True)
        if dst_path.exists():
            src_stat = src_path.stat()
            dst_stat = dst_path.stat()
            if src_stat.st_size == dst_stat.st_size and src_stat.st_mtime == dst_stat.st_mtime:
                continue
        if dry_run:
            print(f"Would copy {rel}")
        else:
            copy2(src_path, dst_path)
        changed += 1
    return changed


def clean(target_dst: Path, allowed: set[Path], dry_run: bool) -> int:
    removed = 0
    for path in sorted(target_dst.rglob("*"), reverse=True):
        if path == target_dst:
            continue
        rel = path.relative_to(target_dst)
        if rel not in allowed:
            if dry_run:
                print(f"Would remove {rel}")
            else:
                if path.is_dir():
                    try:
                        path.rmdir()
                        removed += 1
                    except OSError:
                        continue
                else:
                    path.unlink()
                    removed += 1
    return removed


def main() -> int:
    args = parse_args()

    if not DST.exists():
        DST.mkdir(parents=True)

    expected = build_expected_paths(SRC)
    copied = sync(SRC, DST, args.dry_run)
    removed = clean(DST, expected, args.dry_run)

    label = "Dry run: " if args.dry_run else ""
    print(f"{label}Synced {copied} file(s) and removed {removed} extra path(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

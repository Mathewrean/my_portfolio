#!/usr/bin/env python3
"""Reset the local SQLite store so it matches the published docs data."""

from __future__ import annotations

import argparse
from pathlib import Path
from shutil import copy2
import sys

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.config import BASE_DIR, DB_PATH
from backend.db import migrate, seed_from_json


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="""Drop and re-create the local SQLite database using the data files
        that back the GitHub Pages build (docs/data/*.json).""",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument(
        "--backup",
        type=Path,
        help="path to save the existing database before refreshing it",
    )
    parser.add_argument(
        "--yes",
        action="store_true",
        help="skip the confirmation prompt when a database already exists",
    )
    return parser.parse_args()


def main() -> int:
    args = _parse_args()

    if DB_PATH.exists():
        if not args.yes:
            resp = input(
                "A database already exists at {DB_PATH}. Remove it and re-seed from docs data? [y/N]: ".format(
                    DB_PATH=DB_PATH
                )
            )
            if resp.strip().lower() not in {"y", "yes"}:
                print("Aborting; the local database was not modified.")
                return 0
        if args.backup:
            backup_path = args.backup
            if backup_path.exists():
                print(f"Warning: overwriting backup target {backup_path}")
            backup_path.parent.mkdir(parents=True, exist_ok=True)
            copy2(DB_PATH, backup_path)
            print(f"Existing database backed up to {backup_path}")
        DB_PATH.unlink()
        print(f"Removed existing database {DB_PATH}")
    else:
        print("No local database was found; creating a fresh copy from docs data.")

    migrate()
    seed_from_json(BASE_DIR)
    print("Local database now matches docs/data/*.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

# Personal Portfolio (Dynamic + Admin)

This project now supports:
- Public portfolio rendering from dynamic API data.
- Admin dashboard for CRUD operations (Challenges, Certificates, Projects, Research, Gallery, Blog, Settings).
- Secure file upload handling with structured folders.
- SQLite-backed storage with migration and seed logic.
- GitHub Pages fallback for public content using `docs/data/*.json` when API is unavailable.

## Run Locally

```bash
python3 run_server.py
```

Open:
- Public site: `http://127.0.0.1:4173/`
- Admin: `http://127.0.0.1:4173/admin`

## Admin Authentication

- Password hash is configured in `backend/config.py` via `PORTFOLIO_ADMIN_HASH` env override.
- Current password corresponds to the hash configured in the frontend/login flow.

## Backend Structure

- `backend/app.py`: Flask app, API routes, static serving, security headers.
- `backend/db.py`: SQLite schema migration + JSON seed import.
- `backend/repository.py`: data access and transformation layer.
- `backend/services/auth.py`: admin token auth.
- `backend/services/uploads.py`: secure upload/validation helpers.
- `run_server.py`: local server entrypoint.

## Upload Folders

- `docs/uploads/challenges/`
- `docs/uploads/certificates/`
- `docs/uploads/projects/`
- `docs/uploads/gallery/`
- `docs/uploads/research/`
- `docs/uploads/blog/`
- `docs/uploads/attachments/`

## Notes on Hosting

- Full admin/API functionality requires a backend runtime (Flask).
- GitHub Pages serves static files only; the public page falls back to JSON files in `docs/data/`.

## Syncing local data with GitHub Pages

The Flask backend now hashes `docs/data/*.json` and re-seeds `portfolio.db` whenever those files change, so the live API matches the GitHub Pages snapshot automatically. If you ever want to force a refresh (for example, after manually deleting `portfolio.db`), run `python3 scripts/sync_from_docs.py` with `--yes` to skip the prompt or `--backup <path>` to keep the previous database. The script rebuilds the local store directly from `docs/data/*.json`.

## Asset parity

GitHub Pages also serves everything under `docs/assets`, while the Flask app reads from `assets/`. `scripts/sync_assets_from_docs.py` mirrors `docs/assets` into `assets`, including the challenge badge images GitHub Pages exposes but that were previously missing locally. Run that script whenever you update assets so both versions stay identical (`--dry-run` shows the planned changes without overwriting).

## Endpoint smoke tests

To be sure the public API still matches the published snapshot, run `PYTHONPATH=. python3 scripts/check_public_endpoints.py`. It seeds the database from `docs/data/*.json` and hits every `/api/public/*` route plus the health check to confirm each returns valid JSON shaped like the docs payload.

## License

MIT

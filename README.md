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

The Flask backend hashes `docs/data/*.json` and re-seeds `portfolio.db` whenever those files change so the live API reflects the GitHub Pages snapshot automatically. Run `python3 scripts/sync_from_docs.py` with `--yes` (or `--backup <path>`) when you need to restart from the published JSON snapshot.

When you edit content via the admin UI, run `PYTHONPATH=. python3 scripts/export_db_to_docs.py` to write the current database back into `docs/data/*.json`. That keeps the GitHub Pages data files aligned with the live backend. Mirror any new uploads with `scripts/sync_assets_from_docs.py`, then commit `docs/data/*.json`, `docs/assets/...`, and `docs/uploads/...` before pushing—GitHub Pages will then render the same content you just edited locally.

## Environment detection & caching

`assets/js/main.js` and `docs/assets/js/main.js` now respect the `<meta name="repo-base-path">` value (set to `/my_portfolio`) so both environments build fetch URLs from the correct relative root. The script also detects `localhost` vs. GitHub Pages, uses the API only when a backend is available, and falls back to `docs/data/*.json` when running in production. Cache-control meta tags (`no-cache`, `no-store`, `must-revalidate`) keep browser clients from reusing stale copies of the homepage regardless of hosting.

## Automation workflow

Run `python3 scripts/sync_assets_from_docs.py` and `PYTHONPATH=. python3 scripts/export_db_to_docs.py` whenever you change JSON content or uploads; the GitHub Action at `.github/workflows/ensure-docs-sync.yml` repeats those steps on every push and fails if the generated JSON/assets differ from the committed copies. That way the action alerts you before the GitHub Pages build runs if anything is out of sync.

## Navigation & tabs

The tab navigation now uses a view registry (`VIEW_IDS`) and consistent data attributes so toggling between Home, About, Resume, Certificates, Projects, Challenges, Contact, Gallery, and Research stays clean. `setActiveView` centralizes the tab state, and the mobile toggle plus challenge submenu keep the UI responsive.

## Testing & verification

- `PYTHONPATH=. python3 scripts/check_public_endpoints.py` (seeds the database from `docs/data` and hits every public `/api` route plus `/api/health`).
- `python3 scripts/sync_assets_from_docs.py` ensures `assets/` mirrors `docs/assets/`, preventing missing images on either environment.

## Asset parity

GitHub Pages also serves everything under `docs/assets`, while the Flask app reads from `assets/`. `scripts/sync_assets_from_docs.py` mirrors `docs/assets` into `assets`, including the challenge badge images GitHub Pages exposes but that were previously missing locally. Run that script whenever you update assets so both versions stay identical (`--dry-run` shows the planned changes without overwriting).

## Endpoint smoke tests

To be sure the public API still matches the published snapshot, run `PYTHONPATH=. python3 scripts/check_public_endpoints.py`. It seeds the database from `docs/data/*.json` and hits every `/api/public/*` route plus the health check to confirm each returns valid JSON shaped like the docs payload.

## Admin preview flag

The home page now ignores any saved admin draft unless the query string contains `?preview=admin`. That means a fresh browser session always renders the official GitHub Pages content (no “Security Analyst” extras), while administrators can still preview their locally saved draft via `http://127.0.0.1:4173/?preview=admin` after saving it from the admin panel. (You can also clear the `portfolio_static_admin_v2` localStorage entry if you need to reset your draft experience.)
## License

MIT

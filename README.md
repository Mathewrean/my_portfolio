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

## License

MIT

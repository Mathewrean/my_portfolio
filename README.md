# Mathewrean Cybersecurity Portfolio (Static)

This is the static portfolio that powers https://mathewrean.github.io/my_portfolio. The HTML/JS simply reads JSON + Markdown from `data/` and `content/` and renders the hero, about, resume, certificates, projects, challenges, research, gallery, and contact sections.

## Project layout

```
/my_portfolio
├── index.html           # SPA shell with hero, tabs, modal, and toast
├── admin.html           # lightweight admin shell (manual content editing only)
├── assets/              # shared CSS / JS / image assets
├── data/                # JSON content that drives every section
└── content/             # markdown writeups for challenges & research
```

All URLs respect the `<meta name="repo-base-path" content="/my_portfolio">` tag so the same build works both locally and on GitHub Pages.

## Running locally

```bash
# from the repo root
python3 -m http.server 4173
```

Then point your browser at `http://localhost:4173/index.html`. Browsers require a web server because the fetch-based data loading won’t work via `file://`.

## Updating content

1. Edit the appropriate JSON file in `/data` (profile, projects, certificates, challenges, research, resume, gallery).
2. Add or update markdown files under `/content/challenges` or `/content/research` and reference them via the `md_path` values.
3. Preview locally with the HTTP server above, then commit the JSON/Markdown changes (and any new assets) so GitHub Pages serves the same data automatically.

The admin UI (`admin.html`) is a static scaffold to keep future automation or GitHub API wiring in one place, but it currently relies on manual edits (no backend sync).

## Challenge & research modals

`assets/js/main.js` loads `marked.js` via CDN (CSP includes the CDN reference) so every challenge or research card fetches the linked Markdown file (`content/...`) and renders it inside the modal with a close button. The modal also traps focus via simple button listeners.

## Theme toggle

A floating `#themeToggle` button toggles `data-theme="dark"` / `data-theme="light"` on `<html>`, stores the preference in `localStorage`, and the CSS defines variables for both modes.

## Challenges — Detailed Behaviour

**Sub-tabs (platform switcher)**

The challenges section renders six inline platform tabs (`TryHackMe`, `HackTheBox`, `CTFZone`, `CTFROOM`, `PicoCTF`, `Others`). Each tab maps to the corresponding slug inside `data/challenges.json`. Switching tabs re-runs the renderer so only that platform’s entries are shown, and the active tab stays visually highlighted (default tab = `TryHackMe`).

**CTF Categories**

Every challenge entry carries an array of categories picked from the standard set below. A single battle can belong to multiple categories simultaneously, and the UI surfaces them as tags on each card.

```
Web Exploitation, Cryptography, Reverse Engineering, Binary Exploitation (Pwn),
Forensics, OSINT, Steganography, Networking, Miscellaneous, Hardware,
Cloud Security, Mobile Security, Active Directory, Malware Analysis, Threat Hunting
```

**Filtering (public-facing)**

- **Source filter** — dropdown above the list that repeats the six platform slugs, allowing visitors to override the active tab and show another platform’s entries without leaving the page; `Clear Filters` resets it to “All platforms”.
- **Category filter** — dropdown seeded dynamically from the categories present in the currently displayed platform. It works in tandem with the source filter, so both platform + category constraints can be applied at once.
- Clearing filters reverts to the default tab view with all categories included; updates happen client-side without page reloads.

**`data/challenges.json` — updated schema**

```json
{
  "tryhackme": [
    {
      "title": "",
      "categories": ["Forensics", "Steganography"],
      "difficulty": "Easy",
      "description": "",
      "md_path": "content/challenges/tryhackme/slug.md",
      "date": "YYYY-MM-DD"
    }
  ],
  "hackthebox": [],
  "ctfzone": [],
  "ctfroom": [],
  "picoctf": [],
  "others": []
}
```

`category` is now an array of strings so a challenge can be tagged with multiple CTF genres.

**Admin — Challenges tab update**

- Platform dropdown mirrors the six slugs so new entries land in the correct array.
- Categories are chosen using a multi-select/checkbox group sourced from the standard list above.
- All other fields stay the same (title, difficulty, description, date, markdown upload/paste). A slug is generated from the title at save time.
- Saving writes a markdown file to `content/challenges/{platform}/{slug}.md` and appends an entry to the matching platform array in `data/challenges.json`. The admin list shows per-platform entries with edit/delete controls.

## Notes for future updates

- Keep absolute paths out of CSS/JS; rely on the `repo-base-path` meta tag and `buildUrl` helper.
- If you want a GitHub-backed admin workflow, implement GitHub Contents API calls in `assets/js/admin.js` and guard them with stored credentials (no PATs in source).
- Before pushing, run `python3 -m http.server` locally and walk through every tab (Home, About, Resume, Certificates, Projects, Challenges, Contact, Gallery, Research) plus modal content to ensure there are no fetch errors.

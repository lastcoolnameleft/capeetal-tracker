# Copilot Instructions

## Build & Run

```bash
# Install dependencies
npm ci

# Run locally (requires data directories to exist)
npm start
# This sets env vars SQLITE_DB_PATH, MAP_CACHE_PATH, STATS_PATH to ./data/ subdirs

# Run with Docker (dev)
docker compose -f docker-compose/docker-compose-dev.yaml up --build
```

There are no test or lint scripts configured.

## Architecture

This is an Express.js app (Node, EJS views) that tracks which US state capitals a user has visited ("Ca-PEE-tal Tracker"). Key components:

- **`app.js`** — Express setup, mounts three routers: `/` (pages), `/api` (data persistence), `/map/` (image generation)
- **`routes/index.js`** — Serves page views and builds the share-page render object (state list, OG image URL)
- **`routes/api.js`** — POST `/api/save` persists user sessions to SQLite (one DB file per region); GET `/api/refresh-stats/:region` regenerates aggregated stats JSON
- **`routes/map.js`** — Generates US state map PNG images using Google Charts (via jsdom server-side rendering), caches them in a 2-layer system (gchart raw → overlay with background), and serves cached files
- **`routes/helpers/states.js`** — Canonical list of US state codes/capitals and input validation via `filterStates()`
- **`public/json/region/`** — Static JSON files defining regions (used as templates for stats aggregation)

## Key Conventions

- **Environment variables** drive all data paths: `SQLITE_DB_PATH`, `MAP_CACHE_PATH`, `STATS_PATH`. Never hardcode data paths.
- **CommonJS modules** throughout (`require`/`module.exports`), not ES modules.
- **No ORM** — raw `sqlite3` with direct SQL queries. Each region gets its own `.db` file.
- **Image caching is two-layer**: first the raw Google Charts geochart PNG, then the overlay composite (using Jimp). Cache is file-system based under `MAP_CACHE_PATH`.
- **State codes** are always uppercase 2-letter abbreviations (e.g., `CA`, `NY`). The `filterStates()` helper validates input against the canonical list before use.
- **Deployment**: pushes to `main` trigger a GitHub Actions workflow that builds a Docker image to GHCR, then deploys to a VM via SSH using `docker rollout`.

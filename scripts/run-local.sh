#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

mkdir -p data/db data/map data/stats

export SQLITE_DB_PATH="${PWD}/data/db/"
export MAP_CACHE_PATH="${PWD}/data/map/"
export STATS_PATH="${PWD}/data/stats/"
export PORT=8002
export SESSION_SECRET="${SESSION_SECRET:-capeetal-local-dev-secret}"
# Optional: set these for Google OAuth
# export GOOGLE_CLIENT_ID="your-client-id"
# export GOOGLE_CLIENT_SECRET="your-client-secret"
# Optional: set for email delivery (password resets)
# export SENDGRID_API_KEY="your-sendgrid-api-key"
# export FROM_EMAIL="noreply@capeetaltracker.com"

echo "Starting Ca-PEE-tal Tracker on http://localhost:${PORT}"
node ./bin/www

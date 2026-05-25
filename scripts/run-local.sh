#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

mkdir -p data/db data/map data/stats

export SQLITE_DB_PATH="${PWD}/data/db/"
export MAP_CACHE_PATH="${PWD}/data/map/"
export STATS_PATH="${PWD}/data/stats/"
export PORT=8002

echo "Starting Ca-PEE-tal Tracker on http://localhost:${PORT}"
node ./bin/www

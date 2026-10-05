#!/usr/bin/env bash
# Usage: promote-green.sh <project-slug>
#
# Runs ON THE APP MACHINE, AFTER nginx (on the nginx machine) has been pointed
# at the green port.
#   1. Stops/removes old blue containers
#   2. Renames green containers to blue
#   3. Prunes old images
set -euo pipefail

SLUG="${1:?slug required}"

PLATFORM_BLUE="${SLUG}-platform-blue"
WORKER_BLUE="${SLUG}-background-worker-blue"
PLATFORM_GREEN="${SLUG}-platform-green"
WORKER_GREEN="${SLUG}-background-worker-green"

if ! docker inspect "$PLATFORM_GREEN" >/dev/null 2>&1; then
  echo "[promote] No ${PLATFORM_GREEN} container on this machine — leaving blue untouched." >&2
  exit 0
fi

echo "[promote] Stopping and removing old blue containers..." >&2
docker rm -f "$PLATFORM_BLUE" "$WORKER_BLUE" 2>/dev/null || true

echo "[promote] Renaming green containers to blue..." >&2
docker rename "$PLATFORM_GREEN" "$PLATFORM_BLUE"
if docker inspect "$WORKER_GREEN" >/dev/null 2>&1; then
  docker rename "$WORKER_GREEN" "$WORKER_BLUE" 2>/dev/null || true
fi

echo "[promote] Pruning old Docker images..." >&2
docker image prune -af >/dev/null 2>&1 || true

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
echo "  Promotion & Cleanup Complete!" >&2
echo "  Project        : $SLUG" >&2
echo "  Blue Containers: Updated to active version" >&2
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2

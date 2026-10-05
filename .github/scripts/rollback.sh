#!/usr/bin/env bash
# Usage: rollback.sh <project-slug> <repo-lower> <image-tag> [scripts-dir]
#
# What it does:
#   1. Deletes any existing green containers if present on the server
#   2. Pulls target Docker image for the given commit_sha / image_tag
#   3. Finds a free host port in 5000-7000 via find-port.sh
#   4. Runs the rollback image as green (${SLUG}-platform-green)
#   5. Runs health check on green container port
#   6. Prints the green port on stdout
#
# It does NOT touch nginx or the blue containers. The workflow then:
#   - runs setup-nginx.sh on the NGINX machine (separate job)
#   - runs promote-green.sh back on this machine
#
# CHANGELOG:
#   2026-09-09 — Sanitize + validate NEW_PORT right after find-port.sh, so a
#                malformed port value can never reach the Nginx config.
set -euo pipefail

SLUG="${1:?slug required}"
REPO="${2:?repo required}"
IMAGE_TAG="${3:?image-tag required}"
SCRIPTS="${4:-$(dirname "$0")}"

PLATFORM_IMAGE="ghcr.io/${REPO}/${SLUG}-platform:${IMAGE_TAG}"
WORKER_IMAGE="ghcr.io/${REPO}/${SLUG}-background-worker:${IMAGE_TAG}"

PLATFORM_GREEN="${SLUG}-platform-green"
WORKER_GREEN="${SLUG}-background-worker-green"

DEPLOY_DIR="/home/deploy/vyapti/generated-projects/${SLUG}"
ENV_FILE="${DEPLOY_DIR}/.env"
ENV_PORTS="${DEPLOY_DIR}/.env.ports"
HEALTH_PATH="${HEALTH_PATH:-/api/v1/vulcan/health-check}"

# ── 2. Pull rollback images from GHCR ─────────────────────────────────────
echo "[rollback] Pulling rollback images for tag ${IMAGE_TAG}..." >&2
docker pull "$PLATFORM_IMAGE" >&2
docker pull "$WORKER_IMAGE" >&2

# ── 1. Delete green container if present ──────────────────────────────────
echo "[rollback] Cleaning up any existing green containers..." >&2
docker stop "$PLATFORM_GREEN" "$WORKER_GREEN" 2>/dev/null || true
docker rm   "$PLATFORM_GREEN" "$WORKER_GREEN" 2>/dev/null || true

# ── 3. Find a free port in 5000-7000 ──────────────────────────────────────
echo "[rollback] Finding free port..." >&2
NEW_PORT=$("$SCRIPTS/find-port.sh" "$SLUG" "platform-green")
echo "[rollback] Assigned rollback port: $NEW_PORT" >&2

# ── ADDED 2026-09-09: Sanitize + validate port ──────────────────────────
NEW_PORT="$(echo "$NEW_PORT" | grep -oE '[0-9]+' | tail -n1)"
if ! [[ "$NEW_PORT" =~ ^[0-9]+$ ]]; then
  echo "ERROR: NEW_PORT is not a valid port number" >&2
  exit 1
fi
# ── END ADDED 2026-09-09 ────────────────────────────────────────────────

# ── 4. Run rollback image as GREEN ────────────────────────────────────────
COMPOSE_NETWORK="${SLUG}_default"
docker network create "$COMPOSE_NETWORK" 2>/dev/null || true

echo "[rollback] Starting rollback container as GREEN..." >&2
docker run -d \
  --name "$PLATFORM_GREEN" \
  --restart unless-stopped \
  --network "$COMPOSE_NETWORK" \
  --env-file "$ENV_FILE" \
  --env-file "$ENV_PORTS" \
  -p "${NEW_PORT}:3000" \
  "$PLATFORM_IMAGE" >&2

docker run -d \
  --name "$WORKER_GREEN" \
  --restart unless-stopped \
  --network "$COMPOSE_NETWORK" \
  --env-file "$ENV_FILE" \
  --env-file "$ENV_PORTS" \
  "$WORKER_IMAGE" \
  pnpm run worker:prod >&2

# ── 5. Health check green platform ────────────────────────────────────────
echo "[rollback] Waiting 15s for green rollback containers to initialize..." >&2
sleep 15
RETRIES=15
INTERVAL=10
for i in $(seq 1 "$RETRIES"); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    "http://127.0.0.1:${NEW_PORT}${HEALTH_PATH}" || true)
  if [ "$STATUS" = "200" ]; then
    echo "[rollback] Health check PASSED on attempt ${i}" >&2
    break
  fi
  if [ "$i" = "$RETRIES" ]; then
    echo "ERROR: rollback health check failed after $((RETRIES * INTERVAL))s — deleting green containers" >&2
    docker rm -f "$PLATFORM_GREEN" "$WORKER_GREEN" 2>/dev/null || true
    exit 1
  fi
  echo "[rollback] Attempt ${i}/${RETRIES} — got ${STATUS}, retrying in ${INTERVAL}s..." >&2
  sleep "$INTERVAL"
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
echo "  Rollback container is up as GREEN" >&2
echo "  Project    : $SLUG" >&2
echo "  Target Tag : $IMAGE_TAG" >&2
echo "  Green Port : $NEW_PORT" >&2
echo "  Status     : Healthy (live traffic still on blue until nginx is switched)" >&2
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2

echo "$NEW_PORT"

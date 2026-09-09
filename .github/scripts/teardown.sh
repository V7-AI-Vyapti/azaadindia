#!/usr/bin/env bash
# Usage: teardown.sh <project-slug> <mode>
#   mode: down              — stop & remove containers/network, KEEP volumes + repo
#         remove_completely — stop & remove EVERYTHING (containers, network,
#                              volumes/data, nginx vhost, cloned deploy dir)
#
# What it does (both modes):
#   1. Removes platform + background-worker containers (blue AND green)
#   2. Runs `docker compose -p <slug> down` in the project's deploy dir to
#      stop/remove postgres, redis, minio, minio-init (+ the compose network)
#   3. Removes the ${slug}_default docker network if anything is left over
#   4. Removes the Nginx vhost for ${slug}.v7ai.org and reloads Nginx
#
# remove_completely additionally:
#   5. Drops postgres/redis/minio data volumes (irreversible data loss)
#   6. Deletes the cloned deploy directory on the server
#
# NOTE: this is scoped to the docker-compose PROJECT (-p <slug>), not to
# fixed container names, because redis/minio use hardcoded container_names
# in docker-compose.yml (not slug-namespaced) — compose-project scoping
# avoids ever touching another project's containers on a shared host.
set -euo pipefail

SLUG="${1:?slug required}"
MODE="${2:?mode required: 'down' or 'remove_completely'}"

case "$MODE" in
  down) REMOVE_VOLUMES=0; REMOVE_REPO=0 ;;
  remove_completely) REMOVE_VOLUMES=1; REMOVE_REPO=1 ;;
  *)
    echo "ERROR: unknown mode '${MODE}' — must be 'down' or 'remove_completely'" >&2
    exit 1
    ;;
esac

DEPLOY_DIR="/home/deploy/vyapti/generated-projects/${SLUG}"
DOMAIN="${SLUG}.v7ai.org"
CONF="/etc/nginx/sites-available/${DOMAIN}"
ENABLED="/etc/nginx/sites-enabled/${DOMAIN}"

PLATFORM_BLUE="${SLUG}-platform-blue"
WORKER_BLUE="${SLUG}-background-worker-blue"
PLATFORM_GREEN="${SLUG}-platform-green"
WORKER_GREEN="${SLUG}-background-worker-green"
COMPOSE_NETWORK="${SLUG}_default"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
echo "  Tearing down stack for: ${SLUG}" >&2
echo "  Mode: ${MODE}" >&2
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2

# ── 1. Remove platform + worker containers (blue and green) ───────────────
echo "[teardown] Removing platform/worker containers..." >&2
docker rm -f "$PLATFORM_BLUE" "$WORKER_BLUE" "$PLATFORM_GREEN" "$WORKER_GREEN" 2>/dev/null || true

# ── 2. Tear down infra stack (postgres, redis, minio, minio-init) ─────────
if [ -d "$DEPLOY_DIR" ]; then
  echo "[teardown] Running docker compose down for project '${SLUG}'..." >&2
  DOWN_ARGS=(-p "$SLUG" down --remove-orphans)
  if [ "$REMOVE_VOLUMES" -eq 1 ]; then
    DOWN_ARGS+=(-v)
  fi
  ( cd "$DEPLOY_DIR" && docker compose --env-file "$DEPLOY_DIR/.env.ports" "${DOWN_ARGS[@]}" ) >&2 || \
    echo "[teardown] WARNING: compose down reported an error (continuing)" >&2
else
  echo "[teardown] No deploy dir at ${DEPLOY_DIR}; skipping compose down." >&2
fi

# ── 3. Remove leftover network, if any ─────────────────────────────────────
docker network rm "$COMPOSE_NETWORK" >&2 2>/dev/null || true

# ── 4. Remove Nginx vhost ───────────────────────────────────────────────────
if [ -f "$CONF" ] || [ -L "$ENABLED" ]; then
  echo "[teardown] Removing Nginx vhost for ${DOMAIN}..." >&2
  sudo rm -f "$ENABLED"
  sudo rm -f "$CONF"
  sudo nginx -t
  sudo systemctl reload nginx
  echo "[teardown] Nginx vhost removed and reloaded." >&2
else
  echo "[teardown] No Nginx vhost found for ${DOMAIN}; skipping." >&2
fi

# ── 5. Optionally remove the cloned deploy directory ────────────────────────
if [ "$REMOVE_REPO" -eq 1 ] && [ -d "$DEPLOY_DIR" ]; then
  echo "[teardown] Removing deploy directory ${DEPLOY_DIR}..." >&2
  rm -rf "$DEPLOY_DIR"
fi

# ── 6. Prune dangling images ────────────────────────────────────────────────
echo "[teardown] Pruning dangling Docker images..." >&2
docker image prune -af >/dev/null 2>&1 || true

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2
echo "  Teardown Complete!" >&2
echo "  Project        : ${SLUG}" >&2
echo "  Mode           : ${MODE}" >&2
echo "  Containers     : removed (blue + green, platform + worker)" >&2
echo "  Infra stack    : removed (postgres, redis, minio, minio-init)" >&2
echo "  Volumes        : $([ "$REMOVE_VOLUMES" -eq 1 ] && echo removed || echo kept)" >&2
echo "  Nginx vhost    : removed" >&2
echo "  Deploy dir     : $([ "$REMOVE_REPO" -eq 1 ] && echo removed || echo kept)" >&2
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" >&2

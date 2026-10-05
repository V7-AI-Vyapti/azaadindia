#!/usr/bin/env bash
# Usage: find-port.sh <slug> <service> [exclude_ports...]
# Assigns an available host port in 9000-11000.
#
# CHANGELOG:
#   2026-09-09 — Exact-match socket filter via `ss` (no sudo needed).
#   2026-10-05 — Made portable so it also works on macOS (no `ss`, bash 3.2):
#                  * Linux : `ss` socket filter, as before
#                  * macOS : `lsof` + a direct connect test on 127.0.0.1
#                  * both  : ports already published by running Docker
#                            containers are treated as in use
#                Without this, a host without `ss` saw every port as free and
#                always returned 9000.
set -euo pipefail

SLUG="${1:?slug required}"
SERVICE="${2:?service required}"
shift 2 2>/dev/null || true
EXCLUDES=("$@")

# Host ports already published by running containers (read once).
DOCKER_PORTS="$(docker ps --format '{{.Ports}}' 2>/dev/null || true)"

port_in_use() {
  local p="$1"

  # Published by a running container (e.g. "0.0.0.0:9000->3000/tcp")
  if printf '%s\n' "$DOCKER_PORTS" | grep -qE "(^|[^0-9])${p}->"; then
    return 0
  fi

  # Linux: exact socket filter
  if command -v ss >/dev/null 2>&1; then
    if ss -H -ltn "( sport = :${p} )" 2>/dev/null | grep -q .; then
      return 0
    fi
    return 1
  fi

  # macOS / hosts without ss
  if command -v lsof >/dev/null 2>&1; then
    if lsof -nP -iTCP:"${p}" -sTCP:LISTEN >/dev/null 2>&1; then
      return 0
    fi
  fi
  # Something answers on the port -> in use
  if (exec 3<>"/dev/tcp/127.0.0.1/${p}") 2>/dev/null; then
    return 0
  fi
  return 1
}

for PORT in $(seq 9000 11000); do
  # Check if port is in exclude list (written so an empty list is safe on bash 3.2)
  SKIP=0
  for EX in ${EXCLUDES[@]+"${EXCLUDES[@]}"}; do
    if [[ "$PORT" == "$EX" ]]; then
      SKIP=1
      break
    fi
  done
  if [[ "$SKIP" -eq 1 ]]; then continue; fi

  if port_in_use "$PORT"; then continue; fi

  if [[ -n "$SLUG" && -n "$SERVICE" ]]; then
    echo "[port] ${SLUG}.${SERVICE} → $PORT" >&2
  fi
  echo "$PORT"
  exit 0
done

echo "ERROR: no free port found in 9000-11000" >&2
exit 1

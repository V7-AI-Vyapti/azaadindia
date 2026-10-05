#!/usr/bin/env bash
# Runs ON THE GITHUB RUNNER (not on a server).
#
# Works out what the nginx machine has to proxy to, and writes two step outputs:
#   port      host port of <slug>-platform-green on the app machine
#   upstream  IP nginx must use to reach the app machine
#
# Env:
#   SSH_KEY / SSH_HOST / SSH_USER / SSH_PORT   creds of the APP machine
#   PROJECT_SLUG
#   TARGET_PORT      optional — skip auto-detect and use this port
#   RESOLVE_PORT     set to "false" to output only `upstream` (teardown)
#   UPSTREAM_HOST    private IP of the app machine (empty on the nginx machine)
#   MACHINE          selected GitHub environment
#   NGINX_MACHINE    environment name of the machine that runs nginx
set -euo pipefail

# ── upstream host ─────────────────────────────────────────────────────────
UPSTREAM="${UPSTREAM_HOST:-}"
if [ -z "$UPSTREAM" ]; then
  # environment names are case-insensitive on GitHub
  if [ "$(printf %s "${MACHINE:-}" | tr "[:upper:]" "[:lower:]")" != "$(printf %s "${NGINX_MACHINE:-Trooper}" | tr "[:upper:]" "[:lower:]")" ]; then
    echo "::error::Environment '${MACHINE:-}' has no UPSTREAM_HOST variable. Set it to that machine's private IP, otherwise nginx would proxy to itself."
    exit 1
  fi
  UPSTREAM="127.0.0.1"
fi

if [ "${RESOLVE_PORT:-true}" = "false" ]; then
  echo "Upstream host for '${MACHINE:-}': ${UPSTREAM}"
  echo "upstream=${UPSTREAM}" >> "$GITHUB_OUTPUT"
  exit 0
fi

# ── green port ────────────────────────────────────────────────────────────
PORT="${TARGET_PORT:-}"
if [ -z "$PORT" ]; then
  KEY="$(mktemp)"
  trap 'rm -f "$KEY"' EXIT
  printf '%s\n' "$SSH_KEY" > "$KEY"
  chmod 600 "$KEY"
  MAPPED="$(ssh -i "$KEY" -p "${SSH_PORT:-22}" \
      -o BatchMode=yes -o ConnectTimeout=15 -o LogLevel=ERROR \
      -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null \
      "${SSH_USER}@${SSH_HOST}" \
      "PATH=\"\$PATH:/usr/local/bin:/opt/homebrew/bin:\$HOME/.docker/bin\"; docker port '${PROJECT_SLUG}-platform-green' 3000 2>/dev/null | head -n1" || true)"
  PORT="${MAPPED##*:}"
fi

if ! [[ "$PORT" =~ ^[0-9]+$ ]]; then
  echo "::error::Could not detect the green port for ${PROJECT_SLUG}-platform-green on '${MACHINE:-}'. Is the green container running there?"
  exit 1
fi

echo "Routing ${PROJECT_SLUG}.v7ai.org → ${UPSTREAM}:${PORT}"
{
  echo "port=${PORT}"
  echo "upstream=${UPSTREAM}"
} >> "$GITHUB_OUTPUT"

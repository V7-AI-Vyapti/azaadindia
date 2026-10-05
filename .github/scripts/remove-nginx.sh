#!/usr/bin/env bash
# Usage: remove-nginx.sh <slug> <expected-upstream-host>
#
# Runs ON THE NGINX MACHINE only. Removes the vhost for <slug>.v7ai.org and
# reloads nginx.
#
# Safety: the vhost is only removed if its proxy_pass points at
# <expected-upstream-host> (127.0.0.1 for the nginx machine itself, the private
# IP for another machine). If the teardown was run against the wrong machine,
# the live site on the other machine is left alone and this script fails.
set -euo pipefail
SLUG="${1:?slug required}"
UPSTREAM_HOST="${2:?expected upstream host required}"
DOMAIN="${SLUG}.v7ai.org"
CONF="/etc/nginx/sites-available/${DOMAIN}"
ENABLED="/etc/nginx/sites-enabled/${DOMAIN}"

if [ ! -f "$CONF" ] && [ ! -L "$ENABLED" ]; then
  echo "[nginx] No vhost found for ${DOMAIN}; nothing to remove."
  exit 0
fi

if [ -f "$CONF" ]; then
  PATTERN="proxy_pass[[:space:]]+http://${UPSTREAM_HOST//./\\.}:"
  if ! sudo grep -qE "$PATTERN" "$CONF"; then
    CURRENT="$(sudo grep -oE 'proxy_pass[[:space:]]+[^;]+' "$CONF" | head -n1 || true)"
    echo "ERROR: vhost for ${DOMAIN} does not point at ${UPSTREAM_HOST} (found: ${CURRENT:-none})." >&2
    echo "       It belongs to a different machine — vhost NOT removed. Was the wrong machine selected?" >&2
    exit 1
  fi
fi

sudo rm -f "$ENABLED" "$CONF"
sudo nginx -t
sudo systemctl reload nginx
echo "[nginx] Vhost for ${DOMAIN} removed and nginx reloaded."

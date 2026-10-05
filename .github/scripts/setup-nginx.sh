#!/usr/bin/env bash
# Usage: setup-nginx.sh <slug> <port> [upstream-host]
#
# Runs ON THE NGINX MACHINE only. Writes the vhost for <slug>.v7ai.org and
# reloads nginx.
#   upstream-host = 127.0.0.1        -> app runs on this same machine
#   upstream-host = <private LAN IP> -> app runs on another machine in the LAN
set -euo pipefail
SLUG="${1:?slug required}"
PORT="${2:?port required}"
UPSTREAM_HOST="${3:-127.0.0.1}"
DOMAIN="${SLUG}.v7ai.org"
CONF="/etc/nginx/sites-available/${DOMAIN}"

sudo tee "$CONF" > /dev/null <<NGINX
server {
    listen 443 ssl http2;
    server_name ${DOMAIN};
    ssl_certificate     /etc/letsencrypt/live/v7ai.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/v7ai.org/privkey.pem;
    location / {
        proxy_pass         http://${UPSTREAM_HOST}:${PORT};
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_http_version 1.1;
        proxy_set_header   Connection        "";
        proxy_read_timeout 60s;
    }
}
NGINX

sudo ln -sf "$CONF" "/etc/nginx/sites-enabled/${DOMAIN}"
sudo nginx -t
sudo systemctl reload nginx
echo "[nginx] https://${DOMAIN} → ${UPSTREAM_HOST}:${PORT}"

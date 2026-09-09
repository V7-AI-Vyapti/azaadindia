#!/usr/bin/env bash
# Usage: find-port.sh <slug> <service> [exclude_ports...]
# Assigns an available host port in 5000-7000 by checking active host sockets.
#
# CHANGELOG:
#   2026-09-09 — Updated the port-in-use check (see ── UPDATED marker below)
#                from:
#                  if ss -tlnp | grep -q ":${PORT} "; then continue; fi
#                to:
#                  if ss -H -ltn "( sport = :${PORT} )" 2>/dev/null | grep -q .; then continue; fi
#                Reason: the old check used a loose text match (":${PORT} ")
#                against `ss -tlnp` output, which could false-positive on
#                ports that merely share a prefix/substring (e.g. matching
#                ":9000 " could also match ":90000" or process-name text
#                containing that substring) and also required root/sudo for
#                the `-p` (process) flag. The new check uses `ss`'s own
#                socket filter expression `sport = :PORT` for an exact port
#                match, `-H` to drop the header row, and doesn't need `-p`,
#                so it runs reliably as a non-root deploy user.
set -euo pipefail

SLUG="${1:?slug required}"
SERVICE="${2:?service required}"
shift 2 2>/dev/null || true
EXCLUDES=("$@")

for PORT in $(seq 9000 11000); do
  # Check if port is in exclude list
  SKIP=0
  for EX in "${EXCLUDES[@]}"; do
    if [[ "$PORT" == "$EX" ]]; then
      SKIP=1
      break
    fi
  done
  if [[ "$SKIP" -eq 1 ]]; then continue; fi

  # ── UPDATED 2026-09-09: exact-match socket filter, no sudo required ──────
  # Check if port is in use on host
  if ss -H -ltn "( sport = :${PORT} )" 2>/dev/null | grep -q .; then
    continue
  fi
  # ── END UPDATED 2026-09-09 ────────────────────────────────────────────────

  if [[ -n "$SLUG" && -n "$SERVICE" ]]; then
    echo "[port] ${SLUG}.${SERVICE} → $PORT" >&2
  fi
  echo "$PORT"
  exit 0
done

echo "ERROR: no free port found in 5000-7000" >&2
exit 1

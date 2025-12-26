#!/usr/bin/env bash
set -euo pipefail

SEAL_USER="${SEAL_SERVER_USER:-admin}"
SEAL_KEYS_DIR="${SEAL_SSH_KEYS_DIR:-/tmp/seal-ssh}"
SEAL_KEYS_FILE="${SEAL_KEYS_FILE:-${SEAL_KEYS_DIR}/authorized_keys}"
SEAL_HOME="/home/${SEAL_USER}"

log() {
  echo "[seal-server] $*"
}

if [ ! -d "$SEAL_HOME" ]; then
  log "WARN: home not found for ${SEAL_USER} (${SEAL_HOME})"
fi

log "Ensuring ssh host keys..."
ssh-keygen -A >/dev/null 2>&1 || true

if [ -f "$SEAL_KEYS_FILE" ]; then
  log "Installing authorized_keys for ${SEAL_USER}"
  install -d -m 700 -o "$SEAL_USER" -g "$SEAL_USER" "${SEAL_HOME}/.ssh"
  install -m 600 -o "$SEAL_USER" -g "$SEAL_USER" "$SEAL_KEYS_FILE" "${SEAL_HOME}/.ssh/authorized_keys"
else
  log "WARN: authorized_keys not found at ${SEAL_KEYS_FILE}"
fi

exec "$@"

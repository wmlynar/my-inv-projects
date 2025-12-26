#!/usr/bin/env bash
set -euo pipefail

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  SUDO="sudo"
fi

SEAL_USER="${SEAL_SSH_USER:-admin}"
SEAL_HOME="${SEAL_SSH_HOME:-/home/$SEAL_USER}"
SEAL_KEYS_PATH="${SEAL_SSH_AUTH_KEYS:-}"
INSTALL_APT="${SEAL_SSH_INSTALL_APT:-1}"

log() {
  echo "[bootstrap-ssh] $*"
}

if [ "$INSTALL_APT" = "1" ]; then
  if ! command -v apt-get >/dev/null 2>&1; then
    log "ERROR: apt-get not found. This bootstrap targets Ubuntu/Debian."
    exit 2
  fi
  log "Installing server dependencies..."
  $SUDO apt-get update
  $SUDO apt-get install -y sudo openssh-server rsync curl ca-certificates
fi

if ! id "$SEAL_USER" >/dev/null 2>&1; then
  log "Creating user: $SEAL_USER"
  $SUDO useradd -m -s /bin/bash "$SEAL_USER"
fi

log "Ensuring sudo NOPASSWD for $SEAL_USER"
echo "${SEAL_USER} ALL=(ALL) NOPASSWD:ALL" | $SUDO tee "/etc/sudoers.d/${SEAL_USER}" >/dev/null
$SUDO chmod 440 "/etc/sudoers.d/${SEAL_USER}"

log "Preparing SSH directory..."
$SUDO mkdir -p "${SEAL_HOME}/.ssh"
$SUDO chmod 700 "${SEAL_HOME}/.ssh"
$SUDO chown -R "${SEAL_USER}:${SEAL_USER}" "${SEAL_HOME}/.ssh"

if [ -n "$SEAL_KEYS_PATH" ] && [ -f "$SEAL_KEYS_PATH" ]; then
  log "Installing authorized_keys from ${SEAL_KEYS_PATH}"
  $SUDO install -m 600 -o "$SEAL_USER" -g "$SEAL_USER" "$SEAL_KEYS_PATH" "${SEAL_HOME}/.ssh/authorized_keys"
else
  log "WARN: no SEAL_SSH_AUTH_KEYS provided; authorized_keys not updated."
fi

if command -v systemctl >/dev/null 2>&1; then
  log "Enabling ssh service (systemd)"
  $SUDO systemctl enable ssh >/dev/null 2>&1 || true
  $SUDO systemctl start ssh >/dev/null 2>&1 || true
fi

log "Bootstrap complete."

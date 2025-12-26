#!/usr/bin/env bash
set -euo pipefail

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  SUDO="sudo"
fi

INSTALL_GROUP="${SEAL_DOCKER_GROUP:-1}"
START_SERVICE="${SEAL_DOCKER_START:-1}"

log() {
  echo "[install-docker] $*"
}

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    log "ERROR: missing required command: $cmd"
    exit 2
  fi
}

if ! command -v apt-get >/dev/null 2>&1; then
  log "ERROR: apt-get not found. This installer targets Ubuntu/Debian."
  exit 1
fi

log "Installing Docker dependencies..."
$SUDO apt-get update
$SUDO apt-get install -y ca-certificates curl gnupg lsb-release

require_cmd curl
require_cmd gpg

log "Adding Docker apt repo..."
$SUDO install -m 0755 -d /etc/apt/keyrings
if [ ! -f /etc/apt/keyrings/docker.gpg ]; then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | $SUDO gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  $SUDO chmod a+r /etc/apt/keyrings/docker.gpg
fi

ARCH="$(dpkg --print-architecture)"
CODENAME="$(. /etc/os-release && echo "${VERSION_CODENAME:-}")"
if [ -z "$CODENAME" ]; then
  log "ERROR: could not detect Ubuntu codename."
  exit 3
fi

echo "deb [arch=${ARCH} signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${CODENAME} stable" \
  | $SUDO tee /etc/apt/sources.list.d/docker.list >/dev/null

$SUDO apt-get update
$SUDO apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

if [ "$START_SERVICE" = "1" ] && command -v systemctl >/dev/null 2>&1; then
  log "Starting Docker service..."
  $SUDO systemctl enable --now docker || log "WARN: failed to start docker via systemctl"
fi

if [ "$INSTALL_GROUP" = "1" ] && [ -n "$SUDO" ]; then
  log "Adding current user to docker group..."
  $SUDO usermod -aG docker "$USER" || log "WARN: failed to add user to docker group"
  log "NOTE: log out/in to apply docker group membership."
fi

log "Docker install complete."
if command -v docker >/dev/null 2>&1; then
  docker --version || true
fi

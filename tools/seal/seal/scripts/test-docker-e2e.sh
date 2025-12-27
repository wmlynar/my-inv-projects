#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
E2E_DIR="$REPO_ROOT/tools/seal/seal/docker/e2e"
SSH_DIR="$E2E_DIR/ssh"
CACHE_DIR="${SEAL_DOCKER_E2E_CACHE_DIR:-$HOME/.cache/seal/docker-e2e}"
NETWORK_NAME="seal-e2e"
SERVER_NAME="seal-e2e-server"
BUILDER_IMAGE="e2e-seal-builder:latest"
SERVER_IMAGE="e2e-seal-server:latest"

log() {
  echo "[docker-e2e] $*"
}

fail() {
  echo "[docker-e2e] ERROR: $*" >&2
  exit 1
}

DOCKER="docker"

if ! command -v docker >/dev/null 2>&1; then
  fail "docker not found. Run tools/seal/seal/scripts/install-docker.sh first."
fi

if ! docker info >/dev/null 2>&1; then
  if command -v sudo >/dev/null 2>&1 && sudo docker info >/dev/null 2>&1; then
    DOCKER="sudo docker"
    COMPOSE="sudo docker compose"
  else
    fail "docker daemon not available. Start docker service or add user to docker group."
  fi
fi

if ! command -v ssh-keygen >/dev/null 2>&1; then
  fail "ssh-keygen not found. Install openssh-client."
fi

mkdir -p "$SSH_DIR"
chmod 700 "$SSH_DIR"
mkdir -p "$CACHE_DIR"

KEY_FILE="$SSH_DIR/id_ed25519"
PUB_FILE="${KEY_FILE}.pub"
AUTH_FILE="$SSH_DIR/authorized_keys"

if [ ! -f "$KEY_FILE" ]; then
  log "Generating SSH key for docker E2E..."
  ssh-keygen -t ed25519 -N "" -C "seal-e2e" -f "$KEY_FILE" >/dev/null
fi

if [ ! -f "$PUB_FILE" ]; then
  fail "Missing public key: $PUB_FILE"
fi

cp "$PUB_FILE" "$AUTH_FILE"
chmod 600 "$KEY_FILE" "$AUTH_FILE"
chmod 644 "$PUB_FILE"

PULL_ARG=()
if [ "${SEAL_DOCKER_E2E_PULL:-1}" = "1" ]; then
  PULL_ARG+=(--pull)
fi

log "Building docker images..."
$DOCKER build "${PULL_ARG[@]}" --network=host -t "$BUILDER_IMAGE" -f "$E2E_DIR/Dockerfile.builder" "$REPO_ROOT"
$DOCKER build "${PULL_ARG[@]}" --network=host -t "$SERVER_IMAGE" -f "$E2E_DIR/Dockerfile.server" "$REPO_ROOT"

cleanup() {
  if [ "${SEAL_DOCKER_E2E_KEEP:-0}" = "1" ]; then
    log "KEEP enabled; skipping docker cleanup."
    return
  fi
  log "Cleaning up docker containers..."
  $DOCKER rm -f "$SERVER_NAME" >/dev/null 2>&1 || true
  $DOCKER network rm "$NETWORK_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

if ! $DOCKER network ls --format '{{.Name}}' | grep -q "^${NETWORK_NAME}$"; then
  $DOCKER network create "$NETWORK_NAME" >/dev/null
fi

if $DOCKER ps -a --format '{{.Names}}' | grep -q "^${SERVER_NAME}$"; then
  log "Removing stale server container..."
  $DOCKER rm -f "$SERVER_NAME" >/dev/null 2>&1 || true
fi

log "Starting server container..."
$DOCKER run -d \
  --name "$SERVER_NAME" \
  --hostname "$SERVER_NAME" \
  --privileged \
  --cgroupns=host \
  --tmpfs /run \
  --tmpfs /tmp \
  --tmpfs /run/lock \
  -v /sys/fs/cgroup:/sys/fs/cgroup:rw \
  -v "$SSH_DIR:/tmp/seal-ssh:ro" \
  --network "$NETWORK_NAME" \
  "$SERVER_IMAGE" >/dev/null

log "Waiting for sshd (systemd) to be ready..."
READY=0
for _ in $(seq 1 60); do
  if $DOCKER exec "$SERVER_NAME" systemctl is-active ssh >/dev/null 2>&1; then
    READY=1
    break
  fi
  if $DOCKER exec "$SERVER_NAME" pgrep -x sshd >/dev/null 2>&1; then
    READY=1
    break
  fi
  sleep 1
done

if [ "$READY" != "1" ]; then
  $DOCKER logs "$SERVER_NAME" || true
  fail "sshd did not become ready in time."
fi

log "Running full SEAL E2E suite in builder container..."
$DOCKER run --rm \
  --privileged \
  --network "$NETWORK_NAME" \
  -v "$REPO_ROOT:/workspace" \
  -v "$SSH_DIR:/root/.ssh" \
  -v "$CACHE_DIR:/root/.cache/seal" \
  -w /workspace \
  -e SEAL_E2E_INSTALL_DEPS="${SEAL_E2E_INSTALL_DEPS:-1}" \
  -e SEAL_E2E_INSTALL_PACKERS="${SEAL_E2E_INSTALL_PACKERS:-1}" \
  -e SEAL_E2E_INSTALL_OBFUSCATORS="${SEAL_E2E_INSTALL_OBFUSCATORS:-1}" \
  -e SEAL_SHIP_SSH_HOST="$SERVER_NAME" \
  "$BUILDER_IMAGE" \
  bash -lc "tools/seal/seal/scripts/run-e2e-suite.sh"

log "Docker E2E suite completed."

#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
E2E_DIR="$REPO_ROOT/tools/seal/seal/docker/e2e"
CACHE_DIR="${SEAL_DOCKER_E2E_CACHE_DIR:-/tmp/seal-e2e-cache}"
NODE_MODULES_CACHE="$CACHE_DIR/node_modules"
EXAMPLE_NODE_MODULES_CACHE="$CACHE_DIR/example-node_modules"
NPM_CACHE_DIR="$CACHE_DIR/npm"
SSH_DIR="${SEAL_DOCKER_E2E_SSH_DIR:-$CACHE_DIR/ssh}"
NETWORK_NAME="seal-e2e"
SERVER_NAME="seal-e2e-server"
BUILDER_IMAGE="e2e-seal-builder:latest"
SERVER_IMAGE="e2e-seal-server:latest"
REMOTE_E2E="${SEAL_DOCKER_E2E_REMOTE:-1}"

log() {
  echo "[docker-e2e] $*"
}

dir_has_files() {
  [ -d "$1" ] && [ -n "$(ls -A "$1" 2>/dev/null)" ]
}

fail() {
  echo "[docker-e2e] ERROR: $*" >&2
  exit 1
}

SUDO_KEEPALIVE_PID=""

start_sudo_keepalive() {
  if ! sudo -n true >/dev/null 2>&1; then
    return
  fi
  # Keep sudo timestamp alive to avoid mid-run prompts.
  (while true; do sudo -n true; sleep 60; done) &
  SUDO_KEEPALIVE_PID=$!
}

stop_sudo_keepalive() {
  if [ -n "${SUDO_KEEPALIVE_PID:-}" ]; then
    kill "$SUDO_KEEPALIVE_PID" >/dev/null 2>&1 || true
  fi
}

sudo_auth_from_env() {
  if [ -n "${SEAL_DOCKER_E2E_SUDO_PASS_FILE:-}" ]; then
    if [ ! -r "$SEAL_DOCKER_E2E_SUDO_PASS_FILE" ]; then
      fail "SEAL_DOCKER_E2E_SUDO_PASS_FILE is not readable."
    fi
    log "Using SEAL_DOCKER_E2E_SUDO_PASS_FILE for sudo authentication."
    sudo -S -v < "$SEAL_DOCKER_E2E_SUDO_PASS_FILE" >/dev/null 2>&1 || fail "sudo authentication failed."
    return 0
  fi

  if [ -n "${SEAL_DOCKER_E2E_SUDO_PASS:-}" ]; then
    log "Using SEAL_DOCKER_E2E_SUDO_PASS for sudo authentication."
    printf '%s\n' "$SEAL_DOCKER_E2E_SUDO_PASS" | sudo -S -v >/dev/null 2>&1 || fail "sudo authentication failed."
    unset SEAL_DOCKER_E2E_SUDO_PASS
    return 0
  fi

  if [ -n "${SUDO_ASKPASS:-}" ]; then
    log "Using SUDO_ASKPASS for sudo authentication."
    SUDO_ASKPASS_REQUIRE=force sudo -A -v >/dev/null 2>&1 || fail "sudo authentication failed."
    return 0
  fi

  return 1
}

use_sudo_docker() {
  if ! command -v sudo >/dev/null 2>&1; then
    fail "docker daemon not available and sudo not found."
  fi

  if sudo -n docker info >/dev/null 2>&1; then
    DOCKER="sudo docker"
    COMPOSE="sudo docker compose"
    start_sudo_keepalive
    return
  fi

  if sudo_auth_from_env; then
    if ! sudo -n docker info >/dev/null 2>&1; then
      fail "docker daemon not available. Start docker service or add user to docker group."
    fi
    DOCKER="sudo docker"
    COMPOSE="sudo docker compose"
    start_sudo_keepalive
    return
  fi

  if [ ! -t 0 ]; then
    fail "docker needs sudo, but no TTY is available. Run 'sudo -v' in a terminal and re-run, or add your user to the docker group."
  fi

  log "Docker requires sudo; you will be prompted once."
  sudo -v || fail "sudo authentication failed."
  if ! sudo -n docker info >/dev/null 2>&1; then
    fail "docker daemon not available. Start docker service or add user to docker group."
  fi

  DOCKER="sudo docker"
  COMPOSE="sudo docker compose"
  start_sudo_keepalive
}

DOCKER="docker"

if ! command -v docker >/dev/null 2>&1; then
  fail "docker not found. Run tools/seal/seal/scripts/install-docker.sh first."
fi

if ! docker info >/dev/null 2>&1; then
  use_sudo_docker
fi

if ! command -v ssh-keygen >/dev/null 2>&1; then
  fail "ssh-keygen not found. Install openssh-client."
fi

mkdir -p "$SSH_DIR"
chmod 700 "$SSH_DIR"
mkdir -p "$CACHE_DIR"
mkdir -p "$NODE_MODULES_CACHE" "$EXAMPLE_NODE_MODULES_CACHE" "$NPM_CACHE_DIR"
SSH_DIR="$(cd "$SSH_DIR" && pwd)"

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
if [ "$REMOTE_E2E" = "1" ]; then
  $DOCKER build "${PULL_ARG[@]}" --network=host -t "$SERVER_IMAGE" -f "$E2E_DIR/Dockerfile.server" "$REPO_ROOT"
else
  log "Remote SSH E2E disabled (single container mode)."
fi

cleanup() {
  stop_sudo_keepalive
  if [ "${SEAL_DOCKER_E2E_KEEP:-0}" = "1" ]; then
    log "KEEP enabled; skipping docker cleanup."
    return
  fi
  if [ "$REMOTE_E2E" = "1" ]; then
    log "Cleaning up docker containers..."
    $DOCKER rm -f "$SERVER_NAME" >/dev/null 2>&1 || true
    $DOCKER network rm "$NETWORK_NAME" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

if [ "$REMOTE_E2E" = "1" ]; then
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
fi

log "Running full SEAL E2E suite in builder container..."
BUILDER_NET_ARGS=()
if [ "$REMOTE_E2E" = "1" ]; then
  BUILDER_NET_ARGS+=(--network "$NETWORK_NAME")
fi
SHIP_ENV_ARGS=()
if [ "$REMOTE_E2E" = "1" ]; then
  SHIP_ENV_ARGS+=(-e SEAL_SHIP_SSH_HOST="$SERVER_NAME")
fi
NODE_MODULES_ENV=()
if [ "${SEAL_E2E_USE_SHARED_NODE_MODULES:-0}" = "1" ]; then
  NODE_MODULES_ENV+=(-e SEAL_E2E_NODE_MODULES_ROOT="/root/.cache/seal/example-node_modules")
  log "Using shared example node_modules cache (SEAL_E2E_USE_SHARED_NODE_MODULES=1)."
fi
E2E_INSTALL_DEPS="${SEAL_E2E_INSTALL_DEPS:-}"
if [ -z "$E2E_INSTALL_DEPS" ]; then
  if dir_has_files "$NODE_MODULES_CACHE"; then
    E2E_INSTALL_DEPS=0
    log "Using cached node_modules (skip npm install)."
  else
    E2E_INSTALL_DEPS=1
    log "node_modules cache empty; npm install will run once."
  fi
fi
$DOCKER run --rm \
  --init \
  --privileged \
  "${BUILDER_NET_ARGS[@]}" \
  -v "$REPO_ROOT:/workspace" \
  -v "$NODE_MODULES_CACHE:/workspace/node_modules" \
  -v "$NPM_CACHE_DIR:/root/.npm" \
  -v "$SSH_DIR:/tmp/seal-ssh:ro" \
  -v "$CACHE_DIR:/root/.cache/seal" \
  -w /workspace \
  -e SEAL_DOCKER_E2E=1 \
  -e SEAL_E2E_SSH="${REMOTE_E2E}" \
  -e SEAL_E2E_PARALLEL="${SEAL_E2E_PARALLEL:-0}" \
  -e SEAL_E2E_JOBS="${SEAL_E2E_JOBS:-}" \
  -e SEAL_E2E_TESTS="${SEAL_E2E_TESTS:-}" \
  -e SEAL_E2E_SKIP="${SEAL_E2E_SKIP:-}" \
  -e SEAL_E2E_INSTALL_DEPS="$E2E_INSTALL_DEPS" \
  -e SEAL_E2E_INSTALL_PACKERS="${SEAL_E2E_INSTALL_PACKERS:-1}" \
  -e SEAL_E2E_INSTALL_OBFUSCATORS="${SEAL_E2E_INSTALL_OBFUSCATORS:-1}" \
  -e SEAL_E2E_STRICT_PROC_MEM="${SEAL_E2E_STRICT_PROC_MEM:-0}" \
  -e SEAL_E2E_STRICT_PTRACE="${SEAL_E2E_STRICT_PTRACE:-0}" \
  -e SEAL_E2E_STRICT_SNAPSHOT_GUARD="${SEAL_E2E_STRICT_SNAPSHOT_GUARD:-0}" \
  "${NODE_MODULES_ENV[@]}" \
  -e SEAL_NPM_SKIP_IF_PRESENT=1 \
  "${SHIP_ENV_ARGS[@]}" \
  "$BUILDER_IMAGE" \
  bash -lc 'if [ "${SEAL_E2E_PARALLEL:-0}" = "1" ]; then tools/seal/seal/scripts/run-e2e-parallel.sh; else tools/seal/seal/scripts/run-e2e-suite.sh; fi'

log "Docker E2E suite completed."

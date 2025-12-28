#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
E2E_DIR="$REPO_ROOT/tools/seal/seal/docker/e2e"
CACHE_DIR="${SEAL_DOCKER_E2E_CACHE_DIR:-/var/tmp/seal-e2e-cache}"
NODE_MODULES_CACHE="$CACHE_DIR/node_modules"
EXAMPLE_NODE_MODULES_CACHE="$CACHE_DIR/example-node_modules"
NPM_CACHE_DIR="$CACHE_DIR/npm"
SSH_DIR="${SEAL_DOCKER_E2E_SSH_DIR:-$CACHE_DIR/ssh}"
IMAGE_CACHE_DIR="$CACHE_DIR/images"
PLAYWRIGHT_CACHE_DIR="$CACHE_DIR/playwright"
NETWORK_NAME="seal-e2e"
SERVER_NAME="seal-e2e-server"
BUILDER_VARIANT="${SEAL_DOCKER_E2E_BUILDER:-full}"
BUILDER_IMAGE_BASE="e2e-seal-builder:latest"
BUILDER_IMAGE_FULL="e2e-seal-builder-full:latest"
SERVER_IMAGE="e2e-seal-server:latest"
REMOTE_E2E="${SEAL_DOCKER_E2E_REMOTE:-1}"
REMOTE_FALLBACK="${SEAL_DOCKER_E2E_REMOTE_FALLBACK:-1}"
REMOTE_E2E_REQUESTED="$REMOTE_E2E"
TOOLSET="${SEAL_E2E_TOOLSET:-core}"
SERVER_DOCKERFILE="$E2E_DIR/Dockerfile.server"
SERVER_ENTRYPOINT="$E2E_DIR/server-entrypoint.sh"

log() {
  echo "[docker-e2e] $*"
}

dir_has_files() {
  [ -d "$1" ] && [ -n "$(ls -A "$1" 2>/dev/null)" ]
}

load_e2e_config() {
  local cfg="${SEAL_E2E_CONFIG:-}"
  local default_cfg="$REPO_ROOT/.seal/e2e.env"
  local sample_cfg="$REPO_ROOT/tools/seal/seal/scripts/e2e-config.env"
  if [ -z "$cfg" ]; then
    if [ -f "$default_cfg" ]; then
      cfg="$default_cfg"
    elif [ -f "$sample_cfg" ]; then
      cfg="$sample_cfg"
    fi
  fi
  if [ -n "$cfg" ] && [ -f "$cfg" ]; then
    log "Loading E2E config: $cfg"
    set -a
    # shellcheck disable=SC1090
    . "$cfg"
    set +a
  fi
}

load_e2e_config

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

if dir_has_files "$REPO_ROOT/node_modules" && ! dir_has_files "$NODE_MODULES_CACHE"; then
  NODE_MODULES_CACHE="$REPO_ROOT/node_modules"
  log "Using repo node_modules cache."
fi

if [ "$REMOTE_E2E" = "1" ] && ! command -v ssh-keygen >/dev/null 2>&1; then
  if [ "$REMOTE_FALLBACK" = "1" ]; then
    log "WARN: ssh-keygen not found; falling back to single-container mode."
    REMOTE_E2E=0
  else
    fail "ssh-keygen not found. Install openssh-client."
  fi
fi

mkdir -p "$SSH_DIR"
chmod 700 "$SSH_DIR"
mkdir -p "$CACHE_DIR"
mkdir -p "$NODE_MODULES_CACHE" "$EXAMPLE_NODE_MODULES_CACHE" "$NPM_CACHE_DIR" "$PLAYWRIGHT_CACHE_DIR"
mkdir -p "$IMAGE_CACHE_DIR"
SSH_DIR="$(cd "$SSH_DIR" && pwd)"

KEY_FILE="$SSH_DIR/id_ed25519"
PUB_FILE="${KEY_FILE}.pub"
AUTH_FILE="$SSH_DIR/authorized_keys"

if [ "$REMOTE_E2E" = "1" ]; then
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
fi

PULL_ARG=()
if [ "${SEAL_DOCKER_E2E_PULL:-1}" = "1" ]; then
  PULL_ARG+=(--pull)
fi

log "Building docker images..."
BUILDER_DOCKERFILE="$E2E_DIR/Dockerfile.builder"
BUILDER_IMAGE="$BUILDER_IMAGE_BASE"
LOCK_HASH=""
BUILDER_TAR=""
TOOLS_LOCK_FILE="$E2E_DIR/tools.lock"
if [ "$TOOLSET" = "full" ] && [ -f "$E2E_DIR/tools.full.lock" ]; then
  TOOLS_LOCK_FILE="$E2E_DIR/tools.full.lock"
fi
TOOLS_LOCK_ARG="${TOOLS_LOCK_FILE#$REPO_ROOT/}"
if [ "$BUILDER_VARIANT" = "full" ]; then
  BUILDER_DOCKERFILE="$E2E_DIR/Dockerfile.builder.full"
  BUILDER_IMAGE="$BUILDER_IMAGE_FULL"
  log "Using full builder image (preinstalls packers/obfuscators)."
  if [ -f "$TOOLS_LOCK_FILE" ]; then
    LOCK_HASH="$(sha256sum "$TOOLS_LOCK_FILE" | awk '{print $1}')"
    BUILDER_TAR="$IMAGE_CACHE_DIR/${BUILDER_IMAGE//[:/]/_}-${LOCK_HASH}.tar"
  fi
else
  log "Using base builder image."
fi
REBUILD_IMAGES="${SEAL_DOCKER_E2E_REBUILD:-0}"
SKIP_BUILD="${SEAL_DOCKER_E2E_SKIP_BUILD:-0}"
PROGRESS_MODE="${SEAL_DOCKER_E2E_PROGRESS:-plain}"
BUILD_NETWORK="${SEAL_DOCKER_E2E_BUILD_NETWORK:-host}"
BUILD_NETWORK_FALLBACK="${SEAL_DOCKER_E2E_BUILD_NETWORK_FALLBACK:-default}"

docker_build() {
  local network="$1"
  shift
  local net_args=()
  if [ -n "$network" ] && [ "$network" != "skip" ]; then
    net_args+=(--network="$network")
  fi
  DOCKER_BUILDKIT=1 $DOCKER build "${PULL_ARG[@]}" --progress="$PROGRESS_MODE" "${net_args[@]}" "$@"
}
if [ "$REBUILD_IMAGES" != "1" ] && $DOCKER image inspect "$BUILDER_IMAGE" >/dev/null 2>&1; then
  log "Builder image exists; skipping build (set SEAL_DOCKER_E2E_REBUILD=1 to rebuild)."
elif [ "$SKIP_BUILD" = "1" ]; then
  fail "Builder image missing and SEAL_DOCKER_E2E_SKIP_BUILD=1."
elif [ -n "$BUILDER_TAR" ] && [ -f "$BUILDER_TAR" ]; then
  log "Loading cached builder image from $BUILDER_TAR"
  $DOCKER load -i "$BUILDER_TAR" >/dev/null
else
  BUILD_LABELS=()
  if [ -n "$LOCK_HASH" ]; then
    BUILD_LABELS+=(--label "org.seal.tools.lock=$LOCK_HASH")
  fi
  if ! docker_build "$BUILD_NETWORK" \
    "${BUILD_LABELS[@]}" --build-arg "SEAL_TOOLS_LOCK=$TOOLS_LOCK_ARG" \
    -t "$BUILDER_IMAGE" -f "$BUILDER_DOCKERFILE" "$REPO_ROOT"; then
    if [ -n "$BUILD_NETWORK_FALLBACK" ] && [ "$BUILD_NETWORK_FALLBACK" != "$BUILD_NETWORK" ]; then
      log "WARN: builder build failed (network=${BUILD_NETWORK}); retrying (network=${BUILD_NETWORK_FALLBACK})."
      docker_build "$BUILD_NETWORK_FALLBACK" \
        "${BUILD_LABELS[@]}" --build-arg "SEAL_TOOLS_LOCK=$TOOLS_LOCK_ARG" \
        -t "$BUILDER_IMAGE" -f "$BUILDER_DOCKERFILE" "$REPO_ROOT" || fail "Builder image build failed."
    else
      fail "Builder image build failed."
    fi
  fi
  if [ -n "$BUILDER_TAR" ] && [ "${SEAL_DOCKER_E2E_SAVE_IMAGE:-1}" = "1" ]; then
    log "Saving builder image to $BUILDER_TAR"
    $DOCKER save "$BUILDER_IMAGE" -o "$BUILDER_TAR"
  fi
fi
if [ "$REMOTE_E2E" = "1" ]; then
  SERVER_HASH=""
  if [ -f "$SERVER_DOCKERFILE" ]; then
    if [ -f "$SERVER_ENTRYPOINT" ]; then
      SERVER_HASH="$(sha256sum "$SERVER_DOCKERFILE" "$SERVER_ENTRYPOINT" | sha256sum | awk '{print $1}')"
    else
      SERVER_HASH="$(sha256sum "$SERVER_DOCKERFILE" | awk '{print $1}')"
    fi
  fi
  SERVER_LABEL=""
  if $DOCKER image inspect "$SERVER_IMAGE" >/dev/null 2>&1; then
    SERVER_LABEL="$($DOCKER image inspect --format '{{ index .Config.Labels \"org.seal.server.hash\" }}' "$SERVER_IMAGE" 2>/dev/null || true)"
  fi
  SERVER_LABELS=()
  if [ -n "$SERVER_HASH" ]; then
    SERVER_LABELS+=(--label "org.seal.server.hash=$SERVER_HASH")
  fi

  if $DOCKER image inspect "$SERVER_IMAGE" >/dev/null 2>&1; then
    if [ "$REBUILD_IMAGES" = "1" ]; then
      log "Rebuilding server image (SEAL_DOCKER_E2E_REBUILD=1)."
    else
      if [ -n "$SERVER_HASH" ] && [ "$SERVER_LABEL" != "$SERVER_HASH" ]; then
        log "Server image hash changed; using cached image (set SEAL_DOCKER_E2E_REBUILD=1 to rebuild)."
      else
        log "Server image exists; skipping build (set SEAL_DOCKER_E2E_REBUILD=1 to rebuild)."
      fi
      if [ "$SKIP_BUILD" = "1" ]; then
        log "SEAL_DOCKER_E2E_SKIP_BUILD=1 set; skipping server rebuild."
      fi
    fi
  elif [ "$SKIP_BUILD" = "1" ]; then
    fail "Server image missing and SEAL_DOCKER_E2E_SKIP_BUILD=1."
  fi

  if [ "$REBUILD_IMAGES" = "1" ] || ! $DOCKER image inspect "$SERVER_IMAGE" >/dev/null 2>&1; then
    if ! docker_build "$BUILD_NETWORK" \
      "${SERVER_LABELS[@]}" \
      -t "$SERVER_IMAGE" -f "$SERVER_DOCKERFILE" "$REPO_ROOT"; then
      if [ -n "$BUILD_NETWORK_FALLBACK" ] && [ "$BUILD_NETWORK_FALLBACK" != "$BUILD_NETWORK" ]; then
        log "WARN: server build failed (network=${BUILD_NETWORK}); retrying (network=${BUILD_NETWORK_FALLBACK})."
        docker_build "$BUILD_NETWORK_FALLBACK" \
          "${SERVER_LABELS[@]}" \
          -t "$SERVER_IMAGE" -f "$SERVER_DOCKERFILE" "$REPO_ROOT" || fail "Server image build failed."
      else
        fail "Server image build failed."
      fi
    fi
  fi
else
  log "Remote SSH E2E disabled (single container mode)."
fi

SECURITY_OPTS=(--security-opt seccomp=unconfined --security-opt apparmor=unconfined)
CGROUP_ARGS=()
CGROUP_SETTING="${SEAL_DOCKER_E2E_CGROUPNS:-host}"
if [ -n "$CGROUP_SETTING" ] && [ "$CGROUP_SETTING" != "skip" ]; then
  CGROUP_ARGS+=(--cgroupns="$CGROUP_SETTING")
fi

SHM_ARGS=()
if [ "${SEAL_DOCKER_E2E_IPC:-}" = "host" ]; then
  SHM_ARGS+=(--ipc=host)
else
  SHM_SIZE="${SEAL_DOCKER_E2E_SHM_SIZE:-2g}"
  SHM_ARGS+=(--shm-size "$SHM_SIZE")
fi

DEBUG_MOUNTS=()
if [ -d /sys/kernel/debug ]; then
  DEBUG_MOUNTS+=(-v /sys/kernel/debug:/sys/kernel/debug:rw)
fi
if [ -d /sys/kernel/tracing ]; then
  DEBUG_MOUNTS+=(-v /sys/kernel/tracing:/sys/kernel/tracing:rw)
fi
if [ -d /lib/modules ]; then
  DEBUG_MOUNTS+=(-v /lib/modules:/lib/modules:ro)
fi

DEVICE_ARGS=()
if [ -e /dev/kmsg ]; then
  DEVICE_ARGS+=(--device /dev/kmsg)
fi
if [ -e /dev/fuse ]; then
  DEVICE_ARGS+=(--device /dev/fuse)
fi

cleanup() {
  stop_sudo_keepalive
  if [ "${SEAL_DOCKER_E2E_KEEP:-0}" = "1" ]; then
    log "KEEP enabled; skipping docker cleanup."
    return
  fi
  if [ "$REMOTE_E2E_REQUESTED" = "1" ]; then
    log "Cleaning up docker containers..."
    $DOCKER rm -f "$SERVER_NAME" >/dev/null 2>&1 || true
    $DOCKER network rm "$NETWORK_NAME" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

if [ "$REMOTE_E2E" = "1" ]; then
  if ! $DOCKER network ls --format '{{.Name}}' | grep -q "^${NETWORK_NAME}$"; then
    if ! $DOCKER network create "$NETWORK_NAME" >/dev/null 2>&1; then
      if [ "$REMOTE_FALLBACK" = "1" ]; then
        log "WARN: docker network create failed; falling back to single-container mode."
        REMOTE_E2E=0
      else
        fail "docker network create failed."
      fi
    fi
  fi
fi

if [ "$REMOTE_E2E" = "1" ]; then
  if $DOCKER ps -a --format '{{.Names}}' | grep -q "^${SERVER_NAME}$"; then
    log "Removing stale server container..."
    $DOCKER rm -f "$SERVER_NAME" >/dev/null 2>&1 || true
  fi

  log "Starting server container..."
  if ! $DOCKER run -d \
    --name "$SERVER_NAME" \
    --hostname "$SERVER_NAME" \
    --privileged \
    "${SECURITY_OPTS[@]}" \
    "${CGROUP_ARGS[@]}" \
    "${DEVICE_ARGS[@]}" \
    "${DEBUG_MOUNTS[@]}" \
    --tmpfs /run \
    --tmpfs /tmp \
    --tmpfs /run/lock \
    -v /sys/fs/cgroup:/sys/fs/cgroup:rw \
    -v "$SSH_DIR:/tmp/seal-ssh:ro" \
    --network "$NETWORK_NAME" \
    "$SERVER_IMAGE" >/dev/null; then
    if [ "$REMOTE_FALLBACK" = "1" ]; then
      log "WARN: server container failed to start; falling back to single-container mode."
      $DOCKER rm -f "$SERVER_NAME" >/dev/null 2>&1 || true
      $DOCKER network rm "$NETWORK_NAME" >/dev/null 2>&1 || true
      REMOTE_E2E=0
    else
      fail "server container failed to start."
    fi
  fi
fi

if [ "$REMOTE_E2E" = "1" ]; then
  log "Waiting for sshd (systemd) to be ready..."
  SSHD_TIMEOUT="${SEAL_DOCKER_E2E_SSHD_TIMEOUT:-60}"
  READY=0
  for _ in $(seq 1 "$SSHD_TIMEOUT"); do
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
    if [ "$REMOTE_FALLBACK" = "1" ]; then
      log "WARN: sshd not ready; falling back to single-container mode (set SEAL_DOCKER_E2E_REMOTE_FALLBACK=0 to fail)."
      $DOCKER rm -f "$SERVER_NAME" >/dev/null 2>&1 || true
      $DOCKER network rm "$NETWORK_NAME" >/dev/null 2>&1 || true
      REMOTE_E2E=0
    else
      fail "sshd did not become ready in time."
    fi
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
$DOCKER run --rm \
  --init \
  --privileged \
  "${SECURITY_OPTS[@]}" \
  "${CGROUP_ARGS[@]}" \
  "${DEVICE_ARGS[@]}" \
  "${DEBUG_MOUNTS[@]}" \
  "${SHM_ARGS[@]}" \
  "${BUILDER_NET_ARGS[@]}" \
  -v "$REPO_ROOT:/workspace" \
  -v "$NODE_MODULES_CACHE:/workspace/node_modules" \
  -v "$NPM_CACHE_DIR:/root/.npm" \
  -v "$SSH_DIR:/tmp/seal-ssh:ro" \
  -v "$CACHE_DIR:/root/.cache/seal" \
  -v "$PLAYWRIGHT_CACHE_DIR:/root/.cache/ms-playwright" \
  -w /workspace \
  -e SEAL_DOCKER_E2E=1 \
  -e NPM_CONFIG_UNSAFE_PERM=true \
  -e SEAL_E2E_SSH="${REMOTE_E2E}" \
  -e SEAL_E2E_CONFIG="${SEAL_E2E_CONFIG:-}" \
  -e SEAL_E2E_TOOLSET="${TOOLSET}" \
  -e SEAL_E2E_PARALLEL="${SEAL_E2E_PARALLEL:-0}" \
  -e SEAL_E2E_PARALLEL_MODE="${SEAL_E2E_PARALLEL_MODE:-}" \
  -e SEAL_E2E_JOBS="${SEAL_E2E_JOBS:-}" \
  -e SEAL_E2E_TESTS="${SEAL_E2E_TESTS:-}" \
  -e SEAL_E2E_SKIP="${SEAL_E2E_SKIP:-}" \
  -e SEAL_E2E_LIMITED_HOST="${SEAL_E2E_LIMITED_HOST:-}" \
  -e SEAL_E2E_RERUN_FAILED="${SEAL_E2E_RERUN_FAILED:-}" \
  -e SEAL_E2E_RERUN_FROM="${SEAL_E2E_RERUN_FROM:-}" \
  -e SEAL_E2E_SUMMARY_PATH="${SEAL_E2E_SUMMARY_PATH:-}" \
  -e SEAL_E2E_SUMMARY_SCOPE="${SEAL_E2E_SUMMARY_SCOPE:-}" \
  -e SEAL_E2E_SUMMARY_APPEND="${SEAL_E2E_SUMMARY_APPEND:-}" \
  -e SEAL_E2E_LOG_DIR="${SEAL_E2E_LOG_DIR:-}" \
  -e SEAL_E2E_LOG_TAIL_LINES="${SEAL_E2E_LOG_TAIL_LINES:-}" \
  -e SEAL_E2E_CAPTURE_LOGS="${SEAL_E2E_CAPTURE_LOGS:-}" \
  -e SEAL_E2E_FAIL_FAST="${SEAL_E2E_FAIL_FAST:-}" \
  -e SEAL_E2E_INSTALL_DEPS="${SEAL_E2E_INSTALL_DEPS:-}" \
  -e SEAL_E2E_INSTALL_PACKERS="${SEAL_E2E_INSTALL_PACKERS:-}" \
  -e SEAL_E2E_INSTALL_OBFUSCATORS="${SEAL_E2E_INSTALL_OBFUSCATORS:-}" \
  -e SEAL_E2E_STRICT_PROC_MEM="${SEAL_E2E_STRICT_PROC_MEM:-0}" \
  -e SEAL_E2E_STRICT_PTRACE="${SEAL_E2E_STRICT_PTRACE:-0}" \
  -e SEAL_E2E_STRICT_SNAPSHOT_GUARD="${SEAL_E2E_STRICT_SNAPSHOT_GUARD:-0}" \
  "${NODE_MODULES_ENV[@]}" \
  "${SHIP_ENV_ARGS[@]}" \
  "$BUILDER_IMAGE" \
  bash -lc 'if [ "${SEAL_E2E_PARALLEL:-0}" = "1" ]; then tools/seal/seal/scripts/run-e2e-parallel.sh; else tools/seal/seal/scripts/run-e2e-suite.sh; fi'

log "Docker E2E suite completed."

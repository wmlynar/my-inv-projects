#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

CACHE_BIN="${SEAL_E2E_CACHE_BIN:-/root/.cache/seal/bin}"
mkdir -p "$CACHE_BIN"
export PATH="$CACHE_BIN:$PATH"
export SEAL_OLLVM_BIN_DIR="$CACHE_BIN"
export SEAL_HIKARI_BIN_DIR="$CACHE_BIN"
export SEAL_KITESHIELD_BIN_DIR="$CACHE_BIN"
export SEAL_MIDGETPACK_BIN_DIR="$CACHE_BIN"

log() {
  echo "[seal-e2e] $*"
}

has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

if [ "${SEAL_E2E_INSTALL_DEPS:-0}" = "1" ]; then
  log "Installing core SEAL dependencies..."
  "$SCRIPT_DIR/install-seal-deps.sh"
fi

if [ "${SEAL_E2E_INSTALL_PACKERS:-0}" = "1" ]; then
  log "Installing ELF packers..."
  if ! has_cmd upx; then
    "$SCRIPT_DIR/install-upx.sh"
  fi
  if ! has_cmd kiteshield; then
    "$SCRIPT_DIR/install-kiteshield.sh"
  fi
  if ! has_cmd midgetpack; then
    "$SCRIPT_DIR/install-midgetpack.sh"
  fi
  if ! has_cmd strip; then
    "$SCRIPT_DIR/install-strip.sh"
  fi
fi

if [ "${SEAL_E2E_INSTALL_OBFUSCATORS:-0}" = "1" ]; then
  log "Installing C obfuscators..."
  if ! has_cmd ollvm-clang; then
    "$SCRIPT_DIR/install-ollvm.sh"
  fi
  if ! has_cmd hikari-clang; then
    "$SCRIPT_DIR/install-hikari-llvm15.sh"
  fi
fi

export LC_ALL=C
export TZ=UTC

EXAMPLE_SRC="$REPO_ROOT/tools/seal/example"
EXAMPLE_DST="${SEAL_E2E_EXAMPLE_ROOT:-/tmp/seal-example-e2e}"
if [ "${SEAL_E2E_COPY_EXAMPLE:-1}" = "1" ]; then
  log "Preparing disposable example workspace..."
  rm -rf "$EXAMPLE_DST"
  cp -a "$EXAMPLE_SRC" "$EXAMPLE_DST"
  export SEAL_E2E_EXAMPLE_ROOT="$EXAMPLE_DST"
fi

if [ "${SEAL_E2E_INSTALL_EXAMPLE_DEPS:-1}" = "1" ]; then
  if [ -d "${SEAL_E2E_EXAMPLE_ROOT:-$EXAMPLE_DST}" ]; then
    EXAMPLE_DIR="${SEAL_E2E_EXAMPLE_ROOT:-$EXAMPLE_DST}"
    if [ ! -d "$EXAMPLE_DIR/node_modules" ]; then
      log "Installing example dependencies..."
      (cd "$EXAMPLE_DIR" && npm install)
    fi
  fi
fi

if [ ! -s /etc/machine-id ]; then
  log "Generating /etc/machine-id for sentinel E2E..."
  if has_cmd systemd-machine-id-setup; then
    systemd-machine-id-setup >/dev/null 2>&1 || true
  fi
  if [ ! -s /etc/machine-id ]; then
    cat /proc/sys/kernel/random/uuid | tr -d '-' > /etc/machine-id
  fi
fi

export SEAL_THIN_E2E=1
export SEAL_THIN_ANTI_DEBUG_E2E=1
export SEAL_SENTINEL_E2E=1
export SEAL_PROTECTION_E2E=1
export SEAL_OBFUSCATION_E2E=1
export SEAL_STRIP_E2E=1
export SEAL_ELF_PACKERS_E2E=1
export SEAL_C_OBF_E2E=1
export SEAL_UI_E2E=1
export SEAL_POSTJECT_E2E=1
export SEAL_SHIP_E2E=1
export SEAL_SHIP_SSH_E2E=1

export SEAL_SHIP_SSH_HOST="${SEAL_SHIP_SSH_HOST:-seal-server}"
export SEAL_SHIP_SSH_USER="${SEAL_SHIP_SSH_USER:-admin}"
export SEAL_SHIP_SSH_PORT="${SEAL_SHIP_SSH_PORT:-22}"
export SEAL_SHIP_SSH_INSTALL_DIR="${SEAL_SHIP_SSH_INSTALL_DIR:-/home/admin/apps/seal-example}"
export SEAL_SHIP_SSH_SERVICE_NAME="${SEAL_SHIP_SSH_SERVICE_NAME:-seal-example}"
export SEAL_SHIP_SSH_HTTP_PORT="${SEAL_SHIP_SSH_HTTP_PORT:-3333}"

export SEAL_THIN_CHUNK_SIZE="${SEAL_THIN_CHUNK_SIZE:-8388608}"
export SEAL_THIN_ZSTD_LEVEL="${SEAL_THIN_ZSTD_LEVEL:-1}"
export SEAL_THIN_ZSTD_TIMEOUT_MS="${SEAL_THIN_ZSTD_TIMEOUT_MS:-120000}"

export SEAL_UI_E2E_HEADLESS="${SEAL_UI_E2E_HEADLESS:-1}"

if [ "${SEAL_UI_E2E:-0}" = "1" ]; then
  if ! has_cmd npx; then
    log "WARN: npx not found; skipping Playwright browser install"
  else
    if [ ! -d "/root/.cache/ms-playwright" ] || [ -z "$(ls -A /root/.cache/ms-playwright 2>/dev/null)" ]; then
      log "Installing Playwright browsers for UI E2E..."
      (cd "$REPO_ROOT" && npx playwright install --with-deps chromium)
    fi
  fi
fi

run_test() {
  local name="$1"
  shift
  log "Running ${name}..."
  "$@"
  log "OK: ${name}"
}

cd "$REPO_ROOT"

run_test "thin" node tools/seal/seal/scripts/test-thin-e2e.js
run_test "thin-anti-debug" node tools/seal/seal/scripts/test-thin-anti-debug-e2e.js
run_test "sentinel" node tools/seal/seal/scripts/test-sentinel-e2e.js
run_test "protection" node tools/seal/seal/scripts/test-protection-e2e.js
run_test "obfuscation" node tools/seal/seal/scripts/test-obfuscation-e2e.js
run_test "strip" node tools/seal/seal/scripts/test-strip-e2e.js
run_test "elf-packers" node tools/seal/seal/scripts/test-elf-packers-e2e.js
run_test "c-obfuscators" node tools/seal/seal/scripts/test-c-obfuscators-e2e.js
run_test "postject" node tools/seal/seal/scripts/test-postject-e2e.js
run_test "example-ui" node tools/seal/seal/scripts/test-example-ui-e2e.js
run_test "ship" node tools/seal/seal/scripts/test-ship-e2e.js

log "All E2E tests finished."

#!/usr/bin/env bash
set -euo pipefail

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  SUDO="sudo"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SEAL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

NODE_MAJOR="${SEAL_NODE_MAJOR:-24}"
INSTALL_APT="${SEAL_INSTALL_APT:-1}"
INSTALL_NODE="${SEAL_INSTALL_NODE:-1}"
INSTALL_NPM="${SEAL_INSTALL_NPM:-1}"

APT_DEPS=(
  build-essential
  pkg-config
  zstd
  libzstd-dev
  binutils
  curl
  ca-certificates
  rsync
  openssh-client
)

log() {
  echo "[install-seal-deps] $*"
}

has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

node_major() {
  node -v 2>/dev/null | sed -E 's/^v([0-9]+).*/\1/'
}

if [ "$INSTALL_APT" = "1" ]; then
  if ! has_cmd apt-get; then
    log "ERROR: apt-get not found. This installer targets Ubuntu/Debian."
    log "       Install dependencies manually or set SEAL_INSTALL_APT=0."
    exit 2
  fi
  log "Installing core apt dependencies..."
  $SUDO apt-get update
  $SUDO apt-get install -y "${APT_DEPS[@]}"
fi

if [ "$INSTALL_NODE" = "1" ]; then
  NEED_NODE=0
  if ! has_cmd node; then
    NEED_NODE=1
  else
    CUR_MAJOR="$(node_major)"
    if [ -z "$CUR_MAJOR" ] || [ "$CUR_MAJOR" -lt "$NODE_MAJOR" ]; then
      NEED_NODE=1
    fi
  fi

  if [ "$NEED_NODE" = "1" ]; then
    if ! has_cmd curl; then
      log "ERROR: curl not found (required for NodeSource install)."
      exit 3
    fi
    log "Installing Node.js >= ${NODE_MAJOR} (NodeSource)..."
    $SUDO -E bash -c "curl -fsSL https://deb.nodesource.com/setup_${NODE_MAJOR}.x | bash -"
    $SUDO apt-get install -y nodejs
  else
    log "Node.js OK: $(node -v)"
  fi
else
  log "Skipping Node.js install (SEAL_INSTALL_NODE=0)"
fi

if [ "$INSTALL_NPM" = "1" ]; then
  if ! has_cmd npm; then
    log "ERROR: npm not found. Install Node.js first."
    exit 4
  fi
  if [ -f "$REPO_ROOT/package.json" ] && grep -q "\"workspaces\"" "$REPO_ROOT/package.json"; then
    log "Installing npm deps from repo root (workspaces)..."
    (cd "$REPO_ROOT" && npm install)
  else
    log "Installing npm deps in tools/seal/seal..."
    (cd "$SEAL_DIR" && npm install)
  fi

  POSTJECT_CANDIDATES=(
    "$SEAL_DIR/node_modules/.bin/postject"
    "$(dirname "$SEAL_DIR")/node_modules/.bin/postject"
    "$REPO_ROOT/node_modules/.bin/postject"
  )
  FOUND_POSTJECT=""
  for p in "${POSTJECT_CANDIDATES[@]}"; do
    if [ -x "$p" ]; then
      FOUND_POSTJECT="$p"
      break
    fi
  done

  if [ -n "$FOUND_POSTJECT" ]; then
    log "postject OK: $FOUND_POSTJECT"
  elif has_cmd postject; then
    log "postject OK: $(command -v postject)"
  else
    log "WARN: postject not found after npm install."
    log "      Run npm install again or check network/proxy settings."
  fi
else
  log "Skipping npm install (SEAL_INSTALL_NPM=0)"
fi

log "Done."
log "Optional extras (run only if needed):"
log "  - $SCRIPT_DIR/install-upx.sh"
log "  - $SCRIPT_DIR/install-strip.sh"
log "  - $SCRIPT_DIR/install-ollvm.sh"
log "  - $SCRIPT_DIR/install-hikari-llvm15.sh"
log "  - $SCRIPT_DIR/install-kiteshield.sh"
log "  - $SCRIPT_DIR/install-midgetpack.sh"

#!/usr/bin/env bash
set -euo pipefail

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  SUDO="sudo"
fi

run_sudo() {
  if [ -n "$SUDO" ]; then
    "$SUDO" -E "$@"
  else
    "$@"
  fi
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SEAL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

NODE_MAJOR="${SEAL_NODE_MAJOR:-24}"
INSTALL_APT="${SEAL_INSTALL_APT:-1}"
INSTALL_NODE="${SEAL_INSTALL_NODE:-1}"
INSTALL_NPM="${SEAL_INSTALL_NPM:-1}"
INSTALL_E2E_TOOLS="${SEAL_INSTALL_E2E_TOOLS:-1}"
INSTALL_KITESHIELD="${SEAL_INSTALL_KITESHIELD:-1}"
SKIP_NPM_IF_PRESENT="${SEAL_NPM_SKIP_IF_PRESENT:-0}"

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
  run_sudo apt-get update
  run_sudo apt-get install -y "${APT_DEPS[@]}"
  if [ "$INSTALL_E2E_TOOLS" = "1" ]; then
    log "Installing E2E anti-debug tools..."
    SEAL_E2E_TOOLS_SKIP_UPDATE=1 "$SCRIPT_DIR/install-e2e-tools.sh"
  else
    log "Skipping E2E tool install (SEAL_INSTALL_E2E_TOOLS=0)"
  fi
elif [ "$INSTALL_E2E_TOOLS" = "1" ]; then
  log "WARN: SEAL_INSTALL_APT=0; E2E tools not installed."
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
    run_sudo bash -c "curl -fsSL https://deb.nodesource.com/setup_${NODE_MAJOR}.x | bash -"
    run_sudo apt-get install -y nodejs
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
  DO_NPM_INSTALL=1
  if [ "$SKIP_NPM_IF_PRESENT" = "1" ]; then
    if [ -f "$REPO_ROOT/package.json" ] && grep -q "\"workspaces\"" "$REPO_ROOT/package.json"; then
      if [ -d "$REPO_ROOT/node_modules" ] && [ -n "$(ls -A "$REPO_ROOT/node_modules" 2>/dev/null)" ]; then
        log "npm deps already present; skipping npm install (SEAL_NPM_SKIP_IF_PRESENT=1)."
        DO_NPM_INSTALL=0
      fi
    else
      if [ -d "$SEAL_DIR/node_modules" ] && [ -n "$(ls -A "$SEAL_DIR/node_modules" 2>/dev/null)" ]; then
        log "npm deps already present; skipping npm install (SEAL_NPM_SKIP_IF_PRESENT=1)."
        DO_NPM_INSTALL=0
      fi
    fi
  fi

  if [ "$DO_NPM_INSTALL" = "1" ]; then
    if [ -f "$REPO_ROOT/package.json" ] && grep -q "\"workspaces\"" "$REPO_ROOT/package.json"; then
      log "Installing npm deps from repo root (workspaces)..."
      (cd "$REPO_ROOT" && npm install)
    else
      log "Installing npm deps in tools/seal/seal..."
      (cd "$SEAL_DIR" && npm install)
    fi
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

  TERSER_CANDIDATES=(
    "$SEAL_DIR/node_modules/.bin/terser"
    "$(dirname "$SEAL_DIR")/node_modules/.bin/terser"
    "$REPO_ROOT/node_modules/.bin/terser"
  )
  FOUND_TERSER=""
  for p in "${TERSER_CANDIDATES[@]}"; do
    if [ -x "$p" ]; then
      FOUND_TERSER="$p"
      break
    fi
  done

  if [ -n "$FOUND_TERSER" ]; then
    log "terser OK: $FOUND_TERSER"
  elif has_cmd terser; then
    log "terser OK: $(command -v terser)"
  else
    log "WARN: terser not found after npm install."
    log "      Backend terser pass will be unavailable until dependencies are installed."
  fi

  if [ "$INSTALL_E2E_TOOLS" = "1" ]; then
    for tool in gdb gdbserver strace ltrace; do
      if has_cmd "$tool"; then
        log "$tool OK: $(command -v "$tool")"
      else
        log "WARN: $tool not found (install via apt-get if needed)."
      fi
    done
    if has_cmd coredumpctl; then
      log "coredumpctl OK: $(command -v coredumpctl)"
    else
      log "WARN: coredumpctl not found (core crash E2E will be partially skipped)."
    fi
  fi
else
  log "Skipping npm install (SEAL_INSTALL_NPM=0)"
fi

if [ "$INSTALL_KITESHIELD" = "1" ]; then
  if has_cmd kiteshield; then
    log "kiteshield OK: $(command -v kiteshield)"
  else
    log "Installing kiteshield (ELF packer)..."
    "$SCRIPT_DIR/install-kiteshield.sh"
  fi
else
  log "Skipping kiteshield install (SEAL_INSTALL_KITESHIELD=0)"
fi

log "Done."
log "Optional extras (run only if needed):"
log "  - $SCRIPT_DIR/install-e2e-tools.sh"
log "  - $SCRIPT_DIR/install-e2e-antidebug-deps.sh"
log "  - $SCRIPT_DIR/install-upx.sh"
log "  - $SCRIPT_DIR/install-strip.sh"
log "  - $SCRIPT_DIR/install-ollvm.sh"
log "  - $SCRIPT_DIR/install-hikari-llvm15.sh"
log "  - $SCRIPT_DIR/install-kiteshield.sh"
log "  - $SCRIPT_DIR/install-midgetpack.sh"

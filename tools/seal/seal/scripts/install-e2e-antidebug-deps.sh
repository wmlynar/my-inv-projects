#!/usr/bin/env bash
set -euo pipefail

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  SUDO="sudo"
fi

export DEBIAN_FRONTEND=noninteractive
export TZ=UTC

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() {
  echo "[install-e2e-antidebug-deps] $*"
}

if ! command -v apt-get >/dev/null 2>&1; then
  log "ERROR: apt-get not found. This installer targets Ubuntu/Debian."
  exit 2
fi

install_if_available() {
  local pkg="$1"
  if apt-cache show "$pkg" >/dev/null 2>&1; then
    $SUDO apt-get install -y "$pkg"
    return 0
  fi
  return 1
}

log "Installing anti-debug E2E dependencies (test machines only)..."
$SUDO apt-get update
SEAL_E2E_TOOLS_SKIP_UPDATE=1 "$SCRIPT_DIR/install-e2e-tools.sh"

EXTRA_DEPS=(
  dynamorio
  frida-tools
)

log "Installing extra attach tools (best-effort)..."
for pkg in "${EXTRA_DEPS[@]}"; do
  if ! install_if_available "$pkg"; then
    log "SKIP: $pkg not available in apt repositories."
  fi
done

if [ "${SEAL_E2E_INSTALL_FRIDA_PIP:-0}" = "1" ]; then
  log "Installing frida-tools via pip (SEAL_E2E_INSTALL_FRIDA_PIP=1)..."
  install_if_available python3-pip || true
  if command -v pip3 >/dev/null 2>&1; then
    $SUDO pip3 install -U frida-tools
  else
    log "WARN: pip3 not found; frida-tools not installed."
  fi
fi

log "Manual-only tools (not installed automatically):"
log "  - Intel Pin (pin)"
log "  - AVML (avml)"
log "Notes:"
log "  - Some attach tests require privileged containers and cgroup v2."
log "  - Mount /sys/kernel/debug for perf/bpf tooling when needed."
log "Done."

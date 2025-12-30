#!/usr/bin/env bash
set -euo pipefail

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  SUDO="sudo"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log() {
  echo "[install-e2e-advanced-deps] $*"
}

if ! command -v apt-get >/dev/null 2>&1; then
  log "ERROR: apt-get not found. This installer targets Ubuntu/Debian."
  exit 2
fi

log "Installing advanced anti-debug toolchain (test machines only)..."
SEAL_E2E_INSTALL_FRIDA_PIP=1 \
SEAL_E2E_INSTALL_CRIU=1 \
  "$SCRIPT_DIR/install-e2e-antidebug-deps.sh"

log "Manual-only tools (install separately if you want all strict checks):"
log "  - Intel Pin (pin)"
log "  - AVML (avml)"
log "Notes:"
log "  - Some attach tests require privileged containers and cgroup v2."
log "  - Mount /sys/kernel/debug for perf/bpf tooling when needed."
log "Done."

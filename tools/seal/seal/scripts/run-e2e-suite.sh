#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
JS_RUNNER="$SCRIPT_DIR/run-e2e-suite.js"

log() {
  echo "[seal-e2e] $*"
}

ensure_escalation() {
  if [ "${SEAL_E2E_REQUIRE_ESCALATION:-1}" != "1" ]; then
    return
  fi
  if [ "${SEAL_E2E_ESCALATED:-0}" = "1" ]; then
    return
  fi
  if [ "$(id -u)" -eq 0 ]; then
    export SEAL_E2E_ESCALATED=1
    return
  fi
  if ! command -v sudo >/dev/null 2>&1; then
    log "ERROR: escalation required but sudo not found."
    exit 1
  fi
  if sudo -n true >/dev/null 2>&1; then
    log "Escalating via sudo..."
    exec sudo -E env SEAL_E2E_ESCALATED=1 "$0" "$@"
  fi
  if [ ! -t 0 ]; then
    log "ERROR: escalation required but no TTY; re-run with sudo or Codex escalation."
    exit 1
  fi
  log "Escalation required; you may be prompted."
  sudo -v || exit 1
  exec sudo -E env SEAL_E2E_ESCALATED=1 "$0" "$@"
}

ensure_escalation "$@"

NODE_BIN="$(command -v node || true)"
if [ -z "$NODE_BIN" ]; then
  NODE_BIN="$(command -v nodejs || true)"
fi
if [ -z "$NODE_BIN" ]; then
  log "ERROR: node not found in PATH."
  exit 1
fi

exec "$NODE_BIN" "$JS_RUNNER" "$@"

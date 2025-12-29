#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
RUNNER="${SEAL_E2E_RUNNER:-}"
LOG_PREFIX="${SEAL_E2E_LOG_PREFIX:-seal-e2e}"
SCRIPT_PATH="$SCRIPT_DIR/$(basename "${BASH_SOURCE[0]}")"

log() {
  echo "[${LOG_PREFIX}] $*"
}

load_e2e_config() {
  if [ "${SEAL_E2E_CONFIG_LOADED:-0}" = "1" ]; then
    return
  fi
  local cfg="${SEAL_E2E_CONFIG:-}"
  local default_cfg="$REPO_ROOT/.seal/e2e.env"
  local sample_cfg="$SCRIPT_DIR/e2e-config.env"
  if [ -z "$cfg" ]; then
    if [ -f "$default_cfg" ]; then
      cfg="$default_cfg"
    elif [ -f "$sample_cfg" ]; then
      cfg="$sample_cfg"
    fi
  fi
  if [ -z "$cfg" ]; then
    return
  fi
  if [ "$cfg" = "/dev/null" ]; then
    return
  fi
  if [ ! -r "$cfg" ]; then
    log "ERROR: SEAL_E2E_CONFIG is not readable: $cfg"
    exit 1
  fi
  log "Loading E2E config: $cfg"
  set -a
  set +u
  # shellcheck disable=SC1090
  source "$cfg"
  set -u
  set +a
  export SEAL_E2E_CONFIG_LOADED=1
}

PLAN_ARGS=()
for arg in "$@"; do
  case "$arg" in
    --plan)
      export SEAL_E2E_PLAN=1
      ;;
    --explain)
      export SEAL_E2E_EXPLAIN=1
      ;;
    *)
      PLAN_ARGS+=("$arg")
      ;;
  esac
done
set -- "${PLAN_ARGS[@]}"

if [ -z "$RUNNER" ]; then
  log "ERROR: SEAL_E2E_RUNNER is not set."
  exit 1
fi

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
    exec sudo -E env SEAL_E2E_ESCALATED=1 bash "$SCRIPT_PATH" "$@"
  fi
  if [ ! -t 0 ]; then
    log "ERROR: escalation required but no TTY; re-run with sudo or Codex escalation."
    exit 1
  fi
  log "Escalation required; you may be prompted."
  sudo -v || exit 1
  exec sudo -E env SEAL_E2E_ESCALATED=1 bash "$SCRIPT_PATH" "$@"
}

ensure_escalation "$@"

load_e2e_config

NODE_BIN="$(command -v node || true)"
if [ -z "$NODE_BIN" ]; then
  NODE_BIN="$(command -v nodejs || true)"
fi
if [ -z "$NODE_BIN" ]; then
  log "ERROR: node not found in PATH."
  exit 1
fi

exec "$NODE_BIN" "$RUNNER" "$@"

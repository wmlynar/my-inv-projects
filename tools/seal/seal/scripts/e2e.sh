#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

usage() {
  cat <<'EOF'
Usage: e2e.sh [--local|--docker]

Defaults:
  - Uses seal-out/e2e for E2E root and cache.
  - Set SEAL_E2E_ROOT or SEAL_E2E_CACHE_DIR to override.
  - Set SEAL_E2E_RUN_MODE=single|parallel to choose runner (default: single).

Common env flags:
  SEAL_E2E_CONFIG=path        Use .env-style config (default: .seal/e2e.env or e2e-config.env).
  SEAL_E2E_TESTS=...          Run only selected tests (names from e2e-tests.json5).
  SEAL_E2E_SKIP=...           Skip selected tests.
  SEAL_E2E_TOOLSET=core|full  Toolset toggle (full enables packers/obfuscators tests).
  SEAL_E2E_RUN_MODE=parallel  Run tests in parallel.
  SEAL_E2E_PARALLEL=1         Legacy parallel toggle (maps to run_mode=parallel).
  SEAL_E2E_CONCURRENT=1       Force concurrent run layout (alias for run_layout=concurrent).
  SEAL_E2E_RUN_LAYOUT=auto|shared|concurrent  Run root layout (default: auto).
  SEAL_E2E_TMP_ALLOW_EXTERNAL=1  Allow tmp outside run root (not recommended).
  SEAL_E2E_PLAN=1             Print test plan and exit.
  SEAL_E2E_SETUP_ONLY=1       Install/prepare deps only, no tests.
  SEAL_E2E_REQUIRE_ESCALATION=0  Disable sudo re-exec.

Docker env flags:
  SEAL_DOCKER_E2E_REMOTE=1     Two-container mode (builder + server).
  SEAL_DOCKER_E2E_HOST=1       Run host-only tests in Docker (privileged).

Examples:
  SEAL_E2E_TESTS=thin,thin-anti-debug tools/seal/seal/scripts/e2e.sh --local
  SEAL_E2E_TOOLSET=full tools/seal/seal/scripts/e2e.sh --local
  SEAL_DOCKER_E2E_HOST=1 tools/seal/seal/scripts/e2e.sh --docker
EOF
}

MODE="local"
if [ "${1:-}" = "--docker" ]; then
  MODE="docker"
  shift
elif [ "${1:-}" = "--local" ]; then
  MODE="local"
  shift
elif [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  usage
  exit 0
elif [ -n "${1:-}" ]; then
  echo "Unknown option: $1" >&2
  usage
  exit 1
fi

E2E_ROOT_DEFAULT="$REPO_ROOT/seal-out/e2e"
export SEAL_E2E_ROOT="${SEAL_E2E_ROOT:-$E2E_ROOT_DEFAULT}"
CACHE_ROOT="${SEAL_E2E_CACHE_DIR:-$SEAL_E2E_ROOT/cache}"
export SEAL_E2E_CACHE_DIR="$CACHE_ROOT"
export SEAL_E2E_CACHE_BIN="${SEAL_E2E_CACHE_BIN:-$CACHE_ROOT/bin}"
export SEAL_DOCKER_E2E_CACHE_DIR="${SEAL_DOCKER_E2E_CACHE_DIR:-$CACHE_ROOT}"

RUN_MODE="${SEAL_E2E_RUN_MODE:-}"
if [ -z "$RUN_MODE" ]; then
  if [ "${SEAL_E2E_PARALLEL:-0}" = "1" ]; then
    RUN_MODE="parallel"
  else
    RUN_MODE="single"
  fi
fi
export SEAL_E2E_RUN_MODE="$RUN_MODE"

if [ "$MODE" = "docker" ]; then
  exec "$SCRIPT_DIR/test-docker-e2e.sh"
fi

if [ "$RUN_MODE" = "parallel" ]; then
  exec "$SCRIPT_DIR/run-e2e-parallel.sh"
fi

exec "$SCRIPT_DIR/run-e2e-suite.sh"

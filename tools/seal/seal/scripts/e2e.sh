#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  cat <<'EOF'
Usage: e2e.sh [--local|--docker]

Defaults:
  - Uses /tmp/seal-e2e-cache for both local and Docker cache roots.
  - Set SEAL_E2E_CACHE_DIR or SEAL_DOCKER_E2E_CACHE_DIR to override.
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

CACHE_ROOT="${SEAL_E2E_CACHE_DIR:-/tmp/seal-e2e-cache}"
export SEAL_E2E_CACHE_DIR="$CACHE_ROOT"
export SEAL_E2E_CACHE_BIN="${SEAL_E2E_CACHE_BIN:-$CACHE_ROOT/bin}"
export SEAL_DOCKER_E2E_CACHE_DIR="${SEAL_DOCKER_E2E_CACHE_DIR:-$CACHE_ROOT}"

if [ "$MODE" = "docker" ]; then
  exec "$SCRIPT_DIR/test-docker-e2e.sh"
fi

if [ "${SEAL_E2E_PARALLEL:-0}" = "1" ]; then
  exec "$SCRIPT_DIR/run-e2e-parallel.sh"
fi

exec "$SCRIPT_DIR/run-e2e-suite.sh"

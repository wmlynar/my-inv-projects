#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export SEAL_E2E_RUNNER="$SCRIPT_DIR/run-e2e-parallel.js"
export SEAL_E2E_LOG_PREFIX="seal-e2e-parallel"

exec bash "$SCRIPT_DIR/run-e2e-entry.sh" "$@"

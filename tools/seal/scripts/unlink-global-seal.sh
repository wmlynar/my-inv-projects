#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SEAL_DIR="$ROOT/seal"

echo "[seal] Removing global link for seal-cli"

if [ -d "$SEAL_DIR" ]; then
  cd "$SEAL_DIR"
fi

if npm ls -g --depth=0 seal-cli >/dev/null 2>&1; then
  npm unlink -g seal-cli
  echo "[seal] Unlinked: seal-cli"
else
  echo "[seal] seal-cli not found in global npm"
fi

echo ""
echo "[seal] Check:"
echo "  command -v seal || echo 'seal not found'"

#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SEAL_DIR="$ROOT/seal"

if [ ! -d "$SEAL_DIR" ]; then
  echo "[seal] Expected directory not found: $SEAL_DIR" 1>&2
  exit 1
fi

echo "[seal] Linking global CLI from: $SEAL_DIR"
cd "$SEAL_DIR"
npm link

echo ""
echo "[seal] Ensure npm global bin is on PATH:"
echo "  npm bin -g"
echo "  export PATH=\"$(npm bin -g):\$PATH\""
echo ""
echo "[seal] Check:"
echo "  command -v seal"
echo "  seal --version"

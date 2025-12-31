#!/usr/bin/env bash
set -euo pipefail

TARGET="${1:-prod}"
DIAG_DIR="${SEAL_DIAG_DIR:-seal-out/diagnostics}"

mkdir -p "$DIAG_DIR"

echo "== seal config (${TARGET}) =="
seal config "$TARGET" || true
echo ""

echo "== seal sentinel probe (${TARGET}) =="
seal sentinel probe "$TARGET" || true
echo ""

echo "== seal sentinel inspect (${TARGET}) =="
seal sentinel inspect "$TARGET" || true
echo ""

echo "== seal sentinel verify (${TARGET}) =="
seal sentinel verify "$TARGET" || true
echo ""

if [ -x "seal-out/release/b/a" ]; then
  echo "== local thin runtime (strace) =="
  strace -f -o "$DIAG_DIR/seal-thin.strace" seal-out/release/b/a || true
  tail -n 50 "$DIAG_DIR/seal-thin.strace" || true
fi

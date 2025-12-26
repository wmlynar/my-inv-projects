#!/usr/bin/env bash
set -euo pipefail

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  SUDO="sudo"
fi

if command -v upx >/dev/null 2>&1; then
  echo "[install-upx] upx already installed: $(command -v upx)"
  exit 0
fi

echo "[install-upx] Installing UPX..."
$SUDO apt-get update
if $SUDO apt-get install -y upx-ucl; then
  :
elif $SUDO apt-get install -y upx; then
  :
else
  echo "[install-upx] ERROR: Could not install UPX (packages upx-ucl/upx not available)."
  exit 2
fi

if ! command -v upx >/dev/null 2>&1; then
  echo "[install-upx] ERROR: upx not found after installation."
  exit 3
fi

echo "[install-upx] OK: $(command -v upx)"

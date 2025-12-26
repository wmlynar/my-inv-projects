#!/usr/bin/env bash
set -euo pipefail

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  SUDO="sudo"
fi

if command -v strip >/dev/null 2>&1 && command -v readelf >/dev/null 2>&1; then
  echo "[install-strip] strip already installed: $(command -v strip)"
  echo "[install-strip] readelf already installed: $(command -v readelf)"
  exit 0
fi

echo "[install-strip] Installing binutils (strip/readelf)..."
$SUDO apt-get update
$SUDO apt-get install -y binutils

if ! command -v strip >/dev/null 2>&1; then
  echo "[install-strip] ERROR: strip not found after installation."
  exit 2
fi
if ! command -v readelf >/dev/null 2>&1; then
  echo "[install-strip] ERROR: readelf not found after installation."
  exit 3
fi

echo "[install-strip] OK: $(command -v strip)"
echo "[install-strip] OK: $(command -v readelf)"

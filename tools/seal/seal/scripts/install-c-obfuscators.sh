#!/usr/bin/env bash
set -euo pipefail

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  SUDO="sudo"
fi

echo "[install-c-obfuscators] Installing build dependencies..."
$SUDO apt-get update
$SUDO apt-get install -y \
  build-essential \
  git \
  cmake \
  ninja-build \
  pkg-config \
  clang \
  llvm \
  lld \
  python3

if [ "${SEAL_INSTALL_OBFUSCATORS:-0}" != "1" ]; then
  echo "[install-c-obfuscators] Dependencies installed."
  echo "[install-c-obfuscators] Set SEAL_INSTALL_OBFUSCATORS=1 to clone/build obfuscators."
  exit 0
fi

ROOT="${SEAL_OBFUSCATOR_DIR:-$HOME/.cache/seal/obfuscators}"
mkdir -p "$ROOT"
cd "$ROOT"

echo "[install-c-obfuscators] Cloning obfuscators..."
if [ ! -d obfuscator-llvm ]; then
  git clone https://github.com/obfuscator-llvm/obfuscator.git obfuscator-llvm
fi

if [ ! -d hikari ]; then
  git clone https://github.com/HikariObfuscator/Hikari.git hikari
fi

echo "[install-c-obfuscators] NOTE: Build steps are tool-specific."
echo "[install-c-obfuscators] Follow README in each repo to build an obfuscating clang."
echo "[install-c-obfuscators] Then point SEAL to it via build.protection.cObfuscatorCmd."

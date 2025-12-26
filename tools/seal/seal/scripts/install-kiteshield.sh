#!/usr/bin/env bash
set -euo pipefail

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  SUDO="sudo"
fi

REPO="${SEAL_KITESHIELD_REPO:-}"
REF="${SEAL_KITESHIELD_REF:-}"
ROOT="${SEAL_KITESHIELD_DIR:-$HOME/.cache/seal/kiteshield}"
BIN_NAME="${SEAL_KITESHIELD_BIN:-kiteshield}"
BIN_DIR="${SEAL_KITESHIELD_BIN_DIR:-/usr/local/bin}"

if [ -z "$REPO" ]; then
  echo "[install-kiteshield] ERROR: SEAL_KITESHIELD_REPO is not set."
  echo "[install-kiteshield] Example: SEAL_KITESHIELD_REPO=https://github.com/<org>/<repo>.git"
  exit 2
fi

echo "[install-kiteshield] Installing build dependencies..."
$SUDO apt-get update
$SUDO apt-get install -y git build-essential cmake pkg-config ninja-build

mkdir -p "$ROOT"
if [ -d "$ROOT/.git" ]; then
  echo "[install-kiteshield] Updating repo..."
  git -C "$ROOT" fetch --all --tags
else
  echo "[install-kiteshield] Cloning repo..."
  git clone "$REPO" "$ROOT"
fi

if [ -n "$REF" ]; then
  echo "[install-kiteshield] Checkout ref: $REF"
  git -C "$ROOT" checkout "$REF"
fi

cd "$ROOT"

echo "[install-kiteshield] Building..."
if [ -f Cargo.toml ]; then
  $SUDO apt-get install -y cargo
  cargo build --release
  BIN_PATH="$ROOT/target/release/$BIN_NAME"
elif [ -f CMakeLists.txt ]; then
  cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Release
  cmake --build build
  if [ -x "$ROOT/build/$BIN_NAME" ]; then
    BIN_PATH="$ROOT/build/$BIN_NAME"
  elif [ -x "$ROOT/build/bin/$BIN_NAME" ]; then
    BIN_PATH="$ROOT/build/bin/$BIN_NAME"
  else
    BIN_PATH="$(find "$ROOT/build" -maxdepth 3 -type f -name "$BIN_NAME" -perm -111 | head -n 1 || true)"
  fi
elif [ -f Makefile ] || [ -f makefile ]; then
  make -j
  if [ -x "$ROOT/$BIN_NAME" ]; then
    BIN_PATH="$ROOT/$BIN_NAME"
  else
    BIN_PATH="$(find "$ROOT" -maxdepth 2 -type f -name "$BIN_NAME" -perm -111 | head -n 1 || true)"
  fi
else
  echo "[install-kiteshield] ERROR: Unknown build system (no Cargo.toml/CMakeLists.txt/Makefile)."
  exit 3
fi

if [ -z "${BIN_PATH:-}" ] || [ ! -x "$BIN_PATH" ]; then
  echo "[install-kiteshield] ERROR: Built binary not found. Set SEAL_KITESHIELD_BIN if name differs."
  exit 4
fi

echo "[install-kiteshield] Installing to $BIN_DIR/$BIN_NAME"
$SUDO install -m 0755 "$BIN_PATH" "$BIN_DIR/$BIN_NAME"
echo "[install-kiteshield] OK"

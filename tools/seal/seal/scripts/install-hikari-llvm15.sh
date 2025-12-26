#!/usr/bin/env bash
set -euo pipefail

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  SUDO="sudo"
fi

REPO="${SEAL_HIKARI_REPO:-https://github.com/HikariObfuscator/Hikari.git}"
REF="${SEAL_HIKARI_REF:-}"
ROOT="${SEAL_HIKARI_DIR:-$HOME/.cache/seal/obfuscators/hikari}"
BUILD_DIR="${SEAL_HIKARI_BUILD_DIR:-$ROOT/build}"
BUILD="${SEAL_HIKARI_BUILD:-1}"
TARGET="${SEAL_HIKARI_BUILD_TARGET:-clang}"
EXTRA_CMAKE_ARGS="${SEAL_HIKARI_CMAKE_ARGS:-}"

echo "[install-hikari] Installing build dependencies..."
$SUDO apt-get update
$SUDO apt-get install -y \
  build-essential \
  git \
  cmake \
  ninja-build \
  pkg-config \
  clang \
  lld \
  python3 \
  libxml2-dev \
  libedit-dev \
  zlib1g-dev \
  libssl-dev \
  libffi-dev \
  liblzma-dev \
  libncurses5-dev \
  libncursesw5-dev

mkdir -p "$ROOT"
if [ -d "$ROOT/.git" ]; then
  echo "[install-hikari] Updating repo..."
  git -C "$ROOT" fetch --all --tags
else
  echo "[install-hikari] Cloning Hikari..."
  git clone "$REPO" "$ROOT"
fi

if [ -n "$REF" ]; then
  echo "[install-hikari] Checkout ref: $REF"
  git -C "$ROOT" checkout "$REF"
fi

if [ -f "$ROOT/.gitmodules" ]; then
  echo "[install-hikari] Syncing submodules..."
  git -C "$ROOT" submodule update --init --recursive
fi

if [ "$BUILD" != "1" ]; then
  echo "[install-hikari] Sources ready. Set SEAL_HIKARI_BUILD=1 to build."
  exit 0
fi

SRC_DIR=""
if [ -d "$ROOT/llvm-project/llvm" ]; then
  SRC_DIR="$ROOT/llvm-project/llvm"
elif [ -d "$ROOT/llvm" ] && [ -f "$ROOT/llvm/CMakeLists.txt" ]; then
  SRC_DIR="$ROOT/llvm"
elif [ -f "$ROOT/CMakeLists.txt" ]; then
  SRC_DIR="$ROOT"
fi

if [ -z "$SRC_DIR" ]; then
  echo "[install-hikari] ERROR: Could not locate LLVM source directory in repo."
  echo "[install-hikari] Set SEAL_HIKARI_DIR to a repo with llvm/ or llvm-project/llvm."
  exit 3
fi

echo "[install-hikari] Building Hikari (LLVM 15)..."
cmake -G Ninja \
  -DLLVM_ENABLE_PROJECTS=clang \
  -DLLVM_TARGETS_TO_BUILD=X86 \
  -DCMAKE_BUILD_TYPE=Release \
  $EXTRA_CMAKE_ARGS \
  -S "$SRC_DIR" \
  -B "$BUILD_DIR"

ninja -C "$BUILD_DIR" "$TARGET"

echo "[install-hikari] Done."
echo "[install-hikari] Obfuscating clang: $BUILD_DIR/bin/clang"

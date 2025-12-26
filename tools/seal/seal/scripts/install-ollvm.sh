#!/usr/bin/env bash
set -euo pipefail

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  SUDO="sudo"
fi

ROOT="${SEAL_OLLVM_DIR:-$HOME/.cache/seal/obfuscators/obfuscator-llvm}"
BRANCH="${SEAL_OLLVM_BRANCH:-llvm-4.0}"
BUILD_DIR="${SEAL_OLLVM_BUILD_DIR:-$ROOT/build}"
BUILD="${SEAL_OLLVM_BUILD:-1}"

echo "[install-ollvm] Installing build dependencies..."
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

mkdir -p "$ROOT"
if [ -d "$ROOT/.git" ]; then
  echo "[install-ollvm] Updating repo..."
  git -C "$ROOT" fetch --all --tags
else
  echo "[install-ollvm] Cloning O-LLVM..."
  git clone https://github.com/obfuscator-llvm/obfuscator.git "$ROOT"
fi

echo "[install-ollvm] Checkout branch: $BRANCH"
if git -C "$ROOT" show-ref --verify --quiet "refs/heads/$BRANCH"; then
  git -C "$ROOT" checkout -q "$BRANCH"
else
  git -C "$ROOT" checkout -q -b "$BRANCH" "origin/$BRANCH"
fi

if [ "$BUILD" != "1" ]; then
  echo "[install-ollvm] Sources ready. Set SEAL_OLLVM_BUILD=1 to build."
  exit 0
fi

# Patch rationale (local, non-upstream):
# - Obfuscator-LLVM targets LLVM 4.0 era sources. GCC 13 tightened diagnostics
#   around lambda captures in CGOpenMPRuntime.cpp, causing a compile failure.
# - The change below removes redundant captures that trigger that error.
# - This keeps the build working without changing behavior of the generated
#   code. If you need upstream-pure sources, skip the patch or build with an
#   older GCC.
patch_lambda_capture() {
  local file="$1"
  [ -f "$file" ] || return 0
  if grep -q "auto &&BeginThenGen = \\[&D, &CGF, Device" "$file"; then
    sed -i \
      -e 's/auto &&BeginThenGen = \\[&D, &CGF, Device,/auto &&BeginThenGen = \\[&D, Device,/' \
      -e 's/auto &&EndThenGen = \\[&CGF, Device,/auto &&EndThenGen = \\[Device,/' \
      -e 's/auto &&ThenGen = \\[&D, &CGF, Device/auto &&ThenGen = \\[&D, Device/' \
      "$file"
  fi
}

patch_lambda_capture "$ROOT/tools/clang/lib/CodeGen/CGOpenMPRuntime.cpp"

echo "[install-ollvm] Building O-LLVM (LLVM 4.0)..."
mkdir -p "$BUILD_DIR"
cmake -G Ninja \
  -DLLVM_ENABLE_PROJECTS=clang \
  -DLLVM_INCLUDE_TESTS=OFF \
  -DLLVM_BUILD_TESTS=OFF \
  -DLLVM_BUILD_EXAMPLES=OFF \
  -DLLVM_TARGETS_TO_BUILD=X86 \
  -DCMAKE_BUILD_TYPE=Release \
  -S "$ROOT" \
  -B "$BUILD_DIR"

ninja -C "$BUILD_DIR" clang

echo "[install-ollvm] Done."
echo "[install-ollvm] Obfuscating clang: $BUILD_DIR/bin/clang"

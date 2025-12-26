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
  echo "[install-c-obfuscators] Set SEAL_INSTALL_OBFUSCATORS=1 to clone obfuscators."
  echo "[install-c-obfuscators] Set SEAL_BUILD_OBFUSCATORS=1 to build obfuscating clang."
  exit 0
fi

ROOT="${SEAL_OBFUSCATOR_DIR:-$HOME/.cache/seal/obfuscators}"
CLANG_BRANCH="${SEAL_CLANG_BRANCH:-release_40}"
mkdir -p "$ROOT"
cd "$ROOT"

echo "[install-c-obfuscators] Cloning obfuscators..."
if [ ! -d obfuscator-llvm ]; then
  git clone https://github.com/obfuscator-llvm/obfuscator.git obfuscator-llvm
fi

if [ ! -d hikari ]; then
  git clone https://github.com/HikariObfuscator/Hikari.git hikari
fi

if [ ! -d clang ]; then
  echo "[install-c-obfuscators] Cloning clang (${CLANG_BRANCH})..."
  git clone --depth 1 --branch "${CLANG_BRANCH}" https://github.com/llvm-mirror/clang clang
fi

if [ "${SEAL_BUILD_OBFUSCATORS:-0}" != "1" ]; then
  echo "[install-c-obfuscators] Obfuscator sources are ready."
  echo "[install-c-obfuscators] Set SEAL_BUILD_OBFUSCATORS=1 to build obfuscating clang."
  exit 0
fi

echo "[install-c-obfuscators] Building Obfuscator-LLVM (LLVM 4.0)..."
(
  set -euo pipefail
  cd "$ROOT/obfuscator-llvm"
  if git show-ref --verify --quiet refs/heads/llvm-4.0; then
    git checkout -q llvm-4.0
  else
    git checkout -q -b llvm-4.0 origin/llvm-4.0
  fi

  # Patch rationale (local, non-upstream):
  # - Obfuscator-LLVM targets LLVM 4.0 era sources. GCC 13 tightened diagnostics
  #   around lambda captures in CGOpenMPRuntime.cpp, causing a compile failure.
  # - The change below removes redundant captures that trigger that error.
  # - This keeps the build working without changing behavior of the generated
  #   code. If you need upstream-pure sources, skip the patch or build with an
  #   older GCC. (We patch both obfuscator-llvm and a standalone clang checkout
  #   because both trees are used depending on build setup.)
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

  patch_lambda_capture "$ROOT/obfuscator-llvm/tools/clang/lib/CodeGen/CGOpenMPRuntime.cpp"
  patch_lambda_capture "$ROOT/clang/lib/CodeGen/CGOpenMPRuntime.cpp"

  mkdir -p build
  cd build
  cmake -G Ninja \
    -DLLVM_ENABLE_PROJECTS=clang \
    -DLLVM_INCLUDE_TESTS=OFF \
    -DLLVM_BUILD_TESTS=OFF \
    -DLLVM_BUILD_EXAMPLES=OFF \
    -DLLVM_TARGETS_TO_BUILD=X86 \
    -DCMAKE_BUILD_TYPE=Release \
    ..
  ninja clang
)

echo "[install-c-obfuscators] Done."
echo "[install-c-obfuscators] Obfuscating clang: $ROOT/obfuscator-llvm/build/bin/clang"

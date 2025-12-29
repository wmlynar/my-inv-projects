#!/usr/bin/env bash
set -euo pipefail

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  SUDO="sudo"
fi

git_no_prompt() {
  GIT_TERMINAL_PROMPT=0 "$@"
}

REPO="${SEAL_OLLVM_REPO:-https://github.com/obfuscator-llvm/obfuscator.git}"
ROOT="${SEAL_OLLVM_DIR:-$HOME/.cache/seal/obfuscators/obfuscator-llvm}"
BRANCH="${SEAL_OLLVM_BRANCH:-llvm-4.0}"
BUILD_DIR="${SEAL_OLLVM_BUILD_DIR:-$ROOT/build}"
BUILD="${SEAL_OLLVM_BUILD:-1}"
BIN_NAME="${SEAL_OLLVM_BIN_NAME:-ollvm-clang}"
BIN_DIR="${SEAL_OLLVM_BIN_DIR:-/usr/local/bin}"
INSTALL_BIN="${SEAL_OLLVM_INSTALL:-1}"

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
  git_no_prompt git -C "$ROOT" fetch --all --tags
else
  echo "[install-ollvm] Cloning O-LLVM..."
  git_no_prompt git clone "$REPO" "$ROOT"
fi

echo "[install-ollvm] Checkout branch: $BRANCH"
if git -C "$ROOT" show-ref --verify --quiet "refs/heads/$BRANCH"; then
  git -C "$ROOT" checkout -q "$BRANCH"
else
  git -C "$ROOT" checkout -q -b "$BRANCH" "origin/$BRANCH"
fi

has_legacy_clang=0
has_monorepo_clang=0
if [ -d "$ROOT/tools/clang" ]; then
  has_legacy_clang=1
fi
if [ -d "$ROOT/../clang" ]; then
  has_monorepo_clang=1
fi

if [ "$has_legacy_clang" -eq 0 ] && [ "$has_monorepo_clang" -eq 0 ] && [ -f "$ROOT/.gitmodules" ]; then
  if grep -qE 'path *= *tools/clang' "$ROOT/.gitmodules"; then
    echo "[install-ollvm] Initializing clang submodule..."
    git_no_prompt git -C "$ROOT" submodule update --init --recursive
  fi
fi

if [ -d "$ROOT/tools/clang" ]; then
  has_legacy_clang=1
fi
if [ -d "$ROOT/../clang" ]; then
  has_monorepo_clang=1
fi

if [ "$has_legacy_clang" -eq 0 ] && [ "$has_monorepo_clang" -eq 0 ]; then
  echo "[install-ollvm] ERROR: clang sources not found (tools/clang or ../clang missing)."
  echo "[install-ollvm]        Ensure submodules are initialized or use a monorepo layout."
  exit 4
fi

if [ "$BUILD" != "1" ]; then
  echo "[install-ollvm] Sources ready. Set SEAL_OLLVM_BUILD=1 to build."
  exit 0
fi

# Patch rationale (local, non-upstream):
# - O-LLVM is based on LLVM 4.0 era sources. Modern GCC (>=13) rejects some
#   lambda capture patterns in CGOpenMPRuntime.cpp that were accepted earlier.
# - The patch removes redundant captures that trigger the error. It does not
#   change codegen behavior; it only unblocks compilation on current toolchains.
# - The patch is applied only in the local cache clone used by this installer.
#   Upstream sources remain untouched. If you prefer a pure upstream build,
#   disable the patch or build with an older GCC toolchain.
patch_lambda_capture() {
  local file="$1"
  [ -f "$file" ] || return 0
  if grep -q "auto &&BeginThenGen = \\[&D, &CGF, Device" "$file"; then
    python3 - "$file" <<'PY'
import sys

path = sys.argv[1]
data = open(path, "r", encoding="utf-8").read()
replacements = [
  ("auto &&BeginThenGen = [&D, &CGF, Device,", "auto &&BeginThenGen = [&D, Device,"),
  ("auto &&EndThenGen = [&CGF, Device,", "auto &&EndThenGen = [Device,"),
  ("auto &&ThenGen = [&D, &CGF, Device", "auto &&ThenGen = [&D, Device"),
]
for old, new in replacements:
  data = data.replace(old, new)
open(path, "w", encoding="utf-8").write(data)
PY
  fi
}

patch_lambda_capture "$ROOT/tools/clang/lib/CodeGen/CGOpenMPRuntime.cpp"

echo "[install-ollvm] Building O-LLVM (LLVM 4.0)..."
mkdir -p "$BUILD_DIR"
LLVM_PROJECTS_FLAG=()
if [ "$has_legacy_clang" -eq 1 ]; then
  # Legacy LLVM 4.0 layout: clang lives under tools/clang; LLVM_ENABLE_PROJECTS is not supported.
  LLVM_PROJECTS_FLAG=()
else
  # Newer monorepo layout (clang beside llvm)
  LLVM_PROJECTS_FLAG=(-DLLVM_ENABLE_PROJECTS=clang)
fi

if [ -d "$BUILD_DIR" ] && [ -f "$BUILD_DIR/CMakeCache.txt" ] && [ "$has_legacy_clang" -eq 1 ]; then
  if grep -q "^LLVM_ENABLE_PROJECTS:STRING=" "$BUILD_DIR/CMakeCache.txt"; then
    echo "[install-ollvm] Removing stale build dir (LLVM_ENABLE_PROJECTS cached in legacy layout)..."
    rm -rf "$BUILD_DIR"
  fi
fi

cmake -G Ninja \
  "${LLVM_PROJECTS_FLAG[@]}" \
  -DLLVM_INCLUDE_TESTS=OFF \
  -DLLVM_BUILD_TESTS=OFF \
  -DLLVM_BUILD_EXAMPLES=OFF \
  -DLLVM_TARGETS_TO_BUILD=X86 \
  -DCMAKE_BUILD_TYPE=Release \
  -S "$ROOT" \
  -B "$BUILD_DIR"

ninja -C "$BUILD_DIR" clang

BIN_PATH="$BUILD_DIR/bin/clang"
if [ ! -x "$BIN_PATH" ]; then
  echo "[install-ollvm] ERROR: clang binary not found at $BIN_PATH"
  exit 4
fi

if [ "$INSTALL_BIN" = "1" ]; then
  echo "[install-ollvm] Installing to $BIN_DIR/$BIN_NAME"
  $SUDO install -d "$BIN_DIR"
  $SUDO install -m 0755 "$BIN_PATH" "$BIN_DIR/$BIN_NAME"
fi

echo "[install-ollvm] Done."
echo "[install-ollvm] Obfuscating clang: $BIN_PATH"

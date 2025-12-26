#!/usr/bin/env bash
set -euo pipefail

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  SUDO="sudo"
fi

REPO="${SEAL_MIDGETPACK_REPO:-}"
REF="${SEAL_MIDGETPACK_REF:-}"
ROOT="${SEAL_MIDGETPACK_DIR:-$HOME/.cache/seal/midgetpack}"
BIN_NAME="${SEAL_MIDGETPACK_BIN:-midgetpack}"
BIN_DIR="${SEAL_MIDGETPACK_BIN_DIR:-/usr/local/bin}"

if [ -z "$REPO" ]; then
  echo "[install-midgetpack] ERROR: SEAL_MIDGETPACK_REPO is not set."
  echo "[install-midgetpack] Example: SEAL_MIDGETPACK_REPO=https://github.com/<org>/<repo>.git"
  exit 2
fi

echo "[install-midgetpack] Installing build dependencies..."
$SUDO apt-get update
$SUDO apt-get install -y git build-essential cmake pkg-config ninja-build

mkdir -p "$ROOT"
if [ -d "$ROOT/.git" ]; then
  echo "[install-midgetpack] Updating repo..."
  git -C "$ROOT" fetch --all --tags
else
  echo "[install-midgetpack] Cloning repo..."
  git clone "$REPO" "$ROOT"
fi

if [ -n "$REF" ]; then
  echo "[install-midgetpack] Checkout ref: $REF"
  git -C "$ROOT" checkout "$REF"
fi

cd "$ROOT"

# Patch rationale (local, non-upstream):
# - Midgetpack builds architecture stubs with -static and custom ld flags.
#   On Ubuntu this often fails because libgcc_s or static libgcc variants
#   are missing or incompatible for the selected arch. The upstream build
#   system already ships precompiled stubs. We force those to avoid toolchain
#   issues while keeping the packer usable for SEAL.
# - The upstream tests also build fully static binaries across multiple
#   architectures and are not needed for installing the packer binary. We
#   guard them behind WITH_TESTS to avoid hard failures on systems without
#   all static deps available.
# You can disable all patching with SEAL_MIDGETPACK_PATCH=0.
PATCH_MARKER="SEAL_PATCHED_MIDGETPACK"
if [ "${SEAL_MIDGETPACK_PATCH:-1}" = "1" ]; then
  if ! grep -q "$PATCH_MARKER" "$ROOT/src/stub/CMakeLists.txt"; then
    echo "[install-midgetpack] Patching stub build to prefer precompiled stubs..."
    perl -0pi -e 's/include\(DefinePlatformDefaults\)\n/include(DefinePlatformDefaults)\n\n# SEAL_PATCHED_MIDGETPACK: force precompiled stubs to avoid toolchain static-link issues\nif(WITH_PRECOMPILED_STUBS)\n\tset(CCOMPILER_32 0)\n\tset(CCOMPILER_64 0)\n\tset(CCOMPILER_ARMV6 0)\nendif()\n\n/' "$ROOT/src/stub/CMakeLists.txt"
  fi

  if ! grep -q "$PATCH_MARKER" "$ROOT/src/CMakeLists.txt"; then
    echo "[install-midgetpack] Patching build to skip tests unless explicitly enabled..."
    perl -0pi -e 's/add_subdirectory\(tests\)/# SEAL_PATCHED_MIDGETPACK\nif(WITH_TESTS)\n\tadd_subdirectory(tests)\nendif()\n/' "$ROOT/src/CMakeLists.txt"
  fi
fi

echo "[install-midgetpack] Building..."
if [ -f Cargo.toml ]; then
  $SUDO apt-get install -y cargo
  cargo build --release
  BIN_PATH="$ROOT/target/release/$BIN_NAME"
elif [ -f CMakeLists.txt ]; then
  cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Release -DWITH_PRECOMPILED_STUBS=ON
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
  echo "[install-midgetpack] ERROR: Unknown build system (no Cargo.toml/CMakeLists.txt/Makefile)."
  exit 3
fi

if [ -z "${BIN_PATH:-}" ] || [ ! -x "$BIN_PATH" ]; then
  echo "[install-midgetpack] ERROR: Built binary not found. Set SEAL_MIDGETPACK_BIN if name differs."
  exit 4
fi

echo "[install-midgetpack] Installing to $BIN_DIR/$BIN_NAME"
$SUDO install -m 0755 "$BIN_PATH" "$BIN_DIR/$BIN_NAME"
echo "[install-midgetpack] OK"

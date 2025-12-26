#!/usr/bin/env bash
set -euo pipefail

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  SUDO="sudo"
fi

REPO="${SEAL_KITESHIELD_REPO:-https://github.com/GunshipPenguin/kiteshield}"
REF="${SEAL_KITESHIELD_REF:-}"
ROOT="${SEAL_KITESHIELD_DIR:-$HOME/.cache/seal/kiteshield}"
BIN_NAME="${SEAL_KITESHIELD_BIN:-kiteshield}"
BIN_DIR="${SEAL_KITESHIELD_BIN_DIR:-/usr/local/bin}"

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

if [ -f "$ROOT/.gitmodules" ]; then
  echo "[install-kiteshield] Syncing submodules..."
  git -C "$ROOT" submodule update --init --recursive
fi

cd "$ROOT"

# Patch rationale (local, non-upstream):
# - The loader uses a generated header (obfuscated_strings.h). The original
#   Makefile can compile sources before that header exists when running in
#   parallel, which causes implicit declaration errors for DEOBF_STR and
#   missing string constants. We add explicit dependencies so every compile
#   waits for the header to be generated.
# - The loader/packer Makefiles use -Werror. Newer GCC versions (e.g. GCC 13)
#   emit warnings for upstream patterns (dangling-pointer, array-bounds) which
#   are safe in context but stop the build. We remove -Werror to keep the
#   install script reliable across compiler versions.
# - Loader tests are not required to produce the packer binary and can fail
#   under these freestanding flags; we remove them from the default "all"
#   target to avoid false negatives during installation.
# - The packer depends on bddisasm, provided as a git submodule. We make sure
#   the submodule is initialized and build its Release static lib before
#   building kiteshield itself.
# You can disable patching with SEAL_KITESHIELD_PATCH=0.
PATCH_MARKER="SEAL_PATCHED_KITESHIELD"
if [ "${SEAL_KITESHIELD_PATCH:-1}" = "1" ]; then
  echo "[install-kiteshield] Patching loader build to serialize obfuscated header generation..."
  perl -pi -e 's/^CFLAGS_COMMON = .*/CFLAGS_COMMON = -Wall -std=gnu99 -fno-pie -nostdlib -nostartfiles -nodefaultlibs -fno-builtin -c -I ../' "$ROOT/loader/Makefile"
  ROOT_PATH="$ROOT" python3 - <<'PY'
import os
import re
from pathlib import Path

path = Path(os.environ["ROOT_PATH"]) / "loader" / "Makefile"
text = path.read_text()

text = re.sub(r"^all:.*$", "all: output-dirs $(OBFUSCATED_STRINGS_HEADER) out/loader_header_rt.h out/loader_header_no_rt.h", text, flags=re.M)

block = """out/rt/%.o: %.c $(OBFUSCATED_STRINGS_HEADER)
\t$(CC) -DUSE_RUNTIME $(CFLAGS) $< -o $@

out/rt/%.o: ../common/%.c $(OBFUSCATED_STRINGS_HEADER)
\t$(CC) -DUSE_RUNTIME $(CFLAGS) $< -o $@

out/rt/%.o: %.S $(OBFUSCATED_STRINGS_HEADER)
\t$(CC) -DUSE_RUNTIME -c $< -o $@

out/no_rt/%.o: %.c $(OBFUSCATED_STRINGS_HEADER)
\t$(CC) $(CFLAGS) -c $< -o $@

out/no_rt/%.o: ../common/%.c $(OBFUSCATED_STRINGS_HEADER)
\t$(CC) $(CFLAGS) $< -o $@

out/no_rt/%.o: %.S $(OBFUSCATED_STRINGS_HEADER)
\t$(CC) -c $< -o $@

"""

text, n = re.subn(r"^out/rt/%\.o:.*?^output-dirs:", block + "output-dirs:", text, flags=re.S | re.M)
if n != 1:
    raise SystemExit("[install-kiteshield] ERROR: unexpected Makefile structure; cannot patch rules block.")

path.write_text(text)
PY
  if ! grep -q "$PATCH_MARKER" "$ROOT/loader/Makefile"; then
    printf "\n# %s\n" "$PATCH_MARKER" >> "$ROOT/loader/Makefile"
  fi
fi

if [ -f "$ROOT/packer/Makefile" ]; then
  echo "[install-kiteshield] Patching packer warnings..."
  perl -pi -e 's/ -Werror//g' "$ROOT/packer/Makefile"
fi

if [ -f "$ROOT/packer/bddisasm/Makefile" ]; then
  BDD_LIB="$ROOT/packer/bddisasm/bin/x64/Release/libbddisasm.a"
  if [ ! -f "$BDD_LIB" ]; then
    echo "[install-kiteshield] Building bddisasm (Release)..."
    make -C "$ROOT/packer/bddisasm" bddisasm
  fi
fi

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

#!/usr/bin/env bash
set -euo pipefail

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  SUDO="sudo"
fi

REPO="${SEAL_HIKARI_REPO:-https://github.com/ChandHsu/Hikari-LLVM15.git}"
TOKEN="${SEAL_HIKARI_TOKEN:-${SEAL_GITHUB_TOKEN:-${GITHUB_TOKEN:-}}}"

# Patch/installer rationale (operational, non-upstream):
# - The original upstream Hikari repo is deprecated and does not contain LLVM
#   sources. We default to a maintained LLVM15 fork and to its known branch
#   (llvm-15.0.0rc3) to ensure the repo actually builds.
# - Git over HTTPS will prompt for credentials on some machines (2FA), which
#   breaks non-interactive installers. We disable prompts and support
#   SEAL_HIKARI_TOKEN (or SEAL_GITHUB_TOKEN) and SSH fallback.
# - These are installer behaviors only; the script does not patch the Hikari
#   source tree. If you want a different fork or branch, override
#   SEAL_HIKARI_REPO/SEAL_HIKARI_REF.
REF="${SEAL_HIKARI_REF:-llvm-15.0.0rc3}"
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

git_no_prompt() {
  GIT_TERMINAL_PROMPT=0 "$@"
}

try_clone() {
  local url="$1"
  local label="$2"
  echo "[install-hikari] Cloning Hikari from $label..."
  if git_no_prompt git clone "$url" "$ROOT"; then
    return 0
  fi
  return 1
}

clone_with_fallback() {
  local url="$1"
  local label="$1"
  local token_url=""
  if [[ -n "$TOKEN" && "$url" == https://github.com/* ]]; then
    token_url="https://${TOKEN}@github.com/${url#https://github.com/}"
    if try_clone "$token_url" "https://github.com/... (token)"; then
      return 0
    fi
  fi
  if try_clone "$url" "$label"; then
    return 0
  fi
  if [[ "$url" == https://github.com/* ]]; then
    local ssh_repo="git@github.com:${url#https://github.com/}"
    echo "[install-hikari] HTTPS clone failed; trying SSH ($ssh_repo)..."
    if try_clone "$ssh_repo" "$ssh_repo"; then
      return 0
    fi
  fi
  return 1
}

mkdir -p "$ROOT"
if [ -d "$ROOT/.git" ]; then
  echo "[install-hikari] Updating repo..."
  if ! git_no_prompt git -C "$ROOT" fetch --all --tags; then
    echo "[install-hikari] WARN: fetch failed (possibly auth/proxy)."
  fi
else
  if ! clone_with_fallback "$REPO"; then
    rm -rf "$ROOT"
    echo "[install-hikari] ERROR: clone failed."
    echo "[install-hikari]       If HTTPS prompts for credentials, set SEAL_HIKARI_TOKEN (or SEAL_GITHUB_TOKEN) or configure SSH keys."
    echo "[install-hikari]       You can also set SEAL_HIKARI_REPO to a URL you can access."
    exit 2
  fi
fi

if [ -n "$REF" ]; then
  echo "[install-hikari] Checkout ref: $REF"
  if git -C "$ROOT" show-ref --verify --quiet "refs/heads/$REF"; then
    git -C "$ROOT" checkout "$REF"
  else
    git -C "$ROOT" checkout -B "$REF" "origin/$REF"
  fi
fi

if [ -f "$ROOT/.gitmodules" ]; then
  echo "[install-hikari] Syncing submodules..."
  if ! git_no_prompt git -C "$ROOT" submodule update --init --recursive; then
    echo "[install-hikari] WARN: submodule update failed (possibly auth/proxy)."
    echo "[install-hikari]       You may need to configure SSH access or set SEAL_HIKARI_REPO."
  fi
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
  origin_url="$(git -C "$ROOT" remote get-url origin 2>/dev/null || true)"
  if [ -n "$origin_url" ] && [ "$origin_url" != "$REPO" ] && [ "${SEAL_HIKARI_AUTO_RECLONE:-1}" = "1" ]; then
    echo "[install-hikari] Repo origin is '$origin_url' but expected '$REPO'."
    echo "[install-hikari] Recloning into a clean directory..."
    backup="${ROOT}.bak-$(date +%Y%m%d-%H%M%S)"
    mv "$ROOT" "$backup"
    if ! clone_with_fallback "$REPO"; then
      rm -rf "$ROOT"
      echo "[install-hikari] ERROR: reclone failed."
      echo "[install-hikari]       Set SEAL_HIKARI_TOKEN (or SEAL_GITHUB_TOKEN), configure SSH keys, or use SEAL_HIKARI_REPO."
      exit 2
    fi
    if [ -n "$REF" ]; then
      if git -C "$ROOT" show-ref --verify --quiet "refs/heads/$REF"; then
        git -C "$ROOT" checkout "$REF"
      else
        git -C "$ROOT" checkout -B "$REF" "origin/$REF"
      fi
    fi
    if [ -f "$ROOT/.gitmodules" ]; then
      git -C "$ROOT" submodule update --init --recursive
    fi

    if [ -d "$ROOT/llvm-project/llvm" ]; then
      SRC_DIR="$ROOT/llvm-project/llvm"
    elif [ -d "$ROOT/llvm" ] && [ -f "$ROOT/llvm/CMakeLists.txt" ]; then
      SRC_DIR="$ROOT/llvm"
    elif [ -f "$ROOT/CMakeLists.txt" ]; then
      SRC_DIR="$ROOT"
    fi
  fi
fi

if [ -z "$SRC_DIR" ]; then
  echo "[install-hikari] ERROR: Could not locate LLVM source directory in repo."
  echo "[install-hikari] Set SEAL_HIKARI_REPO or SEAL_HIKARI_DIR to a repo with llvm/ or llvm-project/llvm."
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

#!/usr/bin/env bash
set -euo pipefail

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  SUDO="sudo"
fi
KEEP_SRC="${SEAL_TOOLCHAIN_KEEP_SRC:-0}"

export DEBIAN_FRONTEND=noninteractive
export TZ=UTC

log() {
  echo "[install-criu] $*"
}

has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

safe_rm_dir() {
  local dir="$1"
  if [ -z "$dir" ] || [ "$dir" = "/" ] || [ "$dir" = "." ]; then
    log "WARN: skip unsafe cleanup path: '$dir'"
    return
  fi
  if [ -n "${HOME:-}" ] && [ "$dir" = "$HOME" ]; then
    log "WARN: skip cleanup of HOME: '$dir'"
    return
  fi
  rm -rf "$dir"
}

candidate_available() {
  local cand
  cand="$(apt-cache policy criu 2>/dev/null | awk '/Candidate:/ {print $2}')"
  [ -n "$cand" ] && [ "$cand" != "(none)" ]
}

enable_universe_deb822() {
  local file="/etc/apt/sources.list.d/ubuntu.sources"
  [ -f "$file" ] || return 1
  if has_cmd python3; then
    $SUDO python3 - "$file" <<'PY'
import sys
path = sys.argv[1]
data = open(path, "r", encoding="utf-8").read().splitlines()
out = []
for line in data:
    if line.startswith("Components:"):
        comps = line.split(":", 1)[1].strip().split()
        if "universe" not in comps:
            comps.append("universe")
        line = "Components: " + " ".join(comps)
    out.append(line)
open(path, "w", encoding="utf-8").write("\n".join(out) + "\n")
PY
  else
    if ! grep -q '^Components:.*\\buniverse\\b' "$file"; then
      $SUDO sed -i -E 's/^(Components:[[:space:]]*)(.*)$/\\1\\2 universe/' "$file"
    fi
  fi
  return 0
}

enable_universe_sources_list() {
  local file="/etc/apt/sources.list"
  [ -f "$file" ] || return 1
  $SUDO perl -pi -e 's/^(deb\s+\S+\s+\S+\s+)(.*)$/sprintf("%s%s", $1, ($2 =~ /\buniverse\b/ ? $2 : "$2 universe"))/e' "$file"
  return 0
}

enable_universe() {
  if has_cmd add-apt-repository; then
    $SUDO add-apt-repository -y universe
    return 0
  fi
  if enable_universe_deb822; then
    return 0
  fi
  if enable_universe_sources_list; then
    return 0
  fi
  return 1
}

if ! has_cmd apt-get; then
  log "SKIP: apt-get not found (Ubuntu/Debian only)."
  exit 0
fi

if has_cmd criu; then
  log "criu already installed: $(command -v criu)"
  exit 0
fi

log "Checking apt candidate for criu..."
if ! candidate_available; then
  log "criu candidate missing; enabling universe component..."
  enable_universe || log "WARN: failed to enable universe repositories."
  $SUDO apt-get update
fi

if candidate_available; then
  log "Installing criu from apt..."
  if $SUDO apt-get install -y criu; then
    log "criu installed: $(command -v criu)"
    exit 0
  fi
fi

if [ "${SEAL_CRIU_BUILD:-0}" != "1" ]; then
  log "SKIP: criu not available via apt. Set SEAL_CRIU_BUILD=1 to build from source."
  exit 0
fi

log "Building criu from source (SEAL_CRIU_BUILD=1)..."
$SUDO apt-get update
$SUDO apt-get install -y \
  build-essential \
  git \
  pkg-config \
  python3 \
  libprotobuf-dev \
  protobuf-c-compiler \
  python3-protobuf \
  libcap-dev \
  libnl-3-dev \
  libnet1-dev \
  libbsd-dev \
  libaio-dev

ROOT="${SEAL_CRIU_DIR:-$HOME/.cache/seal/criu}"
REPO="${SEAL_CRIU_REPO:-https://github.com/checkpoint-restore/criu.git}"

mkdir -p "$ROOT"
if [ -d "$ROOT/.git" ]; then
  log "Updating criu repo..."
  git -C "$ROOT" fetch --all --tags
else
  log "Cloning criu repo..."
  git clone "$REPO" "$ROOT"
fi

log "Building criu..."
make -C "$ROOT" -j
$SUDO make -C "$ROOT" install

if has_cmd criu; then
  log "criu installed: $(command -v criu)"
  if [ "$KEEP_SRC" = "1" ]; then
    log "Keeping sources (SEAL_TOOLCHAIN_KEEP_SRC=1)."
  else
    log "Cleaning source/build cache..."
    safe_rm_dir "$ROOT"
  fi
else
  log "WARN: criu build completed but binary not found."
fi

#!/usr/bin/env bash
set -euo pipefail

# Creates a single ZIP backup containing bare git repositories for all third-party
# dependencies used by SEAL. This is meant for off-repo storage (e.g. Drive).
# The ZIP is large and should NOT be committed to git.

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  SUDO="sudo"
fi

OUT_DIR="${SEAL_BACKUP_DIR:-$(cd "$(dirname "$0")" && pwd)}"
OUT_ZIP="${SEAL_BACKUP_ZIP:-$OUT_DIR/seal-third-party-backup-$(date +%Y%m%d).zip}"

if ! command -v zip >/dev/null 2>&1; then
  $SUDO apt-get update
  $SUDO apt-get install -y zip
fi

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

backup_repo() {
  local name="$1"
  local url="$2"
  local branch="${3:-}"
  local dir="$tmp_dir/$name.git"

  echo "[backup] cloning $name..."
  if [ -n "$branch" ]; then
    git clone --bare --single-branch --branch "$branch" "$url" "$dir"
    git -C "$dir" symbolic-ref HEAD "refs/heads/$branch"
  else
    git clone --bare "$url" "$dir"
  fi

  git -C "$dir" gc --aggressive --prune=now || true
}

cat >"$tmp_dir/MANIFEST.txt" <<'TXT'
DO NOT LOAD OR ANALYZE THESE ARCHIVES IN AI CONTEXT.
They are offline backups only.

This ZIP contains bare git repositories for:
- midgetpack (https://github.com/arisada/midgetpack)
- kiteshield (https://github.com/GunshipPenguin/kiteshield)
- bddisasm (https://github.com/bitdefender/bddisasm)
- obfuscator-llvm (https://github.com/obfuscator-llvm/obfuscator, branch llvm-4.0)
- hikari-llvm15 (https://github.com/ChandHsu/Hikari-LLVM15, branch llvm-15.0.0rc3)
TXT

backup_repo "midgetpack" "https://github.com/arisada/midgetpack"
backup_repo "kiteshield" "https://github.com/GunshipPenguin/kiteshield"
backup_repo "bddisasm" "https://github.com/bitdefender/bddisasm"
backup_repo "obfuscator-llvm" "https://github.com/obfuscator-llvm/obfuscator.git" "llvm-4.0"
backup_repo "hikari-llvm15" "https://github.com/ChandHsu/Hikari-LLVM15.git" "llvm-15.0.0rc3"

(cd "$tmp_dir" && zip -qr "$OUT_ZIP" .)

echo "[backup] done: $OUT_ZIP"

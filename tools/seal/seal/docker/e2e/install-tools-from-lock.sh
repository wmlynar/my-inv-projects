#!/usr/bin/env bash
set -euo pipefail

LOCKFILE="${1:-}"
if [ -z "$LOCKFILE" ] || [ ! -f "$LOCKFILE" ]; then
  echo "[install-tools] ERROR: lockfile not found: $LOCKFILE" >&2
  exit 2
fi

CACHE_ROOT="${SEAL_THIRD_PARTY_CACHE:-/root/.cache/seal/third-party}"
SRC_ROOT="$CACHE_ROOT/src"
BIN_CACHE="$CACHE_ROOT/bin"
STAMP_DIR="$CACHE_ROOT/stamps"
BIN_DIR="${SEAL_THIRD_PARTY_BIN_DIR:-/usr/local/bin}"
KEEP_SRC="${SEAL_TOOLCHAIN_KEEP_SRC:-0}"

mkdir -p "$SRC_ROOT" "$BIN_CACHE" "$STAMP_DIR" "$BIN_DIR"

export GIT_TERMINAL_PROMPT=0
export GIT_ASKPASS=/bin/false
unset BASH_ENV ENV CDPATH GLOBIGNORE

log() {
  echo "[install-tools] $*"
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

cleanup_tool_sources() {
  local name="$1"
  if [ "$KEEP_SRC" = "1" ]; then
    return
  fi
  local repo_dir="$SRC_ROOT/$name"
  if [ -d "$repo_dir" ]; then
    log "$name: cleaning source cache..."
    safe_rm_dir "$repo_dir"
  fi
}

trim() {
  local s="$1"
  s="${s#"${s%%[![:space:]]*}"}"
  s="${s%"${s##*[![:space:]]}"}"
  printf "%s" "$s"
}

LOCK_FILE="$CACHE_ROOT/.install-tools.lock"
LOCK_DIR="$CACHE_ROOT/.install-tools.lock.d"

acquire_lock() {
  if command -v flock >/dev/null 2>&1; then
    exec {LOCK_FD}>"$LOCK_FILE"
    log "Waiting for tool cache lock..."
    flock "$LOCK_FD"
    return
  fi
  log "Waiting for tool cache lock..."
  while ! mkdir "$LOCK_DIR" 2>/dev/null; do
    sleep 0.2
  done
  trap 'rmdir "$LOCK_DIR" >/dev/null 2>&1 || true' EXIT
}

acquire_lock

declare -A TOOL_URL=()
declare -A TOOL_REV=()
declare -A TOOL_BIN=()
declare -a TOOL_ORDER=()

current=""
while IFS= read -r raw || [ -n "$raw" ]; do
  line="${raw%%#*}"
  line="$(trim "$line")"
  [ -z "$line" ] && continue
  if [[ "$line" == \[*\] ]]; then
    current="${line#[}"
    current="${current%]}"
    TOOL_ORDER+=("$current")
    continue
  fi
  key="${line%%=*}"
  value="${line#*=}"
  key="$(trim "$key")"
  value="$(trim "$value")"
  case "$key" in
    url) TOOL_URL["$current"]="$value" ;;
    rev) TOOL_REV["$current"]="$value" ;;
    bin) TOOL_BIN["$current"]="$value" ;;
  esac
done < "$LOCKFILE"

stamp_key() {
  local name="$1"
  printf "%s\n" "$name|${TOOL_URL[$name]}|${TOOL_REV[$name]}|${TOOL_BIN[$name]}" | sha256sum | awk '{print $1}'
}

ensure_repo() {
  local name="$1"
  local url="${TOOL_URL[$name]}"
  local rev="${TOOL_REV[$name]}"
  local repo_dir="$SRC_ROOT/$name"

  if [ -z "$url" ] || [ -z "$rev" ]; then
    log "ERROR: missing url/rev for $name"
    exit 3
  fi

  if [ -d "$repo_dir/.git" ]; then
    lock_file="$repo_dir/.git/index.lock"
    if [ -f "$lock_file" ]; then
      log "$name: removing stale git lock (${lock_file})"
      rm -f "$lock_file"
    fi
    log "$name: cleaning repo..."
    git -C "$repo_dir" reset --hard
    git -C "$repo_dir" clean -fdx
    log "$name: updating repo..."
    git -C "$repo_dir" fetch --all --tags --prune
  else
    log "$name: cloning repo..."
    git clone "$url" "$repo_dir"
  fi

  log "$name: checkout $rev"
  git -C "$repo_dir" checkout -q "$rev"
}

install_cached() {
  local name="$1"
  local bin_name="${TOOL_BIN[$name]}"
  local cache_bin="$BIN_CACHE/$bin_name"
  if [ -x "$cache_bin" ]; then
    install -m 0755 "$cache_bin" "$BIN_DIR/$bin_name"
    return 0
  fi
  return 1
}

mark_installed() {
  local name="$1"
  local stamp_file="$STAMP_DIR/$name.stamp"
  stamp_key "$name" > "$stamp_file"
}

stamp_matches() {
  local name="$1"
  local stamp_file="$STAMP_DIR/$name.stamp"
  [ -f "$stamp_file" ] && [ "$(cat "$stamp_file")" = "$(stamp_key "$name")" ]
}

install_ollvm() {
  local name="ollvm"
  local bin_name="${TOOL_BIN[$name]}"
  local repo_dir="$SRC_ROOT/$name"
  local build_dir="$repo_dir/build"

  ensure_repo "$name"

  # Patch rationale (local, non-upstream):
  # - O-LLVM (LLVM 4.0) fails on modern GCC due to invalid lambda captures.
  # - This patch removes redundant captures to restore build on GCC >=13.
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

  patch_lambda_capture "$repo_dir/tools/clang/lib/CodeGen/CGOpenMPRuntime.cpp"

  mkdir -p "$build_dir"
  LLVM_PROJECTS_FLAG=()
  if [ ! -d "$repo_dir/tools/clang" ]; then
    LLVM_PROJECTS_FLAG=(-DLLVM_ENABLE_PROJECTS=clang)
  fi

  if [ -d "$build_dir" ] && [ -f "$build_dir/CMakeCache.txt" ] && [ -d "$repo_dir/tools/clang" ]; then
    if grep -q "^LLVM_ENABLE_PROJECTS:STRING=" "$build_dir/CMakeCache.txt"; then
      log "$name: clearing stale build dir (LLVM_ENABLE_PROJECTS cached in legacy layout)"
      rm -rf "$build_dir"
      mkdir -p "$build_dir"
    fi
  fi

  log "$name: building..."
  cmake -G Ninja \
    "${LLVM_PROJECTS_FLAG[@]}" \
    -DLLVM_INCLUDE_TESTS=OFF \
    -DLLVM_BUILD_TESTS=OFF \
    -DLLVM_BUILD_EXAMPLES=OFF \
    -DLLVM_TARGETS_TO_BUILD=X86 \
    -DCMAKE_BUILD_TYPE=Release \
    -S "$repo_dir" \
    -B "$build_dir"
  ninja -C "$build_dir" clang

  local bin_path="$build_dir/bin/clang"
  if [ ! -x "$bin_path" ]; then
    log "ERROR: OLLVM clang not found at $bin_path"
    exit 4
  fi

  install -m 0755 "$bin_path" "$BIN_CACHE/$bin_name"
  install -m 0755 "$bin_path" "$BIN_DIR/$bin_name"
}

install_kiteshield() {
  local name="kiteshield"
  local bin_name="${TOOL_BIN[$name]}"
  local repo_dir="$SRC_ROOT/$name"

  ensure_repo "$name"

  if [ -f "$repo_dir/.gitmodules" ]; then
    log "$name: syncing submodules..."
    git -C "$repo_dir" submodule update --init --recursive
  fi

  # Patch rationale (local, non-upstream):
  # - Ensure loader waits for generated obfuscated_strings.h.
  # - Remove -Werror for newer GCC compatibility.
  # - Skip loader tests (not needed to build packer).
  if [ "${SEAL_KITESHIELD_PATCH:-1}" = "1" ]; then
    perl -pi -e 's/^CFLAGS_COMMON = .*/CFLAGS_COMMON = -Wall -std=gnu99 -fno-pie -nostdlib -nostartfiles -nodefaultlibs -fno-builtin -c -I ../' \
      "$repo_dir/loader/Makefile"
    ROOT_PATH="$repo_dir" python3 - <<'PY'
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
    raise SystemExit("[install-tools] ERROR: unexpected Makefile structure; cannot patch rules block.")

path.write_text(text)
PY
    if [ -f "$repo_dir/packer/Makefile" ]; then
      perl -pi -e 's/ -Werror//g' "$repo_dir/packer/Makefile"
    fi
  fi

  if [ -f "$repo_dir/packer/bddisasm/Makefile" ]; then
    local bdd_lib="$repo_dir/packer/bddisasm/bin/x64/Release/libbddisasm.a"
    if [ ! -f "$bdd_lib" ]; then
      log "$name: building bddisasm (Release)..."
      make -C "$repo_dir/packer/bddisasm" bddisasm
    fi
  fi

  log "$name: building..."
  local bin_path=""
  if [ -f "$repo_dir/Cargo.toml" ]; then
    cargo build --release --manifest-path "$repo_dir/Cargo.toml"
    bin_path="$repo_dir/target/release/$bin_name"
  elif [ -f "$repo_dir/CMakeLists.txt" ]; then
    cmake -S "$repo_dir" -B "$repo_dir/build" -G Ninja -DCMAKE_BUILD_TYPE=Release
    cmake --build "$repo_dir/build"
    if [ -x "$repo_dir/build/$bin_name" ]; then
      bin_path="$repo_dir/build/$bin_name"
    elif [ -x "$repo_dir/build/bin/$bin_name" ]; then
      bin_path="$repo_dir/build/bin/$bin_name"
    else
      bin_path="$(find "$repo_dir/build" -maxdepth 3 -type f -name "$bin_name" -perm -111 | head -n 1 || true)"
    fi
  elif [ -f "$repo_dir/Makefile" ] || [ -f "$repo_dir/makefile" ]; then
    make -C "$repo_dir" -j
    if [ -x "$repo_dir/$bin_name" ]; then
      bin_path="$repo_dir/$bin_name"
    else
      bin_path="$(find "$repo_dir" -maxdepth 2 -type f -name "$bin_name" -perm -111 | head -n 1 || true)"
    fi
  else
    log "ERROR: $name build system not detected"
    exit 5
  fi

  if [ -z "$bin_path" ] || [ ! -x "$bin_path" ]; then
    log "ERROR: $name binary not found"
    exit 6
  fi

  install -m 0755 "$bin_path" "$BIN_CACHE/$bin_name"
  install -m 0755 "$bin_path" "$BIN_DIR/$bin_name"
}

install_midgetpack() {
  local name="midgetpack"
  local bin_name="${TOOL_BIN[$name]}"
  local repo_dir="$SRC_ROOT/$name"

  ensure_repo "$name"

  # Patch rationale (local, non-upstream):
  # - Force precompiled stubs to avoid static-link toolchain issues.
  # - Skip tests unless explicitly enabled.
  PATCH_MARKER="SEAL_PATCHED_MIDGETPACK"
  if [ "${SEAL_MIDGETPACK_PATCH:-1}" = "1" ]; then
    if ! grep -q "$PATCH_MARKER" "$repo_dir/src/stub/CMakeLists.txt"; then
      perl -0pi -e 's/include\(DefinePlatformDefaults\)\n/include(DefinePlatformDefaults)\n\n# SEAL_PATCHED_MIDGETPACK: force precompiled stubs to avoid toolchain static-link issues\nif(WITH_PRECOMPILED_STUBS)\n\tset(CCOMPILER_32 0)\n\tset(CCOMPILER_64 0)\n\tset(CCOMPILER_ARMV6 0)\nendif()\n\n/' "$repo_dir/src/stub/CMakeLists.txt"
    fi

    if ! grep -q "$PATCH_MARKER" "$repo_dir/src/CMakeLists.txt"; then
      perl -0pi -e 's/add_subdirectory\(tests\)/# SEAL_PATCHED_MIDGETPACK\nif(WITH_TESTS)\n\tadd_subdirectory(tests)\nendif()\n/' "$repo_dir/src/CMakeLists.txt"
    fi
  fi

  log "$name: building..."
  local bin_path=""
  if [ -f "$repo_dir/Cargo.toml" ]; then
    cargo build --release --manifest-path "$repo_dir/Cargo.toml"
    bin_path="$repo_dir/target/release/$bin_name"
  elif [ -f "$repo_dir/CMakeLists.txt" ]; then
    cmake -S "$repo_dir" -B "$repo_dir/build" -G Ninja -DCMAKE_BUILD_TYPE=Release -DWITH_PRECOMPILED_STUBS=ON
    cmake --build "$repo_dir/build"
    if [ -x "$repo_dir/build/$bin_name" ]; then
      bin_path="$repo_dir/build/$bin_name"
    elif [ -x "$repo_dir/build/bin/$bin_name" ]; then
      bin_path="$repo_dir/build/bin/$bin_name"
    else
      bin_path="$(find "$repo_dir/build" -maxdepth 3 -type f -name "$bin_name" -perm -111 | head -n 1 || true)"
    fi
  elif [ -f "$repo_dir/Makefile" ] || [ -f "$repo_dir/makefile" ]; then
    make -C "$repo_dir" -j
    if [ -x "$repo_dir/$bin_name" ]; then
      bin_path="$repo_dir/$bin_name"
    else
      bin_path="$(find "$repo_dir" -maxdepth 2 -type f -name "$bin_name" -perm -111 | head -n 1 || true)"
    fi
  else
    log "ERROR: $name build system not detected"
    exit 5
  fi

  if [ -z "$bin_path" ] || [ ! -x "$bin_path" ]; then
    log "ERROR: $name binary not found"
    exit 6
  fi

  install -m 0755 "$bin_path" "$BIN_CACHE/$bin_name"
  install -m 0755 "$bin_path" "$BIN_DIR/$bin_name"
}

install_hikari() {
  local name="hikari"
  local bin_name="${TOOL_BIN[$name]}"
  local repo_dir="$SRC_ROOT/$name"
  local build_dir="$repo_dir/build"

  ensure_repo "$name"

  if [ -f "$repo_dir/.gitmodules" ]; then
    log "$name: syncing submodules..."
    git -C "$repo_dir" submodule update --init --recursive || true
  fi

  local src_dir=""
  if [ -d "$repo_dir/llvm-project/llvm" ]; then
    src_dir="$repo_dir/llvm-project/llvm"
  elif [ -d "$repo_dir/llvm" ] && [ -f "$repo_dir/llvm/CMakeLists.txt" ]; then
    src_dir="$repo_dir/llvm"
  elif [ -f "$repo_dir/CMakeLists.txt" ]; then
    src_dir="$repo_dir"
  fi

  if [ -z "$src_dir" ]; then
    log "ERROR: $name missing LLVM source directory"
    exit 7
  fi

  log "$name: building..."
  cmake -G Ninja \
    -DLLVM_ENABLE_PROJECTS=clang \
    -DLLVM_TARGETS_TO_BUILD=X86 \
    -DCMAKE_BUILD_TYPE=Release \
    -S "$src_dir" \
    -B "$build_dir"
  ninja -C "$build_dir" clang

  local bin_path="$build_dir/bin/clang"
  if [ ! -x "$bin_path" ]; then
    log "ERROR: $name clang not found at $bin_path"
    exit 8
  fi

  install -m 0755 "$bin_path" "$BIN_CACHE/$bin_name"
  install -m 0755 "$bin_path" "$BIN_DIR/$bin_name"
}

install_tool() {
  local name="$1"
  local bin_name="${TOOL_BIN[$name]:-}"

  if [ -z "${TOOL_URL[$name]:-}" ]; then
    return
  fi
  if [ -z "$bin_name" ]; then
    log "ERROR: missing bin for $name"
    exit 7
  fi

  if stamp_matches "$name"; then
    if install_cached "$name"; then
      log "$name: cached (skip build)"
      return
    fi
  fi

  case "$name" in
    ollvm) install_ollvm ;;
    kiteshield) install_kiteshield ;;
    midgetpack) install_midgetpack ;;
    hikari) install_hikari ;;
    *)
      log "ERROR: unsupported tool in lockfile: $name"
      exit 8
      ;;
  esac

  mark_installed "$name"
  log "$name: installed"
  cleanup_tool_sources "$name"
}

for tool in "${TOOL_ORDER[@]}"; do
  install_tool "$tool"
done

log "All tools from lockfile installed."

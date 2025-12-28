#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

CACHE_BIN="${SEAL_E2E_CACHE_BIN:-${HOME}/.cache/seal/bin}"
CACHE_ROOT="${SEAL_E2E_CACHE_DIR:-$(dirname "$CACHE_BIN")}"
STAMPS_DIR="$CACHE_ROOT/stamps"
mkdir -p "$CACHE_BIN" "$STAMPS_DIR"
export PATH="$CACHE_BIN:$PATH"
export SEAL_OLLVM_BIN_DIR="$CACHE_BIN"
export SEAL_HIKARI_BIN_DIR="$CACHE_BIN"
export SEAL_KITESHIELD_BIN_DIR="$CACHE_BIN"
export SEAL_MIDGETPACK_BIN_DIR="$CACHE_BIN"
unset BASH_ENV ENV CDPATH GLOBIGNORE

log() {
  echo "[seal-e2e] $*"
}

SUMMARY_PATH="${SEAL_E2E_SUMMARY_PATH:-}"
SUMMARY_GROUP="${SEAL_E2E_GROUP:-default}"

format_duration() {
  local total="$1"
  local h=$((total / 3600))
  local m=$(((total % 3600) / 60))
  local s=$((total % 60))
  if [ "$h" -gt 0 ]; then
    printf "%02d:%02d:%02d" "$h" "$m" "$s"
  else
    printf "%02d:%02d" "$m" "$s"
  fi
}

has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

dir_has_files() {
  local dir="$1"
  [ -d "$dir" ] && [ -n "$(ls -A "$dir" 2>/dev/null)" ]
}

hash_inputs() {
  local file
  for file in "$@"; do
    if [ -f "$file" ]; then
      sha256sum "$file"
    else
      printf "missing:%s\n" "$file"
    fi
  done
}

make_sig() {
  local label="$1"
  shift
  {
    printf "label=%s\n" "$label"
    printf "node_major=%s\n" "${SEAL_NODE_MAJOR:-24}"
    hash_inputs "$@"
  } | sha256sum | awk '{print $1}'
}

sig_changed() {
  local stamp="$1"
  local sig="$2"
  if [ ! -f "$stamp" ]; then
    return 0
  fi
  if [ "$(cat "$stamp")" != "$sig" ]; then
    return 0
  fi
  return 1
}

trim_list() {
  local raw="$1"
  echo "$raw" | tr ',;' ' ' | tr -s ' ' | sed 's/^ *//;s/ *$//'
}

load_e2e_config() {
  local cfg="${SEAL_E2E_CONFIG:-}"
  local default_cfg="$REPO_ROOT/.seal/e2e.env"
  local sample_cfg="$REPO_ROOT/tools/seal/seal/scripts/e2e-config.env"
  if [ -z "$cfg" ]; then
    if [ -f "$default_cfg" ]; then
      cfg="$default_cfg"
    elif [ -f "$sample_cfg" ]; then
      cfg="$sample_cfg"
    fi
  fi
  if [ -n "$cfg" ] && [ -f "$cfg" ]; then
    log "Loading E2E config: $cfg"
    set -a
    # shellcheck disable=SC1090
    . "$cfg"
    set +a
  fi
}

load_e2e_config

TOOLSET="${SEAL_E2E_TOOLSET:-core}"
if [ "$TOOLSET" = "core" ]; then
  export SEAL_C_OBF_ALLOW_MISSING=1
  export SEAL_MIDGETPACK_SKIP=1
fi

init_summary_file() {
  if [ -z "$SUMMARY_PATH" ]; then
    return
  fi
  mkdir -p "$(dirname "$SUMMARY_PATH")"
  if [ "${SEAL_E2E_SUMMARY_APPEND:-0}" != "1" ]; then
    printf "group\ttest\tstatus\tduration_s\n" > "$SUMMARY_PATH"
  else
    if [ ! -f "$SUMMARY_PATH" ]; then
      printf "group\ttest\tstatus\tduration_s\n" > "$SUMMARY_PATH"
    fi
  fi
}

write_summary_file() {
  if [ -z "$SUMMARY_PATH" ]; then
    return
  fi
  local name status dur
  for name in "${TEST_ORDER[@]}"; do
    status="${TEST_STATUS[$name]}"
    dur="${TEST_DURATIONS[$name]:-0}"
    printf "%s\t%s\t%s\t%s\n" "$SUMMARY_GROUP" "$name" "$status" "$dur" >> "$SUMMARY_PATH"
  done
}

declare -A E2E_ONLY=()
declare -A E2E_SKIP=()
E2E_ONLY_RAW="$(trim_list "${SEAL_E2E_TESTS:-}")"
E2E_SKIP_RAW="$(trim_list "${SEAL_E2E_SKIP:-}")"
if [ -n "$E2E_ONLY_RAW" ]; then
  for item in $E2E_ONLY_RAW; do
    E2E_ONLY["$item"]=1
  done
fi
if [ -n "$E2E_SKIP_RAW" ]; then
  for item in $E2E_SKIP_RAW; do
    E2E_SKIP["$item"]=1
  done
fi

should_run() {
  local name="$1"
  if [ -n "$E2E_ONLY_RAW" ] && [ -z "${E2E_ONLY[$name]:-}" ]; then
    return 1
  fi
  if [ -n "$E2E_SKIP_RAW" ] && [ -n "${E2E_SKIP[$name]:-}" ]; then
    return 1
  fi
  return 0
}

START_TS="$(date +%s)"
SUMMARY_PRINTED=0
declare -A TEST_DURATIONS=()
declare -A TEST_STATUS=()
declare -a TEST_ORDER=()

print_summary() {
  if [ "$SUMMARY_PRINTED" = "1" ]; then
    return
  fi
  SUMMARY_PRINTED=1
  local end_ts
  end_ts="$(date +%s)"
  local total=$((end_ts - START_TS))

  local ok_count=0
  local skip_count=0
  local fail_count=0
  local sum_tests=0
  for name in "${!TEST_STATUS[@]}"; do
    case "${TEST_STATUS[$name]}" in
      ok) ok_count=$((ok_count + 1)) ;;
      skipped) skip_count=$((skip_count + 1)) ;;
      failed) fail_count=$((fail_count + 1)) ;;
    esac
  done
  for name in "${!TEST_DURATIONS[@]}"; do
    sum_tests=$((sum_tests + TEST_DURATIONS[$name]))
  done

  log "Timing summary (total $(format_duration "$total")):"
  if [ "${#TEST_DURATIONS[@]}" -gt 0 ]; then
    {
      for name in "${!TEST_DURATIONS[@]}"; do
        printf "%s\t%s\n" "${TEST_DURATIONS[$name]}" "$name"
      done
    } | sort -nr | while read -r dur name; do
      status="${TEST_STATUS[$name]}"
      printf "[seal-e2e]   - %s  %s  (%s)\n" "$name" "$status" "$(format_duration "$dur")"
    done
  fi
  log "Stats: ok=${ok_count}, skipped=${skip_count}, failed=${fail_count}"
  if [ "$sum_tests" -gt 0 ] && [ "$total" -gt "$sum_tests" ]; then
    local overhead=$((total - sum_tests))
    log "Non-test time: $(format_duration "$overhead") (setup/deps/copy)"
  fi

  write_summary_file
}

trap print_summary EXIT

init_summary_file

DEPS_SIG="$(make_sig "deps" \
  "$REPO_ROOT/package.json" \
  "$REPO_ROOT/package-lock.json" \
  "$REPO_ROOT/tools/seal/seal/package.json" \
  "$REPO_ROOT/tools/seal/seal/package-lock.json")"
DEPS_STAMP="$STAMPS_DIR/deps.sig"
NEED_DEPS="${SEAL_E2E_INSTALL_DEPS:-}"
if [ -z "$NEED_DEPS" ]; then
  NEED_DEPS=0
  if ! dir_has_files "$REPO_ROOT/node_modules"; then
    NEED_DEPS=1
  elif sig_changed "$DEPS_STAMP" "$DEPS_SIG"; then
    NEED_DEPS=1
  fi
fi
if [ "$NEED_DEPS" = "1" ]; then
  log "Installing core SEAL dependencies..."
  SEAL_NPM_SKIP_IF_PRESENT=0 "$SCRIPT_DIR/install-seal-deps.sh"
  echo "$DEPS_SIG" > "$DEPS_STAMP"
fi

NEED_PACKERS="${SEAL_E2E_INSTALL_PACKERS:-}"
if [ -z "$NEED_PACKERS" ]; then
  NEED_PACKERS=0
  if [ "${SEAL_E2E_REINSTALL_PACKERS:-0}" = "1" ]; then
    NEED_PACKERS=1
  else
    if ! has_cmd upx || ! has_cmd kiteshield || ! has_cmd strip; then
      NEED_PACKERS=1
    elif [ "$TOOLSET" = "full" ] && ! has_cmd midgetpack; then
      NEED_PACKERS=1
    fi
  fi
fi
if [ "$NEED_PACKERS" = "1" ]; then
  log "Installing ELF packers..."
  "$SCRIPT_DIR/install-upx.sh"
  "$SCRIPT_DIR/install-kiteshield.sh"
  if [ "$TOOLSET" = "full" ]; then
    "$SCRIPT_DIR/install-midgetpack.sh"
  fi
  "$SCRIPT_DIR/install-strip.sh"
else
  log "ELF packers already installed (skip)."
fi

NEED_OBF="${SEAL_E2E_INSTALL_OBFUSCATORS:-}"
if [ -z "$NEED_OBF" ]; then
  NEED_OBF=0
  if [ "${SEAL_E2E_REINSTALL_OBFUSCATORS:-0}" = "1" ]; then
    NEED_OBF=1
  elif [ "$TOOLSET" = "full" ]; then
    if ! has_cmd ollvm-clang; then
      NEED_OBF=1
    elif ! has_cmd hikari-clang; then
      NEED_OBF=1
    fi
  fi
fi
if [ "$NEED_OBF" = "1" ]; then
  log "Installing C obfuscators..."
  "$SCRIPT_DIR/install-ollvm.sh"
  if [ "$TOOLSET" = "full" ]; then
    "$SCRIPT_DIR/install-hikari-llvm15.sh"
  fi
else
  if [ "$TOOLSET" = "full" ]; then
    log "C obfuscators already installed (skip)."
  else
    log "Skipping C obfuscator install for core toolset (set SEAL_E2E_INSTALL_OBFUSCATORS=1 to enable)."
  fi
fi

export LC_ALL=C
export TZ=UTC

EXAMPLE_SRC="$REPO_ROOT/tools/seal/example"
EXAMPLE_DST="${SEAL_E2E_EXAMPLE_ROOT:-/tmp/seal-example-e2e}"
if [ "${SEAL_E2E_COPY_EXAMPLE:-1}" = "1" ]; then
  log "Preparing disposable example workspace..."
  rm -rf "$EXAMPLE_DST"
  cp -a "$EXAMPLE_SRC" "$EXAMPLE_DST"
  export SEAL_E2E_EXAMPLE_ROOT="$EXAMPLE_DST"
fi

EXAMPLE_DIR="${SEAL_E2E_EXAMPLE_ROOT:-$EXAMPLE_DST}"
EXAMPLE_SIG="$(make_sig "example" \
  "$EXAMPLE_SRC/package.json" \
  "$EXAMPLE_SRC/package-lock.json")"
EXAMPLE_STAMP="$STAMPS_DIR/example.sig"
NEED_EXAMPLE_DEPS="${SEAL_E2E_INSTALL_EXAMPLE_DEPS:-}"
if [ -d "$EXAMPLE_DIR" ]; then
  if [ -z "$NEED_EXAMPLE_DEPS" ]; then
    NEED_EXAMPLE_DEPS=0
    EXAMPLE_NODE_MODULES_DIR="$EXAMPLE_DIR/node_modules"
    if [ -n "${SEAL_E2E_NODE_MODULES_ROOT:-}" ]; then
      EXAMPLE_NODE_MODULES_DIR="$SEAL_E2E_NODE_MODULES_ROOT"
    fi
    if sig_changed "$EXAMPLE_STAMP" "$EXAMPLE_SIG" || ! dir_has_files "$EXAMPLE_NODE_MODULES_DIR"; then
      NEED_EXAMPLE_DEPS=1
    fi
  fi
  if [ -n "${SEAL_E2E_NODE_MODULES_ROOT:-}" ]; then
    mkdir -p "$SEAL_E2E_NODE_MODULES_ROOT"
    if [ ! -d "$EXAMPLE_DIR/node_modules" ]; then
      log "Linking shared node_modules..."
      ln -s "$SEAL_E2E_NODE_MODULES_ROOT" "$EXAMPLE_DIR/node_modules"
    fi
    if [ "$NEED_EXAMPLE_DEPS" = "1" ]; then
      log "Installing example dependencies (shared cache)..."
      (cd "$EXAMPLE_DIR" && npm install)
      echo "$EXAMPLE_SIG" > "$EXAMPLE_STAMP"
    fi
  else
    if [ "$NEED_EXAMPLE_DEPS" = "1" ]; then
      log "Installing example dependencies..."
      (cd "$EXAMPLE_DIR" && npm install)
      echo "$EXAMPLE_SIG" > "$EXAMPLE_STAMP"
    fi
  fi
fi

if [ ! -s /etc/machine-id ]; then
  log "Generating /etc/machine-id for sentinel E2E..."
  if has_cmd systemd-machine-id-setup; then
    systemd-machine-id-setup >/dev/null 2>&1 || true
  fi
  if [ ! -s /etc/machine-id ]; then
    cat /proc/sys/kernel/random/uuid | tr -d '-' > /etc/machine-id
  fi
fi

export SEAL_THIN_E2E=1
export SEAL_THIN_ANTI_DEBUG_E2E=1
export SEAL_LEGACY_PACKAGERS_E2E=1
export SEAL_USER_FLOW_E2E=1
export SEAL_E2E_STRICT_PROC_MEM="${SEAL_E2E_STRICT_PROC_MEM:-1}"
export SEAL_E2E_STRICT_PTRACE="${SEAL_E2E_STRICT_PTRACE:-1}"
export SEAL_E2E_STRICT_DENY_ENV="${SEAL_E2E_STRICT_DENY_ENV:-0}"
export SEAL_SENTINEL_E2E=1
export SEAL_PROTECTION_E2E=1
export SEAL_OBFUSCATION_E2E=1
export SEAL_STRIP_E2E=1
export SEAL_ELF_PACKERS_E2E=1
DEFAULT_C_OBF_E2E=1
if [ "$TOOLSET" != "full" ]; then
  DEFAULT_C_OBF_E2E=0
fi
export SEAL_C_OBF_E2E="${SEAL_C_OBF_E2E:-$DEFAULT_C_OBF_E2E}"
export SEAL_UI_E2E=1
export SEAL_POSTJECT_E2E=1
export SEAL_SHIP_E2E=1
export SEAL_DECOY_E2E=1

E2E_SSH="${SEAL_E2E_SSH:-}"
if [ -z "$E2E_SSH" ]; then
  E2E_SSH="${SEAL_SHIP_SSH_E2E:-0}"
fi
if [ "$E2E_SSH" = "1" ]; then
  export SEAL_E2E_SSH=1
  export SEAL_SHIP_SSH_E2E=1
  export SEAL_USER_FLOW_SSH_E2E=1
  export SEAL_SHIP_SSH_HOST="${SEAL_SHIP_SSH_HOST:-seal-server}"
  export SEAL_SHIP_SSH_USER="${SEAL_SHIP_SSH_USER:-admin}"
  export SEAL_SHIP_SSH_PORT="${SEAL_SHIP_SSH_PORT:-22}"
  export SEAL_SHIP_SSH_INSTALL_DIR="${SEAL_SHIP_SSH_INSTALL_DIR:-/home/admin/apps/seal-example}"
  export SEAL_SHIP_SSH_SERVICE_NAME="${SEAL_SHIP_SSH_SERVICE_NAME:-seal-example}"
  export SEAL_SHIP_SSH_HTTP_PORT="${SEAL_SHIP_SSH_HTTP_PORT:-3333}"
else
  export SEAL_E2E_SSH=0
  export SEAL_SHIP_SSH_E2E=0
  export SEAL_USER_FLOW_SSH_E2E=0
fi

export SEAL_THIN_CHUNK_SIZE="${SEAL_THIN_CHUNK_SIZE:-8388608}"
export SEAL_THIN_ZSTD_LEVEL="${SEAL_THIN_ZSTD_LEVEL:-1}"
export SEAL_THIN_ZSTD_TIMEOUT_MS="${SEAL_THIN_ZSTD_TIMEOUT_MS:-120000}"

export SEAL_UI_E2E_HEADLESS="${SEAL_UI_E2E_HEADLESS:-1}"

if [ "${SEAL_UI_E2E:-0}" = "1" ] && should_run "example-ui"; then
  PW_MARKER="${SEAL_E2E_PLAYWRIGHT_MARKER:-/root/.cache/seal/playwright-installed}"
  if ! has_cmd npx; then
    log "WARN: npx not found; skipping Playwright browser install"
  else
    if [ ! -f "$PW_MARKER" ]; then
      if [ ! -x "$REPO_ROOT/tools/seal/seal/node_modules/.bin/playwright" ]; then
        log "Playwright CLI missing; installing tools/seal/seal npm deps..."
        (cd "$REPO_ROOT/tools/seal/seal" && npm install)
      fi
      if [ ! -d "/root/.cache/ms-playwright" ] || [ -z "$(ls -A /root/.cache/ms-playwright 2>/dev/null)" ]; then
        log "Installing Playwright browsers for UI E2E..."
        (cd "$REPO_ROOT" && npx playwright install --with-deps chromium)
      fi
      touch "$PW_MARKER"
    fi
  fi
fi

run_test() {
  local name="$1"
  shift
  if ! should_run "$name"; then
    log "SKIP: ${name} (filtered)"
    TEST_STATUS["$name"]="skipped"
    TEST_DURATIONS["$name"]=0
    TEST_ORDER+=("$name")
    return
  fi
  log "Running ${name}..."
  TEST_ORDER+=("$name")
  local start
  start="$(date +%s)"
  set +e
  "$@"
  local status=$?
  set -e
  local end
  end="$(date +%s)"
  local dur=$((end - start))
  TEST_DURATIONS["$name"]="$dur"
  if [ "$status" -ne 0 ]; then
    TEST_STATUS["$name"]="failed"
    log "FAIL: ${name} (time=$(format_duration "$dur"))"
    exit "$status"
  fi
  TEST_STATUS["$name"]="ok"
  log "OK: ${name} (time=$(format_duration "$dur"))"
}

NODE_BIN="$(command -v node || true)"
if [ -z "$NODE_BIN" ]; then
  NODE_BIN="$(command -v nodejs || true)"
fi
if [ -z "$NODE_BIN" ]; then
  log "ERROR: node not found in PATH."
  exit 1
fi

cd "$REPO_ROOT"

if [ "${SEAL_E2E_SETUP_ONLY:-0}" = "1" ]; then
  log "Setup only (SEAL_E2E_SETUP_ONLY=1). Skipping tests."
  exit 0
fi

SEAL_THIN_E2E_NATIVE_RUN_TIMEOUT_MS="${SEAL_THIN_E2E_NATIVE_RUN_TIMEOUT_MS:-240000}" \
  run_test "thin" "$NODE_BIN" tools/seal/seal/scripts/test-thin-e2e.js
run_test "thin-anti-debug" "$NODE_BIN" tools/seal/seal/scripts/test-thin-anti-debug-e2e.js
run_test "legacy-packagers" "$NODE_BIN" tools/seal/seal/scripts/test-legacy-packagers-e2e.js
run_test "completion" "$NODE_BIN" tools/seal/seal/scripts/test-completion-e2e.js
run_test "user-flow" "$NODE_BIN" tools/seal/seal/scripts/test-user-flow-e2e.js
run_test "sentinel" "$NODE_BIN" tools/seal/seal/scripts/test-sentinel-e2e.js
run_test "protection" "$NODE_BIN" tools/seal/seal/scripts/test-protection-e2e.js
run_test "obfuscation" "$NODE_BIN" tools/seal/seal/scripts/test-obfuscation-e2e.js
run_test "strip" "$NODE_BIN" tools/seal/seal/scripts/test-strip-e2e.js
run_test "elf-packers" "$NODE_BIN" tools/seal/seal/scripts/test-elf-packers-e2e.js
run_test "c-obfuscators" "$NODE_BIN" tools/seal/seal/scripts/test-c-obfuscators-e2e.js
run_test "postject" "$NODE_BIN" tools/seal/seal/scripts/test-postject-e2e.js
run_test "example-ui" "$NODE_BIN" tools/seal/seal/scripts/test-example-ui-e2e.js
run_test "decoy" "$NODE_BIN" tools/seal/seal/scripts/test-decoy-e2e.js
run_test "ship" "$NODE_BIN" tools/seal/seal/scripts/test-ship-e2e.js

log "All E2E tests finished."

#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

unset BASH_ENV ENV CDPATH GLOBIGNORE

log() {
  echo "[seal-e2e] $*"
}

ensure_escalation() {
  if [ "${SEAL_E2E_REQUIRE_ESCALATION:-1}" != "1" ]; then
    return
  fi
  if [ "${SEAL_E2E_ESCALATED:-0}" = "1" ]; then
    return
  fi
  if [ "$(id -u)" -eq 0 ]; then
    export SEAL_E2E_ESCALATED=1
    return
  fi
  if ! command -v sudo >/dev/null 2>&1; then
    log "ERROR: escalation required but sudo not found."
    exit 1
  fi
  if sudo -n true >/dev/null 2>&1; then
    log "Escalating via sudo..."
    exec sudo -E env SEAL_E2E_ESCALATED=1 "$0" "$@"
  fi
  if [ ! -t 0 ]; then
    log "ERROR: escalation required but no TTY; re-run with sudo or Codex escalation."
    exit 1
  fi
  log "Escalation required; you may be prompted."
  sudo -v || exit 1
  exec sudo -E env SEAL_E2E_ESCALATED=1 "$0" "$@"
}

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

npm_install() {
  local dir="$1"
  if ! has_cmd npm; then
    log "ERROR: npm not found in PATH."
    exit 1
  fi
  if [ -f "$dir/package-lock.json" ]; then
    (cd "$dir" && npm ci)
  else
    (cd "$dir" && npm install)
  fi
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
  local node_ver="missing"
  local npm_ver="missing"
  if command -v node >/dev/null 2>&1; then
    node_ver="$(node -v 2>/dev/null || true)"
    node_ver="${node_ver:-missing}"
  fi
  if command -v npm >/dev/null 2>&1; then
    npm_ver="$(npm -v 2>/dev/null || true)"
    npm_ver="${npm_ver:-missing}"
  fi
  {
    printf "label=%s\n" "$label"
    printf "node_major=%s\n" "${SEAL_NODE_MAJOR:-24}"
    printf "node_version=%s\n" "$node_ver"
    printf "npm_version=%s\n" "$npm_ver"
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

intersect_lists() {
  local left="$1"
  local right="$2"
  declare -A seen=()
  local item
  for item in $left; do
    seen["$item"]=1
  done
  local out=""
  for item in $right; do
    if [ -n "${seen[$item]:-}" ]; then
      out+="${item} "
    fi
  done
  echo "$out"
}

load_failed_tests() {
  local summary_file="$1"
  if [ ! -f "$summary_file" ]; then
    return 1
  fi
  awk -F'\t' 'NR>1 && $3=="failed" {print $2}' "$summary_file" | tr '\n' ' '
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
  if [ -n "$cfg" ]; then
    if [ ! -f "$cfg" ]; then
      log "ERROR: SEAL_E2E_CONFIG points to missing file: $cfg"
      exit 1
    fi
    if [ ! -r "$cfg" ]; then
      log "ERROR: SEAL_E2E_CONFIG is not readable: $cfg"
      exit 1
    fi
    log "Loading E2E config: $cfg"
    set -a
    # shellcheck disable=SC1090
    . "$cfg"
    set +a
  fi
}

load_e2e_config

ensure_escalation "$@"

CACHE_BIN="${SEAL_E2E_CACHE_BIN:-${HOME}/.cache/seal/bin}"
CACHE_ROOT="${SEAL_E2E_CACHE_DIR:-$(dirname "$CACHE_BIN")}"
STAMPS_DIR="$CACHE_ROOT/stamps"
mkdir -p "$CACHE_BIN" "$STAMPS_DIR"
export PATH="$CACHE_BIN:$PATH"
export SEAL_OLLVM_BIN_DIR="$CACHE_BIN"
export SEAL_HIKARI_BIN_DIR="$CACHE_BIN"
export SEAL_KITESHIELD_BIN_DIR="$CACHE_BIN"
export SEAL_MIDGETPACK_BIN_DIR="$CACHE_BIN"

SETUP_ONLY="${SEAL_E2E_SETUP_ONLY:-0}"
FAIL_FAST="${SEAL_E2E_FAIL_FAST:-0}"
SKIP_CODE=77
SUMMARY_GROUP="${SEAL_E2E_GROUP:-default}"
SUMMARY_SCOPE="${SEAL_E2E_SUMMARY_SCOPE:-all}"
RUN_ID="${SEAL_E2E_RUN_ID:-$(date +%Y%m%d-%H%M%S)-$$}"
export SEAL_E2E_RUN_ID="$RUN_ID"

NPM_CACHE_DIR="${NPM_CONFIG_CACHE:-$CACHE_ROOT/npm}"
export NPM_CONFIG_CACHE="$NPM_CACHE_DIR"
export NPM_CONFIG_AUDIT="${NPM_CONFIG_AUDIT:-false}"
export NPM_CONFIG_FUND="${NPM_CONFIG_FUND:-false}"
export NPM_CONFIG_PROGRESS="${NPM_CONFIG_PROGRESS:-false}"
export NPM_CONFIG_UPDATE_NOTIFIER="${NPM_CONFIG_UPDATE_NOTIFIER:-false}"
export NPM_CONFIG_LOGLEVEL="${NPM_CONFIG_LOGLEVEL:-warn}"
mkdir -p "$NPM_CACHE_DIR"

SUMMARY_LAST_PATH=""
DEFAULT_SUMMARY_DIR="$CACHE_ROOT/e2e-summary"
if [ "$SETUP_ONLY" = "1" ]; then
  SUMMARY_PATH="${SEAL_E2E_SUMMARY_PATH:-}"
else
  if [ -n "${SEAL_E2E_SUMMARY_PATH:-}" ]; then
    SUMMARY_PATH="$SEAL_E2E_SUMMARY_PATH"
  else
    SUMMARY_PATH="$DEFAULT_SUMMARY_DIR/run-$RUN_ID.tsv"
    SUMMARY_LAST_PATH="$DEFAULT_SUMMARY_DIR/last.tsv"
  fi
fi
LOG_CAPTURE="${SEAL_E2E_CAPTURE_LOGS:-1}"
LOG_DIR="${SEAL_E2E_LOG_DIR:-$CACHE_ROOT/e2e-logs/$RUN_ID}"
export SEAL_E2E_LOG_DIR="$LOG_DIR"
LOG_TAIL_LINES="${SEAL_E2E_LOG_TAIL_LINES:-40}"
LOG_FILTERED="${SEAL_E2E_LOG_FILTERED:-1}"
if [ "$SETUP_ONLY" = "1" ]; then
  LOG_CAPTURE=0
fi

TOOLSET="${SEAL_E2E_TOOLSET:-core}"
if [ "$TOOLSET" = "core" ]; then
  export SEAL_C_OBF_ALLOW_MISSING=1
  export SEAL_MIDGETPACK_SKIP=1
fi

E2E_HOME=""
ISOLATE_HOME="${SEAL_E2E_ISOLATE_HOME:-}"
if [ -z "$ISOLATE_HOME" ]; then
  if [ "${SEAL_DOCKER_E2E:-0}" = "1" ]; then
    ISOLATE_HOME=1
  else
    ISOLATE_HOME=0
  fi
fi
if [ "$ISOLATE_HOME" = "1" ]; then
  E2E_HOME_ROOT="${SEAL_E2E_HOME_ROOT:-$CACHE_ROOT/e2e-home}"
  mkdir -p "$E2E_HOME_ROOT"
  E2E_HOME="$(mktemp -d "$E2E_HOME_ROOT/home-XXXXXX")"
  export HOME="$E2E_HOME"
  export XDG_CACHE_HOME="$E2E_HOME/.cache"
  export XDG_CONFIG_HOME="$E2E_HOME/.config"
  export XDG_DATA_HOME="$E2E_HOME/.local/share"
  export XDG_STATE_HOME="$E2E_HOME/.local/state"
  mkdir -p "$XDG_CACHE_HOME" "$XDG_CONFIG_HOME" "$XDG_DATA_HOME" "$XDG_STATE_HOME"
  log "Isolated HOME for E2E: $E2E_HOME"
fi

MANIFEST_PATH="${SEAL_E2E_MANIFEST:-$SCRIPT_DIR/e2e-tests.tsv}"
declare -A TEST_CATEGORY=()
declare -A TEST_DESC=()
declare -A TEST_SKIP_RISK=()
declare -A TEST_PARALLEL=()
declare -A TEST_HINT=()
declare -A TEST_SCRIPT=()
declare -A TEST_HOST_ONLY=()
declare -A CATEGORY_SEEN=()
declare -a MANIFEST_ORDER=()
declare -a CATEGORY_ORDER=()

if [ ! -f "$MANIFEST_PATH" ]; then
  log "ERROR: missing E2E manifest: $MANIFEST_PATH"
  exit 1
fi

while IFS=$'\t' read -r name category parallel desc skip_risk hint script host_only; do
  if [ -z "$name" ] || [ "$name" = "name" ] || [[ "$name" = \#* ]]; then
    continue
  fi
  TEST_CATEGORY["$name"]="$category"
  TEST_PARALLEL["$name"]="$parallel"
  TEST_DESC["$name"]="$desc"
  TEST_SKIP_RISK["$name"]="$skip_risk"
  TEST_HINT["$name"]="$hint"
  TEST_SCRIPT["$name"]="$script"
  TEST_HOST_ONLY["$name"]="$host_only"
  MANIFEST_ORDER+=("$name")
  if [ -n "$category" ] && [ -z "${CATEGORY_SEEN[$category]:-}" ]; then
    CATEGORY_SEEN["$category"]=1
    CATEGORY_ORDER+=("$category")
  fi
done < "$MANIFEST_PATH"

log_effective_config() {
  log "Effective config:"
  log "  toolset=$TOOLSET parallel=${SEAL_E2E_PARALLEL:-0} mode=${SEAL_E2E_PARALLEL_MODE:-} jobs=${SEAL_E2E_JOBS:-}"
  log "  tests=${SEAL_E2E_TESTS:-<all>} skip=${SEAL_E2E_SKIP:-<none>} limited_host=${SEAL_E2E_LIMITED_HOST:-0} fail_fast=$FAIL_FAST"
  log "  summary=${SUMMARY_PATH:-<disabled>} last=${SUMMARY_LAST_PATH:-<none>}"
  log "  log_dir=${LOG_DIR} capture_logs=${LOG_CAPTURE} log_filtered=${LOG_FILTERED}"
  log "  cache_root=${CACHE_ROOT} npm_cache=${NPM_CONFIG_CACHE} node_modules_root=${SEAL_E2E_NODE_MODULES_ROOT:-<none>}"
  if [ -n "${SEAL_E2E_CONFIG:-}" ]; then
    log "  config=${SEAL_E2E_CONFIG}"
  fi
  if [ -n "$E2E_HOME" ]; then
    log "  home=${E2E_HOME}"
  fi
}

log_effective_config

init_summary_file() {
  if [ -z "$SUMMARY_PATH" ]; then
    return
  fi
  mkdir -p "$(dirname "$SUMMARY_PATH")"
  if [ "${SEAL_E2E_SUMMARY_APPEND:-0}" != "1" ]; then
    printf "group\ttest\tstatus\tduration_s\tcategory\tparallel\tskip_risk\tdescription\tlog_path\tfail_hint\n" > "$SUMMARY_PATH"
  else
    if [ ! -f "$SUMMARY_PATH" ]; then
      printf "group\ttest\tstatus\tduration_s\tcategory\tparallel\tskip_risk\tdescription\tlog_path\tfail_hint\n" > "$SUMMARY_PATH"
    fi
  fi
}

write_summary_file() {
  if [ -z "$SUMMARY_PATH" ]; then
    return
  fi
  local name status dur category parallel skip_risk desc log_path hint
  for name in "${TEST_ORDER[@]}"; do
    status="${TEST_STATUS[$name]}"
    dur="${TEST_DURATIONS[$name]:-0}"
    category="${TEST_CATEGORY[$name]:-}"
    parallel="${TEST_PARALLEL[$name]:-0}"
    skip_risk="${TEST_SKIP_RISK[$name]:-}"
    desc="${TEST_DESC[$name]:-}"
    hint="${TEST_HINT[$name]:-}"
    log_path="${TEST_LOGS[$name]:-}"
    desc="${desc//$'\t'/ }"
    hint="${hint//$'\t'/ }"
    printf "%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n" \
      "$SUMMARY_GROUP" "$name" "$status" "$dur" "$category" "$parallel" "$skip_risk" "$desc" "$log_path" "$hint" >> "$SUMMARY_PATH"
  done
}

update_last_summary() {
  if [ -z "$SUMMARY_LAST_PATH" ] || [ -z "$SUMMARY_PATH" ] || [ ! -f "$SUMMARY_PATH" ]; then
    return
  fi
  local last_dir tmp_path
  last_dir="$(dirname "$SUMMARY_LAST_PATH")"
  mkdir -p "$last_dir"
  tmp_path="${SUMMARY_LAST_PATH}.tmp.$$"
  cp -f "$SUMMARY_PATH" "$tmp_path"
  mv -f "$tmp_path" "$SUMMARY_LAST_PATH"
}

declare -A E2E_ONLY=()
declare -A E2E_SKIP=()
E2E_ONLY_RAW="$(trim_list "${SEAL_E2E_TESTS:-}")"
E2E_SKIP_RAW="$(trim_list "${SEAL_E2E_SKIP:-}")"
RERUN_FAILED="${SEAL_E2E_RERUN_FAILED:-0}"
DEFAULT_RERUN_FROM="$SUMMARY_PATH"
if [ -n "$SUMMARY_LAST_PATH" ]; then
  DEFAULT_RERUN_FROM="$SUMMARY_LAST_PATH"
fi
RERUN_FROM="${SEAL_E2E_RERUN_FROM:-$DEFAULT_RERUN_FROM}"
FAILED_ONLY_RAW=""
if [ "$RERUN_FAILED" = "1" ] && [ "$SETUP_ONLY" != "1" ]; then
  if [ -z "$RERUN_FROM" ]; then
    log "WARN: SEAL_E2E_RERUN_FAILED=1 but no summary path is set."
  else
    FAILED_ONLY_RAW="$(trim_list "$(load_failed_tests "$RERUN_FROM" || true)")"
    if [ -z "$FAILED_ONLY_RAW" ]; then
      log "No failed tests in $RERUN_FROM; nothing to rerun."
      exit 0
    fi
  fi
fi
if [ -n "$FAILED_ONLY_RAW" ]; then
  if [ -n "$E2E_ONLY_RAW" ]; then
    E2E_ONLY_RAW="$(trim_list "$(intersect_lists "$E2E_ONLY_RAW" "$FAILED_ONLY_RAW")")"
  else
    E2E_ONLY_RAW="$FAILED_ONLY_RAW"
  fi
  if [ -z "$E2E_ONLY_RAW" ]; then
    log "No tests left after rerun/filters."
    exit 0
  fi
  if [ -z "${SEAL_E2E_SUMMARY_SCOPE:-}" ]; then
    SUMMARY_SCOPE="selected"
  fi
  log "Rerun failed tests only: $E2E_ONLY_RAW"
fi
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

HOST_LIMITED="${SEAL_E2E_LIMITED_HOST:-0}"
if [ "$HOST_LIMITED" = "1" ]; then
  HOST_ONLY_LIST=""
  for name in "${MANIFEST_ORDER[@]}"; do
    if [ "${TEST_HOST_ONLY[$name]:-0}" = "1" ]; then
      E2E_SKIP["$name"]=1
      HOST_ONLY_LIST+="${name} "
    fi
  done
  if [ -n "$HOST_ONLY_LIST" ]; then
    log "Host-limited mode: skipping host-only tests: ${HOST_ONLY_LIST% }"
  fi
fi

should_run() {
  local name="$1"
  if [ -n "$E2E_ONLY_RAW" ] && [ -z "${E2E_ONLY[$name]:-}" ]; then
    return 1
  fi
  if [ -n "${E2E_SKIP[$name]:-}" ]; then
    return 1
  fi
  return 0
}

START_TS="$(date +%s)"
SUMMARY_PRINTED=0
declare -A TEST_DURATIONS=()
declare -A TEST_STATUS=()
declare -A TEST_LOGS=()
declare -a TEST_ORDER=()
FAILURES=0

print_category_table() {
  if [ "${#MANIFEST_ORDER[@]}" -eq 0 ]; then
    return
  fi
  log "Category summary:"
  local category name status total ok_count skip_count fail_count dur par skip_risk desc
  local -a order_list=("${MANIFEST_ORDER[@]}")
  local -a categories=()
  declare -A cat_seen=()
  if [ "$SUMMARY_SCOPE" = "selected" ]; then
    order_list=("${TEST_ORDER[@]}")
  fi
  for name in "${order_list[@]}"; do
    category="${TEST_CATEGORY[$name]:-misc}"
    if [ -z "${cat_seen[$category]:-}" ]; then
      cat_seen["$category"]=1
      categories+=("$category")
    fi
  done
  for category in "${categories[@]}"; do
    total=0
    ok_count=0
    skip_count=0
    fail_count=0
    for name in "${order_list[@]}"; do
      if [ "${TEST_CATEGORY[$name]:-}" != "$category" ]; then
        continue
      fi
      status="${TEST_STATUS[$name]:-skipped}"
      total=$((total + 1))
      case "$status" in
        ok) ok_count=$((ok_count + 1)) ;;
        skipped) skip_count=$((skip_count + 1)) ;;
        failed) fail_count=$((fail_count + 1)) ;;
      esac
    done
    printf "[seal-e2e] Category %s: total=%s ok=%s skipped=%s failed=%s\n" \
      "$category" "$total" "$ok_count" "$skip_count" "$fail_count"
    printf "[seal-e2e]   Test | Status | Time | Parallel | SkipRisk | Description\n"
    for name in "${order_list[@]}"; do
      if [ "${TEST_CATEGORY[$name]:-}" != "$category" ]; then
        continue
      fi
      status="${TEST_STATUS[$name]:-skipped}"
      dur="${TEST_DURATIONS[$name]:-0}"
      par="${TEST_PARALLEL[$name]:-0}"
      if [ "$par" = "1" ]; then
        par="yes"
      else
        par="no"
      fi
      skip_risk="${TEST_SKIP_RISK[$name]:-}"
      desc="${TEST_DESC[$name]:-}"
      printf "[seal-e2e]   - %s | %s | %s | %s | %s | %s\n" \
        "$name" "$status" "$(format_duration "$dur")" "$par" "$skip_risk" "$desc"
    done
  done
}

print_failure_list() {
  if [ "$FAILURES" -eq 0 ]; then
    return
  fi
  log "Failures:"
  local name hint log_path desc
  for name in "${MANIFEST_ORDER[@]}"; do
    if [ "${TEST_STATUS[$name]:-}" != "failed" ]; then
      continue
    fi
    desc="${TEST_DESC[$name]:-}"
    hint="${TEST_HINT[$name]:-}"
    log_path="${TEST_LOGS[$name]:-}"
    printf "[seal-e2e]   - %s: %s\n" "$name" "$desc"
    if [ -n "$hint" ]; then
      printf "[seal-e2e]     hint: %s\n" "$hint"
    fi
    if [ -n "$log_path" ]; then
      printf "[seal-e2e]     log: %s\n" "$log_path"
    fi
  done
}

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
  local total_count=$((ok_count + skip_count + fail_count))
  log "Stats: total=${total_count}, ok=${ok_count}, skipped=${skip_count}, failed=${fail_count}"
  if [ "$sum_tests" -gt 0 ] && [ "$total" -gt "$sum_tests" ]; then
    local overhead=$((total - sum_tests))
    log "Non-test time: $(format_duration "$overhead") (setup/deps/copy)"
  fi

  if [ -n "$SUMMARY_PATH" ]; then
    log "Summary file: $SUMMARY_PATH"
  fi
  if [ -n "$SUMMARY_LAST_PATH" ]; then
    log "Summary last: $SUMMARY_LAST_PATH"
  fi
  if [ "$LOG_CAPTURE" = "1" ]; then
    log "Logs: $LOG_DIR"
  fi
  if [ "$fail_count" -ne 0 ] && [ -n "$SUMMARY_PATH" ]; then
    local rerun_hint="$SUMMARY_PATH"
    if [ -n "$SUMMARY_LAST_PATH" ]; then
      rerun_hint="$SUMMARY_LAST_PATH"
    fi
    log "Rerun failed only: SEAL_E2E_RERUN_FAILED=1 SEAL_E2E_RERUN_FROM=$rerun_hint"
  fi

  print_category_table
  print_failure_list

  write_summary_file
  update_last_summary
}

cleanup_home() {
  if [ -n "$E2E_HOME" ] && [ "${SEAL_E2E_HOME_KEEP:-0}" != "1" ]; then
    rm -rf "$E2E_HOME"
  fi
}

trap 'print_summary; cleanup_home' EXIT

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

SAFE_ROOTS=(/tmp /var/tmp /dev/shm)
if [ -n "${TMPDIR:-}" ]; then
  SAFE_ROOTS+=("$TMPDIR")
fi
if [ -n "${TMP:-}" ]; then
  SAFE_ROOTS+=("$TMP")
fi
if [ -n "${TEMP:-}" ]; then
  SAFE_ROOTS+=("$TEMP")
fi
if [ -n "${SEAL_E2E_SAFE_ROOTS:-}" ]; then
  for root in $(echo "$SEAL_E2E_SAFE_ROOTS" | tr ':,;' ' '); do
    SAFE_ROOTS+=("$root")
  done
fi

is_safe_example_root() {
  local path="$1"
  local base
  for base in "${SAFE_ROOTS[@]}"; do
    if [ -z "$base" ]; then
      continue
    fi
    case "$path" in
      "$base" | "$base"/*) return 0 ;;
    esac
  done
  return 1
}

require_safe_example_root() {
  local path="$1"
  if [ "${SEAL_E2E_UNSAFE_EXAMPLE_ROOT:-0}" = "1" ]; then
    return 0
  fi
  if [[ "$path" != /* ]]; then
    log "ERROR: SEAL_E2E_EXAMPLE_ROOT must be absolute (got: $path)"
    exit 1
  fi
  if ! is_safe_example_root "$path"; then
    log "ERROR: SEAL_E2E_EXAMPLE_ROOT is not under safe roots (${SAFE_ROOTS[*]})."
    log "       Set SEAL_E2E_SAFE_ROOTS or SEAL_E2E_UNSAFE_EXAMPLE_ROOT=1 to override."
    exit 1
  fi
}

EXAMPLE_SRC="$REPO_ROOT/tools/seal/example"
EXAMPLE_DST="${SEAL_E2E_EXAMPLE_ROOT:-/tmp/seal-example-e2e}"
if [ "${SEAL_E2E_COPY_EXAMPLE:-1}" = "1" ]; then
  log "Preparing disposable example workspace..."
  require_safe_example_root "$EXAMPLE_DST"
  mkdir -p "$(dirname "$EXAMPLE_DST")"
  rm -rf "$EXAMPLE_DST"
  cp -a "$EXAMPLE_SRC" "$EXAMPLE_DST"
  export SEAL_E2E_EXAMPLE_ROOT="$EXAMPLE_DST"
fi

EXAMPLE_DIR="${SEAL_E2E_EXAMPLE_ROOT:-$EXAMPLE_DST}"
EXAMPLE_NODE_MODULES_DIR="$EXAMPLE_DIR/node_modules"
SHARED_NODE_MODULES_DIR=""
if [ -n "${SEAL_E2E_NODE_MODULES_ROOT:-}" ]; then
  if [ "${SEAL_E2E_NODE_MODULES_ROOT##*/}" = "node_modules" ]; then
    SHARED_NODE_MODULES_DIR="$SEAL_E2E_NODE_MODULES_ROOT"
  else
    SHARED_NODE_MODULES_DIR="$SEAL_E2E_NODE_MODULES_ROOT/node_modules"
  fi
  EXAMPLE_NODE_MODULES_DIR="$SHARED_NODE_MODULES_DIR"
fi

# Ensure summary headers survive example workspace resets.
init_summary_file
EXAMPLE_SIG="$(make_sig "example" \
  "$EXAMPLE_SRC/package.json" \
  "$EXAMPLE_SRC/package-lock.json")"
EXAMPLE_STAMP="$STAMPS_DIR/example.sig"
EXAMPLE_LOCK="$STAMPS_DIR/example.lock"
NEED_EXAMPLE_DEPS="${SEAL_E2E_INSTALL_EXAMPLE_DEPS:-}"
if [ -d "$EXAMPLE_DIR" ]; then
  if [ -z "$NEED_EXAMPLE_DEPS" ]; then
    NEED_EXAMPLE_DEPS=0
    if sig_changed "$EXAMPLE_STAMP" "$EXAMPLE_SIG" || ! dir_has_files "$EXAMPLE_NODE_MODULES_DIR"; then
      NEED_EXAMPLE_DEPS=1
    fi
  fi
  if [ -n "$SHARED_NODE_MODULES_DIR" ]; then
    mkdir -p "$SHARED_NODE_MODULES_DIR"
    if ! dir_has_files "$SHARED_NODE_MODULES_DIR" && dir_has_files "$SEAL_E2E_NODE_MODULES_ROOT"; then
      log "Migrating shared node_modules cache layout..."
      (
        shopt -s dotglob
        for entry in "$SEAL_E2E_NODE_MODULES_ROOT"/*; do
          if [ -e "$entry" ] && [ "$(basename "$entry")" != "node_modules" ]; then
            mv "$entry" "$SHARED_NODE_MODULES_DIR"/
          fi
        done
      )
    fi
    if [ "$NEED_EXAMPLE_DEPS" = "1" ]; then
      if command -v flock >/dev/null 2>&1; then
        (
          exec {lockfd}>"$EXAMPLE_LOCK"
          flock "$lockfd"
          if sig_changed "$EXAMPLE_STAMP" "$EXAMPLE_SIG" || ! dir_has_files "$EXAMPLE_NODE_MODULES_DIR"; then
            log "Installing example dependencies (shared cache)..."
            if [ -L "$EXAMPLE_DIR/node_modules" ]; then
              rm -f "$EXAMPLE_DIR/node_modules"
            fi
            npm_install "$EXAMPLE_DIR"
            if command -v rsync >/dev/null 2>&1; then
              rsync -a --delete "$EXAMPLE_DIR/node_modules/" "$SHARED_NODE_MODULES_DIR/"
            else
              rm -rf "$SHARED_NODE_MODULES_DIR"
              mkdir -p "$SHARED_NODE_MODULES_DIR"
              cp -a "$EXAMPLE_DIR/node_modules/." "$SHARED_NODE_MODULES_DIR/"
            fi
            rm -rf "$EXAMPLE_DIR/node_modules"
            ln -s "$SHARED_NODE_MODULES_DIR" "$EXAMPLE_DIR/node_modules"
            echo "$EXAMPLE_SIG" > "$EXAMPLE_STAMP"
          else
            log "Example dependencies already installed (shared cache)."
          fi
          flock -u "$lockfd"
        )
      else
        (
          lock_dir="${EXAMPLE_LOCK}.d"
          while ! mkdir "$lock_dir" 2>/dev/null; do
            sleep 0.2
          done
          trap 'rmdir "$lock_dir" >/dev/null 2>&1 || true' EXIT
          if sig_changed "$EXAMPLE_STAMP" "$EXAMPLE_SIG" || ! dir_has_files "$EXAMPLE_NODE_MODULES_DIR"; then
            log "Installing example dependencies (shared cache)..."
            if [ -L "$EXAMPLE_DIR/node_modules" ]; then
              rm -f "$EXAMPLE_DIR/node_modules"
            fi
            npm_install "$EXAMPLE_DIR"
            if command -v rsync >/dev/null 2>&1; then
              rsync -a --delete "$EXAMPLE_DIR/node_modules/" "$SHARED_NODE_MODULES_DIR/"
            else
              rm -rf "$SHARED_NODE_MODULES_DIR"
              mkdir -p "$SHARED_NODE_MODULES_DIR"
              cp -a "$EXAMPLE_DIR/node_modules/." "$SHARED_NODE_MODULES_DIR/"
            fi
            rm -rf "$EXAMPLE_DIR/node_modules"
            ln -s "$SHARED_NODE_MODULES_DIR" "$EXAMPLE_DIR/node_modules"
            echo "$EXAMPLE_SIG" > "$EXAMPLE_STAMP"
          else
            log "Example dependencies already installed (shared cache)."
          fi
        )
      fi
    elif [ ! -d "$EXAMPLE_DIR/node_modules" ]; then
      log "Linking shared node_modules..."
      ln -s "$SHARED_NODE_MODULES_DIR" "$EXAMPLE_DIR/node_modules"
    fi
  else
    if [ "$NEED_EXAMPLE_DEPS" = "1" ]; then
      log "Installing example dependencies..."
      npm_install "$EXAMPLE_DIR"
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
export SEAL_STRIP_E2E_STRINGS_TIMEOUT_MS="${SEAL_STRIP_E2E_STRINGS_TIMEOUT_MS:-60000}"
export SEAL_STRIP_E2E_STRINGS_MAX_BUFFER="${SEAL_STRIP_E2E_STRINGS_MAX_BUFFER:-50000000}"
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
if [ -z "${SEAL_E2E_TIMEOUT_SCALE:-}" ]; then
  if [ "${SEAL_DOCKER_E2E:-0}" = "1" ]; then
    export SEAL_E2E_TIMEOUT_SCALE=2
  fi
fi

export SEAL_UI_E2E_HEADLESS="${SEAL_UI_E2E_HEADLESS:-1}"

disable_ui_e2e() {
  log "WARN: $*"
  export SEAL_UI_E2E=0
}

if [ "${SEAL_UI_E2E:-0}" = "1" ] && should_run "example-ui"; then
  if [ -z "${PLAYWRIGHT_BROWSERS_PATH:-}" ] && [ "${SEAL_DOCKER_E2E:-0}" = "1" ]; then
    export PLAYWRIGHT_BROWSERS_PATH="/root/.cache/ms-playwright"
  fi
  PW_CACHE_ROOT="${SEAL_E2E_PLAYWRIGHT_CACHE_ROOT:-${XDG_CACHE_HOME:-$HOME/.cache}}"
  PW_CACHE="${PLAYWRIGHT_BROWSERS_PATH:-$PW_CACHE_ROOT/ms-playwright}"
  PW_MARKER="${SEAL_E2E_PLAYWRIGHT_MARKER:-$CACHE_ROOT/playwright-installed}"
  PW_HAS_BROWSER=0
  PW_BROWSER_PATH=""
  PW_DEPS_OK=1
  if [ -d "$PW_CACHE" ]; then
    PW_BROWSER_PATH="$(find "$PW_CACHE" -type f -name 'chrome-headless-shell' -print -quit 2>/dev/null || true)"
    if [ -z "$PW_BROWSER_PATH" ]; then
      PW_BROWSER_PATH="$(find "$PW_CACHE" -type f -name 'chrome' -print -quit 2>/dev/null || true)"
    fi
    if [ -n "$PW_BROWSER_PATH" ]; then
      PW_HAS_BROWSER=1
    fi
  fi
  if [ "$PW_HAS_BROWSER" = "1" ] && command -v ldd >/dev/null 2>&1; then
    if ldd "$PW_BROWSER_PATH" 2>/dev/null | grep -q "not found"; then
      PW_DEPS_OK=0
    fi
  fi
  if ! has_cmd npx; then
    if [ "${SEAL_DOCKER_E2E:-0}" = "1" ]; then
      disable_ui_e2e "npx not found; disabling UI E2E in docker"
    else
      log "WARN: npx not found; skipping Playwright browser install"
    fi
  else
    if [ ! -f "$PW_MARKER" ] || [ "$PW_HAS_BROWSER" = "0" ] || [ "$PW_DEPS_OK" = "0" ]; then
      if [ -f "$PW_MARKER" ] && [ "$PW_HAS_BROWSER" = "0" ]; then
        log "Playwright marker present but browsers missing; reinstalling."
      fi
      if [ "$PW_DEPS_OK" = "0" ]; then
        log "Playwright browser deps missing; reinstalling with --with-deps."
      fi
      if [ ! -x "$REPO_ROOT/tools/seal/seal/node_modules/.bin/playwright" ]; then
        log "Playwright CLI missing; installing tools/seal/seal npm deps..."
        set +e
        npm_install "$REPO_ROOT/tools/seal/seal"
        npm_status=$?
        set -e
        if [ "$npm_status" -ne 0 ]; then
          if [ "${SEAL_DOCKER_E2E:-0}" = "1" ]; then
            disable_ui_e2e "Playwright npm install failed; disabling UI E2E in docker"
          else
            exit "$npm_status"
          fi
        fi
      fi
      if [ "${SEAL_UI_E2E:-0}" = "1" ]; then
        log "Installing Playwright browsers for UI E2E..."
        set +e
        (cd "$REPO_ROOT" && npx playwright install --with-deps chromium)
        pw_status=$?
        set -e
        if [ "$pw_status" -ne 0 ]; then
          if [ "${SEAL_DOCKER_E2E:-0}" = "1" ]; then
            disable_ui_e2e "Playwright browser install failed; disabling UI E2E in docker"
          else
            exit "$pw_status"
          fi
        else
          touch "$PW_MARKER"
        fi
      fi
    fi
  fi
fi

run_test() {
  local name="$1"
  shift
  if ! should_run "$name"; then
    if [ "$LOG_FILTERED" = "1" ]; then
      log "SKIP: ${name} (filtered)"
    fi
    if [ "$SUMMARY_SCOPE" = "all" ]; then
      TEST_STATUS["$name"]="skipped"
      TEST_DURATIONS["$name"]=0
      TEST_ORDER+=("$name")
    fi
    return
  fi
  if [ -z "${TEST_SCRIPT[$name]:-}" ]; then
    log "ERROR: missing manifest entry for test: $name"
    TEST_STATUS["$name"]="failed"
    TEST_DURATIONS["$name"]=0
    TEST_ORDER+=("$name")
    FAILURES=$((FAILURES + 1))
    return
  fi
  log "Running ${name}..."
  TEST_ORDER+=("$name")
  local start
  start="$(date +%s)"
  set +e
  local status=0
  local log_file=""
  if [ "$LOG_CAPTURE" = "1" ]; then
    mkdir -p "$LOG_DIR"
    log_file="$LOG_DIR/${name}.log"
    "$@" 2>&1 | tee "$log_file"
    status="${PIPESTATUS[0]}"
  else
    "$@"
    status=$?
  fi
  set -e
  local end
  end="$(date +%s)"
  local dur=$((end - start))
  TEST_DURATIONS["$name"]="$dur"
  if [ -n "$log_file" ]; then
    TEST_LOGS["$name"]="$log_file"
  fi
  if [ "$status" -eq "$SKIP_CODE" ]; then
    TEST_STATUS["$name"]="skipped"
    log "SKIP: ${name} (time=$(format_duration "$dur"))"
    return
  fi
  if [ "$status" -ne 0 ]; then
    TEST_STATUS["$name"]="failed"
    FAILURES=$((FAILURES + 1))
    log "FAIL: ${name} (time=$(format_duration "$dur"), exit=${status})"
    if [ -n "${TEST_HINT[$name]:-}" ]; then
      log "HINT: ${TEST_HINT[$name]}"
    fi
    if [ -n "$log_file" ] && [ "${LOG_TAIL_LINES:-0}" != "0" ]; then
      log "Log tail (${LOG_TAIL_LINES} lines): ${log_file}"
      tail -n "$LOG_TAIL_LINES" "$log_file" | sed 's/^/[seal-e2e]   | /'
    fi
    if [ "$FAIL_FAST" = "1" ]; then
      exit "$status"
    fi
    return
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

if [ "$SETUP_ONLY" = "1" ]; then
  log "Setup only (SEAL_E2E_SETUP_ONLY=1). Skipping tests."
  exit 0
fi
THIN_NATIVE_RUN_TIMEOUT_MS="${SEAL_THIN_E2E_NATIVE_RUN_TIMEOUT_MS:-}"
if [ -z "$THIN_NATIVE_RUN_TIMEOUT_MS" ]; then
  if [ -n "${SEAL_E2E_TIMEOUT_SCALE:-}" ]; then
    THIN_NATIVE_RUN_TIMEOUT_MS="$(awk -v base=240000 -v scale="$SEAL_E2E_TIMEOUT_SCALE" 'BEGIN { v=base*scale; if (v<1) v=1; printf "%d", v }')"
  else
    THIN_NATIVE_RUN_TIMEOUT_MS=240000
  fi
fi
for name in "${MANIFEST_ORDER[@]}"; do
  script="${TEST_SCRIPT[$name]:-}"
  missing_script=0
  missing_reason=""
  if [ -z "$script" ]; then
    missing_script=1
    missing_reason="missing script for test ${name}"
  else
    if [[ "$script" != /* ]]; then
      script="$REPO_ROOT/$script"
    fi
    if [ ! -f "$script" ]; then
      missing_script=1
      missing_reason="script not found for ${name}: ${script}"
    fi
  fi
  if [ "$missing_script" = "1" ]; then
    log "ERROR: ${missing_reason}"
    TEST_STATUS["$name"]="failed"
    TEST_DURATIONS["$name"]=0
    TEST_ORDER+=("$name")
    FAILURES=$((FAILURES + 1))
  else
    if [ "$name" = "thin" ]; then
      SEAL_THIN_E2E_NATIVE_RUN_TIMEOUT_MS="$THIN_NATIVE_RUN_TIMEOUT_MS" \
        run_test "$name" "$NODE_BIN" "$script"
    else
      run_test "$name" "$NODE_BIN" "$script"
    fi
  fi
done

log "All E2E tests finished."
if [ "$FAILURES" -ne 0 ]; then
  log "E2E failures: ${FAILURES}"
  exit 1
fi

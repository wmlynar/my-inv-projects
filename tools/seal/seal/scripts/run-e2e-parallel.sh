#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNNER="$SCRIPT_DIR/run-e2e-suite.sh"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

CACHE_BIN="${SEAL_E2E_CACHE_BIN:-${HOME}/.cache/seal/bin}"
CACHE_ROOT="${SEAL_E2E_CACHE_DIR:-$(dirname "$CACHE_BIN")}"
MANIFEST_PATH="${SEAL_E2E_MANIFEST:-$SCRIPT_DIR/e2e-tests.tsv}"

log() {
  echo "[seal-e2e-parallel] $*"
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

normalize_flag() {
  if [ "${1:-}" = "1" ]; then
    echo "1"
  else
    echo "0"
  fi
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

REMOTE_E2E="$(normalize_flag "${SEAL_E2E_SSH:-${SEAL_SHIP_SSH_E2E:-0}}")"
DEFAULT_JOBS="4"
if command -v nproc >/dev/null 2>&1; then
  DEFAULT_JOBS="$(nproc)"
fi
JOBS="${SEAL_E2E_JOBS:-$DEFAULT_JOBS}"

SEED_ROOT="${SEAL_E2E_SEED_ROOT:-/tmp/seal-example-e2e-seed}"
if [ "${SEAL_E2E_PREPARE_SEED:-1}" = "1" ]; then
  log "Preparing shared example seed..."
  env \
    SEAL_E2E_SETUP_ONLY=1 \
    SEAL_E2E_EXAMPLE_ROOT="$SEED_ROOT" \
    SEAL_E2E_COPY_EXAMPLE=1 \
    "$RUNNER"
fi

NODE_MODULES_ROOT="${SEAL_E2E_NODE_MODULES_ROOT:-}"
if [ -z "$NODE_MODULES_ROOT" ] && [ -d "$SEED_ROOT/node_modules" ]; then
  NODE_MODULES_ROOT="$SEED_ROOT/node_modules"
fi
if [ -n "$NODE_MODULES_ROOT" ]; then
  log "Using shared node_modules: $NODE_MODULES_ROOT"
fi

declare -A TEST_CATEGORY=()
declare -A TEST_PARALLEL=()
declare -A TEST_DESC=()
declare -A TEST_SKIP_RISK=()
declare -A TEST_HINT=()
declare -A TEST_SCRIPT=()
declare -A CATEGORY_SEEN=()
declare -a MANIFEST_ORDER=()
declare -a CATEGORY_ORDER=()

if [ ! -f "$MANIFEST_PATH" ]; then
  log "ERROR: missing E2E manifest: $MANIFEST_PATH"
  exit 1
fi

while IFS=$'\t' read -r name category parallel desc skip_risk hint script; do
  if [ -z "$name" ] || [ "$name" = "name" ] || [[ "$name" = \#* ]]; then
    continue
  fi
  TEST_CATEGORY["$name"]="$category"
  TEST_PARALLEL["$name"]="$parallel"
  TEST_DESC["$name"]="$desc"
  TEST_SKIP_RISK["$name"]="$skip_risk"
  TEST_HINT["$name"]="$hint"
  TEST_SCRIPT["$name"]="$script"
  MANIFEST_ORDER+=("$name")
  if [ -n "$category" ] && [ -z "${CATEGORY_SEEN[$category]:-}" ]; then
    CATEGORY_SEEN["$category"]=1
    CATEGORY_ORDER+=("$category")
  fi
done < "$MANIFEST_PATH"

DEFAULT_SUMMARY_PATH="$CACHE_ROOT/e2e-summary/last.tsv"
SUMMARY_PATH="${SEAL_E2E_SUMMARY_PATH:-$DEFAULT_SUMMARY_PATH}"

E2E_ONLY_RAW="$(trim_list "${SEAL_E2E_TESTS:-}")"
E2E_SKIP_RAW="$(trim_list "${SEAL_E2E_SKIP:-}")"
RERUN_FAILED="${SEAL_E2E_RERUN_FAILED:-0}"
RERUN_FROM="${SEAL_E2E_RERUN_FROM:-$SUMMARY_PATH}"
FAILED_ONLY_RAW=""
if [ "$RERUN_FAILED" = "1" ]; then
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
  log "Rerun failed tests only: $E2E_ONLY_RAW"
fi

declare -A ONLY_SET=()
declare -A SKIP_SET=()
if [ -n "$E2E_ONLY_RAW" ]; then
  for item in $E2E_ONLY_RAW; do
    ONLY_SET["$item"]=1
  done
fi
if [ -n "$E2E_SKIP_RAW" ]; then
  for item in $E2E_SKIP_RAW; do
    SKIP_SET["$item"]=1
  done
fi

filter_tests() {
  local list="$1"
  local out=""
  local item
  for item in $(echo "$list" | tr ',;' ' '); do
    if [ -n "$E2E_ONLY_RAW" ] && [ -z "${ONLY_SET[$item]:-}" ]; then
      continue
    fi
    if [ -n "$E2E_SKIP_RAW" ] && [ -n "${SKIP_SET[$item]:-}" ]; then
      continue
    fi
    out+="${item},"
  done
  echo "${out%,}"
}

PARALLEL_MODE="${SEAL_E2E_PARALLEL_MODE:-groups}"
declare -A GROUP_TESTS=()
declare -a GROUP_ORDER=()
SERIAL_TESTS=()

if [ "$PARALLEL_MODE" = "per-test" ]; then
  for name in "${MANIFEST_ORDER[@]}"; do
    if [ "${TEST_PARALLEL[$name]:-0}" != "1" ]; then
      SERIAL_TESTS+=("$name")
      continue
    fi
    GROUP_TESTS["$name"]="$name"
    GROUP_ORDER+=("$name")
  done
else
  for name in "${MANIFEST_ORDER[@]}"; do
    if [ "${TEST_PARALLEL[$name]:-0}" != "1" ]; then
      SERIAL_TESTS+=("$name")
      continue
    fi
    category="${TEST_CATEGORY[$name]:-misc}"
    if [ -z "${GROUP_TESTS[$category]:-}" ]; then
      GROUP_TESTS["$category"]="$name"
      GROUP_ORDER+=("$category")
    else
      GROUP_TESTS["$category"]+=",${name}"
    fi
  done
fi

declare -A GROUP_FILTERED=()
declare -a FILTERED_GROUP_ORDER=()
for group in "${GROUP_ORDER[@]}"; do
  tests="$(filter_tests "${GROUP_TESTS[$group]}")"
  if [ -z "$tests" ]; then
    log "Skipping group ${group} (no tests after filters)"
    continue
  fi
  GROUP_FILTERED["$group"]="$tests"
  FILTERED_GROUP_ORDER+=("$group")
done
GROUP_ORDER=("${FILTERED_GROUP_ORDER[@]}")

SERIAL_FILTERED=()
for test in "${SERIAL_TESTS[@]}"; do
  if [ -n "$E2E_ONLY_RAW" ] && [ -z "${ONLY_SET[$test]:-}" ]; then
    continue
  fi
  if [ -n "$E2E_SKIP_RAW" ] && [ -n "${SKIP_SET[$test]:-}" ]; then
    continue
  fi
  SERIAL_FILTERED+=("$test")
done
SERIAL_TESTS=("${SERIAL_FILTERED[@]}")

run_group() {
  local group="$1"
  local tests="$2"
  local root="$3"
  local summary_path="$root/.e2e-summary.tsv"
  local log_dir="$root/.e2e-logs"
  local example_deps="0"
  if [ -z "$NODE_MODULES_ROOT" ]; then
    example_deps="${SEAL_E2E_INSTALL_EXAMPLE_DEPS:-1}"
  fi
  log "Group ${group}: ${tests} (root=${root})"
  local env_args=(
    SEAL_E2E_TESTS="$tests"
    SEAL_E2E_SKIP="${SEAL_E2E_SKIP:-}"
    SEAL_E2E_EXAMPLE_ROOT="$root"
    SEAL_E2E_COPY_EXAMPLE=1
    SEAL_E2E_INSTALL_EXAMPLE_DEPS="$example_deps"
    SEAL_E2E_INSTALL_DEPS=0
    SEAL_E2E_INSTALL_PACKERS=0
    SEAL_E2E_INSTALL_OBFUSCATORS=0
    SEAL_E2E_SSH="$REMOTE_E2E"
    SEAL_E2E_GROUP="$group"
    SEAL_E2E_SUMMARY_PATH="$summary_path"
    SEAL_E2E_SUMMARY_SCOPE=selected
    SEAL_E2E_SUMMARY_APPEND=0
    SEAL_E2E_LOG_DIR="$log_dir"
    SEAL_E2E_RERUN_FAILED=0
    SEAL_E2E_FAIL_FAST="${SEAL_E2E_FAIL_FAST:-0}"
  )
  if [ -n "$NODE_MODULES_ROOT" ]; then
    env_args+=(SEAL_E2E_NODE_MODULES_ROOT="$NODE_MODULES_ROOT")
  fi
  env "${env_args[@]}" "$RUNNER"
  log "Group ${group}: OK"
}

declare -A GROUP_DURATIONS=()
declare -A GROUP_STATUS=()
declare -A GROUP_SUMMARY=()
failures=0

print_group_summary() {
  if [ "${#GROUP_DURATIONS[@]}" -eq 0 ]; then
    return
  fi
  log "Group timing summary:"
  {
    for name in "${!GROUP_DURATIONS[@]}"; do
      printf "%s\t%s\n" "${GROUP_DURATIONS[$name]}" "$name"
    done
  } | sort -nr | while read -r dur name; do
    status="${GROUP_STATUS[$name]}"
    printf "[seal-e2e-parallel]   - %s  %s  (%s)\n" "$name" "$status" "$(format_duration "$dur")"
  done
}

print_detailed_summary() {
  if [ "${#GROUP_SUMMARY[@]}" -eq 0 ]; then
    return
  fi
  log "Detailed summary:"
  local group summary_file status wall_time test_sum has_tests
  local tgroup test tstatus dur category parallel skip_risk desc log_path hint
  for group in "${GROUP_ORDER[@]}"; do
    summary_file="${GROUP_SUMMARY[$group]:-}"
    status="${GROUP_STATUS[$group]:-unknown}"
    wall_time="${GROUP_DURATIONS[$group]:-0}"
    test_sum=0
    has_tests=0
    if [ -f "$summary_file" ]; then
      while IFS=$'\t' read -r tgroup test tstatus dur category parallel skip_risk desc log_path hint; do
        if [ "$test" = "test" ] || [ -z "$test" ]; then
          continue
        fi
        has_tests=1
        test_sum=$((test_sum + dur))
      done < "$summary_file"
    fi
    printf "[seal-e2e-parallel] Group %s  %s  (tests=%s, wall=%s)\n" \
      "$group" "$status" "$(format_duration "$test_sum")" "$(format_duration "$wall_time")"
    if [ -f "$summary_file" ]; then
      printf "[seal-e2e-parallel]   Test | Status | Time | Category | SkipRisk | Description\n"
      while IFS=$'\t' read -r tgroup test tstatus dur category parallel skip_risk desc log_path hint; do
        if [ "$test" = "test" ] || [ -z "$test" ]; then
          continue
        fi
        printf "[seal-e2e-parallel]   - %s | %s | %s | %s | %s | %s\n" \
          "$test" "$tstatus" "$(format_duration "$dur")" "$category" "$skip_risk" "$desc"
      done < "$summary_file"
    elif [ "$has_tests" -eq 0 ]; then
      printf "[seal-e2e-parallel]   - no summary data\n"
    fi
  done
}

write_combined_summary() {
  if [ -z "$SUMMARY_PATH" ]; then
    return
  fi
  mkdir -p "$(dirname "$SUMMARY_PATH")"
  local header_written=0
  : > "$SUMMARY_PATH"
  local group summary_file
  for group in "${GROUP_ORDER[@]}"; do
    summary_file="${GROUP_SUMMARY[$group]:-}"
    if [ ! -f "$summary_file" ]; then
      continue
    fi
    if [ "$header_written" -eq 0 ]; then
      head -n 1 "$summary_file" > "$SUMMARY_PATH"
      header_written=1
    fi
    tail -n +2 "$summary_file" >> "$SUMMARY_PATH"
  done
  if [ "$header_written" -eq 0 ]; then
    printf "group\ttest\tstatus\tduration_s\tcategory\tparallel\tskip_risk\tdescription\tlog_path\tfail_hint\n" > "$SUMMARY_PATH"
  fi
}

print_combined_summary() {
  if [ -z "$SUMMARY_PATH" ] || [ ! -f "$SUMMARY_PATH" ]; then
    return
  fi
  declare -A STATUS=()
  declare -A DURATION=()
  declare -A DESC=()
  declare -A SKIP_RISK=()
  declare -A HINT=()
  declare -A LOG_PATH=()
  local line_group test status dur category parallel skip_risk desc log_path hint par
  while IFS=$'\t' read -r line_group test status dur category parallel skip_risk desc log_path hint; do
    if [ "$test" = "test" ] || [ -z "$test" ]; then
      continue
    fi
    STATUS["$test"]="$status"
    DURATION["$test"]="$dur"
    DESC["$test"]="$desc"
    SKIP_RISK["$test"]="$skip_risk"
    HINT["$test"]="$hint"
    LOG_PATH["$test"]="$log_path"
  done < "$SUMMARY_PATH"

  local -a order_list=()
  for test in "${MANIFEST_ORDER[@]}"; do
    if [ -n "$E2E_ONLY_RAW" ] && [ -z "${ONLY_SET[$test]:-}" ]; then
      continue
    fi
    if [ -n "$E2E_SKIP_RAW" ] && [ -n "${SKIP_SET[$test]:-}" ]; then
      continue
    fi
    order_list+=("$test")
  done

  local ok_count=0
  local skip_count=0
  local fail_count=0
  local total_count=0
  local test_status
  for test in "${order_list[@]}"; do
    test_status="${STATUS[$test]:-skipped}"
    total_count=$((total_count + 1))
    case "$test_status" in
      ok) ok_count=$((ok_count + 1)) ;;
      skipped) skip_count=$((skip_count + 1)) ;;
      failed) fail_count=$((fail_count + 1)) ;;
    esac
  done
  log "Combined stats: total=${total_count}, ok=${ok_count}, skipped=${skip_count}, failed=${fail_count}"
  log "Summary file: $SUMMARY_PATH"
  if [ "$fail_count" -ne 0 ]; then
    log "Rerun failed only: SEAL_E2E_RERUN_FAILED=1 SEAL_E2E_RERUN_FROM=$SUMMARY_PATH"
  fi

  log "Combined category summary:"
  local -a categories=()
  declare -A cat_seen=()
  local category
  for test in "${order_list[@]}"; do
    category="${TEST_CATEGORY[$test]:-misc}"
    if [ -z "${cat_seen[$category]:-}" ]; then
      cat_seen["$category"]=1
      categories+=("$category")
    fi
  done
  local status_line
  for category in "${categories[@]}"; do
    local total=0
    local ok=0
    local skipped=0
    local failed=0
    for test in "${order_list[@]}"; do
      if [ "${TEST_CATEGORY[$test]:-}" != "$category" ]; then
        continue
      fi
      status_line="${STATUS[$test]:-skipped}"
      total=$((total + 1))
      case "$status_line" in
        ok) ok=$((ok + 1)) ;;
        skipped) skipped=$((skipped + 1)) ;;
        failed) failed=$((failed + 1)) ;;
      esac
    done
    printf "[seal-e2e-parallel] Category %s: total=%s ok=%s skipped=%s failed=%s\n" \
      "$category" "$total" "$ok" "$skipped" "$failed"
    printf "[seal-e2e-parallel]   Test | Status | Time | Parallel | SkipRisk | Description\n"
    for test in "${order_list[@]}"; do
      if [ "${TEST_CATEGORY[$test]:-}" != "$category" ]; then
        continue
      fi
      status_line="${STATUS[$test]:-skipped}"
      par="${TEST_PARALLEL[$test]:-0}"
      if [ "$par" = "1" ]; then
        par="yes"
      else
        par="no"
      fi
      printf "[seal-e2e-parallel]   - %s | %s | %s | %s | %s | %s\n" \
        "$test" "$status_line" "$(format_duration "${DURATION[$test]:-0}")" \
        "$par" "${SKIP_RISK[$test]:-}" "${DESC[$test]:-}"
    done
  done

  if [ "$fail_count" -ne 0 ]; then
    log "Failures:"
    for test in "${order_list[@]}"; do
      if [ "${STATUS[$test]:-}" != "failed" ]; then
        continue
      fi
      printf "[seal-e2e-parallel]   - %s: %s\n" "$test" "${DESC[$test]:-}"
      if [ -n "${HINT[$test]:-}" ]; then
        printf "[seal-e2e-parallel]     hint: %s\n" "${HINT[$test]}"
      fi
      if [ -n "${LOG_PATH[$test]:-}" ]; then
        printf "[seal-e2e-parallel]     log: %s\n" "${LOG_PATH[$test]}"
      fi
    done
  fi
}

if [ "${#GROUP_ORDER[@]}" -gt 0 ]; then
  if [ "$JOBS" -le 1 ]; then
    for name in "${GROUP_ORDER[@]}"; do
      tests="${GROUP_FILTERED[$name]}"
      root="$(mktemp -d "/tmp/seal-example-e2e-${name}-XXXXXX")"
      summary_path="$root/.e2e-summary.tsv"
      GROUP_SUMMARY["$name"]="$summary_path"
      start="$(date +%s)"
      if run_group "$name" "$tests" "$root"; then
        end="$(date +%s)"
        GROUP_DURATIONS["$name"]=$((end - start))
        GROUP_STATUS["$name"]="ok"
      else
        end="$(date +%s)"
        GROUP_DURATIONS["$name"]=$((end - start))
        GROUP_STATUS["$name"]="failed"
        failures=$((failures + 1))
      fi
    done
  else
    pids=()
    declare -A PID_GROUP=()
    declare -A PID_START=()
    declare -A PID_SUMMARY=()
    for name in "${GROUP_ORDER[@]}"; do
      tests="${GROUP_FILTERED[$name]}"
      root="$(mktemp -d "/tmp/seal-example-e2e-${name}-XXXXXX")"
      summary_path="$root/.e2e-summary.tsv"
      GROUP_SUMMARY["$name"]="$summary_path"
      start="$(date +%s)"
      (run_group "$name" "$tests" "$root") &
      pid="$!"
      pids+=("$pid")
      PID_GROUP["$pid"]="$name"
      PID_START["$pid"]="$start"
      PID_SUMMARY["$pid"]="$summary_path"
    done
    for pid in "${pids[@]}"; do
      if wait "$pid"; then
        end="$(date +%s)"
        name="${PID_GROUP[$pid]}"
        start="${PID_START[$pid]}"
        GROUP_DURATIONS["$name"]=$((end - start))
        GROUP_STATUS["$name"]="ok"
      else
        end="$(date +%s)"
        name="${PID_GROUP[$pid]}"
        start="${PID_START[$pid]}"
        GROUP_DURATIONS["$name"]=$((end - start))
        GROUP_STATUS["$name"]="failed"
        failures=$((failures + 1))
      fi
    done
  fi
else
  log "No parallel groups to run."
fi

if [ "$failures" -ne 0 ]; then
  log "Parallel groups failed: ${failures}"
  print_group_summary
  print_detailed_summary
fi

for test in "${SERIAL_TESTS[@]}"; do
  root="$(mktemp -d "/tmp/seal-example-e2e-${test}-XXXXXX")"
  summary_path="$root/.e2e-summary.tsv"
  GROUP_SUMMARY["$test"]="$summary_path"
  GROUP_ORDER+=("$test")
  start="$(date +%s)"
  if run_group "$test" "$test" "$root"; then
    end="$(date +%s)"
    GROUP_DURATIONS["$test"]=$((end - start))
    GROUP_STATUS["$test"]="ok"
  else
    end="$(date +%s)"
    GROUP_DURATIONS["$test"]=$((end - start))
    GROUP_STATUS["$test"]="failed"
    failures=$((failures + 1))
  fi
done

if [ "$failures" -ne 0 ]; then
  log "Serial groups failed: ${failures}"
  print_group_summary
  print_detailed_summary
fi

print_group_summary
print_detailed_summary

write_combined_summary
print_combined_summary

log "All E2E groups finished."
if [ "$failures" -ne 0 ]; then
  exit 1
fi

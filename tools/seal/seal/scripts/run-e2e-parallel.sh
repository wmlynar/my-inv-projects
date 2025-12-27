#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNNER="$SCRIPT_DIR/run-e2e-suite.sh"

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

PARALLEL_GROUPS=(
  "packagers:thin,thin-anti-debug,legacy-packagers"
  "hardening:protection,strip,elf-packers"
  "security:sentinel"
  "obf:obfuscation,c-obfuscators,decoy"
  "ui:example-ui"
  "misc:completion,postject"
)
SERIAL_TESTS=("ship")

if [ "$REMOTE_E2E" = "1" ]; then
  SERIAL_TESTS+=("user-flow")
else
  PARALLEL_GROUPS+=("flow:user-flow")
fi

PARALLEL_MODE="${SEAL_E2E_PARALLEL_MODE:-groups}"
if [ "$PARALLEL_MODE" = "per-test" ]; then
  ALL_TESTS=(
    "thin"
    "thin-anti-debug"
    "legacy-packagers"
    "completion"
    "user-flow"
    "sentinel"
    "protection"
    "obfuscation"
    "strip"
    "elf-packers"
    "c-obfuscators"
    "postject"
    "example-ui"
    "decoy"
    "ship"
  )
  PARALLEL_GROUPS=()
  for test in "${ALL_TESTS[@]}"; do
    skip=0
    for serial in "${SERIAL_TESTS[@]}"; do
      if [ "$test" = "$serial" ]; then
        skip=1
        break
      fi
    done
    if [ "$skip" -eq 0 ]; then
      PARALLEL_GROUPS+=("test-${test}:${test}")
    fi
  done
fi

run_group() {
  local group="$1"
  local tests="$2"
  local root="$3"
  local example_deps="0"
  if [ -z "$NODE_MODULES_ROOT" ]; then
    example_deps="${SEAL_E2E_INSTALL_EXAMPLE_DEPS:-1}"
  fi
  log "Group ${group}: ${tests} (root=${root})"
  local env_args=(
    SEAL_E2E_TESTS="$tests"
    SEAL_E2E_EXAMPLE_ROOT="$root"
    SEAL_E2E_COPY_EXAMPLE=1
    SEAL_E2E_INSTALL_EXAMPLE_DEPS="$example_deps"
    SEAL_E2E_INSTALL_DEPS=0
    SEAL_E2E_INSTALL_PACKERS=0
    SEAL_E2E_INSTALL_OBFUSCATORS=0
    SEAL_E2E_SSH="$REMOTE_E2E"
  )
  if [ -n "$NODE_MODULES_ROOT" ]; then
    env_args+=(SEAL_E2E_NODE_MODULES_ROOT="$NODE_MODULES_ROOT")
  fi
  env "${env_args[@]}" "$RUNNER"
  log "Group ${group}: OK"
}

declare -A GROUP_DURATIONS=()
declare -A GROUP_STATUS=()
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

if [ "$JOBS" -le 1 ]; then
  for group in "${PARALLEL_GROUPS[@]}"; do
    name="${group%%:*}"
    tests="${group#*:}"
    root="$(mktemp -d "/tmp/seal-example-e2e-${name}-XXXXXX")"
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
  for group in "${PARALLEL_GROUPS[@]}"; do
    name="${group%%:*}"
    tests="${group#*:}"
    root="$(mktemp -d "/tmp/seal-example-e2e-${name}-XXXXXX")"
    start="$(date +%s)"
    (run_group "$name" "$tests" "$root") &
    pid="$!"
    pids+=("$pid")
    PID_GROUP["$pid"]="$name"
    PID_START["$pid"]="$start"
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

if [ "$failures" -ne 0 ]; then
  log "Parallel groups failed: ${failures}"
  print_group_summary
  exit 1
fi

for test in "${SERIAL_TESTS[@]}"; do
  root="$(mktemp -d "/tmp/seal-example-e2e-${test}-XXXXXX")"
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
  exit 1
fi

print_group_summary

log "All E2E groups finished."

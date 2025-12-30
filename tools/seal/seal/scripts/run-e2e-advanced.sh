#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

set_default() {
  local key="$1"
  local value="$2"
  if [ -z "${!key:-}" ]; then
    export "$key"="$value"
  fi
}

# Root can always dump; keep strict dump optional unless explicitly set.
if [ -z "${SEAL_E2E_STRICT_REAL_DUMP:-}" ] && [ "$(id -u)" -eq 0 ]; then
  export SEAL_E2E_STRICT_REAL_DUMP=0
fi
if [ -z "${SEAL_E2E_STRICT_JS_DUMP_FIXTURE:-}" ] && [ "$(id -u)" -eq 0 ]; then
  export SEAL_E2E_STRICT_JS_DUMP_FIXTURE=0
fi
if [ -z "${SEAL_E2E_STRICT_CAPS:-}" ] && [ "$(id -u)" -eq 0 ]; then
  export SEAL_E2E_STRICT_CAPS=0
fi
if [ -z "${SEAL_E2E_STRICT_PROC_MEM:-}" ] && [ "$(id -u)" -eq 0 ]; then
  export SEAL_E2E_STRICT_PROC_MEM=0
fi
if [ -z "${SEAL_E2E_STRICT_PTRACE:-}" ] && [ "$(id -u)" -eq 0 ]; then
  export SEAL_E2E_STRICT_PTRACE=0
fi
if [ -z "${SEAL_E2E_STRICT_PIDFD:-}" ] && [ "$(id -u)" -eq 0 ]; then
  export SEAL_E2E_STRICT_PIDFD=0
fi
if [ -z "${SEAL_E2E_STRICT_DYNLINK:-}" ] && [ "$(id -u)" -eq 0 ]; then
  export SEAL_E2E_STRICT_DYNLINK=0
fi
if [ -z "${SEAL_E2E_STRICT_DENY_ENV:-}" ] && [ "$(id -u)" -eq 0 ]; then
  export SEAL_E2E_STRICT_DENY_ENV=0
fi
if [ -z "${SEAL_E2E_STRICT_BOOTSTRAP_WIPE:-}" ] && [ "$(id -u)" -eq 0 ]; then
  export SEAL_E2E_STRICT_BOOTSTRAP_WIPE=0
fi
if [ -z "${SEAL_E2E_STRICT_BOOTSTRAP_PAGE_COUNT:-}" ] && [ "$(id -u)" -eq 0 ]; then
  export SEAL_E2E_STRICT_BOOTSTRAP_PAGE_COUNT=0
fi
if [ -z "${SEAL_E2E_STRICT_TOOL_BASELINE:-}" ] && [ "$(id -u)" -eq 0 ]; then
  export SEAL_E2E_STRICT_TOOL_BASELINE=0
fi
if [ -z "${SEAL_E2E_STRICT_LLDB:-}" ] && [ "$(id -u)" -eq 0 ]; then
  export SEAL_E2E_STRICT_LLDB=0
fi
if [ -z "${SEAL_E2E_STRICT_LLDB_SERVER:-}" ] && [ "$(id -u)" -eq 0 ]; then
  export SEAL_E2E_STRICT_LLDB_SERVER=0
fi
if [ -z "${SEAL_E2E_STRICT_PERF:-}" ] && [ "$(id -u)" -eq 0 ]; then
  export SEAL_E2E_STRICT_PERF=0
fi
if [ -z "${SEAL_E2E_STRICT_PERF_PROBE:-}" ] && [ "$(id -u)" -eq 0 ]; then
  export SEAL_E2E_STRICT_PERF_PROBE=0
fi
if [ -z "${SEAL_E2E_STRICT_BPFTRACE:-}" ] && [ "$(id -u)" -eq 0 ]; then
  export SEAL_E2E_STRICT_BPFTRACE=0
fi
if [ -z "${SEAL_E2E_STRICT_TRACE_CMD:-}" ] && [ "$(id -u)" -eq 0 ]; then
  export SEAL_E2E_STRICT_TRACE_CMD=0
fi
if [ -z "${SEAL_E2E_STRICT_LTTNG:-}" ] && [ "$(id -u)" -eq 0 ]; then
  export SEAL_E2E_STRICT_LTTNG=0
fi
if [ -z "${SEAL_E2E_STRICT_SYSTEMTAP:-}" ] && [ "$(id -u)" -eq 0 ]; then
  export SEAL_E2E_STRICT_SYSTEMTAP=0
fi
if [ -z "${SEAL_E2E_STRICT_SYSDIG:-}" ] && [ "$(id -u)" -eq 0 ]; then
  export SEAL_E2E_STRICT_SYSDIG=0
fi
if [ -z "${SEAL_E2E_STRICT_AUDITCTL:-}" ] && [ "$(id -u)" -eq 0 ]; then
  export SEAL_E2E_STRICT_AUDITCTL=0
fi
if [ -z "${SEAL_E2E_STRICT_CRIU:-}" ] && [ "$(id -u)" -eq 0 ]; then
  export SEAL_E2E_STRICT_CRIU=0
fi
if [ -z "${SEAL_E2E_STRICT_RR:-}" ] && [ "$(id -u)" -eq 0 ]; then
  export SEAL_E2E_STRICT_RR=0
fi
if [ -z "${SEAL_E2E_STRICT_DRRUN:-}" ] && [ "$(id -u)" -eq 0 ]; then
  export SEAL_E2E_STRICT_DRRUN=0
fi
if [ -z "${SEAL_E2E_STRICT_PIN:-}" ] && [ "$(id -u)" -eq 0 ]; then
  export SEAL_E2E_STRICT_PIN=0
fi
if [ -z "${SEAL_E2E_STRICT_FRIDA:-}" ] && [ "$(id -u)" -eq 0 ]; then
  export SEAL_E2E_STRICT_FRIDA=0
fi
if [ -z "${SEAL_E2E_STRICT_CORE_BASELINE:-}" ] && [ "$(id -u)" -eq 0 ]; then
  export SEAL_E2E_STRICT_CORE_BASELINE=0
fi

# Default to the strict anti-debug subset unless SEAL_E2E_TESTS is provided.
set_default SEAL_E2E_TESTS "thin-anti-debug,thin-anti-debug-dump"
set_default SEAL_E2E_TOOLSET "full"

set_default SEAL_E2E_ENV_CHECKS "1"
set_default SEAL_E2E_REAL_DUMP "1"
set_default SEAL_E2E_STRICT_REAL_DUMP "1"
set_default SEAL_E2E_STRICT_JS_DUMP_FIXTURE "1"

set_default SEAL_E2E_STRICT_PROC_MEM "1"
set_default SEAL_E2E_STRICT_PTRACE "1"
set_default SEAL_E2E_STRICT_PIDFD "1"
set_default SEAL_E2E_STRICT_SNAPSHOT_GUARD "1"
set_default SEAL_E2E_STRICT_SYSLOG "1"
set_default SEAL_E2E_STRICT_DMESG "1"
set_default SEAL_E2E_STRICT_SYSCTL "1"
set_default SEAL_E2E_STRICT_DENY_ENV "1"
set_default SEAL_E2E_STRICT_ENV_SCRUB_EXT "1"
set_default SEAL_E2E_STRICT_LD_SO_PRELOAD "1"
set_default SEAL_E2E_STRICT_NODE_MEMFD "1"
set_default SEAL_E2E_STRICT_DYNLINK "1"
set_default SEAL_E2E_STRICT_CORE_FILTER "1"
set_default SEAL_E2E_STRICT_KERNEL_MEM "1"
set_default SEAL_E2E_STRICT_CAPS "1"
set_default SEAL_E2E_STRICT_NODE_DIAG "1"
set_default SEAL_E2E_STRICT_CMDLINE "1"

set_default SEAL_E2E_STRICT_DONTDUMP "1"
set_default SEAL_E2E_STRICT_MEMLOCK "1"
set_default SEAL_E2E_STRICT_WIPEONFORK "1"
set_default SEAL_E2E_STRICT_DONTFORK "1"
set_default SEAL_E2E_STRICT_UNMERGEABLE "1"

set_default SEAL_E2E_STRICT_ATTACH_BASELINE "1"
set_default SEAL_E2E_STRICT_TOOL_BASELINE "1"
set_default SEAL_E2E_STRICT_HOST_BASELINE "1"
set_default SEAL_E2E_STRICT_CORE_BASELINE "1"

set_default SEAL_E2E_STRICT_PERF "1"
set_default SEAL_E2E_STRICT_PERF_PROBE "1"
set_default SEAL_E2E_STRICT_BPFTRACE "1"
set_default SEAL_E2E_STRICT_TRACE_CMD "1"
set_default SEAL_E2E_STRICT_LTTNG "1"
set_default SEAL_E2E_STRICT_SYSTEMTAP "1"
set_default SEAL_E2E_STRICT_SYSDIG "1"
set_default SEAL_E2E_STRICT_AUDITCTL "1"
set_default SEAL_E2E_STRICT_CRIU "1"

set_default SEAL_E2E_STRICT_RR "1"
set_default SEAL_E2E_STRICT_LLDB "1"
set_default SEAL_E2E_STRICT_LLDB_SERVER "1"
set_default SEAL_E2E_STRICT_DRRUN "1"
set_default SEAL_E2E_STRICT_PIN "1"
set_default SEAL_E2E_STRICT_FRIDA "1"

set_default SEAL_E2E_STRICT_BOOTSTRAP_PAGE_COUNT "1"
set_default SEAL_E2E_STRICT_BOOTSTRAP_SELF_SCAN "1"
set_default SEAL_E2E_STRICT_BOOTSTRAP_SELF_SCAN_VMFLAGS "1"
set_default SEAL_E2E_STRICT_BOOTSTRAP_MARKER "1"
set_default SEAL_E2E_STRICT_BOOTSTRAP_WIPE "1"
set_default SEAL_E2E_STRICT_BOOTSTRAP_TOKENS "1"

set_default SEAL_E2E_ANON_SCAN_MAX_BYTES "33554432"

set_default SEAL_E2E_STRICT_UNPACK "1"
set_default SEAL_E2E_STRICT_BUILD_ID "1"
set_default SEAL_E2E_STRICT_LAUNCHER_STRINGS "1"
set_default SEAL_E2E_STRICT_PACK_NB "1"

exec "$SCRIPT_DIR/e2e.sh" "$@"

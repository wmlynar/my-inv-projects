#!/usr/bin/env bash
set -euo pipefail

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  SUDO="sudo"
fi

export DEBIAN_FRONTEND=noninteractive
export TZ=UTC

if ! command -v apt-get >/dev/null 2>&1; then
  echo "[install-e2e-tools] ERROR: apt-get not found. This installer targets Ubuntu/Debian."
  exit 2
fi

E2E_DEPS=(
  gdb
  gdbserver
  strace
  ltrace
)

OPTIONAL_DEPS=(
  rr
  bpftrace
  lttng-tools
  systemtap
  elfutils
  pstack
  lldb
  binwalk
  criu
  trace-cmd
  sysdig
  auditd
  file
)

install_if_available() {
  local pkg="$1"
  if apt-cache show "$pkg" >/dev/null 2>&1; then
    $SUDO apt-get install -y "$pkg"
    return 0
  fi
  return 1
}

echo "[install-e2e-tools] Installing E2E anti-debug tools..."
if [ "${SEAL_E2E_TOOLS_SKIP_UPDATE:-0}" != "1" ]; then
  $SUDO apt-get update
fi
$SUDO apt-get install -y "${E2E_DEPS[@]}"

echo "[install-e2e-tools] Installing optional instrumentation tools (best-effort)..."
for pkg in "${OPTIONAL_DEPS[@]}"; do
  if ! install_if_available "$pkg"; then
    echo "[install-e2e-tools] SKIP: $pkg not available in apt repositories."
  fi
done

if ! command -v perf >/dev/null 2>&1; then
  if ! install_if_available linux-tools-common; then
    echo "[install-e2e-tools] SKIP: linux-tools-common not available."
  fi
  if ! install_if_available "linux-tools-$(uname -r)"; then
    if ! install_if_available linux-tools-generic; then
      echo "[install-e2e-tools] SKIP: linux-tools package not available for perf."
    fi
  fi
fi

if ! command -v coredumpctl >/dev/null 2>&1; then
  if $SUDO apt-get install -y systemd-coredump; then
    :
  else
    echo "[install-e2e-tools] WARN: systemd-coredump not available."
  fi
fi

for tool in gdb gdbserver strace ltrace; do
  if command -v "$tool" >/dev/null 2>&1; then
    echo "[install-e2e-tools] $tool OK: $(command -v "$tool")"
  else
    echo "[install-e2e-tools] WARN: $tool not found after install."
  fi
done

if command -v coredumpctl >/dev/null 2>&1; then
  echo "[install-e2e-tools] coredumpctl OK: $(command -v coredumpctl)"
else
  echo "[install-e2e-tools] WARN: coredumpctl not found (core crash E2E will be partially skipped)."
fi

for tool in rr bpftrace lttng stap eu-readelf eu-stack perf pstack gstack lldb lldb-server binwalk criu trace-cmd sysdig auditctl file; do
  if command -v "$tool" >/dev/null 2>&1; then
    echo "[install-e2e-tools] $tool OK: $(command -v "$tool")"
  else
    echo "[install-e2e-tools] WARN: $tool not found after install."
  fi
done

echo "[install-e2e-tools] Done."

#!/usr/bin/env bash
set -euo pipefail

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  SUDO="sudo"
fi

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

echo "[install-e2e-tools] Installing E2E anti-debug tools..."
if [ "${SEAL_E2E_TOOLS_SKIP_UPDATE:-0}" != "1" ]; then
  $SUDO apt-get update
fi
$SUDO apt-get install -y "${E2E_DEPS[@]}"

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

echo "[install-e2e-tools] Done."

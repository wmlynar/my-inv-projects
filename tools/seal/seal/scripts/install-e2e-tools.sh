#!/usr/bin/env bash
set -euo pipefail

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  SUDO="sudo"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export DEBIAN_FRONTEND=noninteractive
export TZ=UTC

STRICT_TOOL_BASELINE="${SEAL_E2E_STRICT_TOOL_BASELINE:-0}"

if [ -n "${SEAL_E2E_CACHE_BIN:-}" ]; then
  export PATH="$SEAL_E2E_CACHE_BIN:$PATH"
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

OPTIONAL_DEPS=(
  rr
  bpftrace
  lttng-tools
  systemtap
  elfutils
  pstack
  lldb
  binwalk
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

log_missing() {
  local msg="$1"
  if [ "$STRICT_TOOL_BASELINE" = "1" ]; then
    echo "[install-e2e-tools] WARN: $msg"
  else
    echo "[install-e2e-tools] SKIP: $msg"
  fi
}

write_executable() {
  local dest="$1"
  if [ -n "$SUDO" ] && [ ! -w "$(dirname "$dest")" ]; then
    $SUDO tee "$dest" >/dev/null
    $SUDO chmod +x "$dest"
  else
    cat > "$dest"
    chmod +x "$dest"
  fi
}

ensure_gstack() {
  if command -v gstack >/dev/null 2>&1; then
    return 0
  fi
  if ! command -v gdb >/dev/null 2>&1; then
    log_missing "gstack unavailable (gdb missing)."
    return 0
  fi
  local target_dir="${SEAL_E2E_CACHE_BIN:-}"
  if [ -z "$target_dir" ]; then
    if [ "$(id -u)" -eq 0 ]; then
      target_dir="/usr/local/bin"
    else
      target_dir="${HOME}/.local/bin"
    fi
  fi
  if [ -n "$SUDO" ] && [ ! -w "$target_dir" ]; then
    $SUDO mkdir -p "$target_dir"
  else
    mkdir -p "$target_dir"
  fi
  local target="${target_dir}/gstack"
  if [ ! -f "$target" ]; then
    write_executable "$target" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
pid="${1:-}"
if [ -z "$pid" ]; then
  echo "Usage: gstack <pid>" >&2
  exit 1
fi
exec gdb -q -n -batch -ex "set pagination off" -ex "thread apply all bt" -p "$pid"
EOF
  fi
  echo "[install-e2e-tools] gstack shim created: $target"
  return 0
}

echo "[install-e2e-tools] Installing E2E anti-debug tools..."
if [ "${SEAL_E2E_TOOLS_SKIP_UPDATE:-0}" != "1" ]; then
  $SUDO apt-get update
fi
$SUDO apt-get install -y "${E2E_DEPS[@]}"

echo "[install-e2e-tools] Installing optional instrumentation tools (best-effort)..."
for pkg in "${OPTIONAL_DEPS[@]}"; do
  if ! install_if_available "$pkg"; then
    log_missing "$pkg not available in apt repositories."
  fi
done

if [ "${SEAL_E2E_INSTALL_CRIU:-1}" = "1" ]; then
  if ! "$SCRIPT_DIR/install-criu.sh"; then
    log_missing "criu not installed (optional)."
  fi
else
  echo "[install-e2e-tools] SKIP: criu install disabled (SEAL_E2E_INSTALL_CRIU=0)."
fi

if ! command -v perf >/dev/null 2>&1; then
  if ! install_if_available linux-tools-common; then
    log_missing "linux-tools-common not available."
  fi
  if ! install_if_available "linux-tools-$(uname -r)"; then
    if ! install_if_available linux-tools-generic; then
      log_missing "linux-tools package not available for perf."
    fi
  fi
fi

if ! command -v coredumpctl >/dev/null 2>&1; then
  if $SUDO apt-get install -y systemd-coredump; then
    :
  else
    log_missing "systemd-coredump not available."
  fi
fi

for tool in gdb gdbserver strace ltrace; do
  if command -v "$tool" >/dev/null 2>&1; then
    echo "[install-e2e-tools] $tool OK: $(command -v "$tool")"
  else
    echo "[install-e2e-tools] WARN: $tool not found after install."
  fi
done

ensure_gstack

if command -v coredumpctl >/dev/null 2>&1; then
  echo "[install-e2e-tools] coredumpctl OK: $(command -v coredumpctl)"
else
  log_missing "coredumpctl not found (core crash E2E will be partially skipped)."
fi

for tool in rr bpftrace lttng stap eu-readelf eu-stack perf pstack gstack lldb lldb-server binwalk criu trace-cmd sysdig auditctl file; do
  if command -v "$tool" >/dev/null 2>&1; then
    echo "[install-e2e-tools] $tool OK: $(command -v "$tool")"
  else
    log_missing "$tool not found after install."
  fi
done

echo "[install-e2e-tools] Done."

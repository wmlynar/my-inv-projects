#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR"
SEAL_DIR="$ROOT_DIR/seal"
SEAL_SCRIPTS="$SEAL_DIR/scripts"

log() {
  echo "[seal-install] $*"
}

warn() {
  echo "[seal-install] WARN: $*" >&2
}

if [ ! -d "$SEAL_SCRIPTS" ]; then
  warn "Expected scripts dir not found: $SEAL_SCRIPTS"
  exit 1
fi

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  SUDO="sudo"
fi

run_sudo() {
  if [ -n "$SUDO" ]; then
    "$SUDO" -E "$@"
  else
    "$@"
  fi
}

has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

INSTALL_EXTRAS="${SEAL_INSTALL_EXTRAS:-0}"
DEFAULT_E2E_TOOLS=0
DEFAULT_ANTIDEBUG=0
DEFAULT_DOCKER=0
DEFAULT_PACKERS=1
DEFAULT_PLAYWRIGHT=0
DEFAULT_C_OBFUSCATOR=1

if [ "$INSTALL_EXTRAS" = "1" ]; then
  DEFAULT_E2E_TOOLS=1
  DEFAULT_ANTIDEBUG=1
  DEFAULT_DOCKER=1
  DEFAULT_PACKERS=1
  DEFAULT_PLAYWRIGHT=1
  DEFAULT_C_OBFUSCATOR=1
fi

INSTALL_E2E_TOOLS="${SEAL_INSTALL_E2E_TOOLS:-$DEFAULT_E2E_TOOLS}"
INSTALL_ANTIDEBUG="${SEAL_INSTALL_ANTIDEBUG:-$DEFAULT_ANTIDEBUG}"
INSTALL_DOCKER="${SEAL_INSTALL_DOCKER:-$DEFAULT_DOCKER}"
INSTALL_PACKERS="${SEAL_INSTALL_PACKERS:-$DEFAULT_PACKERS}"
INSTALL_PLAYWRIGHT="${SEAL_INSTALL_PLAYWRIGHT:-$DEFAULT_PLAYWRIGHT}"
INSTALL_KITESHIELD="${SEAL_INSTALL_KITESHIELD:-1}"
INSTALL_C_OBFUSCATOR="${SEAL_INSTALL_C_OBFUSCATOR:-$DEFAULT_C_OBFUSCATOR}"
C_OBFUSCATOR="${SEAL_C_OBFUSCATOR:-ollvm}"
INSTALL_LINK="${SEAL_INSTALL_LINK:-1}"
INSTALL_COMPLETION="${SEAL_INSTALL_COMPLETION:-1}"
INSTALL_BASH_COMPLETION_PKG="${SEAL_INSTALL_BASH_COMPLETION_PKG:-1}"

log "Installing base deps (apt, Node, npm, kiteshield)..."
SEAL_INSTALL_E2E_TOOLS="$INSTALL_E2E_TOOLS" \
SEAL_INSTALL_KITESHIELD="$INSTALL_KITESHIELD" \
  "$SEAL_SCRIPTS/install-seal-deps.sh"

if [ "$INSTALL_ANTIDEBUG" = "1" ]; then
  log "Installing anti-debug E2E deps..."
  if ! "$SEAL_SCRIPTS/install-e2e-antidebug-deps.sh"; then
    warn "Anti-debug deps install failed. Some E2E tests will be skipped."
  fi
else
  log "Skipping anti-debug deps (SEAL_INSTALL_ANTIDEBUG=0)."
fi

if [ "$INSTALL_PACKERS" = "1" ]; then
  log "Installing packers/obfuscators (best-effort)..."
  if has_cmd strip; then log "strip already installed"; else if ! "$SEAL_SCRIPTS/install-strip.sh"; then warn "strip install failed"; fi; fi
  if has_cmd upx; then log "upx already installed"; else if ! "$SEAL_SCRIPTS/install-upx.sh"; then warn "upx install failed"; fi; fi
  if has_cmd midgetpack; then log "midgetpack already installed"; else if ! "$SEAL_SCRIPTS/install-midgetpack.sh"; then warn "midgetpack install failed"; fi; fi
else
  log "Skipping packers/obfuscators (SEAL_INSTALL_PACKERS=0)."
fi

if [ "$INSTALL_C_OBFUSCATOR" = "1" ]; then
  case "${C_OBFUSCATOR}" in
    ollvm|obfuscator-llvm|obfuscatorllvm|llvm)
      log "Installing C obfuscator: ollvm..."
      if has_cmd ollvm-clang; then log "ollvm already installed"; else if ! "$SEAL_SCRIPTS/install-ollvm.sh"; then warn "ollvm install failed"; fi; fi
      ;;
    hikari)
      log "Installing C obfuscator: hikari..."
      if has_cmd hikari-clang; then log "hikari already installed"; else if ! "$SEAL_SCRIPTS/install-hikari-llvm15.sh"; then warn "hikari install failed"; fi; fi
      ;;
    both)
      log "Installing C obfuscators: ollvm + hikari..."
      if has_cmd ollvm-clang; then log "ollvm already installed"; else if ! "$SEAL_SCRIPTS/install-ollvm.sh"; then warn "ollvm install failed"; fi; fi
      if has_cmd hikari-clang; then log "hikari already installed"; else if ! "$SEAL_SCRIPTS/install-hikari-llvm15.sh"; then warn "hikari install failed"; fi; fi
      ;;
    *)
      warn "Unknown SEAL_C_OBFUSCATOR='$C_OBFUSCATOR' (use: ollvm|hikari|both). Defaulting to ollvm."
      if has_cmd ollvm-clang; then log "ollvm already installed"; else if ! "$SEAL_SCRIPTS/install-ollvm.sh"; then warn "ollvm install failed"; fi; fi
      ;;
  esac
else
  log "Skipping C obfuscator (SEAL_INSTALL_C_OBFUSCATOR=0)."
fi

if [ "$INSTALL_DOCKER" = "1" ]; then
  log "Installing Docker (best-effort)..."
  if ! "$SEAL_SCRIPTS/install-docker.sh"; then
    warn "Docker install failed. Docker E2E tests will be skipped."
  fi
else
  log "Skipping Docker install (SEAL_INSTALL_DOCKER=0)."
fi

if [ "$INSTALL_BASH_COMPLETION_PKG" = "1" ]; then
  if command -v apt-get >/dev/null 2>&1; then
    log "Installing bash-completion..."
    run_sudo apt-get install -y bash-completion || warn "bash-completion install failed"
  else
    warn "apt-get not found; skip bash-completion package install."
  fi
else
  log "Skipping bash-completion package (SEAL_INSTALL_BASH_COMPLETION_PKG=0)."
fi

if [ "$INSTALL_PLAYWRIGHT" = "1" ]; then
  log "Installing Playwright browsers (chromium)..."
  if [ -z "${PLAYWRIGHT_BROWSERS_PATH:-}" ]; then
    PLAYWRIGHT_BROWSERS_PATH="${SEAL_PLAYWRIGHT_CACHE_DIR:-/usr/local/share/ms-playwright}"
    export PLAYWRIGHT_BROWSERS_PATH
  fi
  run_sudo mkdir -p "$PLAYWRIGHT_BROWSERS_PATH"
  run_sudo chown "$(id -u)":"$(id -g)" "$PLAYWRIGHT_BROWSERS_PATH" 2>/dev/null || true
  if ! (cd "$ROOT_DIR" && npx playwright install --with-deps chromium); then
    warn "Playwright install failed. UI E2E tests will be skipped."
  fi
else
  log "Skipping Playwright install (SEAL_INSTALL_PLAYWRIGHT=0)."
fi

ensure_path_line() {
  local file="$1"
  local dir="$2"
  local line="export PATH=\"$dir:\$PATH\""
  if [ ! -f "$file" ]; then
    touch "$file"
  fi
  if ! grep -qs "$dir" "$file"; then
    {
      echo ""
      echo "# Added by seal install"
      echo "$line"
    } >>"$file"
  fi
}

if [ "$INSTALL_LINK" = "1" ]; then
  log "Linking seal CLI..."
  "$ROOT_DIR/scripts/link-global-seal.sh" || warn "npm link failed"

  if ! command -v seal >/dev/null 2>&1; then
    NPM_BIN="$(npm bin -g 2>/dev/null || true)"
    if [ -n "$NPM_BIN" ] && [[ ":$PATH:" != *":$NPM_BIN:"* ]]; then
      ensure_path_line "$HOME/.bashrc" "$NPM_BIN"
      ensure_path_line "$HOME/.profile" "$NPM_BIN"
      log "Added npm global bin to PATH in ~/.bashrc and ~/.profile"
    fi
  fi

  if ! command -v seal >/dev/null 2>&1; then
    LOCAL_BIN="$HOME/.local/bin"
    mkdir -p "$LOCAL_BIN"
    ln -sf "$SEAL_DIR/bin/seal.js" "$LOCAL_BIN/seal"
    chmod +x "$LOCAL_BIN/seal"
    if [[ ":$PATH:" != *":$LOCAL_BIN:"* ]]; then
      ensure_path_line "$HOME/.bashrc" "$LOCAL_BIN"
      ensure_path_line "$HOME/.profile" "$LOCAL_BIN"
      log "Added ~/.local/bin to PATH in ~/.bashrc and ~/.profile"
    fi
  fi
else
  log "Skipping npm link (SEAL_INSTALL_LINK=0)."
fi

if [ "$INSTALL_COMPLETION" = "1" ]; then
  COMPLETION_USER_DIR="${BASH_COMPLETION_USER_DIR:-${XDG_DATA_HOME:-$HOME/.local/share}/bash-completion}"
  COMPLETION_DIR="$COMPLETION_USER_DIR/completions"
  mkdir -p "$COMPLETION_DIR"
  if command -v seal >/dev/null 2>&1; then
    seal completion bash >"$COMPLETION_DIR/seal"
  else
    node "$SEAL_DIR/bin/seal.js" completion bash >"$COMPLETION_DIR/seal"
  fi
  log "Installed bash completion to: $COMPLETION_DIR/seal"
else
  log "Skipping completion install (SEAL_INSTALL_COMPLETION=0)."
fi

log "Done."
log "Open a new shell (or: source ~/.bashrc) to refresh PATH/completion."
log "Check:"
log "  command -v seal"
log "  seal --help"

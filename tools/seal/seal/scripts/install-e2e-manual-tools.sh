#!/usr/bin/env bash
set -euo pipefail

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  SUDO="sudo"
fi

log() {
  echo "[install-e2e-manual-tools] $*"
}

PIN_URL_DEFAULT="https://software.intel.com/sites/landingpage/pintool/downloads/pin-external-4.0-99633-g5ca9893f2-gcc-linux.tar.gz"
PIN_URL="${PIN_URL:-$PIN_URL_DEFAULT}"
PIN_TARBALL="${PIN_TARBALL:-}"
PIN_ROOT="${PIN_ROOT:-/opt/pin}"

AVML_URL_DEFAULT="https://github.com/microsoft/avml/releases/latest/download/avml"
AVML_URL="${AVML_URL:-$AVML_URL_DEFAULT}"
AVML_BIN="${AVML_BIN:-/usr/local/bin/avml}"

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

if [ -n "$PIN_TARBALL" ]; then
  log "Using local Pin tarball: $PIN_TARBALL"
  PIN_ARCHIVE="$PIN_TARBALL"
else
  PIN_ARCHIVE="$TMP_DIR/pin.tar.gz"
  log "Downloading Pin tarball from: $PIN_URL"
  curl -fL -o "$PIN_ARCHIVE" "$PIN_URL"
fi

log "Installing Pin to: $PIN_ROOT"
$SUDO mkdir -p "$PIN_ROOT"
$SUDO tar -xzf "$PIN_ARCHIVE" -C "$PIN_ROOT" --strip-components=1
$SUDO ln -sf "$PIN_ROOT/pin" /usr/local/bin/pin

log "Installing AVML from: $AVML_URL"
$SUDO curl -fL -o "$AVML_BIN" "$AVML_URL"
$SUDO chmod +x "$AVML_BIN"

log "OK: pin -> $(command -v pin || echo '/usr/local/bin/pin')"
log "OK: avml -> $(command -v avml || echo "$AVML_BIN")"

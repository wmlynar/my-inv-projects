#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_NAME="${SERVICE_NAME:-$(basename "$SCRIPT_DIR")}"
WORKDIR="${SERVICE_WORKDIR:-$SCRIPT_DIR}"

if ! command -v systemctl >/dev/null 2>&1; then
  echo "systemctl not found. This script requires systemd." >&2
  exit 1
fi

NODE_BIN="${NODE_BIN:-$(command -v node || true)}"
if [ -z "$NODE_BIN" ]; then
  echo "node not found in PATH. Install Node.js first." >&2
  exit 1
fi

ENTRY="${SERVICE_ENTRY:-}"
if [ -z "$ENTRY" ] && [ -f "$WORKDIR/package.json" ]; then
  ENTRY="$($NODE_BIN -e 'try{const p=require(process.argv[1]); if(p && p.main) process.stdout.write(p.main);}catch(e){}' "$WORKDIR/package.json")"
fi
ENTRY="${ENTRY:-server.js}"

if [ ! -d "$WORKDIR" ]; then
  echo "Workdir not found: $WORKDIR" >&2
  exit 1
fi

if [ ! -f "$WORKDIR/$ENTRY" ]; then
  echo "Entry file not found: $WORKDIR/$ENTRY" >&2
  exit 1
fi

SERVICE_USER="${SERVICE_USER:-${SUDO_USER:-$(id -un)}}"
SERVICE_GROUP="${SERVICE_GROUP:-$(id -gn "$SERVICE_USER")}"

UNIT_PATH="/etc/systemd/system/${SERVICE_NAME}.service"

SUDO=""
if [ "$(id -u)" -ne 0 ]; then
  if ! command -v sudo >/dev/null 2>&1; then
    echo "sudo not found. Run this script as root." >&2
    exit 1
  fi
  SUDO="sudo"
fi

echo "Reinstalling service: $SERVICE_NAME"
echo "  Workdir: $WORKDIR"
echo "  Entry:   $ENTRY"
echo "  User:    $SERVICE_USER:$SERVICE_GROUP"

$SUDO systemctl stop "$SERVICE_NAME" 2>/dev/null || true
$SUDO systemctl disable "$SERVICE_NAME" 2>/dev/null || true
$SUDO rm -f "$UNIT_PATH"
$SUDO rm -rf "/etc/systemd/system/${SERVICE_NAME}.service.d"
$SUDO systemctl daemon-reload
$SUDO systemctl reset-failed "$SERVICE_NAME" 2>/dev/null || true

if [ -n "$SUDO" ]; then
  $SUDO tee "$UNIT_PATH" > /dev/null <<EOF_UNIT
[Unit]
Description=$SERVICE_NAME
After=network.target

[Service]
Type=simple
WorkingDirectory=$WORKDIR
ExecStart=$NODE_BIN $ENTRY
Restart=always
RestartSec=2
User=$SERVICE_USER
Group=$SERVICE_GROUP
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF_UNIT
else
  tee "$UNIT_PATH" > /dev/null <<EOF_UNIT
[Unit]
Description=$SERVICE_NAME
After=network.target

[Service]
Type=simple
WorkingDirectory=$WORKDIR
ExecStart=$NODE_BIN $ENTRY
Restart=always
RestartSec=2
User=$SERVICE_USER
Group=$SERVICE_GROUP
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF_UNIT
fi

$SUDO systemctl daemon-reload
$SUDO systemctl enable "$SERVICE_NAME"
$SUDO systemctl restart "$SERVICE_NAME"
$SUDO systemctl status "$SERVICE_NAME" --no-pager --full

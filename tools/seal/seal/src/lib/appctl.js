"use strict";

function renderAppctl({ appName, appEntry }) {
  const entry = appEntry ? String(appEntry).replace(/"/g, '\\"') : "";
  return `#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

APP_NAME="${appName}"
APP_BIN="${appName}"
APP_ENTRY="${entry}"

# Best-effort install root detection.
# Expected layout:
#   <ROOT>/releases/<appName>-<buildId>/appctl
ROOT=""
PARENT="$(dirname "$DIR")"
if [ "$(basename "$PARENT")" = "releases" ]; then
  ROOT="$(dirname "$PARENT")"
elif [ -d "$DIR/releases" ]; then
  ROOT="$DIR"
fi

SERVICE_NAME="$APP_NAME"
SERVICE_SCOPE=""  # auto: user (home) / system (else)
SERVICE_USER=""
SERVICE_GROUP=""

_trim() { tr -d '\r\n'; }

_auto_scope() {
  if [ -n "$SERVICE_SCOPE" ]; then
    echo "$SERVICE_SCOPE"; return 0
  fi
if [ -n "$ROOT" ] && [ "\${HOME:-}" != "" ] && echo "$ROOT" | grep -q "^$HOME"; then
    echo "user"; return 0
  fi
  echo "system"
}

_detect_existing_service() {
  # If a unit already exists for this ROOT (created by SEAL bootstrap), detect it
  # and persist service.name/scope for later convenience.
  [ -z "$ROOT" ] && return 0
  local runner="$ROOT/run-current.sh"

  local user_matches=""
  local system_matches=""

  local udir="$HOME/.config/systemd/user"
  if [ -d "$udir" ]; then
    user_matches="$(grep -rl "ExecStart=$runner" "$udir" 2>/dev/null || true)"
  fi
  if [ -d "/etc/systemd/system" ]; then
    system_matches="$(grep -rl "ExecStart=$runner" /etc/systemd/system 2>/dev/null || true)"
  fi

  local ucount="0"
  local scount="0"
  ucount="$(echo "$user_matches" | grep -c . || true)"
  scount="$(echo "$system_matches" | grep -c . || true)"

  if [ "$ucount" -gt 0 ] && [ "$scount" -gt 0 ]; then
    echo "[appctl] Ambiguous service: matching units exist in BOTH user and system scopes for $runner" 1>&2
    echo "$user_matches" | sed 's/^/  user: /' 1>&2 || true
    echo "$system_matches" | sed 's/^/  system: /' 1>&2 || true
    exit 2
  fi

  local found=""
  local scope=""
  if [ "$ucount" -eq 1 ]; then
    found="$user_matches"; scope="user"
  elif [ "$ucount" -gt 1 ]; then
    echo "[appctl] Ambiguous service: multiple user units match $runner" 1>&2
    echo "$user_matches" | sed 's/^/  - /' 1>&2 || true
    exit 2
  elif [ "$scount" -eq 1 ]; then
    found="$system_matches"; scope="system"
  elif [ "$scount" -gt 1 ]; then
    echo "[appctl] Ambiguous service: multiple system units match $runner" 1>&2
    echo "$system_matches" | sed 's/^/  - /' 1>&2 || true
    exit 2
  else
    return 0
  fi

  local name="$(basename "$found" | sed 's/\.service$//')"
  SERVICE_NAME="$name"
  SERVICE_SCOPE="$scope"
  if [ -f "$found" ]; then
    local unit_user=""
    local unit_group=""
    unit_user="$(grep -E '^User=' "$found" | head -n1 | cut -d= -f2- | _trim)"
    unit_group="$(grep -E '^Group=' "$found" | head -n1 | cut -d= -f2- | _trim)"
    if [ -n "$unit_user" ]; then SERVICE_USER="$unit_user"; fi
    if [ -n "$unit_group" ]; then SERVICE_GROUP="$unit_group"; fi
  fi

  mkdir -p "$ROOT" 2>/dev/null || true
  if [ "$(id -u)" -ne 0 ] && [ "$SERVICE_SCOPE" = "system" ]; then
    echo "$SERVICE_NAME" | sudo tee "$ROOT/service.name" >/dev/null
    echo "$SERVICE_SCOPE" | sudo tee "$ROOT/service.scope" >/dev/null
    if [ -n "$SERVICE_USER" ]; then echo "$SERVICE_USER" | sudo tee "$ROOT/service.user" >/dev/null; fi
    if [ -n "$SERVICE_GROUP" ]; then echo "$SERVICE_GROUP" | sudo tee "$ROOT/service.group" >/dev/null; fi
  else
    echo "$SERVICE_NAME" > "$ROOT/service.name"
    echo "$SERVICE_SCOPE" > "$ROOT/service.scope"
    if [ -n "$SERVICE_USER" ]; then echo "$SERVICE_USER" > "$ROOT/service.user"; fi
    if [ -n "$SERVICE_GROUP" ]; then echo "$SERVICE_GROUP" > "$ROOT/service.group"; fi
  fi
}

_load_service_settings() {
  _detect_existing_service || true
  if [ -n "$ROOT" ]; then
    if [ -z "$SERVICE_NAME" ] && [ -f "$ROOT/service.name" ]; then SERVICE_NAME="$(cat "$ROOT/service.name" | _trim)"; fi
    if [ -z "$SERVICE_SCOPE" ] && [ -f "$ROOT/service.scope" ]; then SERVICE_SCOPE="$(cat "$ROOT/service.scope" | _trim)"; fi
    if [ -z "$SERVICE_USER" ] && [ -f "$ROOT/service.user" ]; then SERVICE_USER="$(cat "$ROOT/service.user" | _trim)"; fi
    if [ -z "$SERVICE_GROUP" ] && [ -f "$ROOT/service.group" ]; then SERVICE_GROUP="$(cat "$ROOT/service.group" | _trim)"; fi
  fi
  if [ -z "$SERVICE_NAME" ]; then SERVICE_NAME="$APP_NAME"; fi
  if [ -z "$SERVICE_SCOPE" ]; then SERVICE_SCOPE="$(_auto_scope)"; fi
}

_sysctl() {
  local scope="$SERVICE_SCOPE"
  if [ "$scope" = "user" ]; then
    systemctl --user "$@"
  else
    if [ "$(id -u)" -eq 0 ]; then systemctl "$@"; else sudo systemctl "$@"; fi
  fi
}

_svc_file() {
  if [ "$SERVICE_SCOPE" = "user" ]; then
    echo "$HOME/.config/systemd/user/$SERVICE_NAME.service"
  else
    echo "/etc/systemd/system/$SERVICE_NAME.service"
  fi
}

_as_root() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  else
    sudo "$@"
  fi
}

_tee_file() {
  local path="$1"
  if [ "$SERVICE_SCOPE" = "system" ] && [ "$(id -u)" -ne 0 ]; then
    sudo tee "$path" >/dev/null
  else
    tee "$path" >/dev/null
  fi
}

usage() {
  cat 1>&2 <<EOF
Usage: ./appctl <command>

App runtime:
  run                 Run the app in foreground (requires config.runtime.json5)
  version             Print version.json

Service management (systemd):
  up [--name N] [--user|--system]
                      Install service (if needed) and start it
  enable              Enable autostart
  start               Start service
  down                Stop and remove service
  restart             Restart service
  stop                Stop service
  disable             Disable autostart
  status              Show service status
  logs                Follow logs (tail -f)

Notes:
  - Appctl auto-detects install ROOT from the standard layout:
      <ROOT>/releases/<app>-<buildId>/appctl
  - If service already exists (installed by SEAL bootstrap), appctl will detect its name.
EOF
}

cmd="\${1:-run}"
shift || true

case "$cmd" in
  run)
    if [ ! -f "$DIR/config.runtime.json5" ]; then
      echo "[appctl] Missing config.runtime.json5 in $DIR" 1>&2
      echo "[appctl] Tip: copy config/<config>.json5 here as config.runtime.json5" 1>&2
      exit 2
    fi
    if [ -n "$APP_ENTRY" ]; then
      if [ ! -f "$DIR/$APP_ENTRY" ]; then
        echo "[appctl] Missing entry: $DIR/$APP_ENTRY" 1>&2
        exit 2
      fi
      exec node "$DIR/$APP_ENTRY" "$@"
    fi
    exec "$DIR/$APP_BIN" "$@"
    ;;
  version)
    if [ -f "$DIR/version.json" ]; then
      cat "$DIR/version.json"
    else
      echo "{\"version\":null}"
      exit 1
    fi
    ;;
  up)
    _load_service_settings

    # Parse options
    while [ "\${1:-}" != "" ]; do
      case "$1" in
        --name)
          SERVICE_NAME="\${2:-}"; shift 2 || true
          ;;
        --user)
          SERVICE_SCOPE="user"; shift || true
          ;;
        --system)
          SERVICE_SCOPE="system"; shift || true
          ;;
        -h|--help)
          usage; exit 0
          ;;
        *)
          echo "[appctl] Unknown option: $1" 1>&2
          usage; exit 2
          ;;
      esac
    done

    if [ -z "$ROOT" ]; then
      echo "[appctl] Cannot detect install ROOT. Run from <ROOT>/releases/<app>-<buildId>/ or use SEAL deploy." 1>&2
      exit 2
    fi

    # Persist service settings for convenience
    echo "$SERVICE_NAME" | _tee_file "$ROOT/service.name"
    echo "$SERVICE_SCOPE" | _tee_file "$ROOT/service.scope"
    if [ -n "$SERVICE_USER" ]; then echo "$SERVICE_USER" | _tee_file "$ROOT/service.user"; fi
    if [ -n "$SERVICE_GROUP" ]; then echo "$SERVICE_GROUP" | _tee_file "$ROOT/service.group"; fi

    # Ensure layout
    _as_root mkdir -p "$ROOT/releases" "$ROOT/shared"

    # Ensure current.buildId (if missing)
    if [ ! -f "$ROOT/current.buildId" ]; then
      if [ "$(basename "$PARENT")" = "releases" ]; then
        echo "$(basename "$DIR")" | _tee_file "$ROOT/current.buildId"
      else
        echo "[appctl] Missing $ROOT/current.buildId (and cannot infer). Deploy first." 1>&2
        exit 2
      fi
    fi

    # Runner script (create if missing)
    if [ ! -f "$ROOT/run-current.sh" ]; then
      cat <<'EOF' | _tee_file "$ROOT/run-current.sh"
#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
BUILD_ID="$(cat "$ROOT/current.buildId")"
REL="$ROOT/releases/$BUILD_ID"
if [ ! -d "$REL" ]; then
  echo "[appctl] release dir not found: $REL" 1>&2
  exit 2
fi

# runtime config: shared -> release
if [ -f "$ROOT/shared/config.json5" ]; then
  cp "$ROOT/shared/config.json5" "$REL/config.runtime.json5"
fi

cd "$REL"
exec "$REL/appctl" run
EOF
      _as_root chmod +x "$ROOT/run-current.sh"
    fi

    # Unit file
    svc_path="$(_svc_file)"
    if [ ! -f "$svc_path" ]; then
      if [ "$SERVICE_SCOPE" = "user" ]; then
        mkdir -p "$(dirname "$svc_path")"
      fi

      if [ "$SERVICE_SCOPE" = "user" ]; then
        cat <<EOF | _tee_file "$svc_path"
[Unit]
Description=SEAL app $SERVICE_NAME
After=network.target

[Service]
Type=simple
WorkingDirectory=$ROOT
ExecStart=$ROOT/run-current.sh
Restart=always
RestartSec=1
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=default.target
EOF
      else
        USER_LINE=""
        GROUP_LINE=""
        if [ -n "$SERVICE_USER" ]; then USER_LINE="User=$SERVICE_USER"; fi
        if [ -n "$SERVICE_GROUP" ]; then GROUP_LINE="Group=$SERVICE_GROUP"; fi
        cat <<EOF | _tee_file "$svc_path"
[Unit]
Description=SEAL app $SERVICE_NAME
After=network.target

[Service]
Type=simple
$USER_LINE
$GROUP_LINE
WorkingDirectory=$ROOT
ExecStart=$ROOT/run-current.sh
Restart=always
RestartSec=1
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
      fi
    fi

    # reload systemd (install only)
    _sysctl daemon-reload
    _sysctl enable "$SERVICE_NAME.service" || true
    _sysctl restart "$SERVICE_NAME.service"

    echo "[appctl] Service is up: $SERVICE_NAME ($SERVICE_SCOPE)"
    ;;
  enable)
    _load_service_settings
    _sysctl enable "$SERVICE_NAME.service"
    ;;
  start)
    _load_service_settings
    _sysctl start "$SERVICE_NAME.service"
    ;;
  down)
    _load_service_settings
    _sysctl stop "$SERVICE_NAME.service" || true
    _sysctl disable "$SERVICE_NAME.service" || true
    svc_path="$(_svc_file)"
    if [ -f "$svc_path" ]; then
      _as_root rm -f "$svc_path"
      _sysctl daemon-reload || true
    fi
    echo "[appctl] Service removed: $SERVICE_NAME ($SERVICE_SCOPE)"
    ;;
  restart)
    _load_service_settings
    _sysctl restart "$SERVICE_NAME.service"
    ;;
  stop)
    _load_service_settings
    _sysctl stop "$SERVICE_NAME.service"
    ;;
  disable)
    _load_service_settings
    _sysctl disable "$SERVICE_NAME.service"
    ;;
  status)
    _load_service_settings
    _sysctl status "$SERVICE_NAME.service" --no-pager
    ;;
  logs)
    _load_service_settings
    if [ "$SERVICE_SCOPE" = "user" ]; then
      journalctl --user-unit "$SERVICE_NAME.service" -n 200 -f
    else
      journalctl -u "$SERVICE_NAME.service" -n 200 -f
    fi
    ;;
  *)
    echo "[appctl] Unknown command: $cmd" 1>&2
    usage
    exit 2
    ;;
esac
`;
}

module.exports = { renderAppctl };

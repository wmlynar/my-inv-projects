#!/usr/bin/env bash
set -euo pipefail

use_gsettings=true
if ! command -v gsettings >/dev/null 2>&1; then
  use_gsettings=false
fi

if $use_gsettings; then
  gsettings set org.gnome.settings-daemon.plugins.power lid-close-ac-action 'nothing'
  gsettings set org.gnome.settings-daemon.plugins.power lid-close-battery-action 'nothing'
  echo "OK: GNOME lid close => nothing (no WM restart)."
  exit 0
fi

conf_dir="/etc/systemd/logind.conf.d"
conf_file="${conf_dir}/99-lid-switch.conf"

sudo mkdir -p "$conf_dir"
sudo tee "$conf_file" >/dev/null <<'EOF'
[Login]
HandleLidSwitch=ignore
HandleLidSwitchDocked=ignore
HandleLidSwitchExternalPower=ignore
EOF

echo "OK: logind config updated. Apply by logging out/in or rebooting (no logind restart)."

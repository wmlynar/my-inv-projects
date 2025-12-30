#!/usr/bin/env bash
set -euo pipefail

conf_dir="/etc/systemd/logind.conf.d"
conf_file="${conf_dir}/99-lid-switch.conf"

sudo mkdir -p "$conf_dir"
sudo tee "$conf_file" >/dev/null <<'EOF'
[Login]
HandleLidSwitch=suspend
HandleLidSwitchDocked=ignore
HandleLidSwitchExternalPower=suspend
EOF

sudo systemctl restart systemd-logind
echo "OK: lid close => suspend (dock: ignore)."

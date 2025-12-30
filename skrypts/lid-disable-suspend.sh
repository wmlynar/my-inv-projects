#!/usr/bin/env bash
set -euo pipefail

conf_dir="/etc/systemd/logind.conf.d"
conf_file="${conf_dir}/99-lid-switch.conf"

sudo mkdir -p "$conf_dir"
sudo tee "$conf_file" >/dev/null <<'EOF'
[Login]
HandleLidSwitch=ignore
HandleLidSwitchDocked=ignore
HandleLidSwitchExternalPower=ignore
EOF

sudo systemctl restart systemd-logind
echo "OK: lid close => ignore (stays on)."

#!/bin/bash
# install-robot-task-manager-service.sh
#
# Instalacja robot-task-manager.js jako usługi systemd.
# Użycie:
#   sudo bash install-robot-task-manager-service.sh

set -e

SERVICE_NAME="robot-task-manager.service"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}"

PROJECT_DIR="/home/admin/robot-task-manager"
NODE_BIN="/usr/bin/nodejs"  # sprawdź: which nodejs lub which node

echo "Installing systemd service to ${SERVICE_FILE} ..."

cat > "${SERVICE_FILE}" <<EOUNIT
[Unit]
Description=Robot Task Manager (auto-start & auto-kill tasks)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=admin
Group=admin
WorkingDirectory=${PROJECT_DIR}
ExecStart=${NODE_BIN} ${PROJECT_DIR}/robot-task-manager.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOUNIT

echo "Reloading systemd daemon..."
systemctl daemon-reload

echo "Enabling service ${SERVICE_NAME} to start on boot..."
systemctl enable "${SERVICE_NAME}"

echo "Starting service ${SERVICE_NAME}..."
systemctl start "${SERVICE_NAME}"

echo
echo "Service status:"
systemctl status "${SERVICE_NAME}" --no-pager -l
echo
echo "Follow logs with:"
echo "  journalctl -u ${SERVICE_NAME} -f"

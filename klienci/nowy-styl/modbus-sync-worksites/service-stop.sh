#!/bin/bash
# service-restart.sh
#
# Restart the systemd service and show its status.
# Usage:
#   sudo ./service-restart.sh

SERVICE_NAME="modbus-sync-worksites.service"

systemctl stop "${SERVICE_NAME}"

#!/bin/bash
# service-stop.sh
#
# Stop usługi robot-task-manager.
# Użycie:
#   sudo ./service-stop.sh

SERVICE_NAME="robot-task-manager.service"

systemctl stop "${SERVICE_NAME}"

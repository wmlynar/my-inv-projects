#!/bin/bash
# service-status.sh
#
# Status usługi robot-task-manager.
# Użycie:
#   ./service-status.sh

SERVICE_NAME="robot-task-manager.service"

systemctl status "${SERVICE_NAME}" --no-pager -l

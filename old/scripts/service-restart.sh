#!/bin/bash
# service-restart.sh
#
# Restart usługi robot-task-manager + status.
# Użycie:
#   sudo ./service-restart.sh

SERVICE_NAME="robot-task-manager.service"

systemctl restart "${SERVICE_NAME}"
systemctl status "${SERVICE_NAME}" --no-pager -l

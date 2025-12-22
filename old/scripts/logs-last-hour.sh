#!/bin/bash
# logs-last-hour.sh
#
# Logi z ostatniej godziny.
# Użycie:
#   ./logs-last-hour.sh

SERVICE_NAME="robot-task-manager.service"

journalctl -u "${SERVICE_NAME}" --since "-1 hour" --no-pager

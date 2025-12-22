#!/bin/bash
# logs-follow.sh
#
# Podgląd logów usługi w czasie rzeczywistym.
# Użycie:
#   ./logs-follow.sh

SERVICE_NAME="robot-task-manager.service"

journalctl -u "${SERVICE_NAME}" -f -n 50

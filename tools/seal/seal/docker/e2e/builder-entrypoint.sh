#!/usr/bin/env bash
set -euo pipefail

SEAL_SSH_DIR="${SEAL_SSH_DIR:-/tmp/seal-ssh}"

if [ -d "$SEAL_SSH_DIR" ]; then
  if [ -f "$SEAL_SSH_DIR/id_ed25519" ]; then
    install -d -m 700 /root/.ssh
    install -m 600 "$SEAL_SSH_DIR/id_ed25519" /root/.ssh/id_ed25519
  fi
  if [ -f "$SEAL_SSH_DIR/id_ed25519.pub" ]; then
    install -m 644 "$SEAL_SSH_DIR/id_ed25519.pub" /root/.ssh/id_ed25519.pub
  fi
  if [ -f "$SEAL_SSH_DIR/authorized_keys" ]; then
    install -m 600 "$SEAL_SSH_DIR/authorized_keys" /root/.ssh/authorized_keys
  fi
fi

if [ "$#" -gt 0 ]; then
  exec "$@"
fi

exec bash

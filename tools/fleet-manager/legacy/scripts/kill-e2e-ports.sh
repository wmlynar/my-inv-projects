#!/bin/bash
set -euo pipefail

PORTS=(3100 18088 8088 19200 19204 19205 19206 19207 19208 19210 19301)

for port in "${PORTS[@]}"; do
  pids=$(lsof -ti :"$port" 2>/dev/null || true)
  if [[ -n "$pids" ]]; then
    echo "Killing listeners on port $port: $pids"
    kill -9 $pids
  fi
done

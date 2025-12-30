#!/usr/bin/env bash
set -euo pipefail

idle_seconds="${1:-300}"
shift || true

if [ "$#" -eq 0 ]; then
  echo "Usage: $0 <idle_seconds> <command> [args...]" >&2
  exit 2
fi

probe_enabled="${SEAL_IDLE_PROBE:-1}"
probe_wait="${SEAL_IDLE_PROBE_WAIT:-10}"

tmp_dir="$(mktemp -d)"
fifo="$tmp_dir/out.fifo"
last="$tmp_dir/last"
trap 'rm -rf "$tmp_dir"' EXIT

touch "$last"
mkfifo "$fifo"

(
  while IFS= read -r line; do
    printf '%s\n' "$line"
    date +%s > "$last"
  done < "$fifo"
) &
reader_pid=$!

run_cmd=("$@")
if command -v stdbuf >/dev/null 2>&1; then
  run_cmd=(stdbuf -oL -eL "${run_cmd[@]}")
fi

(
  exec "${run_cmd[@]}" > "$fifo" 2>&1
) &
cmd_pid=$!
probe_sent_at=0

while kill -0 "$cmd_pid" 2>/dev/null; do
  sleep 1
  now="$(date +%s)"
  last_ts="$(cat "$last" 2>/dev/null || echo "$now")"
  if ! [[ "$last_ts" =~ ^[0-9]+$ ]]; then
    last_ts="$now"
  fi
  if [ "$probe_sent_at" -gt 0 ] && [ "$last_ts" -gt "$probe_sent_at" ]; then
    probe_sent_at=0
  fi
  if [ $((now - last_ts)) -ge "$idle_seconds" ]; then
    if [ "$probe_enabled" = "1" ] && [ "$probe_sent_at" -eq 0 ]; then
      echo "NOTE: idle ${idle_seconds}s reached; probing stdin with newline..." >&2
      if [ -w "/proc/$cmd_pid/fd/0" ]; then
        printf '\n' > "/proc/$cmd_pid/fd/0" || true
      fi
      probe_sent_at="$now"
      sleep 2
      continue
    fi
    if [ "$probe_sent_at" -gt 0 ] && [ $((now - probe_sent_at)) -lt "$probe_wait" ]; then
      continue
    fi
    echo "ERROR: idle timeout ${idle_seconds}s reached; stopping command." >&2
    kill -TERM "$cmd_pid" 2>/dev/null || true
    sleep 5
    kill -KILL "$cmd_pid" 2>/dev/null || true
    break
  fi
done

wait "$cmd_pid" || cmd_status=$?
cmd_status="${cmd_status:-0}"
wait "$reader_pid" 2>/dev/null || true

exit "$cmd_status"

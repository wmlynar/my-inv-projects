#!/usr/bin/env bash
set -euo pipefail

ports=(3100 18088 19200 19204 19205 19206 19207 19208 19210 19301)
if [[ $# -gt 0 ]]; then
  ports=("$@")
fi

get_pids() {
  local port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -t -iTCP:"$port" -sTCP:LISTEN 2>/dev/null || true
    return 0
  fi
  if command -v ss >/dev/null 2>&1; then
    ss -ltnp "sport = :$port" 2>/dev/null \
      | awk -F'pid=' 'NR>1 {for (i=2;i<=NF;i++){split($i,a,","); if (a[1]!="") print a[1]}}'
    return 0
  fi
  if command -v fuser >/dev/null 2>&1; then
    fuser -n tcp "$port" 2>/dev/null || true
    return 0
  fi
  echo "Brak lsof/ss/fuser — nie moge znalezc PID." >&2
  return 1
}

pids=()
for port in "${ports[@]}"; do
  while IFS= read -r pid; do
    [[ -n "$pid" ]] && pids+=("$pid")
  done < <(get_pids "$port")
done

if [[ ${#pids[@]} -eq 0 ]]; then
  echo "Brak procesow na portach: ${ports[*]}"
  exit 0
fi

mapfile -t uniq < <(printf "%s\n" "${pids[@]}" | sort -u)
echo "Killing PIDs: ${uniq[*]}"
kill -TERM "${uniq[@]}" 2>/dev/null || true
sleep 1

mapfile -t still < <(printf "%s\n" "${uniq[@]}" | xargs -r -n1 sh -c 'ps -p "$1" >/dev/null && echo "$1"' sh)
if [[ ${#still[@]} -gt 0 ]]; then
  echo "Force kill: ${still[*]}"
  kill -KILL "${still[@]}" 2>/dev/null || true
fi

echo "Done."

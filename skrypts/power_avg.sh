#!/usr/bin/env bash
set -euo pipefail

duration=5
interval=1
samples=$((duration / interval))

batts=()
for d in /sys/class/power_supply/*; do
  [[ -f "$d/type" ]] || continue
  if [[ "$(cat "$d/type")" == "Battery" ]]; then
    batts+=("$d")
  fi
done

if [[ ${#batts[@]} -eq 0 ]]; then
  echo "No battery sensors found. Use external wattmeter for desktop."
  exit 1
fi

warn=0
for d in "${batts[@]}"; do
  if [[ -f "$d/status" ]]; then
    s=$(cat "$d/status")
    if [[ "$s" != "Discharging" ]]; then
      warn=1
    fi
  fi
done

if [[ $warn -eq 1 ]]; then
  echo "Warning: battery not discharging; reading may not reflect system power."
fi

get_power_w() {
  local total=0
  local p c v
  for d in "${batts[@]}"; do
    if [[ -f "$d/power_now" ]]; then
      p=$(cat "$d/power_now")
      total=$(awk -v t="$total" -v p="$p" 'BEGIN{print t + p/1000000}')
    elif [[ -f "$d/current_now" && -f "$d/voltage_now" ]]; then
      c=$(cat "$d/current_now")
      v=$(cat "$d/voltage_now")
      total=$(awk -v t="$total" -v c="$c" -v v="$v" 'BEGIN{print t + (c*v)/1e12}')
    fi
  done
  printf "%.6f\n" "$total"
}

while true; do
  sum=0
  count=0
  for _ in $(seq 1 "$samples"); do
    w=$(get_power_w)
    sum=$(awk -v s="$sum" -v w="$w" 'BEGIN{print s + w}')
    count=$((count + 1))
    sleep "$interval"
  done

  avg=$(awk -v s="$sum" -v c="$count" 'BEGIN{print s / c}')
  printf "Srednia z %ds: %.2f W\n" "$duration" "$avg"
done

#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: $0 <max_scale 0-1|0-100> [min_scale 0-1|0-100]"
  exit 1
}

max_input="${1:-${FEATURE_CPU_MAX_SCALE:-}}"
min_input="${2:-${FEATURE_CPU_MIN_SCALE:-}}"

[[ -n "$max_input" ]] || usage

normalize_scale() {
  local v="$1"
  v="${v%\%}"
  if ! [[ "$v" =~ ^[0-9]+([.][0-9]+)?$ ]]; then
    return 1
  fi
  awk -v v="$v" 'BEGIN{ if (v>1) v=v/100; if (v<=0 || v>1) exit 1; printf "%.6f", v }'
}

max_scale=$(normalize_scale "$max_input") || {
  echo "Invalid max_scale. Use 0-1 or 0-100 (e.g., 0.70 or 70)." >&2
  exit 1
}

min_scale=""
if [[ -n "$min_input" ]]; then
  min_scale=$(normalize_scale "$min_input") || {
    echo "Invalid min_scale. Use 0-1 or 0-100 (e.g., 0.40 or 40)." >&2
    exit 1
  }
  awk -v min="$min_scale" -v max="$max_scale" 'BEGIN{ exit !(min<=max) }' || {
    echo "min_scale must be <= max_scale." >&2
    exit 1
  }
fi

if [[ $EUID -ne 0 ]]; then
  exec sudo FEATURE_CPU_MAX_SCALE="$max_scale" FEATURE_CPU_MIN_SCALE="$min_scale" "$0"
fi

command -v perl >/dev/null 2>&1 || { echo "perl not found in PATH." >&2; exit 1; }

export FEATURE_CPU_MAX_SCALE="$max_scale"
if [[ -n "$min_scale" ]]; then
  export FEATURE_CPU_MIN_SCALE="$min_scale"
fi

driver=""
if [[ -f /sys/devices/system/cpu/cpufreq/policy0/scaling_driver ]]; then
  driver=$(< /sys/devices/system/cpu/cpufreq/policy0/scaling_driver)
fi

if [[ "$driver" == "intel_pstate" && -f /sys/devices/system/cpu/intel_pstate/max_perf_pct ]]; then
  max_pct=$(awk -v s="$FEATURE_CPU_MAX_SCALE" 'BEGIN{printf "%d", (s*100)+0.5}')
  if ((max_pct < 1)); then max_pct=1; fi
  if ((max_pct > 100)); then max_pct=100; fi
  echo "$max_pct" > /sys/devices/system/cpu/intel_pstate/max_perf_pct

  if [[ -n "${FEATURE_CPU_MIN_SCALE:-}" && -f /sys/devices/system/cpu/intel_pstate/min_perf_pct ]]; then
    min_pct=$(awk -v s="$FEATURE_CPU_MIN_SCALE" 'BEGIN{printf "%d", (s*100)+0.5}')
    if ((min_pct < 0)); then min_pct=0; fi
    if ((min_pct > max_pct)); then min_pct=$max_pct; fi
    echo "$min_pct" > /sys/devices/system/cpu/intel_pstate/min_perf_pct
    echo "intel_pstate min_perf_pct set to ${min_pct}%."
  fi

  echo "intel_pstate max_perf_pct set to ${max_pct}%."
  exit 0
fi

cpufreq_dirs=()
for x in /sys/devices/system/cpu/*/cpufreq/; do
  [[ -f "$x/cpuinfo_max_freq" ]] || continue
  cpufreq_dirs+=("$x")
done

if [[ ${#cpufreq_dirs[@]} -eq 0 ]]; then
  echo "No cpufreq entries found." >&2
  exit 1
fi

for x in "${cpufreq_dirs[@]}"; do
  [[ -f "$x/scaling_max_freq" ]] || continue
  perl -pe "s/\\b(\\d+\\.)?\\d+\\b/int(\\$&*$FEATURE_CPU_MAX_SCALE)/ge" \
    "$x/cpuinfo_max_freq" | tee "$x/scaling_max_freq" >/dev/null
done

if [[ -n "${FEATURE_CPU_MIN_SCALE:-}" ]]; then
  for x in "${cpufreq_dirs[@]}"; do
    [[ -f "$x/scaling_min_freq" ]] || continue
    perl -pe "s/\\b(\\d+\\.)?\\d+\\b/int(\\$&*$FEATURE_CPU_MIN_SCALE)/ge" \
      "$x/cpuinfo_max_freq" | tee "$x/scaling_min_freq" >/dev/null
  done
  echo "scaling_min_freq set to ${FEATURE_CPU_MIN_SCALE}x cpuinfo_max_freq."
fi

echo "scaling_max_freq set to ${FEATURE_CPU_MAX_SCALE}x cpuinfo_max_freq."

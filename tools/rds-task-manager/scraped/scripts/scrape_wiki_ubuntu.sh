#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

PYTHON_BIN="${PYTHON_BIN:-${ROOT_DIR}/.venv/bin/python}"
SCRAPER="${SCRIPT_DIR}/scrape_robokit_wiki.py"

START_URL="${START_URL:-https://seer-group.feishu.cn/wiki/EvOMwPyJZiQIbmkLvCTct64Qnrb}"
OUT_DIR="${OUT_DIR:-${ROOT_DIR}/scraped/wiki_all}"
OUTPUT_FORMAT="${OUTPUT_FORMAT:-html}"
WORKERS="${WORKERS:-3}"
MAX_PAGES="${MAX_PAGES:-0}"
CONTENT_WAIT_MS="${CONTENT_WAIT_MS:-15000}"
LINK_WAIT_MS="${LINK_WAIT_MS:-15000}"
TIMEOUT_MS="${TIMEOUT_MS:-45000}"

CDP_PORT="${CDP_PORT:-9222}"
CDP_URL="http://127.0.0.1:${CDP_PORT}"
AUTO_START_CHROME=1
KEEP_CHROME=0
RESUME=1
FORCE=0
CHROME_BIN="${CHROME_BIN:-}"
CHROME_PID=""
STARTED_CHROME=0

usage() {
  cat <<EOF
Usage: $(basename "$0") [options]

Options:
  --start-url URL         Start URL (default: ${START_URL})
  --out-dir DIR           Output directory (default: ${OUT_DIR})
  --output-format FMT     html | md | both (default: ${OUTPUT_FORMAT})
  --workers N             Parallel workers (default: ${WORKERS})
  --max-pages N           Max pages, 0 = unlimited (default: ${MAX_PAGES})
  --content-wait-ms N     Wait for content load (default: ${CONTENT_WAIT_MS})
  --link-wait-ms N        Wait for link load (default: ${LINK_WAIT_MS})
  --timeout-ms N          Page timeout (default: ${TIMEOUT_MS})
  --force                 Delete output before scraping
  --resume                Resume (default)
  --no-resume             Disable resume
  --port N                CDP port (default: ${CDP_PORT})
  --chrome-path PATH      Chrome/Chromium binary path
  --no-start-chrome       Do not auto-start Chrome
  --keep-chrome           Keep auto-started Chrome running
  -h, --help              Show help

Environment overrides:
  PYTHON_BIN, START_URL, OUT_DIR, OUTPUT_FORMAT, WORKERS, MAX_PAGES,
  CONTENT_WAIT_MS, LINK_WAIT_MS, TIMEOUT_MS, CDP_PORT, CHROME_BIN
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --start-url) START_URL="$2"; shift 2 ;;
    --out-dir) OUT_DIR="$2"; shift 2 ;;
    --output-format) OUTPUT_FORMAT="$2"; shift 2 ;;
    --workers) WORKERS="$2"; shift 2 ;;
    --max-pages) MAX_PAGES="$2"; shift 2 ;;
    --content-wait-ms) CONTENT_WAIT_MS="$2"; shift 2 ;;
    --link-wait-ms) LINK_WAIT_MS="$2"; shift 2 ;;
    --timeout-ms) TIMEOUT_MS="$2"; shift 2 ;;
    --force) FORCE=1; RESUME=0; shift ;;
    --resume) RESUME=1; shift ;;
    --no-resume) RESUME=0; shift ;;
    --port) CDP_PORT="$2"; CDP_URL="http://127.0.0.1:${CDP_PORT}"; shift 2 ;;
    --chrome-path) CHROME_BIN="$2"; shift 2 ;;
    --no-start-chrome) AUTO_START_CHROME=0; shift ;;
    --keep-chrome) KEEP_CHROME=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 2 ;;
  esac
done

if [[ ! -f "${SCRAPER}" ]]; then
  echo "Scraper not found: ${SCRAPER}" >&2
  exit 1
fi

if [[ ! -x "${PYTHON_BIN}" ]]; then
  if command -v python3 >/dev/null 2>&1; then
    PYTHON_BIN="$(command -v python3)"
  else
    echo "Python not found. Set PYTHON_BIN or install python3." >&2
    exit 1
  fi
fi

if [[ ${FORCE} -eq 1 && ${RESUME} -eq 1 ]]; then
  echo "Use either --force or --resume, not both." >&2
  exit 2
fi

cdp_ready() {
  if command -v curl >/dev/null 2>&1; then
    curl -fsS "${CDP_URL}/json/version" >/dev/null 2>&1
  elif command -v wget >/dev/null 2>&1; then
    wget -qO- "${CDP_URL}/json/version" >/dev/null 2>&1
  else
    return 1
  fi
}

cleanup() {
  if [[ ${STARTED_CHROME} -eq 1 && ${KEEP_CHROME} -eq 0 && -n "${CHROME_PID}" ]]; then
    kill "${CHROME_PID}" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

if ! cdp_ready; then
  if [[ ${AUTO_START_CHROME} -eq 0 ]]; then
    echo "CDP port not available at ${CDP_URL}." >&2
    echo "Start Chrome with --remote-debugging-port=${CDP_PORT} or omit --no-start-chrome." >&2
    exit 1
  fi

  if [[ -z "${CHROME_BIN}" ]]; then
    if command -v google-chrome >/dev/null 2>&1; then
      CHROME_BIN="$(command -v google-chrome)"
    elif command -v chromium >/dev/null 2>&1; then
      CHROME_BIN="$(command -v chromium)"
    elif command -v chromium-browser >/dev/null 2>&1; then
      CHROME_BIN="$(command -v chromium-browser)"
    else
      echo "Chrome/Chromium not found. Install it or pass --chrome-path." >&2
      exit 1
    fi
  fi

  CHROME_PROFILE_DIR="$(mktemp -d /tmp/chrome-cdp-XXXXXX)"
  CHROME_LOG="${CHROME_PROFILE_DIR}/chrome.log"
  "${CHROME_BIN}" \
    --remote-debugging-port="${CDP_PORT}" \
    --user-data-dir="${CHROME_PROFILE_DIR}" \
    --no-first-run \
    --no-default-browser-check \
    >"${CHROME_LOG}" 2>&1 &
  CHROME_PID="$!"
  STARTED_CHROME=1

  for _ in $(seq 1 30); do
    if cdp_ready; then
      break
    fi
    sleep 1
  done

  if ! cdp_ready; then
    echo "Failed to start Chrome with CDP on ${CDP_URL}." >&2
    echo "Check ${CHROME_LOG} for details." >&2
    exit 1
  fi
fi

CMD=(
  "${PYTHON_BIN}" "${SCRAPER}"
  --connect-cdp "${CDP_URL}"
  --start-url "${START_URL}"
  --out-dir "${OUT_DIR}"
  --output-format "${OUTPUT_FORMAT}"
  --workers "${WORKERS}"
  --max-pages "${MAX_PAGES}"
  --content-wait-ms "${CONTENT_WAIT_MS}"
  --link-wait-ms "${LINK_WAIT_MS}"
  --timeout-ms "${TIMEOUT_MS}"
)

if [[ ${RESUME} -eq 1 ]]; then
  CMD+=(--resume)
fi
if [[ ${FORCE} -eq 1 ]]; then
  CMD+=(--force)
fi

echo "Running scraper..."
echo "  start-url: ${START_URL}"
echo "  out-dir:   ${OUT_DIR}"
echo "  format:    ${OUTPUT_FORMAT}"
echo "  workers:   ${WORKERS}"
echo "  max-pages: ${MAX_PAGES}"
echo "  cdp-url:   ${CDP_URL}"

"${CMD[@]}"

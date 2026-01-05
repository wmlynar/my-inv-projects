Scraping Feishu Wiki (HTML + assets)
====================================

This document describes how the scraper works, how to run it safely, and how to
avoid the most common failures when scraping Feishu wiki pages.

Quick summary
-------------
- Script: `scraped/scripts/scrape_robokit_wiki.py`
- Primary output (HTML mode): `OUT/pages/*.html` + `OUT/assets/*` + `OUT/manifest.json`
- Recommended mode: run Chrome with CDP + `--resume` + moderate workers (3)
- Example output we already collected: `/home/inovatica/seal/rds/scraped/wiki_all`

How the scraper works
---------------------
1) Starts at `--start-url` (default: Robokit API entry page).
2) Loads the page in Playwright, extracts the main content block, and saves it.
3) Collects wiki links (`https://.../wiki/<token>`) from the page content.
4) Enqueues those links and repeats until the queue is exhausted or `--max-pages`
   or `--max-depth` is reached.
5) Writes `manifest.json` with the list of saved pages and metadata.

In HTML mode, it also:
- Downloads image assets and rewrites `<img src=...>` to local relative paths.
- Stores assets in `OUT/assets` and pages in `OUT/pages` (or `OUT/html` if
  `--output-format both` is used).

Requirements
------------
- Python 3 with Playwright installed.
- A Chromium/Chrome instance available (either Playwright-managed or external).
- Network access to the Feishu wiki domain.

If you use HTML-only output, no markdown libraries are required.
If you use MD output, install one of:
- `markdownify` or
- `html2text`

Launching Chrome with CDP
-------------------------
We connect to an already running Chrome using CDP (remote debugging port).
This is more reliable in restricted environments and avoids browser downloads.

Recommended (separate profile):
```
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-cdp \
  --no-first-run --no-default-browser-check
```

Chromium:
```
chromium --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-cdp \
  --no-first-run --no-default-browser-check
```

Check the port:
```
curl http://127.0.0.1:9222/json/version
```

Running the scraper
-------------------
HTML-only (recommended for AI scanning):
```
/home/inovatica/seal/rds/.venv/bin/python /home/inovatica/seal/rds/scraped/scripts/scrape_robokit_wiki.py \
  --connect-cdp http://127.0.0.1:9222 \
  --start-url https://seer-group.feishu.cn/wiki/EvOMwPyJZiQIbmkLvCTct64Qnrb \
  --out-dir /home/inovatica/seal/rds/scraped/wiki_all \
  --output-format html \
  --workers 3 \
  --max-pages 0 \
  --resume \
  --content-wait-ms 15000 \
  --link-wait-ms 15000
```

MD-only:
```
... scraped/scripts/scrape_robokit_wiki.py --output-format md
```

HTML+MD:
```
... scraped/scripts/scrape_robokit_wiki.py --output-format both
```

Ubuntu helper script
--------------------
There is a ready-to-run Ubuntu shell script that starts Chrome (if needed)
and runs the scraper with sensible defaults:
```
scraped/scripts/scrape_wiki_ubuntu.sh --resume
```

Full re-download with the script:
```
scraped/scripts/scrape_wiki_ubuntu.sh --force
```

You can override options via flags or environment variables:
```
START_URL=... OUT_DIR=... scraped/scripts/scrape_wiki_ubuntu.sh --workers 2
```

JavaScript comparison version
-----------------------------
For comparison only (primary version stays in Python):
- Script: `scraped/scripts/scrape_wiki_node.js`
- Requires: `npm install playwright`
- HTML-only output

Example:
```
node scraped/scripts/scrape_wiki_node.js \
  --connect-cdp http://127.0.0.1:9222 \
  --start-url https://seer-group.feishu.cn/wiki/EvOMwPyJZiQIbmkLvCTct64Qnrb \
  --out-dir /home/inovatica/seal/rds/scraped/wiki_all \
  --output-format html \
  --resume
```

Full re-download (manual, no AI)
--------------------------------
Use these steps if a human wants to re-download everything from scratch.

1) Start Chrome/Chromium with CDP:
```
google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-cdp \
  --no-first-run --no-default-browser-check
```
2) Verify the port:
```
curl http://127.0.0.1:9222/json/version
```
3) Choose output directory. If you want a clean re-download, either:
   - rename old output, or
   - use `--force` to delete old output.

Example full re-download:
```
/home/inovatica/seal/rds/.venv/bin/python /home/inovatica/seal/rds/scraped/scripts/scrape_robokit_wiki.py \
  --connect-cdp http://127.0.0.1:9222 \
  --start-url https://seer-group.feishu.cn/wiki/EvOMwPyJZiQIbmkLvCTct64Qnrb \
  --out-dir /home/inovatica/seal/rds/scraped/wiki_all \
  --output-format html \
  --workers 3 \
  --max-pages 0 \
  --force \
  --content-wait-ms 15000 \
  --link-wait-ms 15000
```

Manual error recovery (common fixes)
------------------------------------
- CDP connection fails (EPERM / connection refused):
  - Make sure Chrome is running with `--remote-debugging-port=9222`.
  - Verify the port with `curl http://127.0.0.1:9222/json/version`.
  - Close other Chrome instances or use a separate `--user-data-dir`.
  - If running in a restricted environment, re-run with elevated permissions.

- Pages are empty or missing content:
  - Increase `--content-wait-ms` and `--min-text-len`.
  - Switch `--wait-until load` and reduce workers (2-3).
  - Re-run with `--resume` after adjusting parameters.

- Assets are not downloaded:
  - Run `--rewrite-assets` to reprocess existing HTML:
    ```
    ... scraped/scripts/scrape_robokit_wiki.py --output-format html --rewrite-assets
    ```
  - Confirm the page renders in Chrome without login.

- Network timeouts / ERR_NETWORK_CHANGED:
  - Re-run with `--resume`.
  - Reduce `--workers` and increase `--timeout-ms`.

- Missing Playwright browsers (if not using CDP):
  - Install: `python -m playwright install chromium`

Key flags and what they do
--------------------------
- `--start-url`: entry point for crawling.
- `--out-dir`: where all outputs go (pages, assets, manifest).
- `--output-format`: `html`, `md`, or `both`.
- `--assets-dir`: assets directory (default: `assets` under out-dir).
- `--resume`: keep existing files and fetch only missing pages.
- `--force`: remove existing output first.
- `--workers`: number of parallel workers (3 is safe and fast).
- `--max-pages`: 0 = unlimited.
- `--max-depth`: how far the crawler may traverse from the start page.
- `--wait-until`: Playwright wait strategy (`domcontentloaded`, `load`, `networkidle`).
- `--content-wait-ms`: wait for enough text to appear before extracting.
- `--min-text-len`: minimum text length to treat page as loaded.
- `--max-retries` / `--retry-sleep`: retry policy for flaky loads.
- `--connect-cdp`: connect to Chrome over CDP (recommended).

Output structure
----------------
```
OUT/
  pages/           # HTML or MD pages (depending on output-format)
  assets/          # images and other downloaded assets
  html/            # only when output-format is "both"
  manifest.json    # list of all collected pages
```

The manifest entries include:
- `url`, `title`, `token`, `index`, `file`
- When using both formats: `md_file` and `html_file`

Rewriting assets without re-scraping
------------------------------------
If HTML already exists but images are still remote, you can rewrite them:
```
... scraped/scripts/scrape_robokit_wiki.py \
  --connect-cdp http://127.0.0.1:9222 \
  --output-format html \
  --out-dir /home/inovatica/seal/rds/scraped/wiki_all \
  --rewrite-assets
```

Problems we saw and how they were fixed
---------------------------------------
1) CDP connect blocked or failing.
   - Cause: restricted sandbox permissions.
   - Fix: run with escalation at the very beginning of the scrape so CDP access
     is allowed for the entire run.

2) Page content not fully loaded.
   - Cause: dynamic content; content was empty when scraped.
   - Fix: wait for links and minimum text length (`--content-wait-ms`,
     `--min-text-len`), then add a small sleep.

3) Assets not downloaded.
   - Cause: HTML attributes contained `&amp;` and were not unescaped; regex
     patterns were over-escaped and did not match.
   - Fix: unescape attribute values when parsing, and correct regex patterns
     for `<img>` tags and `src` replacements.

4) Asset paths wrong when writing HTML.
   - Cause: relative paths computed from the wrong base directory.
   - Fix: compute relative asset paths from the actual HTML directory.

5) Partial runs with timeouts.
   - Cause: occasional network hiccups or slow responses.
   - Fix: `--resume` allows incremental progress without re-downloading
     already-saved pages.

Generic guidance to avoid problems
----------------------------------
- Use `--resume` by default. It is the simplest and safest way to recover from
  partial runs or timeouts.
- Keep workers moderate (2-4). Too many concurrent tabs increases failures.
- Prefer CDP with a stable Chrome profile. It avoids Playwright browser installs
  and is consistent across runs.
- Increase `--content-wait-ms` and `--min-text-len` if you see empty pages.
- Use `--max-pages 0` for full crawls, and only limit pages during debugging.
- Always keep `manifest.json`. It is the authoritative list of what was saved.
- If the wiki mixes multiple documentations, add a filter (by token prefix,
  by breadcrumb, or by a whitelist) to avoid crawling unrelated trees.

Notes about scope control
-------------------------
By default, the crawler follows any `/wiki/<token>` link it finds. This can pull
in multiple doc trees (e.g., Robokit + RDSCore). If you want only one subtree,
add a filter or run from a subtree start URL and enforce a whitelist. If needed,
we can add that filter to the script.

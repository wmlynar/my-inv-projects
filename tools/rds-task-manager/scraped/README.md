# Scraped Wiki Data

This directory contains a full scrape of the Feishu wiki and the tooling used
to collect it.

Structure
---------
- `wiki_all/` - all downloaded pages, assets, and manifest
  - `pages/` - HTML (or MD) files saved by the scraper
  - `assets/` - downloaded images referenced by pages
  - `manifest.json` - index of all saved pages and metadata
- `scripts/` - scraping + map tooling scripts
- `wiki_topics.md` - topic index with links to wiki pages
- `fleet_manager_requirements.md` - fleet manager design notes
- `nowy_styl_map_summary.md` - summary report for the Nowy Styl map
- `graph.json` - generated nodes/edges for the Nowy Styl map
- `workflow.json5` - MVP stream definition JSON5 for the Nowy Styl map

Nowy Styl MVP process (current)
-------------------------------
- Single stream: pallets appear on PICK (sensor occupancy) and are placed into
  DROP groups in order; a slot is available only if preceding slots are empty
  (free path).
- Group order in `workflow.json5` must match the physical access order.
- Config lives in `workflow.json5` (streams + drop_group_order).

Common entry points
-------------------
- Python scraper: `scripts/scrape_robokit_wiki.py`
- Ubuntu helper: `scripts/scrape_wiki_ubuntu.sh`
- JS comparison: `scripts/scrape_wiki_node.js`
- Map summary: `scripts/summarize_smap.js`
- Map artifacts: `scripts/generate_map_artifacts.js`

Example commands
----------------
Python (HTML, resume):
```
/home/inovatica/seal/rds/.venv/bin/python /home/inovatica/seal/rds/scraped/scripts/scrape_robokit_wiki.py \
  --connect-cdp http://127.0.0.1:9222 \
  --start-url https://seer-group.feishu.cn/wiki/EvOMwPyJZiQIbmkLvCTct64Qnrb \
  --out-dir /home/inovatica/seal/rds/scraped/wiki_all \
  --output-format html \
  --workers 3 \
  --max-pages 0 \
  --resume
```

Ubuntu helper:
```
scraped/scripts/scrape_wiki_ubuntu.sh --resume
```

JS comparison:
```
node scraped/scripts/scrape_wiki_node.js \
  --connect-cdp http://127.0.0.1:9222 \
  --start-url https://seer-group.feishu.cn/wiki/EvOMwPyJZiQIbmkLvCTct64Qnrb \
  --out-dir /home/inovatica/seal/rds/scraped/wiki_all \
  --output-format html \
  --resume
```

Map summary (Markdown + optional JSON):
```
node scraped/scripts/summarize_smap.js /path/to/map.smap \
  --out /path/to/summary.md \
  --json /path/to/summary.json
```

Map artifacts (graph + workflow template):
```
node scraped/scripts/generate_map_artifacts.js /path/to/map.smap \
  --graph /path/to/graph.json \
  --workflow /path/to/workflow.json5
```

Notes
-----
- The primary supported implementation is the Python scraper.
- The JS version is for comparison only.
- The merged HTML files are generated from `wiki_all/pages` and keep image links
  relative to `wiki_all/assets`.

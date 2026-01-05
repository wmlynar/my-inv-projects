# Data Generation

## Map artifacts (graph + workflow)

Script: `scraped/scripts/generate_map_artifacts.js`

Usage:

```bash
node /home/inovatica/seal/rds/scraped/scripts/generate_map_artifacts.js \\
  /home/inovatica/seal/rds/nowy-styl-map/<map>.smap \\
  --graph /home/inovatica/seal/rds/scraped/graph.json \\
  --workflow /home/inovatica/seal/rds/scraped/workflow.json5
```

The script generates:
- `graph.json` (nodes, edges, lines, areas)
- `workflow.json5` (bin locations, groups, streams)

## UI data sync

If you update `scraped/graph.json` or `scraped/workflow.json5`,
copy them to:
- `fleet-manager/public/data/graph.json`
- `fleet-manager/public/data/workflow.json5`

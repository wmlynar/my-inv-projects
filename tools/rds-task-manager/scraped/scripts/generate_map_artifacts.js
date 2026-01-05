#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

function propValue(prop) {
  if (Object.prototype.hasOwnProperty.call(prop, "boolValue")) {
    return prop.boolValue;
  }
  if (Object.prototype.hasOwnProperty.call(prop, "int32Value")) {
    return prop.int32Value;
  }
  if (Object.prototype.hasOwnProperty.call(prop, "doubleValue")) {
    return prop.doubleValue;
  }
  if (Object.prototype.hasOwnProperty.call(prop, "stringValue")) {
    return prop.stringValue;
  }
  if (Object.prototype.hasOwnProperty.call(prop, "value")) {
    return prop.value;
  }
  return null;
}

function propsMap(props) {
  const out = {};
  for (const prop of props || []) {
    const key = prop.key;
    if (!key) {
      continue;
    }
    out[key] = propValue(prop);
  }
  return out;
}

function loadMap(mapPath) {
  const text = fs.readFileSync(mapPath, "utf8");
  return JSON.parse(text);
}

function buildGraph(data, mapPath) {
  const header = data.header || {};
  const nodes = [];
  const edges = [];
  const lines = [];
  const areas = [];

  for (const p of data.advancedPointList || []) {
    nodes.push({
      id: p.instanceName,
      className: p.className,
      pos: p.pos,
      ignoreDir: p.ignoreDir,
      props: propsMap(p.property),
    });
  }

  for (const c of data.advancedCurveList || []) {
    const start = c.startPos || {};
    const end = c.endPos || {};
    edges.push({
      id: c.instanceName,
      className: c.className,
      start: start.instanceName,
      end: end.instanceName,
      startPos: start.pos,
      endPos: end.pos,
      controlPos1: c.controlPos1,
      controlPos2: c.controlPos2,
      props: propsMap(c.property),
    });
  }

  for (const l of data.advancedLineList || []) {
    const line = l.line || {};
    lines.push({
      id: l.instanceName,
      className: l.className,
      startPos: line.startPos,
      endPos: line.endPos,
      props: propsMap(l.property),
    });
  }

  for (const a of data.advancedAreaList || []) {
    areas.push({
      id: a.instanceName,
      className: a.className,
      dir: a.dir,
      posGroup: a.posGroup,
      props: propsMap(a.property),
      attribute: a.attribute,
    });
  }

  return {
    meta: {
      source: mapPath,
      mapType: header.mapType,
      mapName: header.mapName,
      version: header.version,
      resolution: header.resolution,
      bounds: { min: header.minPos, max: header.maxPos },
    },
    nodes,
    edges,
    lines,
    areas,
  };
}

function buildWorkflowTemplate(data, mapPath) {
  const header = data.header || {};
  const bins = [];
  for (const entry of data.binLocationsList || []) {
    bins.push(...(entry.binLocationList || []));
  }

  const groups = {};
  const binLocations = {};
  const groupBins = {};
  for (const b of bins) {
    const group = b.groupName || "UNKNOWN";
    if (!groupBins[group]) {
      groupBins[group] = [];
    }
    groupBins[group].push(b);
    binLocations[b.instanceName] = {
      group,
      point: b.pointName,
      pos: b.pos,
    };
  }
  for (const [group, items] of Object.entries(groupBins)) {
    const sorted = items.slice().sort((a, b) => {
      const aName = a.instanceName || "";
      const bName = b.instanceName || "";
      return aName.localeCompare(bName);
    });
    groups[group] = sorted.map((item) => item.pointName);
  }

  const actionPoints = [];
  for (const p of data.advancedPointList || []) {
    if (p.className !== "ActionPoint") {
      continue;
    }
    actionPoints.push({
      id: p.instanceName,
      pos: p.pos,
      props: propsMap(p.property),
    });
  }
  actionPoints.sort((a, b) => a.id.localeCompare(b.id));

  const groupNames = Object.keys(groups).sort();
  const pickGroup = groupNames.find((name) => name.includes("PICK")) || null;
  const dropGroups = groupNames.filter((name) => name.includes("DROP"));

  return {
    map: {
      name: header.mapName,
      version: header.version,
      source: mapPath,
    },
    groups,
    bin_locations: binLocations,
    action_points: actionPoints,
    occupancy: {
      source: "sensor",
      pick_groups: pickGroup ? [pickGroup] : [],
      drop_groups: dropGroups,
    },
    streams: [
      {
        id: "stream_1",
        pick_group: pickGroup,
        drop_group_order: dropGroups,
        notes:
          "Single stream: pick from occupied pick_group, drop to first available slot with preceding slots empty.",
        pick_policy: {
          selection: "occupied_only",
        },
        drop_policy: {
          selection: "first_available_in_order",
          access_rule: "preceding_empty",
          commit_distance_m: 8,
        },
      },
    ],
    buffer_group: "BUFFER",
    thresholds: {
      heartbeat_timeout_s: 5,
      no_progress_timeout_s: 20,
      blocked_retry_limit: 3,
      charge_target_pct: 85,
      commit_distance_m: 8,
    },
  };
}

function parseArgs(argv) {
  const args = {
    mapPath: null,
    graphOut: null,
    workflowOut: null,
  };
  const rest = argv.slice(2);
  if (!rest.length) {
    return args;
  }
  args.mapPath = rest[0];
  for (let i = 1; i < rest.length; i += 1) {
    const flag = rest[i];
    const value = rest[i + 1];
    if (flag === "--graph") {
      args.graphOut = value;
      i += 1;
    } else if (flag === "--workflow") {
      args.workflowOut = value;
      i += 1;
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.mapPath) {
    console.error(
      "Usage: generate_map_artifacts.js <map_path> [--graph file] [--workflow file]"
    );
    process.exit(1);
  }

  if (!fs.existsSync(args.mapPath)) {
    console.error(`Map not found: ${args.mapPath}`);
    process.exit(1);
  }

  const data = loadMap(args.mapPath);
  const graph = buildGraph(data, args.mapPath);
  const workflow = buildWorkflowTemplate(data, args.mapPath);

  const defaultBase = path.join(
    path.dirname(args.mapPath),
    path.basename(args.mapPath, ".smap")
  );
  const graphOut = args.graphOut || `${defaultBase}_graph.json`;
  const workflowOut = args.workflowOut || `${defaultBase}_workflow.json5`;

  fs.writeFileSync(graphOut, JSON.stringify(graph, null, 2));
  fs.writeFileSync(workflowOut, JSON.stringify(workflow, null, 2));

  console.log(`Wrote ${graphOut}`);
  console.log(`Wrote ${workflowOut}`);
}

if (require.main === module) {
  main();
}

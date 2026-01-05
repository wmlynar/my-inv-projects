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

function countByClass(items) {
  const counts = {};
  for (const item of items || []) {
    const name = item && item.className;
    if (!name) {
      continue;
    }
    counts[name] = (counts[name] || 0) + 1;
  }
  return counts;
}

function loadMap(mapPath) {
  const text = fs.readFileSync(mapPath, "utf8");
  return JSON.parse(text);
}

function summarize(mapPath, data) {
  const header = data.header || {};
  const minPos = header.minPos || {};
  const maxPos = header.maxPos || {};
  const width = (maxPos.x || 0) - (minPos.x || 0);
  const height = (maxPos.y || 0) - (minPos.y || 0);

  const points = data.advancedPointList || [];
  const lines = data.advancedLineList || [];
  const curves = data.advancedCurveList || [];
  const areas = data.advancedAreaList || [];

  const curveProps = {
    direction: [],
    movestyle: [],
    width: [],
    maxspeed: [],
    loadMaxSpeed: [],
    forbiddenRotAngle: [],
  };

  for (const curve of curves) {
    for (const prop of curve.property || []) {
      const key = prop.key;
      if (!key || !(key in curveProps)) {
        continue;
      }
      curveProps[key].push(propValue(prop));
    }
  }

  const directionCounts = {};
  for (const value of curveProps.direction || []) {
    if (value === null || value === undefined) {
      continue;
    }
    directionCounts[String(value)] = (directionCounts[String(value)] || 0) + 1;
  }

  const bins = [];
  for (const entry of data.binLocationsList || []) {
    bins.push(...(entry.binLocationList || []));
  }

  const binsByGroup = {};
  for (const b of bins) {
    const group = b.groupName || "UNKNOWN";
    if (!binsByGroup[group]) {
      binsByGroup[group] = [];
    }
    binsByGroup[group].push(b);
  }
  const sortedGroupNames = Object.keys(binsByGroup).sort();
  const binGroupsSorted = {};
  for (const group of sortedGroupNames) {
    binGroupsSorted[group] = binsByGroup[group].slice().sort((a, b) => {
      const aName = a.instanceName || "";
      const bName = b.instanceName || "";
      return aName.localeCompare(bName);
    });
  }

  const actionPoints = [];
  const locationMarks = [];
  const chargePoints = [];
  const parkPoints = [];
  for (const p of points) {
    const item = {
      instanceName: p.instanceName,
      className: p.className,
      pos: p.pos,
      props: propsMap(p.property),
      ignoreDir: p.ignoreDir,
    };
    if (item.className === "ActionPoint") {
      actionPoints.push(item);
    } else if (item.className === "LocationMark") {
      locationMarks.push(item);
    } else if (item.className === "ChargePoint") {
      chargePoints.push(item);
    } else if (item.className === "ParkPoint") {
      parkPoints.push(item);
    }
  }
  const sortByName = (a, b) => (a.instanceName || "").localeCompare(b.instanceName || "");
  actionPoints.sort(sortByName);
  locationMarks.sort(sortByName);
  chargePoints.sort(sortByName);
  parkPoints.sort(sortByName);

  const nodesFromCurves = new Set();
  const curveEdges = [];
  for (const curve of curves) {
    const start = curve.startPos || {};
    const end = curve.endPos || {};
    const edge = {
      instanceName: curve.instanceName,
      className: curve.className,
      start: start.instanceName,
      end: end.instanceName,
      startPos: start.pos,
      endPos: end.pos,
      controlPos1: curve.controlPos1,
      controlPos2: curve.controlPos2,
      props: propsMap(curve.property),
    };
    if (edge.start) {
      nodesFromCurves.add(edge.start);
    }
    if (edge.end) {
      nodesFromCurves.add(edge.end);
    }
    curveEdges.push(edge);
  }

  const lineSegments = [];
  for (const line of lines) {
    const segment = line.line || {};
    lineSegments.push({
      instanceName: line.instanceName,
      className: line.className,
      startPos: segment.startPos,
      endPos: segment.endPos,
      props: propsMap(line.property),
    });
  }

  const areaList = [];
  for (const area of areas) {
    areaList.push({
      instanceName: area.instanceName,
      className: area.className,
      dir: area.dir,
      posGroup: area.posGroup,
      props: propsMap(area.property),
      attribute: area.attribute,
    });
  }

  const binPointNames = bins.map((b) => b.pointName);
  const actionNames = new Set(actionPoints.map((p) => p.instanceName));
  const missingActionPoints = binPointNames.filter((name) => !actionNames.has(name));

  return {
    source: mapPath,
    header,
    bounds: {
      min: minPos,
      max: maxPos,
      size_m: { width, height },
    },
    counts: {
      normalPosList: (data.normalPosList || []).length,
      advancedPointList: countByClass(points),
      advancedLineList: countByClass(lines),
      advancedCurveList: countByClass(curves),
      advancedAreaList: countByClass(areas),
      rssiPosList: (data.rssiPosList || []).length,
      binLocationsList: bins.length,
    },
    curve_properties: {
      direction: directionCounts,
      movestyle: curveProps.movestyle,
      width: curveProps.width,
      maxspeed: curveProps.maxspeed,
      loadMaxSpeed: curveProps.loadMaxSpeed,
      forbiddenRotAngle: curveProps.forbiddenRotAngle,
    },
    nodes_from_curves: Array.from(nodesFromCurves).sort(),
    action_points: actionPoints,
    location_marks: locationMarks,
    charge_points: chargePoints,
    park_points: parkPoints,
    lines: lineSegments,
    curves: curveEdges,
    areas: areaList,
    bin_groups: binGroupsSorted,
    validation: {
      bin_point_names_missing_action_points: missingActionPoints,
    },
  };
}

function jsonBlock(data) {
  return JSON.stringify(data, null, 2);
}

function renderMarkdown(summary) {
  const header = summary.header || {};
  const bounds = summary.bounds || {};
  const minPos = bounds.min || {};
  const maxPos = bounds.max || {};
  const size = bounds.size_m || {};

  const out = [];
  out.push("# Map summary");
  out.push("");
  out.push(`- source: \`${summary.source}\``);
  out.push(`- mapType: \`${header.mapType}\``);
  out.push(`- mapName: \`${header.mapName}\``);
  out.push(`- version: \`${header.version}\``);
  out.push(`- resolution: \`${header.resolution}\` m`);
  out.push(`- bounds: min(${minPos.x}, ${minPos.y}) max(${maxPos.x}, ${maxPos.y})`);
  out.push(`- size: ${size.width.toFixed(3)} x ${size.height.toFixed(3)} m`);
  out.push("");
  out.push("## Counts");
  out.push(jsonBlock(summary.counts));
  out.push("");
  out.push("## Nodes and edges");
  out.push(`- nodes_from_curves: ${summary.nodes_from_curves.length}`);
  out.push("```json");
  out.push(jsonBlock(summary.nodes_from_curves));
  out.push("```");
  out.push("");
  out.push("## Curve properties (raw values)");
  out.push("```json");
  out.push(jsonBlock(summary.curve_properties));
  out.push("```");
  out.push("");
  out.push("## Bin location groups (pick/drop)");
  out.push("```json");
  out.push(jsonBlock(summary.bin_groups));
  out.push("```");
  out.push("");
  out.push("## Action points");
  out.push("```json");
  out.push(jsonBlock(summary.action_points));
  out.push("```");
  out.push("");
  out.push("## Location marks");
  out.push("```json");
  out.push(jsonBlock(summary.location_marks));
  out.push("```");
  out.push("");
  if (summary.charge_points && summary.charge_points.length) {
    out.push("## Charge points");
    out.push("```json");
    out.push(jsonBlock(summary.charge_points));
    out.push("```");
    out.push("");
  }
  if (summary.park_points && summary.park_points.length) {
    out.push("## Park points");
    out.push("```json");
    out.push(jsonBlock(summary.park_points));
    out.push("```");
    out.push("");
  }
  out.push("## Lines (FeatureLine)");
  out.push("```json");
  out.push(jsonBlock(summary.lines));
  out.push("```");
  out.push("");
  out.push("## Curves (DegenerateBezier)");
  out.push("```json");
  out.push(jsonBlock(summary.curves));
  out.push("```");
  out.push("");
  out.push("## Areas");
  out.push("```json");
  out.push(jsonBlock(summary.areas));
  out.push("```");
  out.push("");
  out.push("## Validation");
  out.push("```json");
  out.push(jsonBlock(summary.validation));
  out.push("```");
  out.push("");
  out.push("## Notes");
  out.push("- binLocationList pointName values should map to ActionPoint instanceName");
  out.push("- use group names in JSON5 workflows (pick/drop selection)");
  out.push("");

  return out.join("\n");
}

function parseArgs(argv) {
  const args = {
    mapPath: null,
    out: null,
    json: null,
  };
  const rest = argv.slice(2);
  if (!rest.length) {
    return args;
  }
  args.mapPath = rest[0];
  for (let i = 1; i < rest.length; i += 1) {
    const flag = rest[i];
    const value = rest[i + 1];
    if (flag === "--out") {
      args.out = value;
      i += 1;
    } else if (flag === "--json") {
      args.json = value;
      i += 1;
    }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv);
  if (!args.mapPath) {
    console.error("Usage: summarize_smap.js <map_path> [--out file] [--json file]");
    process.exit(1);
  }

  if (!fs.existsSync(args.mapPath)) {
    console.error(`Map not found: ${args.mapPath}`);
    process.exit(1);
  }

  const data = loadMap(args.mapPath);
  const summary = summarize(args.mapPath, data);
  const md = renderMarkdown(summary);

  const outPath = args.out
    ? args.out
    : path.join(path.dirname(args.mapPath), `${path.basename(args.mapPath, ".smap")}_summary.md`);
  fs.writeFileSync(outPath, md);
  console.log(`Wrote ${outPath}`);

  if (args.json) {
    fs.writeFileSync(args.json, JSON.stringify(summary, null, 2));
    console.log(`Wrote ${args.json}`);
  }
}

if (require.main === module) {
  main();
}

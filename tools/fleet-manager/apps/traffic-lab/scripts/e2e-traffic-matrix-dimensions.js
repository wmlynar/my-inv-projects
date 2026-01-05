const assert = require("node:assert/strict");

const { buildTrafficCatalog } = require("./e2e-traffic-matrix");

const getDimensionValue = (entry, path) =>
  (path || []).reduce((acc, key) => (acc ? acc[key] : null), entry?.dimensions || null);

const runDimensionFilter = (label, options, path, expected) => {
  const catalog = buildTrafficCatalog(options);
  assert.ok(catalog.length > 0, `${label}: expected at least one strategy`);
  catalog.forEach((entry) => {
    const value = getDimensionValue(entry, path);
    assert.equal(
      value,
      expected,
      `${label}: ${entry.name} expected ${expected}, got ${value}`
    );
  });
};

runDimensionFilter(
  "route searchSpace=global",
  { routeSearchSpaces: ["global"] },
  ["routePlanner", "searchSpace"],
  "global"
);

runDimensionFilter(
  "route kinematics=kinodynamic",
  { routeKinematics: ["kinodynamic"] },
  ["routePlanner", "kinematics"],
  "kinodynamic"
);

runDimensionFilter(
  "reservation granularity=segment",
  { reservationGranularity: ["segment"] },
  ["reservation", "granularity"],
  "segment"
);

runDimensionFilter(
  "avoidance mechanism=zones",
  { avoidanceMechanisms: ["zones"] },
  ["avoidance", "mechanism"],
  "zones"
);

runDimensionFilter(
  "conflict resolution=backtracking",
  { conflictResolutionModes: ["backtracking"] },
  ["conflict", "resolution"],
  "backtracking"
);

runDimensionFilter(
  "execution control=velocity",
  { execControlModes: ["velocity"] },
  ["execution", "control"],
  "velocity"
);

console.log("E2E traffic matrix dimensions ok.");

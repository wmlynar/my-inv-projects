const fs = require("fs");
const path = require("path");

const DEFAULT_ROBOT_MODEL = { head: 0.5, tail: 2, width: 1 };

const rootDir = path.resolve(__dirname, "..");
const workflowPath = path.join(rootDir, "scenes", "traffic", "workflow.json5");
const workflow = JSON.parse(fs.readFileSync(workflowPath, "utf8"));

const ORDER_ASC = "asc";
const ORDER_DESC = "desc";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function parseWorksiteKey(id) {
  const text = String(id);
  const match = text.match(/^(.*?)(\d+)(?:\D*)$/);
  if (!match) {
    return { prefix: text, num: null };
  }
  return { prefix: match[1] || "", num: Number.parseInt(match[2], 10) };
}

function sortWorksites(list, direction) {
  const dir = direction === ORDER_DESC ? -1 : 1;
  return [...list].sort((a, b) => {
    const aKey = parseWorksiteKey(a.id);
    const bKey = parseWorksiteKey(b.id);
    if (aKey.prefix !== bKey.prefix) {
      return aKey.prefix.localeCompare(bKey.prefix) * dir;
    }
    if (aKey.num !== null && bKey.num !== null && aKey.num !== bKey.num) {
      return (aKey.num - bKey.num) * dir;
    }
    return String(a.id).localeCompare(String(b.id)) * dir;
  });
}

function buildWorksites(data) {
  const locations = data?.bin_locations || {};
  return Object.entries(locations).map(([id, item]) => {
    const kind = id.startsWith("PICK") ? "pick" : id.startsWith("DROP") ? "drop" : "worksite";
    return {
      id,
      group: item.group,
      point: item.point,
      pos: item.pos,
      kind
    };
  });
}

function getDropOrder(stream) {
  const order = stream?.drop_policy?.order;
  if (order === "asc" || order === "ascending") return ORDER_ASC;
  if (order === "desc" || order === "descending") return ORDER_DESC;
  return ORDER_DESC;
}

function getDropAccessRule(stream) {
  const rule = stream?.drop_policy?.access_rule;
  if (rule === "any_free" || rule === "first_free") return "any_free";
  return "preceding_empty";
}

function getNextPickCandidate(worksites, state, pickGroupId, order, reserved) {
  const groupSites = sortWorksites(
    worksites.filter((site) => site.group === pickGroupId),
    order
  );
  for (const site of groupSites) {
    const siteState = state[site.id] || { occupancy: "empty", blocked: false };
    if (reserved?.has(site.id)) continue;
    if (siteState.blocked) continue;
    if (siteState.occupancy === "filled") {
      return site;
    }
  }
  return null;
}

function getNextDropCandidate(worksites, state, dropGroups, order, reserved, accessRule) {
  const allowShadowed = accessRule === "any_free";
  for (const groupId of dropGroups) {
    const groupSites = sortWorksites(
      worksites.filter((site) => site.group === groupId),
      order
    );
    let blockedAhead = false;
    for (const site of groupSites) {
      const siteState = state[site.id] || { occupancy: "empty", blocked: false };
      if (siteState.blocked || siteState.occupancy === "filled" || reserved?.has(site.id)) {
        if (allowShadowed) {
          continue;
        }
        blockedAhead = true;
        break;
      }
      return { site, groupId };
    }
    if (blockedAhead) {
      continue;
    }
  }
  return null;
}

function initWorksiteState(worksites, pickFilled = true) {
  const state = {};
  worksites.forEach((site) => {
    state[site.id] = {
      occupancy: site.kind === "pick" && pickFilled ? "filled" : "empty",
      blocked: false
    };
  });
  return state;
}

function testDropOrderDescending(worksites, stream) {
  const state = initWorksiteState(worksites, false);
  const dropOrder = getDropOrder(stream);
  const accessRule = getDropAccessRule(stream);
  const candidate = getNextDropCandidate(
    worksites,
    state,
    stream.drop_group_order || [],
    dropOrder,
    new Set(),
    accessRule
  );
  assert(candidate && candidate.site.id === "DROP-A4", "Expected DROP-A4 to be first in desc order");
}

function testDropPrecedingRule(worksites) {
  const state = initWorksiteState(worksites, false);
  const dropGroups = ["DROP"];
  state["DROP-A4"].occupancy = "filled";
  const blocked = getNextDropCandidate(
    worksites,
    state,
    dropGroups,
    ORDER_DESC,
    new Set(),
    "preceding_empty"
  );
  assert(!blocked, "Expected no drop candidate when leading drop is filled");

  state["DROP-A4"].occupancy = "empty";
  const candidate = getNextDropCandidate(
    worksites,
    state,
    dropGroups,
    ORDER_DESC,
    new Set(),
    "preceding_empty"
  );
  assert(candidate && candidate.site.id === "DROP-A4", "Expected DROP-A4 when preceding empty");
}

function testPickSkipBlockedReserved(worksites, stream) {
  const state = initWorksiteState(worksites, true);
  state["PICK-A1"].blocked = true;
  const reserved = new Set(["PICK-A2"]);
  const pickCandidate = getNextPickCandidate(
    worksites,
    state,
    stream.pick_group,
    ORDER_ASC,
    reserved
  );
  assert(pickCandidate && pickCandidate.id === "PICK-A3", "Expected PICK-A3 after blocked/reserved");
}

function testDropRespectsReservations(worksites, stream) {
  const state = initWorksiteState(worksites, false);
  const reserved = new Set(["DROP-A4"]);
  const dropOrder = getDropOrder(stream);
  const accessRule = getDropAccessRule(stream);
  const candidate = getNextDropCandidate(
    worksites,
    state,
    stream.drop_group_order || [],
    dropOrder,
    reserved,
    accessRule
  );
  assert(candidate && candidate.site.id === "DROP-A3", "Expected DROP-A3 when DROP-A4 reserved");
}

function run() {
  const worksites = buildWorksites(workflow);
  const stream = workflow?.streams?.[0];
  assert(stream, "Expected workflow stream");

  const picks = worksites.filter((site) => site.kind === "pick");
  const drops = worksites.filter((site) => site.kind === "drop");
  assert(picks.length > 0, "Expected pick worksites");
  assert(drops.length > 0, "Expected drop worksites");

  testDropOrderDescending(worksites, stream);
  testDropPrecedingRule(worksites);
  testPickSkipBlockedReserved(worksites, stream);
  testDropRespectsReservations(worksites, stream);

  const worksiteState = initWorksiteState(worksites, true);

  const buildRobot = (id) => ({ id, task: null, model: { ...DEFAULT_ROBOT_MODEL } });
  const robots = [
    buildRobot("RB-01"),
    buildRobot("RB-02")
  ];

  const dropOrder = getDropOrder(stream);
  const dropRule = getDropAccessRule(stream);
  const tasks = [];
  let guard = 20;

  while (guard > 0) {
    guard -= 1;
    const available = robots.filter((robot) => !robot.task);
    if (!available.length) break;

    const reservedPicks = new Set();
    const reservedDrops = new Set();
    let assigned = 0;

    available.forEach((robot) => {
      const pickCandidate = getNextPickCandidate(
        worksites,
        worksiteState,
        stream.pick_group,
        ORDER_ASC,
        reservedPicks
      );
      const dropCandidate = getNextDropCandidate(
        worksites,
        worksiteState,
        stream.drop_group_order || [],
        dropOrder,
        reservedDrops,
        dropRule
      );
      if (!pickCandidate || !dropCandidate) return;
      reservedPicks.add(pickCandidate.id);
      reservedDrops.add(dropCandidate.site.id);
      robot.task = {
        pickId: pickCandidate.id,
        dropId: dropCandidate.site.id
      };
      tasks.push(robot.task);
      assigned += 1;
    });

    if (!assigned) break;

    robots.forEach((robot) => {
      if (!robot.task) return;
      worksiteState[robot.task.pickId].occupancy = "empty";
      worksiteState[robot.task.dropId].occupancy = "filled";
      robot.task = null;
    });

    const remainingPicks = picks.filter(
      (site) => worksiteState[site.id]?.occupancy === "filled"
    );
    if (!remainingPicks.length) break;
  }

  picks.forEach((site) => {
    assert(
      worksiteState[site.id]?.occupancy === "empty",
      `Expected ${site.id} to be emptied`
    );
  });
  drops.forEach((site) => {
    assert(
      worksiteState[site.id]?.occupancy === "filled",
      `Expected ${site.id} to be filled`
    );
  });
  assert(tasks.length === picks.length, "Expected one task per pick worksite");

  console.log("E2E workflow pick/drop ok: all pick sites moved to drop sites.");
}

run();

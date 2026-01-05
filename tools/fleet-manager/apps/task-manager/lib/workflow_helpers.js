function buildWorksites(workflow) {
  return Object.entries(workflow.bin_locations || {}).map(([id, info]) => ({
    id,
    group: info.group,
    point: info.point,
    pos: info.pos
  }));
}

function groupByGroup(worksites) {
  const groupSites = {};
  for (const site of worksites) {
    if (!groupSites[site.group]) {
      groupSites[site.group] = [];
    }
    groupSites[site.group].push(site);
  }
  return groupSites;
}

function buildDefaultWorksiteState(workflow) {
  const worksites = buildWorksites(workflow);
  const pickGroups = new Set((workflow.occupancy && workflow.occupancy.pick_groups) || []);
  const dropGroups = new Set((workflow.occupancy && workflow.occupancy.drop_groups) || []);
  const state = {};
  for (const site of worksites) {
    const inPick = pickGroups.has(site.group);
    const inDrop = dropGroups.has(site.group);
    if (inPick || inDrop) {
      state[site.id] = { filled: false, blocked: false };
    }
  }
  return state;
}

function findFallbackParkPoint(graph) {
  if (!graph || !Array.isArray(graph.nodes)) {
    return null;
  }
  const park = graph.nodes.find((node) => node.className === 'ParkPoint');
  if (park && park.id) {
    return park.id;
  }
  const charge = graph.nodes.find((node) => node.className === 'ChargePoint');
  if (charge && charge.id) {
    return charge.id;
  }
  return null;
}

module.exports = {
  buildWorksites,
  groupByGroup,
  buildDefaultWorksiteState,
  findFallbackParkPoint
};

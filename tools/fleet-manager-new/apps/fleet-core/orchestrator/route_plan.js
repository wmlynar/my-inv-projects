const { planRoute } = require('./graph');

const buildRoutePlan = (graph, startNodeId, goalNodeId, options = {}) => {
  const route = planRoute(graph, startNodeId, goalNodeId);
  if (!route) return null;

  const nodes = route.nodes || [];
  const corridors = route.corridors || [];
  const corridorSegments = [];
  const nodeRouteS = new Map();
  let cursor = 0;

  if (nodes.length) {
    nodeRouteS.set(nodes[0], 0);
  }

  corridors.forEach((corridorId, index) => {
    const corridor = graph.corridorsById.get(corridorId);
    if (!corridor) return;
    const fromNodeId = nodes[index];
    const toNodeId = nodes[index + 1];
    const dir = fromNodeId === corridor.fromNodeId ? 'A_TO_B' : 'B_TO_A';
    const lengthM = Number.isFinite(corridor.lengthM) ? corridor.lengthM : 0;
    const startRouteS = cursor;
    const endRouteS = cursor + lengthM;
    corridorSegments.push({
      corridorId,
      fromNodeId,
      toNodeId,
      dir,
      lengthM,
      startRouteS,
      endRouteS
    });
    cursor = endRouteS;
    if (toNodeId) {
      nodeRouteS.set(toNodeId, cursor);
    }
  });

  const routeId = options.routeId || `route:${options.robotId || 'robot'}:${startNodeId}->${goalNodeId}`;

  return {
    routeId,
    robotId: options.robotId || null,
    nodes,
    corridors,
    corridorSegments,
    routeLengthM: cursor,
    nodeRouteS
  };
};

module.exports = {
  buildRoutePlan
};

const selectRollingTarget = ({ routePlan, targetNodeId, holdPointRouteS }) => {
  if (!routePlan) return null;
  const holdPoint = Number.isFinite(holdPointRouteS) ? holdPointRouteS : routePlan.routeLengthM;
  const nodeRouteS = routePlan.nodeRouteS || new Map();

  const getRouteSForNode = (nodeId) => {
    if (!nodeId) return null;
    if (nodeRouteS instanceof Map) {
      return nodeRouteS.has(nodeId) ? nodeRouteS.get(nodeId) : null;
    }
    return Number.isFinite(nodeRouteS[nodeId]) ? nodeRouteS[nodeId] : null;
  };

  const targetS = getRouteSForNode(targetNodeId);
  if (targetNodeId && Number.isFinite(targetS) && targetS <= holdPoint) {
    return { targetNodeId, targetRouteS: targetS };
  }

  let bestNodeId = null;
  let bestRouteS = null;
  if (nodeRouteS instanceof Map) {
    nodeRouteS.forEach((routeS, nodeId) => {
      if (routeS <= holdPoint && (bestRouteS === null || routeS > bestRouteS)) {
        bestRouteS = routeS;
        bestNodeId = nodeId;
      }
    });
  } else {
    Object.keys(nodeRouteS || {}).forEach((nodeId) => {
      const routeS = nodeRouteS[nodeId];
      if (routeS <= holdPoint && (bestRouteS === null || routeS > bestRouteS)) {
        bestRouteS = routeS;
        bestNodeId = nodeId;
      }
    });
  }

  if (!bestNodeId) return null;
  return { targetNodeId: bestNodeId, targetRouteS: bestRouteS };
};

module.exports = {
  selectRollingTarget
};

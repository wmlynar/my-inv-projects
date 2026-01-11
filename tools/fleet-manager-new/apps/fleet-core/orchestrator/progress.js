const estimateProgress = ({ robot, routePlan, nowMs, options = {} }) => {
  const telemetryTimeoutMs = Number.isFinite(options.telemetryTimeoutMs)
    ? options.telemetryTimeoutMs
    : null;
  const now = Number.isFinite(nowMs) ? nowMs : Date.now();

  if (!robot || !routePlan) {
    return { routeS: null, reasonCode: 'NO_ROUTE' };
  }

  if (telemetryTimeoutMs && Number.isFinite(robot.lastSeenTsMs)) {
    if (now - robot.lastSeenTsMs > telemetryTimeoutMs) {
      return { routeS: null, reasonCode: 'STALE_TELEMETRY' };
    }
  }

  if (Number.isFinite(robot.routeProgress?.routeS)) {
    return { routeS: robot.routeProgress.routeS, reasonCode: 'NONE' };
  }

  if (robot.nodeId && routePlan.nodeRouteS?.has(robot.nodeId)) {
    return { routeS: routePlan.nodeRouteS.get(robot.nodeId), reasonCode: 'NONE' };
  }

  return { routeS: null, reasonCode: 'OFF_ROUTE' };
};

module.exports = {
  estimateProgress
};

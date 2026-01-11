const buildCorridorRequest = ({
  robotId,
  routePlan,
  progress,
  mapIndex,
  lockLookaheadM,
  lockLookbackM,
  targetNodeId
}) => {
  if (!routePlan || !mapIndex || !progress || !Number.isFinite(progress.routeS)) {
    return null;
  }

  const lookahead = Number.isFinite(lockLookaheadM) ? lockLookaheadM : 0;
  const lookback = Number.isFinite(lockLookbackM) ? lockLookbackM : 0;
  const routeLength = routePlan.routeLengthM || 0;
  const startS = progress.routeS;
  const endS = Math.min(routeLength, startS + lookahead);
  const windowStart = Math.max(0, startS - lookback);

  const desiredCells = [];
  const cellRouteS = {};
  const desiredCorridorDirs = [];
  const corridorDirSet = new Set();
  const occupiedCells = [];

  routePlan.corridorSegments.forEach((segment) => {
    const segmentStart = segment.startRouteS;
    const segmentEnd = segment.endRouteS;
    if (segmentEnd < windowStart || segmentStart > endS) return;

    const listKey = `${segment.corridorId}::${segment.dir}`;
    const cells = mapIndex.cellsByCorridorDir.get(listKey) || [];
    if (!cells.length) return;

    cells.forEach((cell) => {
      const cellStart = segmentStart + cell.travelS0;
      const cellEnd = segmentStart + cell.travelS1;
      if (cellEnd < windowStart || cellStart > endS) return;
      if (!cellRouteS[cell.cellId]) {
        cellRouteS[cell.cellId] = { s0: cellStart, s1: cellEnd };
        desiredCells.push(cell.cellId);
      }
      if (progress.routeS >= cellStart && progress.routeS <= cellEnd) {
        if (!occupiedCells.includes(cell.cellId)) {
          occupiedCells.push(cell.cellId);
        }
      }
    });

    if (!corridorDirSet.has(segment.corridorId)) {
      const corridor = mapIndex.corridorsById.get(segment.corridorId);
      if (corridor?.singleLane) {
        corridorDirSet.add(segment.corridorId);
        desiredCorridorDirs.push({ corridorId: segment.corridorId, dir: segment.dir });
      }
    }
  });

  const desiredNodeStopZones = [];
  if (targetNodeId && mapIndex.nodeStopZonesByNodeId.has(targetNodeId)) {
    desiredNodeStopZones.push(targetNodeId);
  }

  return {
    requestId: `${robotId}:${routePlan.routeId}`,
    robotId,
    routeId: routePlan.routeId,
    progressRouteS: progress.routeS,
    desiredCells,
    desiredCorridorDirs,
    desiredNodeStopZones,
    occupiedCells,
    cellRouteS,
    routeLengthM: routeLength
  };
};

module.exports = {
  buildCorridorRequest
};

const computeHoldPoint = ({ request, grant, stopDistanceM = 0, safetyBufferM = 0 }) => {
  if (!request || !grant) return null;
  const cellRouteS = request.cellRouteS || {};
  const grantedCells = Array.isArray(grant.grantedCells) ? grant.grantedCells : [];
  let maxS = null;
  grantedCells.forEach((cellId) => {
    const range = cellRouteS[cellId];
    if (!range) return;
    if (maxS === null || range.s1 > maxS) {
      maxS = range.s1;
    }
  });
  if (maxS === null) {
    return request.progressRouteS ?? null;
  }
  const holdPoint = maxS - stopDistanceM - safetyBufferM;
  return holdPoint;
};

module.exports = {
  computeHoldPoint
};

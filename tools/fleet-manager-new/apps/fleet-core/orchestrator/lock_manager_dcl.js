const DEFAULT_REASON = 'NONE';

const lockManagerTick = ({ requests = [], mapIndex }) => {
  const order = requests.slice().sort((a, b) => {
    const prioA = Number.isFinite(a.priority) ? a.priority : 0;
    const prioB = Number.isFinite(b.priority) ? b.priority : 0;
    if (prioA !== prioB) return prioB - prioA;
    return a.robotId.localeCompare(b.robotId);
  });

  const cellOwners = new Map();
  const corridorDirState = new Map();
  const grants = [];

  const ensureCorridorState = (corridorId, dir, robotId) => {
    if (!corridorDirState.has(corridorId)) {
      corridorDirState.set(corridorId, { dir, holders: new Set([robotId]) });
      return true;
    }
    const state = corridorDirState.get(corridorId);
    if (state.dir === dir) {
      state.holders.add(robotId);
      return true;
    }
    return false;
  };

  const conflictsWithExisting = (cellId, robotId) => {
    const conflictSet = mapIndex.conflictSetByCellId.get(cellId);
    if (!conflictSet) {
      const owner = cellOwners.get(cellId);
      return owner && owner !== robotId;
    }
    for (const conflictCell of conflictSet) {
      const owner = cellOwners.get(conflictCell);
      if (owner && owner !== robotId) {
        return true;
      }
    }
    return false;
  };

  const grantCell = (cellId, robotId) => {
    cellOwners.set(cellId, robotId);
  };

  // Pre-grant occupied cells (fail-closed).
  order.forEach((req) => {
    const occupied = Array.isArray(req.occupiedCells) ? req.occupiedCells : [];
    occupied.forEach((cellId) => {
      if (!cellOwners.has(cellId)) {
        grantCell(cellId, req.robotId);
      }
    });
  });

  order.forEach((req) => {
    const grantedCells = [];
    const grantedCorridorDirs = [];
    const grantedNodeStopZones = [];
    let reasonCode = DEFAULT_REASON;

    const occupied = Array.isArray(req.occupiedCells) ? req.occupiedCells : [];
    occupied.forEach((cellId) => {
      if (!grantedCells.includes(cellId)) {
        grantedCells.push(cellId);
      }
    });

    const nodeStopZones = Array.isArray(req.desiredNodeStopZones)
      ? req.desiredNodeStopZones
      : [];
    for (const nodeId of nodeStopZones) {
      const zone = mapIndex.nodeStopZonesByNodeId.get(nodeId);
      if (!zone) continue;
      let zoneOk = true;
      for (const cellId of zone.conflictCells) {
        if (conflictsWithExisting(cellId, req.robotId)) {
          zoneOk = false;
          reasonCode = 'WAIT_NODE_STOP_ZONE';
          break;
        }
      }
      if (!zoneOk) break;
      zone.conflictCells.forEach((cellId) => {
        if (!cellOwners.has(cellId)) {
          grantCell(cellId, req.robotId);
        }
        if (!grantedCells.includes(cellId)) {
          grantedCells.push(cellId);
        }
      });
      grantedNodeStopZones.push(nodeId);
    }

    if (reasonCode !== DEFAULT_REASON) {
      grants.push({ robotId: req.robotId, grantedCells, grantedCorridorDirs, grantedNodeStopZones, reasonCode });
      return;
    }

    const corridorDirs = Array.isArray(req.desiredCorridorDirs) ? req.desiredCorridorDirs : [];
    for (const token of corridorDirs) {
      const ok = ensureCorridorState(token.corridorId, token.dir, req.robotId);
      if (!ok) {
        reasonCode = 'WAIT_CORRIDOR_DIR';
        break;
      }
      grantedCorridorDirs.push(token);
    }

    if (reasonCode !== DEFAULT_REASON) {
      grants.push({ robotId: req.robotId, grantedCells, grantedCorridorDirs, grantedNodeStopZones, reasonCode });
      return;
    }

    const desiredCells = Array.isArray(req.desiredCells) ? req.desiredCells : [];
    for (const cellId of desiredCells) {
      if (conflictsWithExisting(cellId, req.robotId)) {
        reasonCode = 'WAIT_CONFLICT_CELL';
        break;
      }
      if (!cellOwners.has(cellId)) {
        grantCell(cellId, req.robotId);
      }
      if (!grantedCells.includes(cellId)) {
        grantedCells.push(cellId);
      }
    }

    grants.push({ robotId: req.robotId, grantedCells, grantedCorridorDirs, grantedNodeStopZones, reasonCode });
  });

  return {
    grants,
    snapshot: {
      corridorDirState,
      cellOwners
    }
  };
};

module.exports = {
  lockManagerTick
};

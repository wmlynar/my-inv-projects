const buildMapIndex = (compiledMap = {}) => {
  const nodes = Array.isArray(compiledMap.nodes) ? compiledMap.nodes : [];
  const edges = Array.isArray(compiledMap.edges) ? compiledMap.edges : [];
  const corridors = Array.isArray(compiledMap.corridors) ? compiledMap.corridors : [];
  const cells = Array.isArray(compiledMap.cells) ? compiledMap.cells : [];
  const nodeStopZones = Array.isArray(compiledMap.nodeStopZones) ? compiledMap.nodeStopZones : [];
  const criticalSections = Array.isArray(compiledMap.criticalSections)
    ? compiledMap.criticalSections
    : [];

  const nodesById = new Map();
  const edgesById = new Map();
  const corridorsById = new Map();
  const cellsById = new Map();
  const cellsByCorridorDir = new Map();
  const conflictSetByCellId = new Map();
  const nodeStopZonesByNodeId = new Map();
  const criticalSectionsById = new Map();

  nodes.forEach((node) => {
    if (!node?.nodeId) return;
    nodesById.set(node.nodeId, node);
  });
  edges.forEach((edge) => {
    if (!edge?.edgeId) return;
    edgesById.set(edge.edgeId, edge);
  });
  corridors.forEach((corridor) => {
    if (!corridor?.corridorId) return;
    const entry = {
      corridorId: corridor.corridorId,
      aNodeId: corridor.aNodeId,
      bNodeId: corridor.bNodeId,
      lengthM: corridor.lengthM,
      singleLane: corridor.singleLane !== false,
      segments: Array.isArray(corridor.segments) ? corridor.segments : []
    };
    corridorsById.set(entry.corridorId, entry);
  });

  const ensureCellBucket = (corridorId, dir) => {
    const key = `${corridorId}::${dir}`;
    if (!cellsByCorridorDir.has(key)) cellsByCorridorDir.set(key, []);
    return cellsByCorridorDir.get(key);
  };

  cells.forEach((cell) => {
    if (!cell?.cellId || !cell?.corridorId) return;
    const corridor = corridorsById.get(cell.corridorId);
    const lengthM = Number.isFinite(corridor?.lengthM) ? corridor.lengthM : null;
    const dir = cell.dir || 'A_TO_B';
    const travelS0 = dir === 'B_TO_A' && Number.isFinite(lengthM)
      ? lengthM - cell.corridorS1M
      : cell.corridorS0M;
    const travelS1 = dir === 'B_TO_A' && Number.isFinite(lengthM)
      ? lengthM - cell.corridorS0M
      : cell.corridorS1M;

    const entry = {
      ...cell,
      dir,
      travelS0,
      travelS1
    };
    cellsById.set(entry.cellId, entry);
    ensureCellBucket(entry.corridorId, entry.dir).push(entry);

    const conflict = Array.isArray(entry.conflictSet) ? entry.conflictSet.slice() : [];
    if (!conflict.includes(entry.cellId)) {
      conflict.push(entry.cellId);
    }
    conflictSetByCellId.set(entry.cellId, new Set(conflict));
  });

  cellsByCorridorDir.forEach((list) => {
    list.sort((a, b) => {
      if (a.travelS0 !== b.travelS0) return a.travelS0 - b.travelS0;
      return a.cellId.localeCompare(b.cellId);
    });
  });

  nodeStopZones.forEach((zone) => {
    if (!zone?.nodeId) return;
    const conflictCells = Array.isArray(zone.conflictCells) ? zone.conflictCells : [];
    nodeStopZonesByNodeId.set(zone.nodeId, {
      ...zone,
      conflictCells: new Set(conflictCells)
    });
  });

  criticalSections.forEach((section) => {
    if (!section?.csId) return;
    criticalSectionsById.set(section.csId, section);
  });

  return {
    nodesById,
    edgesById,
    corridorsById,
    cellsById,
    cellsByCorridorDir,
    conflictSetByCellId,
    nodeStopZonesByNodeId,
    criticalSectionsById
  };
};

module.exports = {
  buildMapIndex
};

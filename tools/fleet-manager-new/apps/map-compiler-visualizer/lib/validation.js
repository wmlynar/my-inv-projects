function isFiniteNumber(value) {
  return Number.isFinite(value);
}

function readCoord(point) {
  if (!point || typeof point !== 'object') return null;
  const x = point.xM !== undefined ? point.xM : point.x;
  const y = point.yM !== undefined ? point.yM : point.y;
  if (!isFiniteNumber(x) || !isFiniteNumber(y)) return null;
  return { x, y };
}

function getNodeId(node) {
  if (!node || typeof node !== 'object') return null;
  return node.nodeId || node.id || null;
}

function getEdgeId(edge) {
  if (!edge || typeof edge !== 'object') return null;
  return edge.edgeId || edge.id || null;
}

function getCorridorId(corridor) {
  if (!corridor || typeof corridor !== 'object') return null;
  return corridor.corridorId || corridor.id || null;
}

function getCellId(cell) {
  if (!cell || typeof cell !== 'object') return null;
  return cell.cellId || cell.id || null;
}

function pushError(list, code, ref) {
  list.push({ code, severity: 'error', ref });
}

function pushWarning(list, code, ref) {
  list.push({ code, severity: 'warn', ref });
}

function validateSceneGraph(sceneGraph, errors, warnings) {
  const nodesById = new Map();
  const edgesById = new Map();

  if (!sceneGraph || typeof sceneGraph !== 'object') {
    pushError(errors, 'SCENEGRAPH_MISSING', 'sceneGraph');
    return { nodesById, edgesById };
  }

  const nodes = Array.isArray(sceneGraph.nodes) ? sceneGraph.nodes : null;
  if (!nodes) {
    pushError(errors, 'SCENEGRAPH_NODES_MISSING', 'sceneGraph.nodes');
  } else {
    for (const node of nodes) {
      const nodeId = getNodeId(node);
      if (!nodeId) {
        pushError(errors, 'NODE_ID_MISSING', 'sceneGraph.nodes');
        continue;
      }
      if (nodesById.has(nodeId)) {
        pushError(errors, 'NODE_ID_DUPLICATE', `nodeId:${nodeId}`);
        continue;
      }
      const pos = readCoord(node.pos || node.position || null);
      if (!pos) {
        pushError(errors, 'NODE_POS_INVALID', `nodeId:${nodeId}`);
      }
      nodesById.set(nodeId, { ...node, _pos: pos || null });
    }
  }

  const edges = Array.isArray(sceneGraph.edges) ? sceneGraph.edges : null;
  if (!edges) {
    pushError(errors, 'SCENEGRAPH_EDGES_MISSING', 'sceneGraph.edges');
  } else {
    for (const edge of edges) {
      const edgeId = getEdgeId(edge) || 'unknown';
      if (edgesById.has(edgeId)) {
        pushWarning(warnings, 'EDGE_ID_DUPLICATE', `edgeId:${edgeId}`);
      }
      const startId = edge.startNodeId || edge.start || null;
      const endId = edge.endNodeId || edge.end || null;
      if (!startId || !nodesById.has(startId)) {
        pushError(errors, 'EDGE_START_NODE_MISSING', `edgeId:${edgeId}`);
      }
      if (!endId || !nodesById.has(endId)) {
        pushError(errors, 'EDGE_END_NODE_MISSING', `edgeId:${edgeId}`);
      }

      const length = edge.lengthM !== undefined ? edge.lengthM : edge.length;
      if (length !== undefined && isFiniteNumber(length) && length <= 0) {
        pushWarning(warnings, 'EDGE_LENGTH_NONPOSITIVE', `edgeId:${edgeId}`);
      }

      const wantsBezier = String(edge.className || '').includes('Bezier') || edge.p0 || edge.p3;
      if (wantsBezier) {
        const p0 = readCoord(edge.p0 || edge.startPos || null);
        const p1 = readCoord(edge.p1 || null);
        const p2 = readCoord(edge.p2 || null);
        const p3 = readCoord(edge.p3 || edge.endPos || null);
        if (!p0 || !p1 || !p2 || !p3) {
          pushWarning(warnings, 'EDGE_BEZIER_MISSING', `edgeId:${edgeId}`);
        }
      }

      edgesById.set(edgeId, edge);
    }
  }

  return { nodesById, edgesById };
}

function validateCompiledMap(compiledMap, edgesById, errors, warnings) {
  const corridorsById = new Map();
  const cellsById = new Map();

  if (!compiledMap || typeof compiledMap !== 'object') {
    pushError(errors, 'COMPILEDMAP_MISSING', 'compiledMap');
    return { corridorsById, cellsById };
  }

  const corridors = Array.isArray(compiledMap.corridors) ? compiledMap.corridors : null;
  if (!corridors) {
    pushError(errors, 'COMPILEDMAP_CORRIDORS_MISSING', 'compiledMap.corridors');
  } else {
    for (const corridor of corridors) {
      const corridorId = getCorridorId(corridor);
      if (!corridorId) {
        pushError(errors, 'CORRIDOR_ID_MISSING', 'compiledMap.corridors');
        continue;
      }
      if (corridorsById.has(corridorId)) {
        pushWarning(warnings, 'CORRIDOR_ID_DUPLICATE', `corridorId:${corridorId}`);
      }
      const segments = Array.isArray(corridor.segments) ? corridor.segments : [];
      for (const segment of segments) {
        const edgeId = segment.edgeId || segment.id || null;
        if (edgeId && edgesById && !edgesById.has(edgeId)) {
          pushError(errors, 'CORRIDOR_EDGE_MISSING', `corridorId:${corridorId};edgeId:${edgeId}`);
        }
      }
      corridorsById.set(corridorId, corridor);
    }
  }

  const cells = Array.isArray(compiledMap.cells) ? compiledMap.cells : null;
  if (!cells) {
    pushError(errors, 'COMPILEDMAP_CELLS_MISSING', 'compiledMap.cells');
  } else {
    for (const cell of cells) {
      const cellId = getCellId(cell);
      if (!cellId) {
        pushError(errors, 'CELL_ID_MISSING', 'compiledMap.cells');
        continue;
      }
      if (cellsById.has(cellId)) {
        pushWarning(warnings, 'CELL_ID_DUPLICATE', `cellId:${cellId}`);
      }
      const corridorId = cell.corridorId || null;
      if (corridorId && !corridorsById.has(corridorId)) {
        pushError(errors, 'CELL_CORRIDOR_MISSING', `cellId:${cellId};corridorId:${corridorId}`);
      }
      const swept = cell.sweptShape || null;
      const rects = Array.isArray(swept?.rects) ? swept.rects : [];
      if (rects.length === 0) {
        pushWarning(warnings, 'CELL_RECTS_MISSING', `cellId:${cellId}`);
      }
      for (const rect of rects) {
        const cx = rect.cxM !== undefined ? rect.cxM : rect.cx;
        const cy = rect.cyM !== undefined ? rect.cyM : rect.cy;
        const angle = rect.angleRad !== undefined ? rect.angleRad : rect.angle;
        const hx = rect.hxM !== undefined ? rect.hxM : rect.hx;
        const hy = rect.hyM !== undefined ? rect.hyM : rect.hy;
        if (!isFiniteNumber(cx) || !isFiniteNumber(cy) || !isFiniteNumber(angle)) {
          pushWarning(warnings, 'CELL_RECT_INVALID', `cellId:${cellId}`);
        }
        if (!isFiniteNumber(hx) || !isFiniteNumber(hy) || hx <= 0 || hy <= 0) {
          pushWarning(warnings, 'CELL_RECT_SIZE_INVALID', `cellId:${cellId}`);
        }
      }
      cellsById.set(cellId, cell);
    }
  }

  for (const [cellId, cell] of cellsById.entries()) {
    const conflicts = Array.isArray(cell.conflictSet) ? cell.conflictSet : [];
    const conflictSet = new Set(conflicts);
    if (!conflictSet.has(cellId)) {
      pushWarning(warnings, 'CONFLICTSET_SELF_MISSING', `cellId:${cellId}`);
    }
    for (const otherId of conflictSet) {
      if (!cellsById.has(otherId)) {
        pushWarning(warnings, 'CONFLICTSET_MISSING_CELL', `cellId:${cellId};ref:${otherId}`);
        continue;
      }
      const other = cellsById.get(otherId);
      const otherSet = new Set(Array.isArray(other.conflictSet) ? other.conflictSet : []);
      if (!otherSet.has(cellId)) {
        pushWarning(warnings, 'CONFLICTSET_ASYMMETRIC', `cellId:${cellId};ref:${otherId}`);
      }
    }
  }

  return { corridorsById, cellsById };
}

function validateArtifacts(sceneGraph, compiledMap) {
  const errors = [];
  const warnings = [];
  const { nodesById, edgesById } = validateSceneGraph(sceneGraph, errors, warnings);
  validateCompiledMap(compiledMap, edgesById, errors, warnings);
  return {
    ok: errors.length === 0,
    errors,
    warnings
  };
}

module.exports = {
  validateArtifacts
};

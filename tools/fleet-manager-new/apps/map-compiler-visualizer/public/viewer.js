(() => {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const MotionKernel = window.MotionKernel || null;

  const INVERT_Y = true;
  const NODE_LABEL_OFFSET = 0.35;
  const mapShell = document.getElementById('map-shell');
  const mapWrap = document.querySelector('.map-wrap');
  const mapSvg = document.getElementById('map-svg');
  const miniMapSvg = document.getElementById('mini-map-svg');
  const fitViewBtn = document.getElementById('fit-view-btn');
  const resetViewBtn = document.getElementById('reset-view-btn');
  const searchInput = document.getElementById('search-input');
  const clearSearchBtn = document.getElementById('clear-search');
  const selectionDetails = document.getElementById('selection-details');
  const validationDetails = document.getElementById('validation-details');
  const validationBadge = document.getElementById('validation-badge');
  const metaLine = document.getElementById('meta-line');
  const statusText = document.getElementById('status-text');
  const viewTitle = document.getElementById('view-title');
  const viewSubtitle = document.getElementById('view-subtitle');
  const healthMetrics = document.getElementById('health-metrics');
  const determinismPlaceholder = document.getElementById('determinism-placeholder');
  const coverageSummary = document.getElementById('coverage-summary');
  const conflictsSummary = document.getElementById('conflicts-summary');
  const lengthSummary = document.getElementById('length-summary');
  const sweptSummary = document.getElementById('swept-summary');
  const navItems = Array.from(document.querySelectorAll('.nav-item[data-view]'));
  const viewPanels = Array.from(document.querySelectorAll('.view-panel[data-view]'));

  const mapWindow = window.MapWindow?.init?.({
    shell: mapShell,
    wrap: mapWrap,
    svg: mapSvg,
    miniMapSvg
  });
  const mapLayers = window.MapLayers?.init?.({ svg: mapSvg });
  const mapStore = window.MapStore?.create?.({
    layers: {
      edges: true,
      nodes: true,
      corridors: false,
      cells: false,
      conflicts: true
    },
    filters: { search: '', sweptDirs: { A_TO_B: true, B_TO_A: true } },
    viewport: null,
    activeView: 'map',
    report: null,
    meta: null,
    compareDir: null
  });
  const mapAdapters = window.MapAdapters?.init?.({ store: mapStore });

  const defs = createSvgElement('defs');
  const pivotArrow = createSvgElement('marker', {
    id: 'pivot-arrow',
    viewBox: '0 0 10 10',
    refX: '9',
    refY: '5',
    markerWidth: '0.18',
    markerHeight: '0.18',
    orient: 'auto',
    markerUnits: 'userSpaceOnUse'
  });
  pivotArrow.appendChild(createSvgElement('path', { d: 'M0,0 L10,5 L0,10 Z', class: 'pivot-arrow-head' }));
  defs.appendChild(pivotArrow);
  mapSvg.appendChild(defs);

  const layerGroups = {
    edges: createGroup('layer-edges'),
    corridors: createGroup('layer-corridors'),
    coverage: createGroup('layer-coverage'),
    length: createGroup('layer-length'),
    cells: createGroup('layer-cells'),
    pivot: createGroup('layer-pivot'),
    swept: createGroup('layer-swept'),
    nodes: createGroup('layer-nodes'),
    labels: createGroup('layer-labels')
  };

  Object.values(layerGroups).forEach((group) => mapSvg.appendChild(group));

  const miniGroup = createGroup('mini-layer');
  const miniViewport = createSvgElement('rect', { class: 'viewer-mini-viewport' });
  miniGroup.appendChild(miniViewport);
  miniMapSvg.appendChild(miniGroup);

  const layerState = {
    version: null,
    miniVersion: null,
    matchElements: [],
    lastSelection: null,
    cellsKey: null,
    sweptKey: null,
    pivotKey: null
  };

  const uiConfig = {
    cellsMinZoom: 1.4,
    labelMinZoom: 1.0
  };

  const VIEW_META = {
    map: { title: 'Map', subtitle: 'SceneGraph + CompiledMap layers' },
    coverage: { title: 'Coverage', subtitle: 'Cells coverage gaps and corridor completeness' },
    conflicts: { title: 'Conflicts', subtitle: 'Conflict heatmap and density summary' },
    swept: { title: 'Swept shape', subtitle: 'Rotated rects with bounding boxes for each cell' },
    connectivity: { title: 'Connectivity', subtitle: 'Connected components and isolated subgraphs' },
    length: { title: 'Length sanity', subtitle: 'Edge length vs curve length checks' },
    determinism: { title: 'Determinism', subtitle: 'Diff summary between compilation runs' },
    report: { title: 'Report', subtitle: 'Validation report and compile health' }
  };

  function createSvgElement(tag, attrs = {}) {
    const el = document.createElementNS(SVG_NS, tag);
    Object.entries(attrs).forEach(([key, value]) => {
      el.setAttribute(key, value);
    });
    return el;
  }

  function createGroup(className) {
    return createSvgElement('g', { class: className });
  }

  function clearElement(el) {
    while (el.firstChild) {
      el.removeChild(el.firstChild);
    }
  }

  function flipY(value) {
    if (!INVERT_Y || !Number.isFinite(value)) return value;
    return -value;
  }

  function flipAngle(value) {
    if (!INVERT_Y || !Number.isFinite(value)) return value;
    return -value;
  }

  function normalizeBbox(bbox) {
    if (!bbox || typeof bbox !== 'object') return null;
    const minX = bbox.minXM !== undefined ? bbox.minXM : bbox.minX;
    const maxX = bbox.maxXM !== undefined ? bbox.maxXM : bbox.maxX;
    const minY = bbox.minYM !== undefined ? bbox.minYM : bbox.minY;
    const maxY = bbox.maxYM !== undefined ? bbox.maxYM : bbox.maxY;
    if (!Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minY) || !Number.isFinite(maxY)) {
      return null;
    }
    if (!INVERT_Y) {
      return { minXM: minX, maxXM: maxX, minYM: minY, maxYM: maxY };
    }
    return { minXM: minX, maxXM: maxX, minYM: -maxY, maxYM: -minY };
  }

  function readCoord(point) {
    if (!point || typeof point !== 'object') return null;
    const x = point.xM !== undefined ? point.xM : point.x;
    const y = point.yM !== undefined ? point.yM : point.y;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x, y: flipY(y) };
  }

  function normalizeNode(node) {
    if (!node) return null;
    const id = node.nodeId || node.id || null;
    const pos = readCoord(node.pos || node.position || null);
    const rawClass = node.className || node.nodeType || '';
    return {
      id,
      pos,
      className: rawClass
    };
  }

  function normalizeEdge(edge, nodesById) {
    if (!edge) return null;
    const id = edge.edgeId || edge.id || null;
    const startId = edge.startNodeId || edge.start || null;
    const endId = edge.endNodeId || edge.end || null;
    const startNode = startId ? nodesById.get(startId) : null;
    const endNode = endId ? nodesById.get(endId) : null;
    const p0 = readCoord(edge.p0) || (startNode ? startNode.pos : null);
    const p1 = readCoord(edge.p1) || p0;
    const p2 = readCoord(edge.p2) || (readCoord(edge.p3) || (endNode ? endNode.pos : p0));
    const p3 = readCoord(edge.p3) || (endNode ? endNode.pos : p2);
    return {
      id,
      startId,
      endId,
      className: edge.className || '',
      lengthM: edge.lengthM !== undefined ? edge.lengthM : edge.length,
      p0,
      p1,
      p2,
      p3
    };
  }

  function normalizeCorridor(corridor) {
    if (!corridor) return null;
    const id = corridor.corridorId || corridor.id || null;
    const segments = Array.isArray(corridor.segments) ? corridor.segments : [];
    const lengthM = corridor.lengthM !== undefined ? corridor.lengthM : corridor.length;
    return {
      id,
      lengthM,
      segments: segments.map((segment) => ({
        edgeId: segment.edgeId || segment.id || null,
        corridorS0M: segment.corridorS0M !== undefined ? segment.corridorS0M : segment.corridorS0,
        corridorS1M: segment.corridorS1M !== undefined ? segment.corridorS1M : segment.corridorS1
      }))
    };
  }

  function normalizeCell(cell) {
    if (!cell) return null;
    const id = cell.cellId || cell.id || null;
    const rects = Array.isArray(cell.sweptShape?.rects) ? cell.sweptShape.rects : [];
    const conflictSet = Array.isArray(cell.conflictSet) ? cell.conflictSet : [];
    const normalizedRects = rects.map((rect) => {
      const cx = rect.cxM !== undefined ? rect.cxM : rect.cx;
      const cy = rect.cyM !== undefined ? rect.cyM : rect.cy;
      const angleRad = rect.angleRad !== undefined ? rect.angleRad : rect.angle;
      const pivotX = rect.pivotXM !== undefined ? rect.pivotXM : rect.pivotX;
      const pivotY = rect.pivotYM !== undefined ? rect.pivotYM : rect.pivotY;
      const frontX = rect.frontXM !== undefined ? rect.frontXM : rect.frontX;
      const frontY = rect.frontYM !== undefined ? rect.frontYM : rect.frontY;
      return {
        cx,
        cy: flipY(cy),
        angleRad: flipAngle(angleRad),
        hx: rect.hxM !== undefined ? rect.hxM : rect.hx,
        hy: rect.hyM !== undefined ? rect.hyM : rect.hy,
        pivotX,
        pivotY: flipY(pivotY),
        frontX,
        frontY: flipY(frontY)
      };
    });
    return {
      id,
      corridorId: cell.corridorId || null,
      corridorS0M: cell.corridorS0M !== undefined ? cell.corridorS0M : cell.corridorS0,
      corridorS1M: cell.corridorS1M !== undefined ? cell.corridorS1M : cell.corridorS1,
      dir: cell.dir || null,
      rects: normalizedRects,
      sweptShape: cell.sweptShape
        ? { bbox: normalizeBbox(cell.sweptShape.bbox), rects: normalizedRects }
        : { rects: normalizedRects },
      conflictSet
    };
  }

  function normalizeNodeClass(raw) {
    const text = String(raw || '').trim();
    if (!text) return 'location-mark';
    const map = {
      LocationMark: 'location-mark',
      ActionPoint: 'action-point',
      ChargePoint: 'charge-point',
      ParkPoint: 'park-point',
      locationMark: 'location-mark',
      actionPoint: 'action-point',
      chargePoint: 'charge-point',
      parkPoint: 'park-point'
    };
    if (map[text]) return map[text];
    return text
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/_/g, '-')
      .toLowerCase();
  }

  function mergeIntervals(intervals) {
    const cleaned = intervals
      .map(([start, end]) => ({
        start: Math.min(start, end),
        end: Math.max(start, end)
      }))
      .filter((entry) => Number.isFinite(entry.start) && Number.isFinite(entry.end));
    cleaned.sort((a, b) => a.start - b.start);
    const merged = [];
    for (const interval of cleaned) {
      if (!merged.length || interval.start > merged[merged.length - 1].end) {
        merged.push({ ...interval });
        continue;
      }
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, interval.end);
    }
    return merged;
  }

  function coveredLength(merged) {
    return merged.reduce((sum, interval) => sum + Math.max(0, interval.end - interval.start), 0);
  }

  function segmentHasGap(merged, start, end, eps = 1e-6) {
    let cursor = start;
    for (const interval of merged) {
      if (interval.end <= cursor + eps) continue;
      if (interval.start > cursor + eps) return true;
      cursor = Math.max(cursor, interval.end);
      if (cursor >= end - eps) return false;
    }
    return cursor < end - eps;
  }

  function computeBezierLength(edge) {
    if (!edge || !edge.p0 || !edge.p1 || !edge.p2 || !edge.p3) return null;
    const approx =
      Math.hypot(edge.p1.x - edge.p0.x, edge.p1.y - edge.p0.y) +
      Math.hypot(edge.p2.x - edge.p1.x, edge.p2.y - edge.p1.y) +
      Math.hypot(edge.p3.x - edge.p2.x, edge.p3.y - edge.p2.y);
    if (!MotionKernel) {
      return approx;
    }
    const sampleStep = 0.2;
    const samples = Math.max(8, Math.min(120, Math.ceil(approx / sampleStep)));
    const points = MotionKernel.sampleBezierPoints(edge.p0, edge.p1, edge.p2, edge.p3, samples);
    const poly = MotionKernel.buildPolyline(points);
    return poly.totalLength;
  }

  function computeAnalysis(mapState) {
    const analysis = {
      coverageGapEdges: new Set(),
      lengthMismatchEdges: new Set(),
      coverageGapCount: 0,
      conflictAvg: 0,
      conflictMax: 0
    };

    const cells = mapState.cells || [];
    let conflictSum = 0;
    for (const cell of cells) {
      const conflicts = Array.isArray(cell.conflictSet) ? cell.conflictSet : [];
      const hasSelf = conflicts.includes(cell.id);
      const count = Math.max(0, conflicts.length - (hasSelf ? 1 : 0));
      cell.conflictCount = count;
      conflictSum += count;
      analysis.conflictMax = Math.max(analysis.conflictMax, count);
    }
    analysis.conflictAvg = cells.length ? Math.round((conflictSum / cells.length) * 100) / 100 : 0;

    const cellsByCorridor = new Map();
    for (const cell of cells) {
      if (!cell.corridorId || !Number.isFinite(cell.corridorS0M) || !Number.isFinite(cell.corridorS1M)) {
        continue;
      }
      if (!cellsByCorridor.has(cell.corridorId)) {
        cellsByCorridor.set(cell.corridorId, []);
      }
      cellsByCorridor.get(cell.corridorId).push([cell.corridorS0M, cell.corridorS1M]);
    }

    for (const corridor of mapState.corridors || []) {
      if (!corridor.id) continue;
      const intervals = cellsByCorridor.get(corridor.id) || [];
      const merged = mergeIntervals(intervals);
      const length = Number.isFinite(corridor.lengthM)
        ? corridor.lengthM
        : Math.max(...corridor.segments.map((seg) => seg.corridorS1M).filter(Number.isFinite), 0);
      if (!Number.isFinite(length) || length <= 0) continue;
      const covered = coveredLength(merged);
      if (length - covered > 1e-3) {
        analysis.coverageGapCount += 1;
        for (const segment of corridor.segments || []) {
          const edgeId = segment.edgeId;
          if (!edgeId) continue;
          if (!Number.isFinite(segment.corridorS0M) || !Number.isFinite(segment.corridorS1M)) {
            analysis.coverageGapEdges.add(edgeId);
            continue;
          }
          if (segmentHasGap(merged, segment.corridorS0M, segment.corridorS1M)) {
            analysis.coverageGapEdges.add(edgeId);
          }
        }
      }
    }

    const ratioThreshold = 0.05;
    const absThreshold = 0.2;
    for (const edge of mapState.edges || []) {
      if (!Number.isFinite(edge.lengthM)) continue;
      const computed = computeBezierLength(edge);
      if (!Number.isFinite(computed)) continue;
      const diff = Math.abs(computed - edge.lengthM);
      if (diff > absThreshold && diff / Math.max(edge.lengthM, 1e-6) > ratioThreshold) {
        analysis.lengthMismatchEdges.add(edge.id);
      }
    }

    return analysis;
  }

  function buildMapState(sceneGraph, compiledMap) {
    const nodes = [];
    const edges = [];
    const corridors = [];
    const cells = [];
    const nodesById = new Map();
    const edgesById = new Map();
    const corridorsById = new Map();
    const cellsById = new Map();

    for (const node of sceneGraph.nodes || []) {
      const normalized = normalizeNode(node);
      if (!normalized || !normalized.id || !normalized.pos) continue;
      nodes.push(normalized);
      nodesById.set(normalized.id, normalized);
    }

    for (const edge of sceneGraph.edges || []) {
      const normalized = normalizeEdge(edge, nodesById);
      if (!normalized || !normalized.id || !normalized.p0 || !normalized.p3) continue;
      edges.push(normalized);
      edgesById.set(normalized.id, normalized);
    }

    for (const corridor of compiledMap.corridors || []) {
      const normalized = normalizeCorridor(corridor);
      if (!normalized || !normalized.id) continue;
      corridors.push(normalized);
      corridorsById.set(normalized.id, normalized);
    }

    for (const cell of compiledMap.cells || []) {
      const normalized = normalizeCell(cell);
      if (!normalized || !normalized.id) continue;
      cells.push(normalized);
      cellsById.set(normalized.id, normalized);
    }

    const bounds = computeBounds({ nodes, edges, cells });
    const edgePaths = new Map();
    for (const edge of edges) {
      edgePaths.set(edge.id, edgeToPath(edge));
    }

    const analysis = computeAnalysis({ nodes, edges, corridors, cells });

    return {
      version: Date.now(),
      bounds,
      nodes,
      edges,
      corridors,
      cells,
      analysis,
      cache: {
        nodesById,
        edgesById,
        corridorsById,
        cellsById,
        edgePaths,
        edgeElementsById: new Map(),
        corridorElementsById: new Map(),
        cellElementsById: new Map(),
        bboxElementsById: new Map(),
        nodeElementsById: new Map(),
        labelElementsById: new Map()
      }
    };
  }

  function computeBounds({ nodes, edges, cells }) {
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    function consider(point) {
      if (!point) return;
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }

    nodes.forEach((node) => consider(node.pos));
    edges.forEach((edge) => {
      consider(edge.p0);
      consider(edge.p1);
      consider(edge.p2);
      consider(edge.p3);
    });
    cells.forEach((cell) => {
      cell.rects.forEach((rect) => {
        if (!Number.isFinite(rect.cx) || !Number.isFinite(rect.cy)) return;
        consider({ x: rect.cx - rect.hx, y: rect.cy - rect.hy });
        consider({ x: rect.cx + rect.hx, y: rect.cy + rect.hy });
      });
    });

    if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
      minX = -10;
      minY = -10;
      maxX = 10;
      maxY = 10;
    }

    return {
      minX,
      minY,
      maxX,
      maxY
    };
  }

  function edgeToPath(edge) {
    return `M ${edge.p0.x} ${edge.p0.y} C ${edge.p1.x} ${edge.p1.y} ${edge.p2.x} ${edge.p2.y} ${edge.p3.x} ${edge.p3.y}`;
  }

  function setStatus(text) {
    if (statusText) {
      statusText.textContent = text;
    }
  }

  function setMetaLine(text) {
    if (metaLine) {
      metaLine.textContent = text;
    }
  }

  function setView(viewId) {
    const meta = VIEW_META[viewId] || VIEW_META.map;
    if (viewTitle) viewTitle.textContent = meta.title;
    if (viewSubtitle) viewSubtitle.textContent = meta.subtitle;

    navItems.forEach((item) => {
      const isActive = item.getAttribute('data-view') === viewId;
      item.classList.toggle('active', isActive);
    });

    viewPanels.forEach((panel) => {
      const isActive = panel.getAttribute('data-view') === viewId;
      panel.classList.toggle('active', isActive);
    });
  }

  function updateState(mutator, reason) {
    const state = mapStore.getState();
    mutator(state);
    mapStore.notify(reason || 'update');
  }

  function applyViewBox(viewport) {
    mapSvg.setAttribute('viewBox', `${viewport.minX} ${viewport.minY} ${viewport.width} ${viewport.height}`);
  }

  function updateViewport(viewport) {
    updateState((state) => {
      state.viewport = viewport;
    }, 'viewport');
    applyViewBox(viewport);
    updateMiniViewport(viewport);
  }

  function fitBounds() {
    const state = mapStore.getState();
    const bounds = state.mapState?.bounds;
    if (!bounds) return;
    const padding = 2;
    const width = Math.max(1, bounds.maxX - bounds.minX + padding * 2);
    const height = Math.max(1, bounds.maxY - bounds.minY + padding * 2);
    const minX = bounds.minX - padding;
    const minY = bounds.minY - padding;
    const baseViewport = { minX, minY, width, height };
    state.baseViewport = baseViewport;
    updateViewport({ ...baseViewport });
  }

  function viewportToZoom(viewport) {
    const base = mapStore.getState().baseViewport;
    if (!base) return 1;
    return base.width / viewport.width;
  }

  function updateMiniViewport(viewport) {
    if (!miniViewport) return;
    miniViewport.setAttribute('x', viewport.minX);
    miniViewport.setAttribute('y', viewport.minY);
    miniViewport.setAttribute('width', viewport.width);
    miniViewport.setAttribute('height', viewport.height);
  }

  function bindPanZoom() {
    let isPanning = false;
    let start = null;
    let startView = null;

    mapWrap.addEventListener('wheel', (event) => {
      event.preventDefault();
      const state = mapStore.getState();
      if (!state.viewport) return;
      const delta = event.deltaY;
      const factor = Math.exp(-delta * 0.0012);
      const rect = mapSvg.getBoundingClientRect();
      const pointerX = ((event.clientX - rect.left) / rect.width) * state.viewport.width + state.viewport.minX;
      const pointerY = ((event.clientY - rect.top) / rect.height) * state.viewport.height + state.viewport.minY;
      const nextWidth = state.viewport.width / factor;
      const nextHeight = state.viewport.height / factor;
      const nextMinX = pointerX - (pointerX - state.viewport.minX) / factor;
      const nextMinY = pointerY - (pointerY - state.viewport.minY) / factor;
      updateViewport({ minX: nextMinX, minY: nextMinY, width: nextWidth, height: nextHeight });
    });

    mapWrap.addEventListener('pointerdown', (event) => {
      isPanning = true;
      mapWrap.classList.add('panning');
      start = { x: event.clientX, y: event.clientY };
      const state = mapStore.getState();
      startView = state.viewport ? { ...state.viewport } : null;
      mapWrap.setPointerCapture(event.pointerId);
    });

    mapWrap.addEventListener('pointermove', (event) => {
      if (!isPanning || !start || !startView) return;
      const rect = mapSvg.getBoundingClientRect();
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      const scaleX = startView.width / rect.width;
      const scaleY = startView.height / rect.height;
      updateViewport({
        minX: startView.minX - dx * scaleX,
        minY: startView.minY - dy * scaleY,
        width: startView.width,
        height: startView.height
      });
    });

    mapWrap.addEventListener('pointerup', (event) => {
      isPanning = false;
      mapWrap.classList.remove('panning');
      start = null;
      startView = null;
      mapWrap.releasePointerCapture(event.pointerId);
    });

    mapWrap.addEventListener('pointerleave', () => {
      if (!isPanning) return;
      isPanning = false;
      mapWrap.classList.remove('panning');
      start = null;
      startView = null;
    });
  }

  function applyLayerVisibility() {
    const state = mapStore.getState();
    const activeView = state.activeView || 'map';
    const zoom = viewportToZoom(state.viewport || state.baseViewport || { width: 1 });
    const isSwept = activeView === 'swept';
    const forceCells = activeView === 'conflicts' || isSwept;
    const showCells =
      (state.layers.cells || forceCells) && (isSwept ? true : zoom >= uiConfig.cellsMinZoom);
    const showEdges =
      state.layers.edges || activeView === 'coverage' || activeView === 'length' || isSwept;

    layerGroups.edges.style.display = showEdges ? 'block' : 'none';
    layerGroups.nodes.style.display = state.layers.nodes ? 'block' : 'none';
    layerGroups.labels.style.display = state.layers.nodes ? 'block' : 'none';
    layerGroups.corridors.style.display = state.layers.corridors ? 'block' : 'none';
    layerGroups.cells.style.display = showCells ? 'block' : 'none';
    layerGroups.pivot.style.display = isSwept ? 'block' : 'none';
    layerGroups.coverage.style.display = activeView === 'coverage' ? 'block' : 'none';
    layerGroups.length.style.display = activeView === 'length' ? 'block' : 'none';
    layerGroups.swept.style.display = isSwept ? 'block' : 'none';

    applyConflictHeatmap(state, activeView === 'conflicts');

    updateNodeLabelsVisibility(zoom);
  }

  function updateNodeLabelsVisibility(zoom) {
    const state = mapStore.getState();
    const labels = state.mapState?.cache?.labelElementsById;
    if (!labels) return;
    const hide = zoom < uiConfig.labelMinZoom;
    labels.forEach((label) => {
      if (hide) {
        label.classList.add('hidden');
      } else {
        label.classList.remove('hidden');
      }
    });
  }

  function getSweptDirFilter(state) {
    const dirs = state.filters?.sweptDirs || {};
    return {
      A_TO_B: dirs.A_TO_B !== false,
      B_TO_A: dirs.B_TO_A !== false
    };
  }

  function getSweptFilterKey(state) {
    const filter = getSweptDirFilter(state);
    return `${filter.A_TO_B ? 1 : 0}${filter.B_TO_A ? 1 : 0}`;
  }

  function shouldRenderSweptCell(state, cell) {
    if (!cell) return false;
    if (state.activeView !== 'swept') return true;
    const filter = getSweptDirFilter(state);
    if (!cell.dir) return true;
    return filter[cell.dir] !== false;
  }

  function renderEdges(state) {
    const mapState = state.mapState;
    if (!mapState || layerState.version === mapState.version) return;
    clearElement(layerGroups.edges);
    mapState.cache.edgeElementsById.clear();

    for (const edge of mapState.edges) {
      const d = mapState.cache.edgePaths.get(edge.id);
      if (!d) continue;
      const path = createSvgElement('path', {
        d,
        class: 'map-edge',
        'data-edge-id': edge.id
      });
      path.style.pointerEvents = 'none';
      layerGroups.edges.appendChild(path);
      mapState.cache.edgeElementsById.set(edge.id, path);
    }
  }

  function renderCorridors(state) {
    const mapState = state.mapState;
    if (!mapState || layerState.version === mapState.version) return;
    clearElement(layerGroups.corridors);
    mapState.cache.corridorElementsById.clear();

    for (const corridor of mapState.corridors) {
      const elements = [];
      for (const segment of corridor.segments) {
        const edgeId = segment.edgeId || segment.id;
        const d = mapState.cache.edgePaths.get(edgeId);
        if (!d) continue;
        const path = createSvgElement('path', {
          d,
          class: 'map-edge corridor',
          'data-corridor-id': corridor.id
        });
        path.style.pointerEvents = 'none';
        layerGroups.corridors.appendChild(path);
        elements.push(path);
      }
      if (corridor.id) {
        mapState.cache.corridorElementsById.set(corridor.id, elements);
      }
    }
  }

  function renderCoverage(state) {
    const mapState = state.mapState;
    if (!mapState || layerState.version === mapState.version) return;
    clearElement(layerGroups.coverage);
    const gapEdges = mapState.analysis?.coverageGapEdges;
    if (!gapEdges || gapEdges.size === 0) return;
    gapEdges.forEach((edgeId) => {
      const d = mapState.cache.edgePaths.get(edgeId);
      if (!d) return;
      const path = createSvgElement('path', { d, class: 'coverage-gap', 'data-edge-id': edgeId });
      path.addEventListener('click', (event) => {
        event.stopPropagation();
        setSelection('edge', edgeId);
      });
      layerGroups.coverage.appendChild(path);
    });
  }

  function renderLength(state) {
    const mapState = state.mapState;
    if (!mapState || layerState.version === mapState.version) return;
    clearElement(layerGroups.length);
    const mismatchEdges = mapState.analysis?.lengthMismatchEdges;
    if (!mismatchEdges || mismatchEdges.size === 0) return;
    mismatchEdges.forEach((edgeId) => {
      const d = mapState.cache.edgePaths.get(edgeId);
      if (!d) return;
      const path = createSvgElement('path', { d, class: 'length-mismatch', 'data-edge-id': edgeId });
      path.addEventListener('click', (event) => {
        event.stopPropagation();
        setSelection('edge', edgeId);
      });
      layerGroups.length.appendChild(path);
    });
  }

  function renderCells(state) {
    const mapState = state.mapState;
    if (!mapState) return;
    const key = `${mapState.version}|${state.activeView}|${getSweptFilterKey(state)}`;
    if (layerState.cellsKey === key) return;
    layerState.cellsKey = key;
    clearElement(layerGroups.cells);
    mapState.cache.cellElementsById.clear();

    for (const cell of mapState.cells) {
      if (!shouldRenderSweptCell(state, cell)) continue;
      const dirClass =
        cell.dir === 'B_TO_A' ? 'dir-b' : cell.dir === 'A_TO_B' ? 'dir-a' : '';
      const elements = [];
      for (const rect of cell.rects) {
        if (!Number.isFinite(rect.cx) || !Number.isFinite(rect.cy)) continue;
        const width = rect.hx * 2;
        const height = rect.hy * 2;
        const el = createSvgElement('rect', {
          x: rect.cx - rect.hx,
          y: rect.cy - rect.hy,
          width,
          height,
          class: dirClass ? `cell-rect ${dirClass}` : 'cell-rect',
          'data-cell-id': cell.id
        });
        if (Number.isFinite(rect.angleRad) && rect.angleRad !== 0) {
          const angleDeg = (rect.angleRad * 180) / Math.PI;
          el.setAttribute('transform', `rotate(${angleDeg} ${rect.cx} ${rect.cy})`);
        }
        el.addEventListener('click', (event) => {
          event.stopPropagation();
          setSelection('cell', cell.id);
        });
        layerGroups.cells.appendChild(el);
        elements.push(el);
      }
      if (cell.id) {
        mapState.cache.cellElementsById.set(cell.id, elements);
      }
    }
  }

  function renderSwept(state) {
    const mapState = state.mapState;
    if (!mapState) return;
    const key = `${mapState.version}|${state.activeView}|${getSweptFilterKey(state)}`;
    if (layerState.sweptKey === key) return;
    layerState.sweptKey = key;
    clearElement(layerGroups.swept);
    mapState.cache.bboxElementsById.clear();

    for (const cell of mapState.cells) {
      if (!shouldRenderSweptCell(state, cell)) continue;
      const dirClass =
        cell.dir === 'B_TO_A' ? 'dir-b' : cell.dir === 'A_TO_B' ? 'dir-a' : '';
      const bbox = cell.sweptShape?.bbox;
      if (!bbox || !Number.isFinite(bbox.minXM) || !Number.isFinite(bbox.minYM)) continue;
      const width = bbox.maxXM - bbox.minXM;
      const height = bbox.maxYM - bbox.minYM;
      if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) continue;
      const rect = createSvgElement('rect', {
        x: bbox.minXM,
        y: bbox.minYM,
        width,
        height,
        class: dirClass ? `cell-bbox ${dirClass}` : 'cell-bbox',
        'data-cell-id': cell.id
      });
      rect.addEventListener('click', (event) => {
        event.stopPropagation();
        setSelection('cell', cell.id);
      });
      layerGroups.swept.appendChild(rect);
      if (cell.id) {
        mapState.cache.bboxElementsById.set(cell.id, rect);
      }
    }
  }

  function renderPivot(state) {
    const mapState = state.mapState;
    if (!mapState) return;
    const key = `${mapState.version}|${state.activeView}|${getSweptFilterKey(state)}`;
    if (layerState.pivotKey === key) return;
    layerState.pivotKey = key;
    clearElement(layerGroups.pivot);

    for (const cell of mapState.cells) {
      if (!shouldRenderSweptCell(state, cell)) continue;
      const dirClass =
        cell.dir === 'B_TO_A' ? 'dir-b' : cell.dir === 'A_TO_B' ? 'dir-a' : '';
      for (const rect of cell.rects) {
        if (!Number.isFinite(rect.pivotX) || !Number.isFinite(rect.pivotY)) continue;
        if (Number.isFinite(rect.frontX) && Number.isFinite(rect.frontY)) {
          const line = createSvgElement('line', {
            x1: rect.pivotX,
            y1: rect.pivotY,
            x2: rect.frontX,
            y2: rect.frontY,
            class: dirClass ? `cell-arrow ${dirClass}` : 'cell-arrow',
            'data-cell-id': cell.id
          });
          line.setAttribute('marker-end', 'url(#pivot-arrow)');
          layerGroups.pivot.appendChild(line);
        }
        const marker = createSvgElement('circle', {
          cx: rect.pivotX,
          cy: rect.pivotY,
          r: 0.06,
          class: dirClass ? `cell-pivot ${dirClass}` : 'cell-pivot',
          'data-cell-id': cell.id
        });
        layerGroups.pivot.appendChild(marker);
      }
    }
  }

  function renderNodes(state) {
    const mapState = state.mapState;
    if (!mapState || layerState.version === mapState.version) return;
    clearElement(layerGroups.nodes);
    clearElement(layerGroups.labels);
    mapState.cache.nodeElementsById.clear();
    mapState.cache.labelElementsById.clear();

    for (const node of mapState.nodes) {
      if (!node.pos) continue;
      const nodeClass = normalizeNodeClass(node.className);
      const circle = createSvgElement('circle', {
        cx: node.pos.x,
        cy: node.pos.y,
        r: 0.22,
        class: `map-node ${nodeClass}`,
        'data-node-id': node.id
      });
      circle.addEventListener('click', (event) => {
        event.stopPropagation();
        setSelection('node', node.id);
      });
      layerGroups.nodes.appendChild(circle);
      mapState.cache.nodeElementsById.set(node.id, circle);

      const label = createSvgElement('text', {
        x: node.pos.x,
        y: node.pos.y + NODE_LABEL_OFFSET,
        class: `node-label ${nodeClass}`,
        'data-node-id': node.id
      });
      label.textContent = node.id;
      layerGroups.labels.appendChild(label);
      mapState.cache.labelElementsById.set(node.id, label);
    }
  }

  function renderMiniMap(state) {
    const mapState = state.mapState;
    if (!mapState || layerState.miniVersion === mapState.version) return;
    clearElement(miniGroup);
    miniGroup.appendChild(miniViewport);

    for (const edge of mapState.edges) {
      const d = mapState.cache.edgePaths.get(edge.id);
      if (!d) continue;
      const path = createSvgElement('path', { d, class: 'mini-map-edge' });
      miniGroup.appendChild(path);
    }
    layerState.miniVersion = mapState.version;
  }

  function render(state) {
    if (!state.mapState) return;

    renderEdges(state);
    renderCorridors(state);
    renderCoverage(state);
    renderLength(state);
    renderCells(state);
    renderPivot(state);
    renderSwept(state);
    renderNodes(state);
    renderMiniMap(state);

    layerState.version = state.mapState.version;
    applyLayerVisibility();
    updateSelectionHighlight();
    updateViewSummaries(state);
  }

  function updateSelectionHighlight() {
    const state = mapStore.getState();
    const cache = state.mapState?.cache;
    if (!cache) return;
    if (layerState.lastSelection) {
      const { kind, id } = layerState.lastSelection;
      clearSelectionClass(kind, id, cache);
    }
    if (!state.selection?.kind || !state.selection?.id) {
      clearConflictHighlight(cache);
      layerState.lastSelection = null;
      return;
    }
    const { kind, id } = state.selection;
    applySelectionClass(kind, id, cache);
    if (state.layers?.conflicts || state.activeView === 'conflicts') {
      applyConflictHighlight(kind, id, cache);
    } else {
      clearConflictHighlight(cache);
    }
    layerState.lastSelection = { kind, id };
  }

  function clearSelectionClass(kind, id, cache) {
    if (kind === 'cell') {
      const rects = cache.cellElementsById.get(id) || [];
      rects.forEach((rect) => rect.classList.remove('selected'));
      const bbox = cache.bboxElementsById?.get(id);
      if (bbox) bbox.classList.remove('selected');
    }
    if (kind === 'node') {
      const node = cache.nodeElementsById.get(id);
      if (node) node.classList.remove('selected');
    }
    if (kind === 'edge') {
      const edge = cache.edgeElementsById.get(id);
      if (edge) edge.classList.remove('selected');
    }
  }

  function applySelectionClass(kind, id, cache) {
    if (kind === 'cell') {
      const rects = cache.cellElementsById.get(id) || [];
      rects.forEach((rect) => rect.classList.add('selected'));
      const bbox = cache.bboxElementsById?.get(id);
      if (bbox) bbox.classList.add('selected');
    }
    if (kind === 'node') {
      const node = cache.nodeElementsById.get(id);
      if (node) node.classList.add('selected');
    }
    if (kind === 'edge') {
      const edge = cache.edgeElementsById.get(id);
      if (edge) edge.classList.add('selected');
    }
  }

  function applyConflictHighlight(kind, id, cache) {
    clearConflictHighlight(cache);
    if (kind !== 'cell') return;
    const cell = cache.cellsById?.get(id);
    if (!cell) return;
    const conflicts = Array.isArray(cell.conflictSet) ? cell.conflictSet : [];
    for (const otherId of conflicts) {
      const rects = cache.cellElementsById.get(otherId) || [];
      rects.forEach((rect) => rect.classList.add('conflict'));
    }
  }

  function clearConflictHighlight(cache) {
    cache.cellElementsById.forEach((rects) => {
      rects.forEach((rect) => rect.classList.remove('conflict'));
    });
  }

  function applyConflictHeatmap(state, enabled) {
    const mapState = state.mapState;
    if (!mapState) return;
    const max = mapState.analysis?.conflictMax || 0;
    mapState.cache.cellElementsById.forEach((rects, cellId) => {
      rects.forEach((rect) => {
        if (!enabled || max === 0) {
          rect.classList.remove('heat');
          rect.style.removeProperty('--cell-heat-fill');
          rect.style.removeProperty('--cell-heat-stroke');
          return;
        }
        const cell = mapState.cache.cellsById.get(cellId);
        const count = cell?.conflictCount || 0;
        const t = Math.min(1, Math.max(0, count / max));
        const hue = 180 - 160 * t;
        const fill = `hsla(${hue}, 70%, 45%, ${0.12 + 0.35 * t})`;
        const stroke = `hsla(${hue}, 70%, 35%, ${0.4 + 0.4 * t})`;
        rect.classList.add('heat');
        rect.style.setProperty('--cell-heat-fill', fill);
        rect.style.setProperty('--cell-heat-stroke', stroke);
      });
    });
  }

  function setSelection(kind, id) {
    updateState((state) => {
      state.selection = {
        type: kind,
        kind,
        id,
        ids: id ? [id] : [],
        primaryId: id || null
      };
    }, 'selection');
    updateSelectionDetails();
  }

  function updateSelectionDetails() {
    const state = mapStore.getState();
    if (!selectionDetails) return;
    const selection = state.selection;
    const cache = state.mapState?.cache;
    if (!selection || !cache || !selection.id) {
      selectionDetails.textContent = JSON.stringify({}, null, 2);
      return;
    }
    let payload = null;
    if (selection.kind === 'cell') {
      payload = cache.cellsById?.get(selection.id) || null;
    } else if (selection.kind === 'node') {
      payload = cache.nodesById?.get(selection.id) || null;
    } else if (selection.kind === 'edge') {
      payload = cache.edgesById?.get(selection.id) || null;
    }
    selectionDetails.textContent = JSON.stringify(payload || {}, null, 2);
  }

  function clearSearchMatches() {
    layerState.matchElements.forEach((el) => el.classList.remove('is-match'));
    layerState.matchElements = [];
  }

  function applySearch(query) {
    clearSearchMatches();
    if (!query) return;
    const state = mapStore.getState();
    const cache = state.mapState?.cache;
    if (!cache) return;
    const lower = query.toLowerCase();

    const tryMatch = (id, element) => {
      if (!id || !element) return;
      if (String(id).toLowerCase().includes(lower)) {
        element.classList.add('is-match');
        layerState.matchElements.push(element);
      }
    };

    cache.nodeElementsById.forEach((element, id) => tryMatch(id, element));
    cache.edgeElementsById.forEach((element, id) => tryMatch(id, element));
    cache.cellElementsById.forEach((elements, id) => {
      if (!String(id).toLowerCase().includes(lower)) return;
      elements.forEach((element) => {
        element.classList.add('is-match');
        layerState.matchElements.push(element);
      });
    });

    const firstMatch = layerState.matchElements[0];
    if (firstMatch) {
      const nodeId = firstMatch.getAttribute('data-node-id');
      const cellId = firstMatch.getAttribute('data-cell-id');
      const edgeId = firstMatch.getAttribute('data-edge-id');
      if (nodeId) setSelection('node', nodeId);
      if (cellId) setSelection('cell', cellId);
      if (edgeId) setSelection('edge', edgeId);
    }
  }

  function bindLayerToggles() {
    const toggles = Array.from(document.querySelectorAll('[data-layer]'));
    toggles.forEach((toggle) => {
      toggle.addEventListener('change', (event) => {
        const layer = event.target.getAttribute('data-layer');
        updateState((state) => {
          state.layers[layer] = event.target.checked;
        }, 'layer');
      });
    });
  }

  function bindSweptDirToggles() {
    const toggles = Array.from(document.querySelectorAll('[data-swept-dir]'));
    if (!toggles.length) return;
    const sync = (toggle) => {
      const dir = toggle.getAttribute('data-swept-dir');
      if (!dir) return;
      updateState((state) => {
        if (!state.filters) state.filters = {};
        if (!state.filters.sweptDirs) {
          state.filters.sweptDirs = { A_TO_B: true, B_TO_A: true };
        }
        state.filters.sweptDirs[dir] = toggle.checked;
      }, 'swept-dir');
    };
    toggles.forEach((toggle) => {
      sync(toggle);
      toggle.addEventListener('change', () => sync(toggle));
    });
  }

  function bindSearch() {
    if (!searchInput) return;
    searchInput.addEventListener('input', (event) => {
      updateState((state) => {
        state.filters.search = event.target.value;
      }, 'search');
      applySearch(event.target.value);
    });
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        applySearch('');
      });
    }
  }

  function bindNav() {
    navItems.forEach((item) => {
      item.addEventListener('click', () => {
        const viewId = item.getAttribute('data-view') || 'map';
        updateState((state) => {
          state.activeView = viewId;
        }, 'view');
        setView(viewId);
      });
    });
  }

  function updateValidationPanel(report) {
    if (!validationDetails) return;
    validationDetails.textContent = JSON.stringify(report || {}, null, 2);
    if (!validationBadge) return;
    if (!report) {
      validationBadge.classList.add('hidden');
      validationBadge.textContent = 'validation';
      return;
    }
    validationBadge.classList.remove('hidden');
    if (report.errors && report.errors.length > 0) {
      validationBadge.classList.add('error');
      validationBadge.classList.remove('warn');
      validationBadge.textContent = `errors: ${report.errors.length}`;
    } else if (report.warnings && report.warnings.length > 0) {
      validationBadge.classList.add('warn');
      validationBadge.classList.remove('error');
      validationBadge.textContent = `warnings: ${report.warnings.length}`;
    } else {
      validationBadge.classList.remove('error');
      validationBadge.classList.remove('warn');
      validationBadge.textContent = 'ok';
    }
  }

  function updateHealthMetricsPanel(state) {
    if (!healthMetrics) return;
    const mapState = state.mapState;
    const analysis = mapState?.analysis;
    const report = state.report;
    const metrics = [
      { label: 'nodes', value: mapState?.nodes?.length ?? 0 },
      { label: 'edges', value: mapState?.edges?.length ?? 0 },
      { label: 'corridors', value: mapState?.corridors?.length ?? 0 },
      { label: 'cells', value: mapState?.cells?.length ?? 0 },
      { label: 'coverage gaps', value: analysis?.coverageGapEdges?.size ?? report?.coverageGaps ?? 'n/a' },
      { label: 'length mismatches', value: analysis?.lengthMismatchEdges?.size ?? 'n/a' },
      { label: 'conflicts avg', value: analysis?.conflictAvg ?? report?.conflictAvg ?? 'n/a' },
      { label: 'conflicts max', value: analysis?.conflictMax ?? report?.conflictMax ?? 'n/a' },
      { label: 'components', value: report?.components ?? 'n/a' },
      { label: 'validation errors', value: report?.errors?.length ?? 0 },
      { label: 'validation warnings', value: report?.warnings?.length ?? 0 }
    ];
    const lines = metrics.map((entry) => `${entry.label}: ${entry.value}`);
    healthMetrics.textContent = lines.join('\n');
  }

  function updateViewSummaries(state) {
    const analysis = state.mapState?.analysis;
    if (coverageSummary) {
      const gaps = analysis?.coverageGapEdges?.size ?? 0;
      coverageSummary.textContent = analysis
        ? `coverage gaps (edges flagged): ${gaps}`
        : 'Coverage summary unavailable.';
    }
    if (conflictsSummary) {
      const avg = analysis?.conflictAvg ?? 0;
      const max = analysis?.conflictMax ?? 0;
      conflictsSummary.textContent = analysis
        ? `conflict density avg=${avg}, max=${max}`
        : 'Conflicts summary unavailable.';
    }
    if (lengthSummary) {
      const mismatches = analysis?.lengthMismatchEdges?.size ?? 0;
      lengthSummary.textContent = analysis
        ? `length mismatches (edges flagged): ${mismatches}`
        : 'Length summary unavailable.';
    }
    if (sweptSummary) {
      const cells = state.mapState?.cells || [];
      let rects = 0;
      let bboxCount = 0;
      for (const cell of cells) {
        rects += Array.isArray(cell.sweptShape?.rects) ? cell.sweptShape.rects.length : 0;
        if (cell.sweptShape?.bbox) bboxCount += 1;
      }
      sweptSummary.textContent = cells.length
        ? `cells: ${cells.length}, rects: ${rects}, bbox: ${bboxCount}`
        : 'Swept shape summary unavailable.';
    }
  }

  function updateMetaPanel(meta) {
    if (!meta || !metaLine) return;
    const source = meta.source || meta.mapName || 'unknown';
    const version = meta.compilerVersion || meta.version || '';
    metaLine.textContent = `${source}${version ? ` (${version})` : ''}`;
  }

  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${url} -> ${res.status}: ${text}`);
    }
    return res.json();
  }

  async function loadArtifacts() {
    setStatus('loading');
    try {
      const [sceneGraph, compiledMap, config] = await Promise.all([
        fetchJson('/api/scene-graph'),
        fetchJson('/api/compiled-map'),
        fetchJson('/api/config')
      ]);
      uiConfig.cellsMinZoom = Number.isFinite(config.cellsMinZoom) ? config.cellsMinZoom : uiConfig.cellsMinZoom;
      uiConfig.labelMinZoom = Number.isFinite(config.labelMinZoom) ? config.labelMinZoom : uiConfig.labelMinZoom;
      updateState((state) => {
        state.compareDir = config.compareDir || null;
      }, 'config');
      if (determinismPlaceholder) {
        determinismPlaceholder.textContent = config.compareDir
          ? `Diff ready: ${config.compareDir}`
          : 'Provide --compare-dir to enable diff view.';
      }

      const mapState = buildMapState(sceneGraph, compiledMap);
      updateState((state) => {
        state.mapState = mapState;
      }, 'map');

      fitBounds();
      render(mapStore.getState());
      updateHealthMetricsPanel(mapStore.getState());
      setStatus('loaded');

      try {
        const meta = await fetchJson('/api/meta');
        updateState((state) => {
          state.meta = meta;
        }, 'meta');
        updateMetaPanel(meta);
      } catch (_) {}

      try {
        const report = await fetchJson('/api/report');
        updateState((state) => {
          state.report = report;
        }, 'report');
        updateValidationPanel(report);
        updateHealthMetricsPanel(mapStore.getState());
      } catch (_) {
        updateValidationPanel(null);
        updateHealthMetricsPanel(mapStore.getState());
      }
    } catch (err) {
      setStatus('error');
      if (validationDetails) {
        validationDetails.textContent = JSON.stringify({ error: err.message }, null, 2);
      }
    }
  }

  if (mapStore && mapLayers) {
    mapStore.subscribe((state) => {
      render(state);
    });
  }

  bindLayerToggles();
  bindSweptDirToggles();
  bindSearch();
  bindNav();
  bindPanZoom();
  if (fitViewBtn) fitViewBtn.addEventListener('click', fitBounds);
  if (resetViewBtn) resetViewBtn.addEventListener('click', fitBounds);

  setView('map');

  mapSvg.addEventListener('click', () => {
    setSelection(null, null);
  });

  if (mapAdapters) {
    mapAdapters.register({
      sync: () => {}
    });
    mapAdapters.sync('init');
  }

  loadArtifacts();
})();

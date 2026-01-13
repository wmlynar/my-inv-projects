(() => {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const INVERT_Y = true;

  const mapWrap = document.getElementById('map-wrap');
  const mapSvg = document.getElementById('map-svg');
  const fitViewBtn = document.getElementById('fit-view-btn');
  const resetViewBtn = document.getElementById('reset-view-btn');
  const selectionDetails = document.getElementById('selection-details');
  const statusText = document.getElementById('status-text');
  const metaLine = document.getElementById('meta-line');
  const mapWarning = document.getElementById('map-warning');
  const sceneFileInput = document.getElementById('scene-file');
  const compiledFileInput = document.getElementById('compiled-file');
  const clearMapBtn = document.getElementById('clear-map-btn');
  const playBtn = document.getElementById('play-btn');
  const nextEventBtn = document.getElementById('next-event-btn');
  const speedSelect = document.getElementById('speed-select');
  const timeSlider = document.getElementById('time-slider');
  const timeLabel = document.getElementById('time-label');
  const eventList = document.getElementById('event-list');

  const layerInputs = Array.from(document.querySelectorAll('[data-layer]'));

  const state = {
    session: null,
    graph: null,
    mapNodesWithPos: [],
    mapState: { ready: true },
    hasMap: false,
    bounds: null,
    viewport: null,
    baseViewport: null,
    trajectory: [],
    blocks: [],
    nearest: [],
    errors: [],
    events: [],
    mapSources: { sceneGraph: null, compiledMap: null },
    manualMap: { sceneGraph: null, compiledMap: null },
    layerVisibility: {
      edges: true,
      nodes: true,
      trajectory: true,
      blocks: true,
      nearest: true,
      errors: true,
      grid: true,
      cursor: true
    },
    cursorIndex: 0,
    playback: {
      playing: false,
      speed: 1,
      lastFrame: null,
      currentTs: null
    }
  };

  const mapLayers = createMapLayers(mapSvg);
  const helpers = {
    projectPoint: (point) => projectPoint(point),
    applyLayerVisibility: (group, visible) => {
      if (!group) return;
      group.classList.toggle('map-layer-hidden', !visible);
    },
    refs: {}
  };

  const defs = document.createElementNS(SVG_NS, 'defs');
  mapSvg.appendChild(defs);
  ensureGridPattern(defs);

  mapLayers.register(createGridLayer());
  mapLayers.register(window.FleetUI?.MapLayerEdges?.create?.() || null);
  mapLayers.register(window.FleetUI?.MapLayerNodes?.create?.() || null);
  mapLayers.register(createTrajectoryLayer());
  mapLayers.register(createBlocksLayer());
  mapLayers.register(createNearestLayer());
  mapLayers.register(createErrorsLayer());
  mapLayers.register(createCursorLayer());

  layerInputs.forEach((input) => {
    input.addEventListener('change', () => {
      const layerId = input.dataset.layer;
      state.layerVisibility[layerId] = input.checked;
      mapLayers.setVisibility({ [layerId]: input.checked });
      renderLayers();
    });
  });

  if (fitViewBtn) {
    fitViewBtn.addEventListener('click', () => fitView());
  }
  if (resetViewBtn) {
    resetViewBtn.addEventListener('click', () => resetView());
  }

  if (playBtn) {
    playBtn.addEventListener('click', () => togglePlayback());
  }
  if (nextEventBtn) {
    nextEventBtn.addEventListener('click', () => jumpToNextEvent());
  }
  if (speedSelect) {
    speedSelect.addEventListener('change', () => {
      state.playback.speed = Number(speedSelect.value) || 1;
    });
  }
  if (timeSlider) {
    timeSlider.addEventListener('input', () => {
      const index = Number(timeSlider.value);
      setCursorIndex(index, true);
    });
  }

  if (sceneFileInput) {
    sceneFileInput.addEventListener('change', () => {
      const file = sceneFileInput.files?.[0];
      if (file) {
        loadManualMap(file, 'sceneGraph');
      }
    });
  }
  if (compiledFileInput) {
    compiledFileInput.addEventListener('change', () => {
      const file = compiledFileInput.files?.[0];
      if (file) {
        loadManualMap(file, 'compiledMap');
      }
    });
  }
  if (clearMapBtn) {
    clearMapBtn.addEventListener('click', () => {
      state.manualMap.sceneGraph = null;
      state.manualMap.compiledMap = null;
      updateMapData();
    });
  }

  bindPanZoom();
  loadInitialData();

  function createMapLayers(svg) {
    const fallback = () => {
      const layers = [];
      let visibility = {};
      return {
        register(layer) {
          if (layer && !layers.includes(layer)) layers.push(layer);
        },
        setVisibility(next) {
          visibility = { ...visibility, ...next };
        },
        render(layerState, layerHelpers) {
          layers.forEach((layer) => {
            if (!layer) return;
            const visible = visibility[layer.id] !== false;
            layer.render({ svg, state: layerState, helpers: layerHelpers, visible });
          });
        }
      };
    };
    if (window.FleetUI?.MapLayers?.init) {
      return window.FleetUI.MapLayers.init({ svg });
    }
    return fallback();
  }

  function ensureGridPattern(defsEl) {
    if (!defsEl || defsEl.querySelector('#grid-pattern')) return;
    const pattern = document.createElementNS(SVG_NS, 'pattern');
    pattern.setAttribute('id', 'grid-pattern');
    pattern.setAttribute('width', '1');
    pattern.setAttribute('height', '1');
    pattern.setAttribute('patternUnits', 'userSpaceOnUse');
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', 'M 1 0 L 0 0 0 1');
    path.setAttribute('stroke', 'rgba(70, 70, 70, 0.25)');
    path.setAttribute('stroke-width', '0.05');
    path.setAttribute('fill', 'none');
    pattern.appendChild(path);
    defsEl.appendChild(pattern);
  }

  function createGridLayer() {
    let group = null;
    let gridRect = null;
    let boundsRect = null;

    return {
      id: 'grid',
      render({ svg, state: layerState, helpers, visible }) {
        if (!svg || !layerState?.bounds) return;
        if (!group) {
          group = document.createElementNS(SVG_NS, 'g');
          group.setAttribute('class', 'layer-grid');
          gridRect = document.createElementNS(SVG_NS, 'rect');
          gridRect.setAttribute('class', 'map-grid');
          boundsRect = document.createElementNS(SVG_NS, 'rect');
          boundsRect.setAttribute('class', 'map-bounds');
          group.appendChild(gridRect);
          group.appendChild(boundsRect);
          svg.appendChild(group);
        }
        helpers.applyLayerVisibility(group, visible);
        if (!visible) return;
        const { minX, minY, width, height } = layerState.bounds;
        gridRect.setAttribute('x', minX);
        gridRect.setAttribute('y', minY);
        gridRect.setAttribute('width', width);
        gridRect.setAttribute('height', height);
        boundsRect.setAttribute('x', minX);
        boundsRect.setAttribute('y', minY);
        boundsRect.setAttribute('width', width);
        boundsRect.setAttribute('height', height);
      }
    };
  }

  function createTrajectoryLayer() {
    let group = null;
    let path = null;

    return {
      id: 'trajectory',
      render({ svg, state: layerState, helpers, visible }) {
        if (!svg) return;
        if (!group) {
          group = document.createElementNS(SVG_NS, 'g');
          group.setAttribute('class', 'layer-trajectory');
          path = document.createElementNS(SVG_NS, 'path');
          path.setAttribute('class', 'trajectory-path');
          group.appendChild(path);
          svg.appendChild(group);
        }
        helpers.applyLayerVisibility(group, visible);
        if (!visible) return;
        if (!layerState.needsRebuild && path.getAttribute('d')) {
          return;
        }
        const points = layerState.trajectory || [];
        if (!points.length) {
          path.setAttribute('d', '');
          return;
        }
        let d = '';
        points.forEach((point, idx) => {
          const pos = helpers.projectPoint(point);
          if (idx === 0) {
            d += `M ${pos.x} ${pos.y}`;
          } else {
            d += ` L ${pos.x} ${pos.y}`;
          }
        });
        path.setAttribute('d', d);
      }
    };
  }

  function createBlocksLayer() {
    let group = null;

    return {
      id: 'blocks',
      render({ svg, state: layerState, helpers, visible }) {
        if (!svg) return;
        if (!group) {
          group = document.createElementNS(SVG_NS, 'g');
          group.setAttribute('class', 'layer-blocks');
          svg.appendChild(group);
        }
        helpers.applyLayerVisibility(group, visible);
        if (!visible) return;
        if (!layerState.needsRebuild && group.childNodes.length) return;
        group.innerHTML = '';
        const points = layerState.blocks || [];
        points.forEach((point) => {
          const pos = helpers.projectPoint(point);
          const circle = document.createElementNS(SVG_NS, 'circle');
          circle.setAttribute('cx', pos.x);
          circle.setAttribute('cy', pos.y);
          circle.setAttribute('r', '0.18');
          circle.setAttribute('class', 'obstacle-block');
          const title = document.createElementNS(SVG_NS, 'title');
          title.textContent = formatPointTooltip(point);
          circle.appendChild(title);
          group.appendChild(circle);
        });
      }
    };
  }

  function createNearestLayer() {
    let group = null;

    return {
      id: 'nearest',
      render({ svg, state: layerState, helpers, visible }) {
        if (!svg) return;
        if (!group) {
          group = document.createElementNS(SVG_NS, 'g');
          group.setAttribute('class', 'layer-nearest');
          svg.appendChild(group);
        }
        helpers.applyLayerVisibility(group, visible);
        if (!visible) return;
        if (!layerState.needsRebuild && group.childNodes.length) return;
        group.innerHTML = '';
        const points = layerState.nearest || [];
        points.forEach((point) => {
          const pos = helpers.projectPoint(point);
          const circle = document.createElementNS(SVG_NS, 'circle');
          circle.setAttribute('cx', pos.x);
          circle.setAttribute('cy', pos.y);
          circle.setAttribute('r', '0.18');
          circle.setAttribute('class', 'obstacle-nearest');
          const title = document.createElementNS(SVG_NS, 'title');
          title.textContent = formatPointTooltip(point);
          circle.appendChild(title);
          group.appendChild(circle);
        });
      }
    };
  }

  function createErrorsLayer() {
    let group = null;

    return {
      id: 'errors',
      render({ svg, state: layerState, helpers, visible }) {
        if (!svg) return;
        if (!group) {
          group = document.createElementNS(SVG_NS, 'g');
          group.setAttribute('class', 'layer-errors');
          svg.appendChild(group);
        }
        helpers.applyLayerVisibility(group, visible);
        if (!visible) return;
        if (!layerState.needsRebuild && group.childNodes.length) return;
        group.innerHTML = '';
        const points = layerState.errors || [];
        points.forEach((point, idx) => {
          const pos = helpers.projectPoint(point);
          const circle = document.createElementNS(SVG_NS, 'circle');
          circle.setAttribute('cx', pos.x);
          circle.setAttribute('cy', pos.y);
          circle.setAttribute('r', '0.24');
          circle.setAttribute('class', 'error-marker');
          circle.dataset.index = String(idx);
          circle.addEventListener('click', (event) => {
            event.stopPropagation();
            selectError(point);
          });
          const title = document.createElementNS(SVG_NS, 'title');
          title.textContent = formatErrorTooltip(point);
          circle.appendChild(title);
          group.appendChild(circle);
        });
      }
    };
  }

  function createCursorLayer() {
    let group = null;
    let marker = null;
    let heading = null;

    return {
      id: 'cursor',
      render({ svg, state: layerState, helpers, visible }) {
        if (!svg) return;
        if (!group) {
          group = document.createElementNS(SVG_NS, 'g');
          group.setAttribute('class', 'layer-cursor');
          marker = document.createElementNS(SVG_NS, 'circle');
          marker.setAttribute('class', 'cursor-marker');
          marker.setAttribute('r', '0.22');
          heading = document.createElementNS(SVG_NS, 'line');
          heading.setAttribute('class', 'cursor-heading');
          group.appendChild(heading);
          group.appendChild(marker);
          svg.appendChild(group);
        }
        helpers.applyLayerVisibility(group, visible);
        if (!visible) return;
        const point = layerState.trajectory?.[layerState.cursorIndex];
        if (!point) {
          marker.setAttribute('display', 'none');
          heading.setAttribute('display', 'none');
          return;
        }
        marker.setAttribute('display', 'block');
        heading.setAttribute('display', 'block');
        const pos = helpers.projectPoint(point);
        marker.setAttribute('cx', pos.x);
        marker.setAttribute('cy', pos.y);
        const yaw = Number.isFinite(point.yaw) ? point.yaw : 0;
        const direction = INVERT_Y ? -yaw : yaw;
        const dx = Math.cos(direction) * 0.6;
        const dy = Math.sin(direction) * 0.6;
        heading.setAttribute('x1', pos.x);
        heading.setAttribute('y1', pos.y);
        heading.setAttribute('x2', pos.x + dx);
        heading.setAttribute('y2', pos.y + dy);
      }
    };
  }

  function projectPoint(point) {
    if (!point) return { x: 0, y: 0 };
    const x = Number(point.x);
    const y = Number(point.y);
    return {
      x: Number.isFinite(x) ? x : 0,
      y: Number.isFinite(y) ? (INVERT_Y ? -y : y) : 0
    };
  }

  function normalizeNodes(nodes = []) {
    return nodes
      .map((node) => {
        if (!node) return null;
        const id = node.nodeId || node.id || null;
        const pos = node.pos || node.position || null;
        const x = pos ? Number(pos.xM ?? pos.x) : null;
        const y = pos ? Number(pos.yM ?? pos.y) : null;
        if (!id || !Number.isFinite(x) || !Number.isFinite(y)) return null;
        return {
          id,
          pos: { x, y },
          className: node.className || node.nodeType || ''
        };
      })
      .filter(Boolean);
  }

  function normalizeEdges(edges = []) {
    return edges
      .map((edge) => {
        if (!edge) return null;
        const id = edge.edgeId || edge.id || null;
        if (!id) return null;
        const start = edge.startNodeId || edge.start || null;
        const end = edge.endNodeId || edge.end || null;
        const startPos = readPoint(edge.p0 || edge.startPos || null);
        const endPos = readPoint(edge.p3 || edge.endPos || null);
        const controlPos1 = readPoint(edge.p1 || edge.controlPos1 || null);
        const controlPos2 = readPoint(edge.p2 || edge.controlPos2 || null);
        return {
          id,
          start,
          end,
          startPos,
          endPos,
          controlPos1,
          controlPos2,
          props: edge.props || {}
        };
      })
      .filter(Boolean);
  }

  function readPoint(point) {
    if (!point) return null;
    const x = Number(point.xM ?? point.x);
    const y = Number(point.yM ?? point.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x, y };
  }

  function computeBounds(points) {
    if (!points.length) return { minX: -10, maxX: 10, minY: -10, maxY: 10 };
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    points.forEach((point) => {
      if (!point) return;
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    });
    if (!Number.isFinite(minX) || !Number.isFinite(maxX) || !Number.isFinite(minY) || !Number.isFinite(maxY)) {
      return { minX: -10, maxX: 10, minY: -10, maxY: 10 };
    }
    return { minX, maxX, minY, maxY };
  }

  function expandBounds(bounds) {
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    const margin = Math.max(width, height) * 0.08 + 1;
    return {
      minX: bounds.minX - margin,
      maxX: bounds.maxX + margin,
      minY: bounds.minY - margin,
      maxY: bounds.maxY + margin,
      width: width + margin * 2,
      height: height + margin * 2
    };
  }

  function updateViewport(viewport) {
    if (!viewport) return;
    state.viewport = viewport;
    mapSvg.setAttribute('viewBox', `${viewport.minX} ${viewport.minY} ${viewport.width} ${viewport.height}`);
  }

  function fitView() {
    if (!state.baseViewport) return;
    updateViewport({ ...state.baseViewport });
  }

  function resetView() {
    fitView();
  }

  function bindPanZoom() {
    let isPanning = false;
    let start = null;
    let startView = null;

    mapWrap.addEventListener('wheel', (event) => {
      event.preventDefault();
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

  async function loadInitialData() {
    try {
      const session = await fetchJson('/api/session');
      const trajectoryData = await fetchJson('/api/trajectory');
      const obstaclesData = await fetchJson('/api/obstacles');
      const errorsData = await fetchJson('/api/errors');
      const eventsData = await fetchJson('/api/events');
      const sceneGraph = await fetchOptionalJson('/api/scene-graph');
      const compiledMap = await fetchOptionalJson('/api/compiled-map');

      state.session = session || null;
      state.trajectory = trajectoryData?.trajectory || [];
      state.blocks = obstaclesData?.blocks || [];
      state.nearest = obstaclesData?.nearest || [];
      state.errors = errorsData?.errors || [];
      state.events = eventsData?.events || [];
      state.mapSources.sceneGraph = sceneGraph || null;
      state.mapSources.compiledMap = compiledMap || null;

      updateMeta();
      updateMapData();
      updateTimeline();
      renderEventList();
      statusText.textContent = 'ready';
    } catch (error) {
      statusText.textContent = 'failed';
      selectionDetails.textContent = JSON.stringify({ error: error.message }, null, 2);
    }
  }

  function updateMeta() {
    if (!state.session) return;
    const mapName = state.session.mapName ? `map=${state.session.mapName}` : 'map=unknown';
    const counts = state.session.counts
      ? `frames=${state.session.counts.frames}, blocks=${state.session.counts.blocks}, errors=${state.session.counts.errors}`
      : '';
    const range = state.session.timeRange?.firstTsMs && state.session.timeRange?.lastTsMs
      ? `${formatTs(state.session.timeRange.firstTsMs)} → ${formatTs(state.session.timeRange.lastTsMs)}`
      : '';
    metaLine.textContent = [state.session.sessionName, mapName, counts, range].filter(Boolean).join(' • ');
  }

  function updateMapData() {
    const sceneGraph = state.manualMap.sceneGraph || state.mapSources.sceneGraph;
    const compiledMap = state.manualMap.compiledMap || state.mapSources.compiledMap;

    const mapData = sceneGraph || compiledMap;
    const nodes = mapData ? normalizeNodes(mapData.nodes || []) : [];
    const edges = mapData ? normalizeEdges(mapData.edges || []) : [];

    state.graph = { nodes, edges };
    state.mapNodesWithPos = nodes;
    state.hasMap = nodes.length > 0;

    const mapPoints = nodes.map((node) => projectPoint(node.pos));
    const trajectoryPoints = state.trajectory.map((point) => projectPoint(point));
    const obstaclePoints = [...state.blocks, ...state.nearest, ...state.errors].map((point) => projectPoint(point));

    const mapBounds = computeBounds(mapPoints);
    const trajectoryBounds = computeBounds([...trajectoryPoints, ...obstaclePoints]);

    let useBounds = mapBounds;
    let mismatch = false;
    if (!state.hasMap) {
      useBounds = trajectoryBounds;
    } else {
      const outsideCount = trajectoryPoints.filter((point) =>
        point.x < mapBounds.minX ||
        point.x > mapBounds.maxX ||
        point.y < mapBounds.minY ||
        point.y > mapBounds.maxY
      ).length;
      if (trajectoryPoints.length && outsideCount / trajectoryPoints.length > 0.25) {
        mismatch = true;
        useBounds = trajectoryBounds;
      }
    }

    const expanded = expandBounds(useBounds);
    state.bounds = { ...expanded };
    state.baseViewport = {
      minX: expanded.minX,
      minY: expanded.minY,
      width: expanded.width,
      height: expanded.height
    };
    updateViewport({ ...state.baseViewport });

    if (!state.hasMap) {
      mapWarning.textContent = 'Map missing. Load sceneGraph/compiledMap or rerun with --map-dir.';
    } else if (mismatch) {
      mapWarning.textContent = 'Map/log mismatch detected. Showing trajectory bounds.';
    } else {
      mapWarning.textContent = '';
    }

    renderLayers(true);
  }

  function renderLayers(needsRebuild = false) {
    state.needsRebuild = Boolean(needsRebuild);
    mapLayers.setVisibility(state.layerVisibility);
    mapLayers.render(state, helpers);
    state.needsRebuild = false;
  }

  function updateTimeline() {
    if (!timeSlider) return;
    const points = state.trajectory || [];
    if (!points.length) {
      timeSlider.min = '0';
      timeSlider.max = '0';
      timeSlider.value = '0';
      timeLabel.textContent = '--:--';
      return;
    }
    timeSlider.min = '0';
    timeSlider.max = String(points.length - 1);
    timeSlider.value = String(Math.min(state.cursorIndex, points.length - 1));
    setCursorIndex(Number(timeSlider.value), false);
  }

  function setCursorIndex(index, stopPlayback) {
    const points = state.trajectory || [];
    if (!points.length) return;
    const nextIndex = Math.max(0, Math.min(points.length - 1, index));
    state.cursorIndex = nextIndex;
    if (stopPlayback) {
      state.playback.playing = false;
      playBtn.textContent = 'Play';
    }
    const current = points[nextIndex];
    if (current) {
      timeLabel.textContent = formatTs(current.tsMs);
      state.playback.currentTs = current.tsMs;
    }
    renderLayers(false);
  }

  function togglePlayback() {
    const points = state.trajectory || [];
    if (!points.length) return;
    state.playback.playing = !state.playback.playing;
    playBtn.textContent = state.playback.playing ? 'Pause' : 'Play';
    if (state.playback.playing) {
      state.playback.lastFrame = performance.now();
      state.playback.currentTs = points[state.cursorIndex]?.tsMs ?? points[0].tsMs;
      requestAnimationFrame(stepPlayback);
    }
  }

  function stepPlayback(timestamp) {
    if (!state.playback.playing) return;
    const points = state.trajectory || [];
    if (!points.length) return;
    const lastFrame = state.playback.lastFrame ?? timestamp;
    const dt = timestamp - lastFrame;
    state.playback.lastFrame = timestamp;
    state.playback.currentTs += dt * state.playback.speed;

    const maxTs = points[points.length - 1].tsMs;
    if (state.playback.currentTs >= maxTs) {
      state.playback.playing = false;
      playBtn.textContent = 'Play';
      state.playback.currentTs = maxTs;
    }

    const nextIndex = findNearestIndex(points, state.playback.currentTs);
    if (timeSlider) {
      timeSlider.value = String(nextIndex);
    }
    setCursorIndex(nextIndex, false);

    if (state.playback.playing) {
      requestAnimationFrame(stepPlayback);
    }
  }

  function findNearestIndex(points, tsMs) {
    if (!points.length) return 0;
    let lo = 0;
    let hi = points.length - 1;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (points[mid].tsMs < tsMs) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    const idx = lo;
    const prev = points[idx - 1];
    const curr = points[idx];
    if (!prev) return idx;
    if (!curr) return idx - 1;
    return Math.abs(curr.tsMs - tsMs) < Math.abs(prev.tsMs - tsMs) ? idx : idx - 1;
  }

  function jumpToNextEvent() {
    if (!state.events.length || !state.trajectory.length) return;
    const currentTs = state.trajectory[state.cursorIndex]?.tsMs ?? state.trajectory[0].tsMs;
    const next = state.events.find((event) => event.tsMs > currentTs);
    if (!next) return;
    const nextIndex = findNearestIndex(state.trajectory, next.tsMs);
    if (timeSlider) {
      timeSlider.value = String(nextIndex);
    }
    setCursorIndex(nextIndex, true);
  }

  function renderEventList() {
    if (!eventList) return;
    if (!state.events.length) {
      eventList.textContent = 'No events loaded.';
      return;
    }
    eventList.innerHTML = '';
    const list = document.createElement('div');
    state.events.slice(0, 200).forEach((event) => {
      const item = document.createElement('div');
      item.className = 'event-item';
      const kind = document.createElement('span');
      kind.className = `event-kind ${event.kind}`;
      kind.textContent = event.kind;
      const time = document.createElement('span');
      time.textContent = formatTs(event.tsMs);
      item.appendChild(kind);
      item.appendChild(time);
      item.addEventListener('click', () => {
        const index = findNearestIndex(state.trajectory, event.tsMs);
        if (timeSlider) {
          timeSlider.value = String(index);
        }
        setCursorIndex(index, true);
        if (event.kind === 'error') {
          const error = state.errors.find((err) => err.tsMs === event.tsMs) || null;
          if (error) selectError(error);
        }
      });
      list.appendChild(item);
    });
    eventList.appendChild(list);
  }

  function selectError(error) {
    selectionDetails.textContent = JSON.stringify(error, null, 2);
  }

  function formatPointTooltip(point) {
    return `t=${formatTs(point.tsMs)}\n(${formatCoord(point.x)}, ${formatCoord(point.y)})`;
  }

  function formatErrorTooltip(error) {
    const codes = (error.errors || []).map((item) => item.code).filter(Boolean).join(', ');
    return `error ${codes || ''} @ ${formatTs(error.tsMs)}`.trim();
  }

  function formatTs(tsMs) {
    if (!Number.isFinite(tsMs)) return '--:--';
    return new Date(tsMs).toISOString();
  }

  function formatCoord(value) {
    return Number.isFinite(value) ? value.toFixed(3) : 'n/a';
  }

  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`request failed: ${url}`);
    }
    return res.json();
  }

  async function fetchOptionalJson(url) {
    const res = await fetch(url);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`request failed: ${url}`);
    return res.json();
  }

  function loadManualMap(file, key) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        state.manualMap[key] = data;
        updateMapData();
      } catch (error) {
        mapWarning.textContent = `Failed to parse ${file.name}: ${error.message}`;
      }
    };
    reader.readAsText(file);
  }
})();

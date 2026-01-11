(() => {
  const init = ({
    svg,
    wrap,
    miniSvg,
    store,
    layers,
    geometry,
    logger,
    constants = {},
    handlers = {}
  } = {}) => {
    const state = {
      graph: null,
      workflow: null,
      robots: [],
      robotsConfig: null,
      worksites: [],
      worksiteState: {},
      obstacles: [],
      mapNodesWithPos: [],
      mapActionPoints: [],
      mapActionPointIndex: new Map(),
      mapState: null,
      needsRebuild: false
    };
    const refs = {
      worksiteElements: new Map(),
      worksiteRings: new Map(),
      worksiteLabels: new Map(),
      actionPointMarkers: new Map(),
      nodeLabels: new Map(),
      nodeMarkers: new Map()
    };
    let panState = null;
    let panZoomBound = false;
    let keyboardBound = false;
    let miniMapViewport = null;
    let miniMapBound = false;
    let miniMapDrag = null;

    const clamp = geometry?.clamp || ((value, min, max) => Math.min(Math.max(value, min), max));

    const applyLayerVisibility = (group, visible) => {
      if (!group) return;
      group.classList.toggle('map-layer-hidden', !visible);
    };

    const projectPoint = (point) => geometry.projectPoint(point, state.mapState);
    const unprojectPoint = (point) => geometry.unprojectPoint(point, state.mapState);

    const getMapCenter = () => {
      if (!state.mapState) return { x: 0, y: 0 };
      return {
        x: state.mapState.x + state.mapState.width / 2,
        y: state.mapState.y + state.mapState.height / 2
      };
    };

    const updateWorksiteScale = () => {
      if (!state.mapState) return;
      const rect = svg.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const scale = state.mapState.width / rect.width;
      const zoomLevel = state.mapState.baseWidth / state.mapState.width;
      const showLabels = zoomLevel >= constants.LABEL_MIN_ZOOM;
      const showNodeLabels = zoomLevel >= constants.NODE_LABEL_MIN_ZOOM;
      const labelOffset = constants.LABEL_OFFSET_PX * scale;
      const fontSize = constants.LABEL_SIZE_PX * scale;
      const nodeLabelOffset = constants.NODE_LABEL_OFFSET_PX * scale;
      const nodeFontSize = constants.NODE_LABEL_SIZE_PX * scale;
      refs.worksiteElements.forEach((marker) => {
        const sizePx = Number(marker.dataset.sizePx || '5');
        marker.setAttribute('r', (sizePx * scale).toFixed(3));
      });
      refs.worksiteRings.forEach((ring) => {
        const sizePx = Number(ring.dataset.sizePx || '8');
        ring.setAttribute('r', (sizePx * scale).toFixed(3));
      });
      refs.actionPointMarkers.forEach((marker) => {
        const sizePx = Number(marker.dataset.sizePx || '3');
        marker.setAttribute('r', (sizePx * scale).toFixed(3));
      });
      refs.nodeMarkers.forEach((marker) => {
        const sizePx = Number(marker.dataset.sizePx || '3');
        marker.setAttribute('r', (sizePx * scale).toFixed(3));
      });
      refs.worksiteLabels.forEach((label) => {
        const baseX = Number(label.dataset.baseX || '0');
        const baseY = Number(label.dataset.baseY || '0');
        label.setAttribute('x', baseX.toFixed(3));
        label.setAttribute('y', (baseY + labelOffset).toFixed(3));
        label.setAttribute('font-size', fontSize.toFixed(3));
        label.classList.toggle('hidden', !showLabels);
      });
      refs.nodeLabels.forEach((label) => {
        const baseX = Number(label.dataset.baseX || '0');
        const baseY = Number(label.dataset.baseY || '0');
        label.setAttribute('x', baseX.toFixed(3));
        label.setAttribute('y', (baseY + nodeLabelOffset).toFixed(3));
        label.setAttribute('font-size', nodeFontSize.toFixed(3));
        label.classList.toggle('hidden', !showNodeLabels);
      });
    };

    const updateMiniMapViewport = () => {
      if (!miniMapViewport || !state.mapState) return;
      miniMapViewport.setAttribute('x', state.mapState.x);
      miniMapViewport.setAttribute('y', state.mapState.y);
      miniMapViewport.setAttribute('width', state.mapState.width);
      miniMapViewport.setAttribute('height', state.mapState.height);
    };

    const updateViewBox = () => {
      if (!state.mapState) return;
      const minX = -state.mapState.width;
      const maxX = state.mapState.baseWidth;
      const minY = -state.mapState.height;
      const maxY = state.mapState.baseHeight;
      state.mapState.x = clamp(state.mapState.x, minX, maxX);
      state.mapState.y = clamp(state.mapState.y, minY, maxY);
      svg.setAttribute(
        'viewBox',
        `${state.mapState.x} ${state.mapState.y} ${state.mapState.width} ${state.mapState.height}`
      );
      updateMiniMapViewport();
      updateWorksiteScale();
      store?.notify?.('viewport');
    };

    const getSvgPoint = (event) => {
      if (!state.mapState) return { x: 0, y: 0 };
      if (svg.createSVGPoint && svg.getScreenCTM) {
        const point = svg.createSVGPoint();
        point.x = event.clientX;
        point.y = event.clientY;
        const matrix = svg.getScreenCTM();
        if (matrix) {
          const inverse = matrix.inverse();
          const svgPoint = point.matrixTransform(inverse);
          return { x: svgPoint.x, y: svgPoint.y };
        }
      }
      const rect = svg.getBoundingClientRect();
      if (!rect.width || !rect.height) return { x: state.mapState.x, y: state.mapState.y };
      const x = state.mapState.x + ((event.clientX - rect.left) / rect.width) * state.mapState.width;
      const y = state.mapState.y + ((event.clientY - rect.top) / rect.height) * state.mapState.height;
      return { x, y };
    };

    const getMapPointFromEvent = (event) => {
      const svgPoint = getSvgPoint(event);
      return unprojectPoint(svgPoint);
    };

    const applyZoom = (factor, center) => {
      if (!state.mapState) return;
      const nextWidth = state.mapState.width * factor;
      const minScale = state.mapState.minWidth / state.mapState.width;
      const maxScaleWidth = state.mapState.maxWidth / state.mapState.width;
      const maxScaleHeight = state.mapState.maxHeight ? state.mapState.maxHeight / state.mapState.height : maxScaleWidth;
      const maxScale = Math.min(maxScaleWidth, maxScaleHeight);
      const scale = clamp(factor, minScale, maxScale);
      if (scale === 1) return;
      const newWidth = state.mapState.width * scale;
      const newHeight = state.mapState.height * scale;
      state.mapState.x = center.x - (center.x - state.mapState.x) * scale;
      state.mapState.y = center.y - (center.y - state.mapState.y) * scale;
      state.mapState.width = newWidth;
      state.mapState.height = newHeight;
      updateViewBox();
    };

    const resetViewBox = () => {
      if (!state.mapState) return;
      state.mapState.x = 0;
      state.mapState.y = 0;
      state.mapState.width = state.mapState.baseWidth;
      state.mapState.height = state.mapState.baseHeight;
      updateViewBox();
    };

    const fitViewBox = () => {
      if (!state.mapState) return;
      const points = [];
      (state.worksites || []).forEach((site) => {
        if (site.pos) points.push(projectPoint(site.pos));
      });
      (state.robots || []).forEach((robot) => {
        if (robot.pos) points.push(projectPoint(robot.pos));
      });
      if (!points.length) {
        resetViewBox();
        return;
      }
      const xs = points.map((point) => point.x);
      const ys = points.map((point) => point.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      const padding = 0.08;
      const boundsWidth = Math.max(maxX - minX, 1);
      const boundsHeight = Math.max(maxY - minY, 1);
      const baseRatio = state.mapState.baseWidth / state.mapState.baseHeight;
      let targetWidth = boundsWidth;
      let targetHeight = boundsHeight;
      if (targetWidth / targetHeight > baseRatio) {
        targetHeight = targetWidth / baseRatio;
      } else {
        targetWidth = targetHeight * baseRatio;
      }
      targetWidth *= 1 + padding;
      targetHeight *= 1 + padding;
      const clampedWidth = clamp(targetWidth, state.mapState.minWidth, state.mapState.maxWidth);
      const scale = clampedWidth / targetWidth;
      state.mapState.width = clampedWidth;
      state.mapState.height = targetHeight * scale;
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      state.mapState.x = centerX - state.mapState.width / 2;
      state.mapState.y = centerY - state.mapState.height / 2;
      updateViewBox();
    };

    const bindPanZoom = () => {
      if (panZoomBound) return;
      panZoomBound = true;

      svg.addEventListener(
        'wheel',
        (event) => {
          event.preventDefault();
          const zoomFactor = event.deltaY > 0 ? 1.05 : 0.95;
          const center = getSvgPoint(event);
          applyZoom(zoomFactor, center);
        },
        { passive: false }
      );

      svg.addEventListener('pointerdown', (event) => {
        if (event.button !== 0) return;
        if (!state.mapState) return;
        if (event.target?.closest?.('.worksite-marker')) return;
        if (event.target?.closest?.('.robot-marker')) return;
        if (event.target?.closest?.('.action-point')) return;
        if (event.target?.closest?.('.obstacle-marker')) return;
        panState = {
          startX: event.clientX,
          startY: event.clientY,
          viewX: state.mapState?.x || 0,
          viewY: state.mapState?.y || 0
        };
        wrap.classList.add('panning');
        svg.setPointerCapture(event.pointerId);
      });

      svg.addEventListener('pointermove', (event) => {
        if (!panState || !state.mapState) return;
        const rect = svg.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const dx = ((event.clientX - panState.startX) / rect.width) * state.mapState.width;
        const dy = ((event.clientY - panState.startY) / rect.height) * state.mapState.height;
        state.mapState.x = panState.viewX - dx;
        state.mapState.y = panState.viewY - dy;
        updateViewBox();
      });

      const endPan = (event) => {
        if (!panState) return;
        panState = null;
        wrap.classList.remove('panning');
        if (event?.pointerId !== undefined) {
          svg.releasePointerCapture(event.pointerId);
        }
      };

      svg.addEventListener('pointerup', endPan);
      svg.addEventListener('pointercancel', endPan);

      svg.addEventListener('dblclick', (event) => {
        event.preventDefault();
        resetViewBox();
      });
    };

    const bindKeyboardShortcuts = () => {
      if (keyboardBound) return;
      keyboardBound = true;
      document.addEventListener('keydown', (event) => {
        if (!state.mapState) return;
        const target = document.activeElement;
        const tag = target?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        const center = getMapCenter();
        if (event.key === '+' || event.key === '=') {
          event.preventDefault();
          applyZoom(0.9, center);
        } else if (event.key === '-' || event.key === '_') {
          event.preventDefault();
          applyZoom(1.1, center);
        } else if (event.key === '0') {
          event.preventDefault();
          resetViewBox();
        }
      });
    };

    const renderMiniMap = () => {
      if (!miniSvg || !state.graph || !state.mapState) return;
      miniSvg.innerHTML = '';
      miniSvg.setAttribute('viewBox', `0 0 ${state.mapState.baseWidth} ${state.mapState.baseHeight}`);
      miniSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

      const nodesIndex = new Map((state.graph.nodes || []).map((node) => [node.id, node.pos]));

      const edgesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      edgesGroup.setAttribute('class', 'mini-map-edges');

      (state.graph.edges || []).forEach((edge) => {
        const start = edge.startPos || nodesIndex.get(edge.start);
        const end = edge.endPos || nodesIndex.get(edge.end);
        if (!start || !end) return;
        const startPos = projectPoint(start);
        const endPos = projectPoint(end);
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        if (edge.controlPos1 && edge.controlPos2) {
          const c1 = projectPoint(edge.controlPos1);
          const c2 = projectPoint(edge.controlPos2);
          path.setAttribute(
            'd',
            `M ${startPos.x} ${startPos.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${endPos.x} ${endPos.y}`
          );
        } else {
          path.setAttribute('d', `M ${startPos.x} ${startPos.y} L ${endPos.x} ${endPos.y}`);
        }
        path.setAttribute('class', 'mini-map-edge');
        edgesGroup.appendChild(path);
      });

      const worksitesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      worksitesGroup.setAttribute('class', 'mini-map-worksites');

      (state.worksites || []).forEach((site) => {
        const pos = site.displayPos || site.pos;
        if (!pos) return;
        const point = projectPoint(pos);
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', point.x);
        circle.setAttribute('cy', point.y);
        circle.setAttribute('r', '1.1');
        circle.setAttribute('class', 'mini-map-worksite');
        worksitesGroup.appendChild(circle);
      });

      miniMapViewport = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      miniMapViewport.setAttribute('class', 'mini-map-viewport');

      const fragment = document.createDocumentFragment();
      fragment.appendChild(edgesGroup);
      fragment.appendChild(worksitesGroup);
      if ((state.obstacles || []).length) {
        const obstaclesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        obstaclesGroup.setAttribute('class', 'mini-map-obstacles');
        state.obstacles.forEach((obstacle) => {
          const point = projectPoint(obstacle);
          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', point.x);
          circle.setAttribute('cy', point.y);
          circle.setAttribute('r', Math.max(obstacle.radius * 0.5, 0.6));
          circle.setAttribute('class', 'mini-map-obstacle');
          obstaclesGroup.appendChild(circle);
        });
        fragment.appendChild(obstaclesGroup);
      }
      fragment.appendChild(miniMapViewport);
      miniSvg.appendChild(fragment);
      updateMiniMapViewport();

      if (!miniMapBound) {
        const updateFromMiniMapEvent = (event) => {
          if (!state.mapState) return;
          const rect = miniSvg.getBoundingClientRect();
          if (!rect.width || !rect.height) return;
          const x = ((event.clientX - rect.left) / rect.width) * state.mapState.baseWidth;
          const y = ((event.clientY - rect.top) / rect.height) * state.mapState.baseHeight;
          state.mapState.x = x - state.mapState.width / 2;
          state.mapState.y = y - state.mapState.height / 2;
          updateViewBox();
        };

        miniSvg.addEventListener('pointerdown', (event) => {
          if (!state.mapState) return;
          miniMapDrag = { pointerId: event.pointerId };
          updateFromMiniMapEvent(event);
          miniSvg.setPointerCapture(event.pointerId);
        });

        miniSvg.addEventListener('pointermove', (event) => {
          if (!miniMapDrag) return;
          updateFromMiniMapEvent(event);
        });

        const endMiniMapDrag = (event) => {
          if (!miniMapDrag) return;
          miniMapDrag = null;
          if (event?.pointerId !== undefined) {
            miniSvg.releasePointerCapture(event.pointerId);
          }
        };

        miniSvg.addEventListener('pointerup', endMiniMapDrag);
        miniSvg.addEventListener('pointercancel', endMiniMapDrag);
        miniMapBound = true;
      }
    };

    const getWorksiteOffset = (site, actionPos, mapMidY) => {
      if (!site) return { x: 0, y: 0 };
      let vertical = constants.WORKSITE_AP_OFFSET;
      if (actionPos && Number.isFinite(actionPos.y) && Number.isFinite(mapMidY)) {
        vertical = actionPos.y >= mapMidY ? constants.WORKSITE_AP_OFFSET : -constants.WORKSITE_AP_OFFSET;
      }
      let horizontal = 0;
      if (site.kind === 'pick') {
        horizontal = -constants.WORKSITE_AP_OFFSET;
      } else if (site.kind === 'drop') {
        horizontal = constants.WORKSITE_AP_OFFSET;
      }
      return { x: horizontal, y: vertical };
    };

    const getWorksiteDisplayPos = (site, actionPointIndex, mapMidY) => {
      if (!site) return null;
      const actionPos = site.point ? actionPointIndex?.get(site.point) : null;
      if (site.pos) {
        if (
          actionPos &&
          geometry.distanceBetweenPoints(site.pos, actionPos) > constants.WORKSITE_POS_MAX_DRIFT
        ) {
          const offset = getWorksiteOffset(site, actionPos, mapMidY);
          return { x: actionPos.x + offset.x, y: actionPos.y + offset.y };
        }
        return site.pos;
      }
      if (!actionPos) return null;
      const offset = getWorksiteOffset(site, actionPos, mapMidY);
      return { x: actionPos.x + offset.x, y: actionPos.y + offset.y };
    };

    const renderMap = () => {
      if (!state.graph || !state.workflow) return;
      svg.innerHTML = '';
      refs.worksiteElements = new Map();
      refs.worksiteLabels = new Map();
      refs.worksiteRings = new Map();
      refs.actionPointMarkers = new Map();
      refs.nodeMarkers = new Map();
      refs.nodeLabels = new Map();

      state.mapNodesWithPos = (state.graph.nodes || []).filter((node) => node && node.pos);
      state.mapActionPoints = state.mapNodesWithPos.filter((node) => node.className === 'ActionPoint');
      state.mapActionPointIndex = new Map(state.mapActionPoints.map((node) => [node.id, node.pos]));
      const nodeYs = state.mapNodesWithPos
        .map((node) => node?.pos?.y)
        .filter((value) => Number.isFinite(value));
      const mapMidY = nodeYs.length ? (Math.min(...nodeYs) + Math.max(...nodeYs)) / 2 : 0;
      (state.worksites || []).forEach((site) => {
        site.displayPos = getWorksiteDisplayPos(site, state.mapActionPointIndex, mapMidY) || site.pos;
      });

      const { minX, maxX, minY, maxY } = geometry.getBounds(state.graph, state.worksites || []);
      const width = maxX - minX;
      const height = maxY - minY;
      state.mapState = {
        x: -constants.MAP_OUTER_MARGIN,
        y: -constants.MAP_OUTER_MARGIN,
        width: width + constants.MAP_OUTER_MARGIN * 2,
        height: height + constants.MAP_OUTER_MARGIN * 2,
        baseWidth: width,
        baseHeight: height,
        minWidth: Math.max(width * 0.03, 5),
        maxWidth: width + constants.MAP_OUTER_MARGIN * 2,
        maxHeight: height + constants.MAP_OUTER_MARGIN * 2,
        offsetX: minX,
        offsetY: maxY
      };
      store?.setMapState?.(state.mapState, 'init');
      updateViewBox();
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      state.needsRebuild = true;
      const layerHelpers = {
        projectPoint,
        applyLayerVisibility,
        refs,
        handlers,
        buildRobotMarkerClass: handlers.buildRobotMarkerClass,
        resolveRobotModel: handlers.resolveRobotModel,
        ensureRobotMotion: handlers.ensureRobotMotion
      };
      layers.render(state, layerHelpers);
      state.needsRebuild = false;
      renderMiniMap();
    };

    const setData = ({ graph, workflow, robots, worksites, worksiteState, robotsConfig, obstacles } = {}) => {
      if (graph) state.graph = graph;
      if (workflow) state.workflow = workflow;
      if (Array.isArray(robots)) state.robots = robots;
      if (Array.isArray(worksites)) state.worksites = worksites;
      if (worksiteState) state.worksiteState = worksiteState;
      if (robotsConfig) state.robotsConfig = robotsConfig;
      if (Array.isArray(obstacles)) state.obstacles = obstacles;
      renderMap();
    };

    const updateRobots = (robots) => {
      if (Array.isArray(robots)) state.robots = robots;
      const layerHelpers = {
        projectPoint,
        applyLayerVisibility,
        refs,
        handlers,
        buildRobotMarkerClass: handlers.buildRobotMarkerClass,
        resolveRobotModel: handlers.resolveRobotModel,
        ensureRobotMotion: handlers.ensureRobotMotion
      };
      layers.render(state, layerHelpers);
    };

    const updateWorksiteState = (nextState) => {
      if (nextState) state.worksiteState = nextState;
      const layerHelpers = {
        projectPoint,
        applyLayerVisibility,
        refs,
        handlers,
        buildRobotMarkerClass: handlers.buildRobotMarkerClass,
        resolveRobotModel: handlers.resolveRobotModel,
        ensureRobotMotion: handlers.ensureRobotMotion
      };
      layers.render(state, layerHelpers);
    };

    const updateObstacles = (obstacles) => {
      if (Array.isArray(obstacles)) state.obstacles = obstacles;
      const layerHelpers = {
        projectPoint,
        applyLayerVisibility,
        refs,
        handlers,
        buildRobotMarkerClass: handlers.buildRobotMarkerClass,
        resolveRobotModel: handlers.resolveRobotModel,
        ensureRobotMotion: handlers.ensureRobotMotion
      };
      layers.render(state, layerHelpers);
      renderMiniMap();
    };

    const init = () => {
      bindPanZoom();
      bindKeyboardShortcuts();
    };

    init();

    return {
      setData,
      updateRobots,
      updateWorksiteState,
      updateObstacles,
      renderMap,
      renderMiniMap,
      resetViewBox,
      fitViewBox,
      applyZoom,
      updateViewBox,
      getMapPointFromEvent,
      projectPoint,
      unprojectPoint,
      getState: () => state,
      getRefs: () => refs
    };
  };

  window.FleetUI = window.FleetUI || {};
  window.FleetUI.MapCore = { init };
})();

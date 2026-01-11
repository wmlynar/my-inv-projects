(() => {
  const init = ({ svg, logger } = {}) => {
    const layers = [];
    let visibility = {};

    const getVisibility = (layerId, fallback = true) => {
      if (!layerId) return fallback;
      if (Object.prototype.hasOwnProperty.call(visibility, layerId)) {
        return Boolean(visibility[layerId]);
      }
      return fallback;
    };

    const api = {
      svg,
      register(layer) {
        if (layer && !layers.includes(layer)) {
          layers.push(layer);
        }
      },
      unregister(layer) {
        const index = layers.indexOf(layer);
        if (index >= 0) {
          layers.splice(index, 1);
        }
      },
      setVisibility(nextVisibility) {
        if (!nextVisibility || typeof nextVisibility !== 'object') return;
        visibility = { ...visibility, ...nextVisibility };
      },
      getVisibility,
      render(state, helpers = {}) {
        layers.forEach((layer) => {
          if (layer && typeof layer.render === 'function') {
            layer.render({ svg, state, helpers, visible: getVisibility(layer.id, true) });
          }
        });
      }
    };
    if (logger?.debug) {
      logger.debug('map-layers', 'init', { count: layers.length });
    }
    return api;
  };

  window.FleetUI = window.FleetUI || {};
  window.FleetUI.MapLayers = { init };
})();
(() => {
  const DEFAULT_SVG_NS = "http://www.w3.org/2000/svg";

  const createEdgesLayer = ({ svgNS = DEFAULT_SVG_NS } = {}) => {
    let group = null;

    return {
      id: "edges",
      render({ svg, state, helpers, visible }) {
        if (!svg || !state?.graph || !state?.mapState) return;
        const needsRebuild = state.needsRebuild || !group;
        if (needsRebuild) {
          if (group) group.remove();
          group = document.createElementNS(svgNS, "g");
          group.setAttribute("class", "map-edges map-layer");
          const nodesIndex = new Map((state.graph.nodes || []).map((node) => [node.id, node.pos]));
          (state.graph.edges || []).forEach((edge) => {
            const start = edge.startPos || nodesIndex.get(edge.start);
            const end = edge.endPos || nodesIndex.get(edge.end);
            if (!start || !end) return;
            const startPos = helpers.projectPoint(start);
            const endPos = helpers.projectPoint(end);
            const path = document.createElementNS(svgNS, "path");
            if (edge.controlPos1 && edge.controlPos2) {
              const c1 = helpers.projectPoint(edge.controlPos1);
              const c2 = helpers.projectPoint(edge.controlPos2);
              path.setAttribute(
                "d",
                `M ${startPos.x} ${startPos.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${endPos.x} ${endPos.y}`
              );
            } else {
              path.setAttribute("d", `M ${startPos.x} ${startPos.y} L ${endPos.x} ${endPos.y}`);
            }
            const width = Number(edge?.props?.width || 0);
            path.setAttribute("class", `map-edge${Number.isFinite(width) && width > 0 ? " corridor" : ""}`);
            if (Number.isFinite(width) && width > 0) {
              path.dataset.corridorWidth = String(width);
            }
            group.appendChild(path);
          });
          svg.appendChild(group);
        }
        helpers.applyLayerVisibility(group, visible);
      }
    };
  };

  const createLinksLayer = ({ svgNS = DEFAULT_SVG_NS } = {}) => {
    let group = null;

    return {
      id: "links",
      render({ svg, state, helpers, visible }) {
        if (!svg || !state?.mapState) return;
        const needsRebuild = state.needsRebuild || !group;
        if (needsRebuild) {
          if (group) group.remove();
          group = document.createElementNS(svgNS, "g");
          group.setAttribute("class", "map-links map-layer");
          (state.worksites || []).forEach((site) => {
            const sitePos = site.displayPos || site.pos;
            if (!sitePos) return;
            const actionPos = site.point ? state.mapActionPointIndex?.get(site.point) : null;
            if (!actionPos) return;
            const point = helpers.projectPoint(sitePos);
            const actionPoint = helpers.projectPoint(actionPos);
            const link = document.createElementNS(svgNS, "line");
            link.setAttribute("x1", point.x);
            link.setAttribute("y1", point.y);
            link.setAttribute("x2", actionPoint.x);
            link.setAttribute("y2", actionPoint.y);
            link.setAttribute("class", "worksite-link");
            group.appendChild(link);
          });
          svg.appendChild(group);
        }
        helpers.applyLayerVisibility(group, visible);
      }
    };
  };

  const createNodesLayer = ({ svgNS = DEFAULT_SVG_NS } = {}) => {
    let group = null;
    let labelsGroup = null;

    return {
      id: "nodes",
      render({ svg, state, helpers, visible }) {
        if (!svg || !state?.mapState) return;
        const needsRebuild = state.needsRebuild || !group;
        if (needsRebuild) {
          if (group) group.remove();
          group = document.createElementNS(svgNS, "g");
          group.setAttribute("class", "map-nodes map-layer");
          labelsGroup = document.createElementNS(svgNS, "g");
          labelsGroup.setAttribute("class", "map-labels");
          helpers.refs.nodeMarkers = new Map();
          helpers.refs.nodeLabels = new Map();
          (state.mapNodesWithPos || []).forEach((node) => {
            const pos = helpers.projectPoint(node.pos);
            const circle = document.createElementNS(svgNS, "circle");
            circle.setAttribute("cx", pos.x);
            circle.setAttribute("cy", pos.y);
            circle.setAttribute("r", "1");
            circle.setAttribute(
              "class",
              `map-node ${node.className ? node.className.replace(/\\s+/g, "-").toLowerCase() : ""}`
            );
            circle.dataset.sizePx = "6";
            circle.dataset.id = node.id;
            group.appendChild(circle);
            helpers.refs.nodeMarkers.set(node.id, circle);

            const label = document.createElementNS(svgNS, "text");
            label.textContent = node.id;
            label.setAttribute("class", "node-label");
            label.dataset.baseX = pos.x;
            label.dataset.baseY = pos.y;
            label.setAttribute("x", pos.x);
            label.setAttribute("y", pos.y);
            label.setAttribute("text-anchor", "middle");
            label.setAttribute("dominant-baseline", "hanging");
            labelsGroup.appendChild(label);
            helpers.refs.nodeLabels.set(node.id, label);
          });
          group.appendChild(labelsGroup);
          svg.appendChild(group);
        }
        helpers.applyLayerVisibility(group, visible);
      }
    };
  };

  const createActionPointsLayer = ({ svgNS = DEFAULT_SVG_NS } = {}) => {
    let group = null;

    return {
      id: "actionPoints",
      render({ svg, state, helpers, visible }) {
        if (!svg || !state?.mapState) return;
        const needsRebuild = state.needsRebuild || !group;
        if (needsRebuild) {
          if (group) group.remove();
          group = document.createElementNS(svgNS, "g");
          group.setAttribute("class", "map-action-points map-layer");
          helpers.refs.actionPointMarkers = new Map();
          (state.mapActionPoints || []).forEach((point) => {
            const pos = helpers.projectPoint(point.pos);
            const circle = document.createElementNS(svgNS, "circle");
            circle.setAttribute("cx", pos.x);
            circle.setAttribute("cy", pos.y);
            circle.setAttribute("r", "1");
            circle.setAttribute("class", "action-point");
            circle.dataset.sizePx = "3";
            circle.dataset.id = point.id;
            circle.addEventListener("click", (event) => {
              event.stopPropagation();
              helpers.handlers?.showManualMenu?.(event, point.id);
            });
            group.appendChild(circle);
            helpers.refs.actionPointMarkers.set(point.id, circle);
          });
          svg.appendChild(group);
        }
        helpers.applyLayerVisibility(group, visible);
      }
    };
  };

  const createWorksitesLayer = ({ svgNS = DEFAULT_SVG_NS } = {}) => {
    let group = null;

    const updateWorksiteClasses = (state, helpers) => {
      const elements = helpers?.refs?.worksiteElements;
      const rings = helpers?.refs?.worksiteRings;
      const labels = helpers?.refs?.worksiteLabels;
      if (!elements || !rings || !labels) return;
      (state.worksites || []).forEach((site) => {
        const siteState = state.worksiteState?.[site.id] || { occupancy: "empty", blocked: false };
        const occupancy = siteState.occupancy || "empty";
        const marker = elements.get(site.id);
        if (marker) {
          marker.classList.remove("filled", "empty", "blocked");
          marker.classList.add(occupancy);
          if (siteState.blocked) marker.classList.add("blocked");
        }
        const ring = rings.get(site.id);
        if (ring) {
          ring.classList.toggle("blocked", siteState.blocked);
        }
        const label = labels.get(site.id);
        if (label) {
          label.classList.remove("filled", "empty", "blocked");
          label.classList.add(occupancy);
          if (siteState.blocked) label.classList.add("blocked");
        }
      });
    };

    return {
      id: "worksites",
      render({ svg, state, helpers, visible }) {
        if (!svg || !state?.mapState) return;
        const needsRebuild = state.needsRebuild || !group;
        if (needsRebuild) {
          if (group) group.remove();
          group = document.createElementNS(svgNS, "g");
          group.setAttribute("class", "map-layer map-layer-worksites");
          const worksitesGroup = document.createElementNS(svgNS, "g");
          worksitesGroup.setAttribute("class", "map-worksites");
          const ringsGroup = document.createElementNS(svgNS, "g");
          ringsGroup.setAttribute("class", "map-worksite-rings");
          const labelsGroup = document.createElementNS(svgNS, "g");
          labelsGroup.setAttribute("class", "map-labels");
          helpers.refs.worksiteElements = new Map();
          helpers.refs.worksiteRings = new Map();
          helpers.refs.worksiteLabels = new Map();
          (state.worksites || []).forEach((site) => {
            const sitePos = site.displayPos || site.pos;
            if (!sitePos) return;
            const point = helpers.projectPoint(sitePos);
            const siteState = state.worksiteState?.[site.id] || { occupancy: "empty", blocked: false };
            const occupancy = siteState.occupancy || "empty";
            const circle = document.createElementNS(svgNS, "circle");
            circle.setAttribute("cx", point.x);
            circle.setAttribute("cy", point.y);
            circle.setAttribute("r", "1");
            circle.setAttribute(
              "class",
              `worksite-marker ${site.kind} ${occupancy}${siteState.blocked ? " blocked" : ""}`
            );
            circle.dataset.sizePx = site.kind === "drop" ? "18" : "15";
            circle.dataset.id = site.id;
            circle.addEventListener("click", (event) => {
              event.stopPropagation();
              helpers.handlers?.showWorksiteMenu?.(event, site.id);
            });
            circle.addEventListener("contextmenu", (event) => {
              event.preventDefault();
              event.stopPropagation();
              helpers.handlers?.showWorksiteMenu?.(event, site.id);
            });
            worksitesGroup.appendChild(circle);
            helpers.refs.worksiteElements.set(site.id, circle);

            const ring = document.createElementNS(svgNS, "circle");
            ring.setAttribute("cx", point.x);
            ring.setAttribute("cy", point.y);
            ring.setAttribute("r", "1");
            ring.setAttribute("class", `worksite-ring${siteState.blocked ? " blocked" : ""}`);
            ring.dataset.sizePx = site.kind === "drop" ? "27" : "24";
            ringsGroup.appendChild(ring);
            helpers.refs.worksiteRings.set(site.id, ring);

            const label = document.createElementNS(svgNS, "text");
            label.textContent = site.id;
            label.setAttribute(
              "class",
              `worksite-label ${occupancy}${siteState.blocked ? " blocked" : ""}`
            );
            label.dataset.baseX = point.x;
            label.dataset.baseY = point.y;
            label.setAttribute("x", point.x);
            label.setAttribute("y", point.y);
            label.setAttribute("text-anchor", "middle");
            label.setAttribute("dominant-baseline", "hanging");
            labelsGroup.appendChild(label);
            helpers.refs.worksiteLabels.set(site.id, label);
          });
          group.appendChild(worksitesGroup);
          group.appendChild(ringsGroup);
          group.appendChild(labelsGroup);
          svg.appendChild(group);
        }
        updateWorksiteClasses(state, helpers);
        helpers.applyLayerVisibility(group, visible);
      }
    };
  };

  const createObstaclesLayer = ({ svgNS = DEFAULT_SVG_NS } = {}) => {
    let group = null;

    const renderMarkers = (state, helpers) => {
      if (!group || !state?.mapState) return;
      group.innerHTML = "";
      (state.obstacles || []).forEach((obstacle) => {
        const point = helpers.projectPoint(obstacle);
        const circle = document.createElementNS(svgNS, "circle");
        circle.setAttribute("cx", point.x);
        circle.setAttribute("cy", point.y);
        circle.setAttribute("r", obstacle.radius);
        circle.setAttribute("class", `obstacle-marker ${obstacle.mode}`);
        circle.dataset.id = obstacle.id;
        circle.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          helpers.handlers?.removeObstacle?.(obstacle.id);
        });
        group.appendChild(circle);
      });
    };

    return {
      id: "obstacles",
      render({ svg, state, helpers, visible }) {
        if (!svg || !state?.mapState) return;
        const needsRebuild = state.needsRebuild || !group;
        if (needsRebuild) {
          if (group) group.remove();
          group = document.createElementNS(svgNS, "g");
          group.setAttribute("class", "map-obstacles map-layer");
          svg.appendChild(group);
        }
        renderMarkers(state, helpers);
        helpers.applyLayerVisibility(group, visible);
      }
    };
  };

  const createRobotsLayer = ({ svgNS = DEFAULT_SVG_NS } = {}) => {
    let group = null;
    let robotMarkers = new Map();

    const updateRobotMarkers = (state, helpers) => {
      if (!robotMarkers.size) return;
      robotMarkers.forEach((marker, id) => {
        const robot = (state.robots || []).find((item) => item.id === id);
        if (!robot?.pos) return;
        helpers.ensureRobotMotion(robot);
        const point = helpers.projectPoint(robot.pos);
        const headingDeg = (-robot.heading * 180) / Math.PI;
        marker.setAttribute("transform", `translate(${point.x} ${point.y}) rotate(${headingDeg})`);
        marker.setAttribute("class", helpers.buildRobotMarkerClass(robot));
      });
    };

    return {
      id: "robots",
      render({ svg, state, helpers, visible }) {
        if (!svg) return;
        const robotIds = (state.robots || []).map((robot) => robot?.id).filter(Boolean);
        if (!robotIds.length) {
          if (group) {
            group.remove();
            group = null;
          }
          robotMarkers.clear();
          return;
        }
        const needsRebuild =
          state.needsRebuild ||
          !group ||
          robotMarkers.size !== robotIds.length ||
          robotIds.some((id) => !robotMarkers.has(id));
        if (needsRebuild) {
          if (group) {
            group.remove();
          }
          group = document.createElementNS(svgNS, "g");
          group.setAttribute("class", "map-robots map-layer");
          robotMarkers = new Map();
          (state.robots || []).forEach((robot) => {
            if (!robot?.pos) return;
            helpers.ensureRobotMotion(robot);
            const point = helpers.projectPoint(robot.pos);
            const container = document.createElementNS(svgNS, "g");
            container.setAttribute("class", helpers.buildRobotMarkerClass(robot));
            container.dataset.id = robot.id;
            const model = helpers.resolveRobotModel(robot, state.robotsConfig);
            const length = model.head + model.tail;
            const halfWidth = model.width / 2;
            const body = document.createElementNS(svgNS, "rect");
            body.setAttribute("x", String(-model.tail));
            body.setAttribute("y", String(-halfWidth));
            body.setAttribute("width", String(length));
            body.setAttribute("height", String(model.width));
            body.setAttribute("rx", String(Math.min(0.2, model.width * 0.2)));
            body.setAttribute("class", "robot-body");
            const heading = document.createElementNS(svgNS, "path");
            heading.setAttribute("class", "robot-heading");
            const arrowLength = Math.max(model.width * 0.6, 0.4);
            const arrowHalfWidth = Math.max(model.width * 0.35, 0.25);
            const tipX = model.head + arrowLength;
            const baseX = model.head;
            heading.setAttribute(
              "d",
              `M ${tipX} 0 L ${baseX} ${arrowHalfWidth} L ${baseX} ${-arrowHalfWidth} Z`
            );
            container.appendChild(body);
            container.appendChild(heading);
            const headingDeg = (-robot.heading * 180) / Math.PI;
            container.setAttribute("transform", `translate(${point.x} ${point.y}) rotate(${headingDeg})`);
            container.addEventListener("click", (event) => {
              event.stopPropagation();
              helpers.handlers?.onRobotClick?.(robot.id);
            });
            group.appendChild(container);
            robotMarkers.set(robot.id, container);
          });
          svg.appendChild(group);
        }
        updateRobotMarkers(state, helpers);
        helpers.applyLayerVisibility(group, visible);
      }
    };
  };

  window.FleetUI = window.FleetUI || {};
  window.FleetUI.MapLayerEdges = { create: createEdgesLayer };
  window.FleetUI.MapLayerLinks = { create: createLinksLayer };
  window.FleetUI.MapLayerNodes = { create: createNodesLayer };
  window.FleetUI.MapLayerActionPoints = { create: createActionPointsLayer };
  window.FleetUI.MapLayerWorksites = { create: createWorksitesLayer };
  window.FleetUI.MapLayerObstacles = { create: createObstaclesLayer };
  window.FleetUI.MapLayerRobots = { create: createRobotsLayer };
})();
(() => {
  const init = ({
    svg,
    wrap,
    miniSvg,
    store,
    layers,
    geometry,
    logger,
    events,
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
      if (events?.MAP_VIEW_CHANGED && typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent(events.MAP_VIEW_CHANGED, {
            detail: { viewBox: { ...state.mapState } }
          })
        );
      }
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
(() => {
  const init = ({ elements = {}, getMapPointFromEvent, handlers = {}, logger } = {}) => {
    const {
      mapWrap,
      worksiteMenu,
      manualMenu,
      manualMenuRobot,
      mapMenu
    } = elements;
    const worksiteMenuButtons = worksiteMenu
      ? Array.from(worksiteMenu.querySelectorAll('button'))
      : [];

    const hideWorksiteMenu = () => {
      if (!worksiteMenu) return;
      worksiteMenu.classList.add('hidden');
      worksiteMenu.dataset.id = '';
    };

    const hideManualMenu = () => {
      if (!manualMenu) return;
      manualMenu.classList.add('hidden');
      manualMenu.dataset.pointId = '';
      manualMenu.dataset.robotId = '';
    };

    const hideMapMenu = () => {
      if (!mapMenu) return;
      mapMenu.classList.add('hidden');
      mapMenu.dataset.x = '';
      mapMenu.dataset.y = '';
    };

    const hideAll = () => {
      hideWorksiteMenu();
      hideManualMenu();
      hideMapMenu();
    };

    const syncWorksiteMenu = (id) => {
      if (!worksiteMenu) return;
      const state = handlers.getWorksiteState?.(id) || { occupancy: 'empty', blocked: false };
      worksiteMenuButtons.forEach((button) => {
        const group = button.dataset.group;
        const value = button.dataset.value;
        let active = false;
        if (group === 'occupancy') {
          active = value === state.occupancy;
        } else if (group === 'blocked') {
          active = (value === 'true') === state.blocked;
        }
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
    };

    const showWorksiteMenu = (event, id) => {
      if (!worksiteMenu || !mapWrap) return;
      if (!id) return;
      const containerRect = mapWrap.getBoundingClientRect();
      const offsetX = event.clientX - containerRect.left + 8;
      const offsetY = event.clientY - containerRect.top + 8;

      hideManualMenu();
      hideMapMenu();

      worksiteMenu.style.left = `${offsetX}px`;
      worksiteMenu.style.top = `${offsetY}px`;
      worksiteMenu.dataset.id = id;
      worksiteMenu.classList.remove('hidden');
      syncWorksiteMenu(id);
    };

    const showManualMenu = (event, pointId) => {
      if (!manualMenu || !manualMenuRobot || !mapWrap) return;
      const robot = handlers.getManualCommandRobot?.();
      if (!robot) return;
      const containerRect = mapWrap.getBoundingClientRect();
      const offsetX = event.clientX - containerRect.left + 8;
      const offsetY = event.clientY - containerRect.top + 8;
      hideWorksiteMenu();
      hideMapMenu();
      manualMenu.style.left = `${offsetX}px`;
      manualMenu.style.top = `${offsetY}px`;
      manualMenu.dataset.pointId = pointId;
      manualMenu.dataset.robotId = robot.id;
      manualMenuRobot.textContent = robot.name;
      manualMenu.classList.remove('hidden');
    };

    const showMapMenu = (event, point) => {
      if (!mapMenu || !mapWrap) return;
      const containerRect = mapWrap.getBoundingClientRect();
      const offsetX = event.clientX - containerRect.left + 8;
      const offsetY = event.clientY - containerRect.top + 8;

      hideWorksiteMenu();
      hideManualMenu();

      mapMenu.style.left = `${offsetX}px`;
      mapMenu.style.top = `${offsetY}px`;
      mapMenu.dataset.x = String(point.x);
      mapMenu.dataset.y = String(point.y);
      const goPointButton = mapMenu.querySelector('[data-action="go-point"]');
      if (goPointButton) {
        const manualRobot = handlers.getManualCommandRobot?.();
        const canGoPoint = handlers.isRemoteSim?.() && manualRobot?.manualMode;
        goPointButton.classList.toggle('hidden', !handlers.isRemoteSim?.());
        goPointButton.disabled = !canGoPoint;
      }
      mapMenu.classList.remove('hidden');
    };

    const bindWorksiteMenu = () => {
      if (!worksiteMenu) return;
      worksiteMenu.addEventListener('click', (event) => {
        event.stopPropagation();
        const button = event.target.closest('button');
        if (!button) return;
        const id = worksiteMenu.dataset.id;
        if (!id) return;
        const group = button.dataset.group;
        const value = button.dataset.value;
        if (group === 'occupancy') {
          handlers.setWorksiteOccupancy?.(id, value);
        } else if (group === 'blocked') {
          handlers.setWorksiteBlocked?.(id, value === 'true');
        }
        hideWorksiteMenu();
      });

      document.addEventListener('click', (event) => {
        if (!worksiteMenu.contains(event.target)) {
          hideWorksiteMenu();
        }
      });

      mapWrap?.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        const isWorksite = event.target?.classList?.contains('worksite-marker');
        if (!isWorksite) {
          hideWorksiteMenu();
        }
      });
    };

    const bindManualMenu = () => {
      if (!manualMenu) return;
      manualMenu.addEventListener('click', (event) => {
        event.stopPropagation();
        const button = event.target.closest('button');
        if (!button) return;
        const pointId = manualMenu.dataset.pointId;
        const robotId = manualMenu.dataset.robotId;
        if (!pointId || !robotId) return;
        const action = button.dataset.action;
        handlers.issueManualCommand?.(robotId, pointId, action);
        hideManualMenu();
      });

      document.addEventListener('click', (event) => {
        if (!manualMenu.contains(event.target)) {
          hideManualMenu();
        }
      });

      mapWrap?.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        if (!manualMenu.contains(event.target)) {
          hideManualMenu();
        }
      });
    };

    const bindMapMenu = () => {
      if (!mapMenu) return;
      mapMenu.addEventListener('click', (event) => {
        event.stopPropagation();
        const button = event.target.closest('button');
        if (!button) return;
        const x = Number.parseFloat(mapMenu.dataset.x);
        const y = Number.parseFloat(mapMenu.dataset.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          hideMapMenu();
          return;
        }
        const mode = button.dataset.mode || 'block';
        if (button.dataset.action === 'go-point') {
          if (!handlers.isRemoteSim?.()) {
            hideMapMenu();
            return;
          }
          const robot = handlers.getManualCommandRobot?.();
          if (!robot || !robot.manualMode) {
            hideMapMenu();
            return;
          }
          if (handlers.manualDriveEnabled?.(robot.id)) {
            handlers.setManualDriveEnabled?.(robot.id, false);
          }
          handlers
            .sendRobotCommand?.(robot.id, 'go-point', { x, y })
            ?.then?.(() => handlers.refreshFleetStatus?.())
            ?.catch?.((error) => {
              console.warn('Go-point failed', error);
            });
        }
        if (button.dataset.action === 'add-obstacle') {
          handlers.addObstacle?.({ x, y }, { mode });
        }
        hideMapMenu();
      });

      document.addEventListener('click', (event) => {
        if (!mapMenu.contains(event.target)) {
          hideMapMenu();
        }
      });

      mapWrap?.addEventListener('contextmenu', (event) => {
        const target = event.target;
        const isWorksite = target?.closest?.('.worksite-marker');
        const isActionPoint = target?.closest?.('.action-point');
        const isRobot = target?.closest?.('.robot-marker');
        const isObstacle = target?.closest?.('.obstacle-marker');
        if (isWorksite || isActionPoint || isRobot || isObstacle) {
          hideMapMenu();
          return;
        }
        if (mapMenu.contains(target)) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        const point = getMapPointFromEvent(event);
        showMapMenu(event, point);
      });
    };

    const bindEsc = () => {
      window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          hideAll();
        }
      });
    };

    const init = () => {
      bindWorksiteMenu();
      bindManualMenu();
      bindMapMenu();
      bindEsc();
    };

    init();

    return {
      showWorksiteMenu,
      showManualMenu,
      showMapMenu,
      syncWorksiteMenu,
      hideAll
    };
  };

  window.FleetUI = window.FleetUI || {};
  window.FleetUI.MapOverlay = { init };
})();
(() => {
  const init = ({
    elements = {},
    store,
    geometry,
    logger,
    events,
    constants = {},
    layerConfig = [],
    handlers = {}
  } = {}) => {
    const {
      mapShell,
      mapWrap,
      mapSvg,
      miniMapSvg,
      layerPanel,
      fitViewBtn,
      resetViewBtn,
      navControlsPause,
      navControlsStop,
      worksiteMenu,
      manualMenu,
      manualMenuRobot,
      mapMenu
    } = elements;
    if (!mapSvg || !mapWrap) {
      return { render: () => {} };
    }

    const mapLayers = window.FleetUI.MapLayers.init({ svg: mapSvg, logger });
    mapLayers.register(window.FleetUI.MapLayerEdges.create());
    mapLayers.register(window.FleetUI.MapLayerLinks.create());
    mapLayers.register(window.FleetUI.MapLayerNodes.create());
    mapLayers.register(window.FleetUI.MapLayerActionPoints.create());
    mapLayers.register(window.FleetUI.MapLayerWorksites.create());
    mapLayers.register(window.FleetUI.MapLayerObstacles.create());
    mapLayers.register(window.FleetUI.MapLayerRobots.create());

    let overlay = null;

    const mapCore = window.FleetUI.MapCore.init({
      svg: mapSvg,
      wrap: mapWrap,
      miniSvg: miniMapSvg,
      store,
      layers: mapLayers,
      geometry,
      logger,
      events,
      constants,
      handlers: {
        showWorksiteMenu: (event, id) => overlay?.showWorksiteMenu(event, id),
        showManualMenu: (event, id) => overlay?.showManualMenu(event, id),
        onRobotClick: handlers.onRobotClick,
        removeObstacle: handlers.removeObstacle,
        buildRobotMarkerClass: handlers.buildRobotMarkerClass,
        resolveRobotModel: handlers.resolveRobotModel,
        ensureRobotMotion: handlers.ensureRobotMotion
      }
    });

    overlay = window.FleetUI.MapOverlay.init({
      elements: {
        mapWrap,
        worksiteMenu,
        manualMenu,
        manualMenuRobot,
        mapMenu
      },
      getMapPointFromEvent: (event) => mapCore.getMapPointFromEvent(event),
      handlers: {
        setWorksiteOccupancy: handlers.setWorksiteOccupancy,
        setWorksiteBlocked: handlers.setWorksiteBlocked,
        issueManualCommand: handlers.issueManualCommand,
        getManualCommandRobot: handlers.getManualCommandRobot,
        sendRobotCommand: handlers.sendRobotCommand,
        refreshFleetStatus: handlers.refreshFleetStatus,
        addObstacle: handlers.addObstacle,
        isRemoteSim: handlers.isRemoteSim,
        getWorksiteState: handlers.getWorksiteState,
        manualDriveEnabled: handlers.manualDriveEnabled,
        setManualDriveEnabled: handlers.setManualDriveEnabled
      },
      logger
    });

    const layerVisibility = layerConfig.reduce((acc, layer) => {
      acc[layer.id] = layer.defaultVisible !== false;
      return acc;
    }, {});

    const renderLayerPanel = () => {
      if (!layerPanel) return;
      const buttons = layerConfig
        .map((layer) => {
          const visible = layerVisibility[layer.id] !== false;
          return `
            <button class="layer-toggle${visible ? ' active' : ''}" data-layer="${layer.id}" type="button" aria-pressed="${visible ? 'true' : 'false'}">
              ${layer.label}
            </button>
          `;
        })
        .join('');
      layerPanel.innerHTML = `
        <div class="layer-panel-title">Warstwy</div>
        <div class="layer-panel-actions">
          ${buttons}
        </div>
      `;
    };

    const bindLayerPanel = () => {
      if (!layerPanel || layerPanel.dataset.bound === 'true') return;
      layerPanel.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-layer]');
        if (!button) return;
        const layerId = button.dataset.layer;
        if (!layerId) return;
        const current = layerVisibility[layerId] !== false;
        const next = !current;
        layerVisibility[layerId] = next;
        button.classList.toggle('active', next);
        button.setAttribute('aria-pressed', next ? 'true' : 'false');
        mapLayers.setVisibility({ [layerId]: next });
        if (store?.setLayers) {
          store.setLayers({ [layerId]: next }, 'layers');
        } else {
          mapLayers.render(mapCore.getState(), {
            projectPoint: mapCore.projectPoint,
            applyLayerVisibility: () => {},
            refs: mapCore.getRefs(),
            handlers: {}
          });
        }
      });
      layerPanel.dataset.bound = 'true';
    };

    const applyWorksiteState = (id) => {
      const state = handlers.getWorksiteState?.(id) || { occupancy: 'empty', blocked: false };
      const refs = mapCore.getRefs();
      const marker = refs.worksiteElements.get(id);
      if (marker) {
        marker.classList.remove('filled', 'empty', 'blocked');
        marker.classList.add(state.occupancy);
        if (state.blocked) marker.classList.add('blocked');
      }
      const ring = refs.worksiteRings.get(id);
      if (ring) {
        ring.classList.toggle('blocked', state.blocked);
      }
      const label = refs.worksiteLabels.get(id);
      if (label) {
        label.classList.remove('filled', 'empty', 'blocked');
        label.classList.add(state.occupancy);
        if (state.blocked) label.classList.add('blocked');
      }
      if (worksiteMenu?.dataset?.id === id) {
        overlay.syncWorksiteMenu(id);
      }
    };

    const init = () => {
      renderLayerPanel();
      bindLayerPanel();
      mapLayers.setVisibility(layerVisibility);
      if (resetViewBtn) {
        resetViewBtn.addEventListener('click', () => {
          mapCore.resetViewBox();
        });
      }
      if (fitViewBtn) {
        fitViewBtn.addEventListener('click', () => {
          mapCore.fitViewBox();
        });
      }
      if (navControlsPause && navControlsStop) {
        navControlsPause.addEventListener('click', () => {
          const robotId = navControlsPause.dataset.id;
          if (robotId) handlers.toggleNavigationPause?.(robotId);
        });
        navControlsStop.addEventListener('click', () => {
          const robotId = navControlsStop.dataset.id;
          if (robotId) handlers.stopNavigation?.(robotId);
        });
      }
    };

    init();

    return {
      setData: (data) => mapCore.setData(data),
      updateRobots: (robots) => mapCore.updateRobots(robots),
      updateWorksiteState: (nextState) => mapCore.updateWorksiteState(nextState),
      updateObstacles: (obstacles) => mapCore.updateObstacles(obstacles),
      applyWorksiteState,
      resetView: () => mapCore.resetViewBox(),
      fitView: () => mapCore.fitViewBox(),
      getMapPointFromEvent: (event) => mapCore.getMapPointFromEvent(event)
    };
  };

  window.FleetUI = window.FleetUI || {};
  window.FleetUI.MapView = { init };
})();

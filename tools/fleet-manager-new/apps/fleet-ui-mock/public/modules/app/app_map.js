(() => {
  const App = window.FleetUI.App;
  const { constants, state, services } = App;

  const parseWorksiteKey = (id) => {
    const match = String(id).match(/^(.*?)(\d+)?$/);
    if (!match) return { prefix: String(id), num: null };
    const prefix = match[1] || String(id);
    const num = match[2] ? Number(match[2]) : null;
    return { prefix, num };
  };

  const sortWorksites = (list, direction) => {
    const dir = direction === constants.ORDER_DESC ? -1 : 1;
    return [...list].sort((a, b) => {
      const aKey = parseWorksiteKey(a.id);
      const bKey = parseWorksiteKey(b.id);
      if (aKey.prefix !== bKey.prefix) {
        return aKey.prefix.localeCompare(bKey.prefix) * dir;
      }
      if (aKey.num !== null && bKey.num !== null && aKey.num !== bKey.num) {
        return (aKey.num - bKey.num) * dir;
      }
      return String(a.id).localeCompare(String(b.id)) * dir;
    });
  };

  const buildWorksites = (workflow) => {
    const locations = workflow?.bin_locations || {};
    return Object.entries(locations).map(([id, item]) => {
      const kind = id.startsWith("PICK") ? "pick" : id.startsWith("DROP") ? "drop" : "worksite";
      return {
        id,
        group: item.group,
        point: item.point,
        pos: item.pos,
        kind
      };
    });
  };

  const loadWorksiteState = (worksiteList) => {
    const snapshot = {};
    worksiteList.forEach((site) => {
      snapshot[site.id] = { occupancy: "empty", blocked: false };
    });
    return snapshot;
  };

  const getWorksiteState = (id) => {
    return state.worksiteState[id] || { occupancy: "empty", blocked: false };
  };

  const persistWorksiteState = () => {};

  const updateWorksiteRemote = async (id, updates) => {
    if (!App.data?.isRemoteSim?.()) return;
    try {
      await App.data?.postFleetJson?.(`/worksites/${encodeURIComponent(id)}`, updates || {});
      App.data?.refreshFleetStatus?.();
    } catch (error) {
      console.warn("Remote worksite update failed", error);
    }
  };

  const setWorksiteOccupancy = (id, occupancy) => {
    const current = getWorksiteState(id);
    current.occupancy = constants.WORKSITE_OCCUPANCY.includes(occupancy) ? occupancy : current.occupancy;
    state.worksiteState[id] = current;
    if (App.data?.isRemoteSim?.()) {
      updateWorksiteRemote(id, { filled: current.occupancy === "filled" });
    } else {
      persistWorksiteState();
    }
    services.mapView?.updateWorksiteState?.(state.worksiteState);
    App.ui?.renderStreams?.();
    App.ui?.renderFields?.();
  };

  const setWorksiteBlocked = (id, blocked) => {
    const current = getWorksiteState(id);
    current.blocked = Boolean(blocked);
    state.worksiteState[id] = current;
    if (App.data?.isRemoteSim?.()) {
      updateWorksiteRemote(id, { blocked: current.blocked });
    } else {
      persistWorksiteState();
    }
    services.mapView?.updateWorksiteState?.(state.worksiteState);
    App.ui?.renderStreams?.();
    App.ui?.renderFields?.();
  };

  const toggleWorksiteOccupancy = (id) => {
    const current = getWorksiteState(id).occupancy;
    const next = current === "filled" ? "empty" : "filled";
    setWorksiteOccupancy(id, next);
  };

  const renderMapError = (message) => {
    if (!services.mapView?.elements?.mapSvg && !App.elements?.mapSvg) {
      return;
    }
    const mapSvg = App.elements?.mapSvg || services.mapView?.elements?.mapSvg;
    if (!mapSvg) return;
    mapSvg.innerHTML = "";
    const text = document.createElementNS(constants.SVG_NS, "text");
    text.textContent = message;
    text.setAttribute("x", "16");
    text.setAttribute("y", "24");
    text.setAttribute("fill", "#6b6055");
    text.setAttribute("font-size", "14");
    mapSvg.appendChild(text);
  };

  const clearObstacleBlocks = () => {
    state.robots.forEach((robot) => {
      if (!robot?.id) return;
      const diagnostics = App.robots?.getRobotDiagnostics?.(robot.id);
      if (diagnostics?.reason === "blocked_obstacle") {
        App.robots?.clearRobotBlock?.(robot.id);
      }
    });
  };

  const postSimJson = async (path, payload) => {
    const body = payload ? JSON.stringify(payload) : null;
    const response = await fetch(`${constants.SIM_API_BASE}${path}`, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : {},
      body
    });
    return response;
  };

  const syncLocalSimObstacleAdd = async (obstacle) => {
    if (!App.data?.isLocalSim?.() || !obstacle) return;
    const response = await postSimJson("/obstacles", obstacle);
    if (!response.ok) return;
    const payload = await response.json().catch(() => null);
    if (payload?.ok && Array.isArray(payload.obstacles)) {
      applySimObstacles(payload.obstacles);
    }
  };

  const syncLocalSimObstacleRemove = async (obstacleId) => {
    if (!App.data?.isLocalSim?.() || !obstacleId) return;
    const response = await postSimJson("/obstacles/remove", { id: obstacleId });
    if (!response.ok) return;
    const payload = await response.json().catch(() => null);
    if (payload?.ok && Array.isArray(payload.obstacles)) {
      applySimObstacles(payload.obstacles);
    }
  };

  const syncLocalSimObstacleClear = async () => {
    if (!App.data?.isLocalSim?.()) return;
    const response = await postSimJson("/obstacles/clear", {});
    if (!response.ok) return;
    const payload = await response.json().catch(() => null);
    if (payload?.ok && Array.isArray(payload.obstacles)) {
      applySimObstacles(payload.obstacles);
    }
  };

  const applySimObstacles = (items) => {
    if (!Array.isArray(items)) return;
    let maxId = 0;
    state.obstacles = items
      .map((obstacle) => {
        if (!obstacle) return null;
        const x = Number(obstacle.x);
        const y = Number(obstacle.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
        const id = obstacle.id ? String(obstacle.id) : `obs-${state.obstacleIdSeq++}`;
        const match = id.match(/^obs-(\d+)$/);
        if (match) {
          maxId = Math.max(maxId, Number(match[1]));
        }
        const rawRadius = Number(obstacle.radius);
        return {
          id,
          x,
          y,
          radius: Number.isFinite(rawRadius) ? Math.max(0, rawRadius) : constants.OBSTACLE_RADIUS,
          mode: obstacle.mode === "avoid" ? "avoid" : "block"
        };
      })
      .filter(Boolean);
    state.obstacleIdSeq = Math.max(state.obstacleIdSeq, maxId + 1 || 1);
    services.mapView?.updateObstacles?.(state.obstacles);
  };

  const refreshSimObstacles = async () => {
    if (!App.data?.isLocalSim?.()) return;
    const payload = await App.data?.fetchJsonSafe?.(`${constants.SIM_API_BASE}/obstacles`);
    if (payload?.ok && Array.isArray(payload.obstacles)) {
      applySimObstacles(payload.obstacles);
    }
  };

  const syncSimObstacles = async () => {
    if (App.data?.isLocalSim?.()) return;
    const token = ++state.simObstacleSyncToken;
    const snapshot = state.obstacles.map((obstacle) => ({
      x: obstacle.x,
      y: obstacle.y,
      radius: obstacle.radius,
      mode: obstacle.mode
    }));
    try {
      await postSimJson("/obstacles/clear", {});
    } catch (_err) {
      return;
    }
    for (const obstacle of snapshot) {
      if (token !== state.simObstacleSyncToken) return;
      try {
        await postSimJson("/obstacles", obstacle);
      } catch (_err) {
        return;
      }
    }
  };

  const addObstacle = (pos, options = {}) => {
    if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) return null;
    const obstacle = {
      id: `obs-${state.obstacleIdSeq++}`,
      x: pos.x,
      y: pos.y,
      radius: Number.isFinite(options.radius) ? Math.max(0, options.radius) : constants.OBSTACLE_RADIUS,
      mode: options.mode === "avoid" ? "avoid" : "block"
    };
    state.obstacles = [...state.obstacles, obstacle];
    services.mapView?.updateObstacles?.(state.obstacles);
    if (App.data?.isLocalSim?.()) {
      syncLocalSimObstacleAdd(obstacle).catch(() => {});
    } else {
      syncSimObstacles().catch(() => {});
    }
    return obstacle;
  };

  const removeObstacle = (obstacleId) => {
    const next = state.obstacles.filter((obstacle) => obstacle.id !== obstacleId);
    if (next.length === state.obstacles.length) return false;
    state.obstacles = next;
    services.mapView?.updateObstacles?.(state.obstacles);
    if (App.data?.isLocalSim?.()) {
      syncLocalSimObstacleRemove(obstacleId).catch(() => {});
    } else {
      clearObstacleBlocks();
      syncSimObstacles().catch(() => {});
    }
    return true;
  };

  const clearObstacles = () => {
    state.obstacles = [];
    services.mapView?.updateObstacles?.(state.obstacles);
    if (App.data?.isLocalSim?.()) {
      syncLocalSimObstacleClear().catch(() => {});
    } else {
      clearObstacleBlocks();
      syncSimObstacles().catch(() => {});
    }
  };

  const addObstacleForRobot = (robotId, mode) => {
    const robot = App.robots?.getRobotById?.(robotId);
    if (!robot?.pos) return null;
    const heading = Number.isFinite(robot.heading) ? robot.heading : 0;
    const offset = constants.OBSTACLE_RADIUS * 1.5;
    const pos = { x: robot.pos.x + Math.cos(heading) * offset, y: robot.pos.y + Math.sin(heading) * offset };
    return addObstacle(pos, { mode });
  };

  const renderMap = () => {
    if (!state.graphData || !state.workflowData) return;
    services.mapView?.setData?.({
      graph: state.graphData,
      workflow: state.workflowData,
      worksites: state.worksites,
      worksiteState: state.worksiteState,
      robots: state.robots,
      robotsConfig: state.robotsConfig,
      obstacles: state.obstacles
    });
  };

  const updateWorksiteStateFromCore = (coreWorksites) => {
    if (!Array.isArray(coreWorksites)) return;
    let touched = false;
    coreWorksites.forEach((site) => {
      if (!site || !site.id) return;
      const current = getWorksiteState(site.id);
      current.occupancy = site.filled ? "filled" : "empty";
      current.blocked = Boolean(site.blocked);
      state.worksiteState[site.id] = current;
      touched = true;
    });
    if (touched) {
      services.mapView?.updateWorksiteState?.(state.worksiteState);
    }
    App.ui?.renderStreams?.();
    App.ui?.renderFields?.();
  };

  App.map = {
    addObstacle,
    addObstacleForRobot,
    applySimObstacles,
    buildWorksites,
    clearObstacles,
    getWorksiteState,
    loadWorksiteState,
    refreshSimObstacles,
    removeObstacle,
    renderMap,
    renderMapError,
    setWorksiteBlocked,
    setWorksiteOccupancy,
    sortWorksites,
    toggleWorksiteOccupancy,
    updateWorksiteStateFromCore
  };
})();

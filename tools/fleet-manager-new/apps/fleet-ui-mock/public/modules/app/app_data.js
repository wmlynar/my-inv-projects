(() => {
  const App = window.FleetUI.App;
  const { constants, state, elements, helpers, services } = App;

  const isRemoteSim = () => [constants.LOCAL_SIM_MODE, constants.ROBOKIT_SIM_MODE].includes(state.simMode);
  const isRobokitSim = () => state.simMode === constants.ROBOKIT_SIM_MODE;
  const isLocalSim = () => state.simMode === constants.LOCAL_SIM_MODE;

  const resolveTrafficForwardStopDistance = (config) => {
    const trafficConfig = config?.traffic || {};
    const raw = Number(
      trafficConfig.forwardStopDistanceM ??
      trafficConfig.forwardStopDistance ??
      trafficConfig.stopDistanceLookahead
    );
    return Number.isFinite(raw) ? Math.max(0, raw) : 0;
  };

  const applyAlgorithmCatalog = (catalog) => {
    if (!catalog || typeof catalog !== "object") return false;
    services.settingsView?.applyCatalog?.(catalog);
    state.algorithmCatalog = catalog;
    state.algorithmCatalogLoaded = true;
    return true;
  };

  const fetchJson = async (path) => {
    if (services.dataSource?.fetchJson) {
      return services.dataSource.fetchJson(path);
    }
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load ${path}`);
    }
    return response.json();
  };

  const fetchJsonSafe = async (path) => {
    if (services.dataSource?.fetchJsonSafe) {
      return services.dataSource.fetchJsonSafe(path);
    }
    try {
      return await fetchJson(path);
    } catch (_error) {
      return null;
    }
  };

  const loadAlgorithmCatalog = async () => {
    if (state.algorithmCatalogLoaded) return state.algorithmCatalog;
    const payload = await fetchJsonSafe(constants.ALGORITHM_CATALOG_PATH);
    if (!payload) return null;
    applyAlgorithmCatalog(payload);
    return payload;
  };

  const applyFleetConfig = (config) => {
    if (!config || typeof config !== "object") return;
    if (typeof config.apiBase === "string" && config.apiBase) {
      state.fleetApiBase = config.apiBase;
      state.fleetStreamPath = `${state.fleetApiBase}/stream`;
      state.fleetStatePath = `${state.fleetApiBase}/state`;
    }
    if (typeof config.streamPath === "string" && config.streamPath) {
      state.fleetStreamPath = config.streamPath;
    }
    if (typeof config.statePath === "string" && config.statePath) {
      state.fleetStatePath = config.statePath;
    }
    if (typeof config.simMode === "string" && config.simMode) {
      const nextMode = config.simMode.toLowerCase();
      if ([constants.LOCAL_SIM_MODE, constants.ROBOKIT_SIM_MODE].includes(nextMode)) {
        state.simMode = nextMode;
      }
    }
    if (Number.isFinite(config.pollMs)) {
      state.fleetPollMs = config.pollMs;
    }
    if (typeof config.simModeMutable === "boolean") {
      state.fleetSimModeMutable = config.simModeMutable;
    }
    state.fleetCoreAvailable = Boolean(config.coreConfigured);
  };

  const applySettingsOverrides = () => {
    const simOverride = helpers.normalizeOption(
      state.settingsState.simMode,
      constants.SIM_MODE_OPTIONS.map((item) => item.value)
    );
    if (simOverride) {
      state.simMode = simOverride;
    }
  };

  const resolveSimModeOverride = () => {
    const params = new URLSearchParams(window.location.search);
    const override = params.get("sim");
    if (override) {
      const nextMode = override.toLowerCase();
      if ([constants.LOCAL_SIM_MODE, constants.ROBOKIT_SIM_MODE].includes(nextMode)) {
        state.simMode = nextMode;
      }
    }
  };

  const loadFleetConfig = async () => {
    const config = services.dataSource?.fetchConfig
      ? await services.dataSource.fetchConfig(constants.FLEET_CONFIG_PATH)
      : await fetchJsonSafe(constants.FLEET_CONFIG_PATH);
    applyFleetConfig(config);
    App.ui?.syncSettingsPanel?.();
  };

  const formatSceneTimestamp = (value) => {
    if (!value) return "--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const pad = (num) => String(num).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(
      date.getMinutes()
    )}`;
  };

  const buildSceneMapMeta = (map) => {
    const meta = map?.meta || {};
    const parts = [];
    if (meta.mapType) parts.push(meta.mapType);
    if (meta.version) parts.push(`v${meta.version}`);
    if (meta.md5) parts.push(meta.md5.slice(0, 8));
    return parts.join(" | ");
  };

  const renderScenes = () => {
    if (services.scenesView?.render) {
      services.scenesView.render();
      return;
    }
    if (!elements.scenesList) return;
    const scenes = Array.isArray(state.scenesState?.scenes) ? state.scenesState.scenes : [];
    elements.scenesList.innerHTML = "";

    if (state.scenesError) {
      const errorCard = document.createElement("div");
      errorCard.className = "card";
      errorCard.textContent = `Blad scen: ${state.scenesError}`;
      elements.scenesList.appendChild(errorCard);
    }

    if (!scenes.length) {
      if (!state.scenesError) {
        elements.scenesList.innerHTML = "<div class=\"card\">Brak scen.</div>";
      }
      return;
    }

    scenes.forEach((scene) => {
      const isActiveScene = scene.id === state.scenesState.activeSceneId;
      const createdLabel = formatSceneTimestamp(scene.createdAt);
      const maps = Array.isArray(scene.maps) ? scene.maps : [];
      const headerBadge = isActiveScene ? "<span class=\"badge\">Aktywna</span>" : "";
      const mapRows = maps
        .map((map) => {
          const mapId = map.id || "";
          const mapLabel = map.name || map.fileName || mapId || "--";
          const metaLabel = buildSceneMapMeta(map);
          const fileLabel = map.fileName ? `Plik: ${map.fileName}` : "";
          const details = [fileLabel, metaLabel].filter(Boolean).join(" | ");
          const isActiveMap = mapId && scene.activeMapId && mapId === scene.activeMapId;
          const badge = isActiveMap ? "<span class=\"badge\">Aktywna mapa</span>" : "";
          const disabled = state.scenesBusy ? "disabled" : "";
          const actionLabel = isActiveScene && isActiveMap ? "Aktywna" : "Aktywuj";
          const showButton = !(isActiveScene && isActiveMap);
          return `
            <div class="scene-map">
              <div>
                <div class="scene-map-title">${mapLabel}</div>
                <div class="scene-map-meta">${details || "--"}</div>
              </div>
              <div class="scene-map-actions">
                ${badge}
                ${showButton ? `<button class="ghost-btn small" data-action="activate-scene" data-scene-id="${scene.id}" data-map-id="${mapId}" ${disabled}>${actionLabel}</button>` : ""}
              </div>
            </div>
          `;
        })
        .join("");

      const card = document.createElement("div");
      card.className = "card scene-card";
      card.innerHTML = `
        <div class="scene-header">
          <div>
            <div class="card-title">${scene.name || scene.id}</div>
            <div class="card-meta">ID: ${scene.id || "--"} | ${createdLabel} | ${scene.kind || "custom"}</div>
          </div>
          ${headerBadge}
        </div>
        <div class="scene-map-list">
          ${mapRows || "<div class=\"card-meta\">Brak map.</div>"}
        </div>
      `;
      elements.scenesList.appendChild(card);
    });

    if (!state.scenesBound) {
      elements.scenesList.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-action]");
        if (!button) return;
        const action = button.dataset.action;
        if (action !== "activate-scene") return;
        const sceneId = button.dataset.sceneId;
        const mapId = button.dataset.mapId || null;
        if (!sceneId) return;
        activateScene(sceneId, mapId);
      });
      state.scenesBound = true;
    }
  };

  const loadScenes = async (options = {}) => {
    if (services.scenesView?.loadScenes) {
      return services.scenesView.loadScenes(options);
    }
    if (!elements.scenesList || state.scenesLoading) return;
    const silent = Boolean(options.silent);
    state.scenesLoading = true;
    state.scenesError = null;
    if (!silent) {
      elements.scenesList.innerHTML = "<div class=\"card\">Ladowanie scen...</div>";
    }
    try {
      const payload = await fetchJson("/api/scenes");
      if (payload && typeof payload === "object") {
        state.scenesState = payload;
      } else {
        state.scenesState = { activeSceneId: null, scenes: [] };
      }
    } catch (error) {
      state.scenesError = error.message || "load_failed";
    } finally {
      state.scenesLoading = false;
      renderScenes();
    }
  };

  const activateScene = async (sceneId, mapId) => {
    if (services.scenesManager?.activate) {
      await services.scenesManager.activate(sceneId, mapId);
      await loadData({ reset: true, silent: true });
      await loadScenes({ silent: true });
      return;
    }
    if (!sceneId || state.scenesBusy) return;
    state.scenesBusy = true;
    state.scenesError = null;
    renderScenes();
    try {
      const response = await fetch("/api/scenes/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sceneId, mapId })
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `activate_failed_${response.status}`);
      }
      const payload = await response.json();
      state.scenesState.activeSceneId = payload.activeSceneId || sceneId;
      const scene = state.scenesState.scenes.find((item) => item.id === state.scenesState.activeSceneId);
      if (scene) {
        scene.activeMapId = payload.activeMapId || mapId || scene.activeMapId;
      }
      await loadData({ reset: true, silent: true });
      await loadScenes({ silent: true });
    } catch (error) {
      state.scenesError = error.message || "activate_failed";
    } finally {
      state.scenesBusy = false;
      renderScenes();
    }
  };

  const resolveDispatchStrategy = () => {
    const override = helpers.normalizeOption(
      state.settingsState.dispatchStrategy,
      constants.DISPATCH_STRATEGY_OPTIONS.map((item) => item.value)
    );
    if (override) return override;
    if (state.robotsConfig?.strategy) return String(state.robotsConfig.strategy);
    return "nearest";
  };

  const resolveTrafficStrategyName = (config) => {
    const override = helpers.normalizeOption(
      state.settingsState.trafficStrategy,
      constants.TRAFFIC_STRATEGY_OPTIONS.map((item) => item.value)
    );
    if (override) return override;
    const trafficConfig = config?.traffic || {};
    return trafficConfig.strategy || config?.trafficStrategy || "simple";
  };

  const applyAlgorithmOverrides = () => {};

  const resetSceneRuntime = () => {
    stopFleetUpdates();
    state.obstacles = [];
    state.obstacleIdSeq = 1;
    state.manualTargetRobotId = null;
    services.manualDriveService?.reset?.();
    services.robotDiagnosticsService?.reset?.();
    services.packagingService?.reset?.();
    state.selectedBufferCell = null;
    state.selectedBufferLevel = 1;
    state.selectedPlaceId = null;
    state.selectedPlaceGoods = null;
    if (elements.mapSvg) {
      elements.mapSvg.innerHTML = "";
    }
    if (elements.miniMapSvg) {
      elements.miniMapSvg.innerHTML = "";
    }
  };

  const fetchMapBundle = async () => {
    if (services.dataSource?.fetchMapBundle) {
      return services.dataSource.fetchMapBundle();
    }
    return Promise.all([
      fetchJson("/data/graph.json"),
      fetchJson("/data/workflow.json5"),
      fetchJsonSafe("/data/packaging.json"),
      fetchJsonSafe("/data/robots.json")
    ]).then(([graph, workflow, packaging, robotsCfg]) => ({
      graph,
      workflow,
      packaging,
      robotsCfg
    }));
  };

  const applyMapBundle = ({ graph, workflow, packaging, robotsCfg }) => {
    state.graphData = graph;
    state.workflowData = workflow;
    state.packagingConfig = packaging;
    services.packagingService?.setConfig?.(state.packagingConfig);
    state.robotsConfig = robotsCfg;
    applyAlgorithmOverrides();
    state.worksites = App.map?.buildWorksites?.(state.workflowData) || [];
    state.worksiteState = App.map?.loadWorksiteState?.(state.worksites) || {};
    const initialRobots = App.robots?.buildRobots?.(state.graphData, state.worksites, state.robotsConfig) || [];
    const initialTasks = [];
    if (services.robotRepo) {
      services.robotRepo.setAll(initialRobots);
    } else {
      state.robots = initialRobots;
    }
    if (services.taskRepo) {
      services.taskRepo.setAll(initialTasks);
    } else {
      state.tasks = initialTasks;
    }
    App.robots?.syncDomainState?.();
    App.map?.renderMap?.();
    const refreshObstacles = App.map?.refreshSimObstacles?.();
    if (refreshObstacles?.catch) {
      refreshObstacles.catch(() => {});
    }
    App.robots?.refreshRobotDiagnostics?.();
    App.ui?.renderRobots?.();
    App.robots?.renderManualDrivePanel?.();
    App.ui?.renderStreams?.();
    App.ui?.renderFields?.();
    App.ui?.renderTasks?.();
    App.ui?.renderTrafficDiagnostics?.();
    App.packaging?.renderPackaging?.();
    App.ui?.syncSettingsPanel?.();
    state.dataLoaded = true;
    if (isLocalSim()) {
      App.packaging?.refreshPackagingState?.();
    }
    startFleetUpdates();
    App.robots?.startManualDriveLoop?.();
  };

  const loadData = async (options = {}) => {
    const { reset = false, silent = false } = options;
    const placeholders = [
      elements.robotsList,
      elements.streamsList,
      elements.fieldsList,
      elements.tasksList
    ].filter(Boolean);
    if (!silent) {
      placeholders.forEach((list) => {
        list.innerHTML = "<div class=\"card\">Ladowanie danych...</div>";
      });
      if (elements.bufferGrid) {
        elements.bufferGrid.innerHTML = "<div class=\"card\">Ladowanie bufora...</div>";
      }
      if (elements.lineRequestsList) {
        elements.lineRequestsList.innerHTML = "<div class=\"card\">Ladowanie linii...</div>";
      }
    }

    loadScenes({ silent });

    try {
      await loadFleetConfig();
      await loadAlgorithmCatalog();
      const bundle = await fetchMapBundle();
      if (reset) {
        resetSceneRuntime();
      }
      applyMapBundle(bundle);
      if (isLocalSim()) {
        syncLocalSimSettings().catch(() => {});
      }
    } catch (error) {
      App.map?.renderMapError?.("Brak danych mapy.");
      if (!silent) {
        placeholders.forEach((list) => {
          list.innerHTML = "<div class=\"card\">Brak danych.</div>";
        });
        App.packaging?.renderPackaging?.();
      }
    }
  };

  const formatCoreTaskStatus = (status) => {
    if (status === "completed") return "Completed";
    if (status === "failed") return "Failed";
    if (status === "paused") return "Paused";
    if (status === "cancelled") return "Cancelled";
    return "In progress";
  };

  const formatCoreTaskPhase = (phase) => {
    const map = {
      blocked: "Blocked",
      blocked_obstacle: "Blocked by obstacle",
      blocked_pick: "Pick blocked",
      blocked_collision: "Collision",
      reroute_drop: "Reroute drop",
      yield: "Yielding",
      recovery: "Recovery",
      stuck: "Stuck",
      picking: "Picking",
      dropping: "Dropping",
      done: "Done",
      manual_move: "Manual move",
      stopped: "Stopped",
      to_pick: "To pick",
      to_drop: "To drop",
      to_park: "Parking",
      no_route: "No route"
    };
    return map[phase] || phase || null;
  };

  const mapCoreTasks = (coreTasks) => {
    if (!Array.isArray(coreTasks)) return [];
    return coreTasks.map((task) => ({
      id: task.id,
      robotId: task.robotId || null,
      pickId: task.pickId || null,
      dropId: task.dropId || null,
      status: formatCoreTaskStatus(task.status),
      phase: formatCoreTaskPhase(task.phase),
      streamId: task.streamId || null,
      kind: task.kind || "Robokit",
      meta: task.meta || null
    }));
  };

  const mapCoreRobots = (coreRobots, baseRobots, mappedTasks) => {
    const baseById = new Map(baseRobots.map((robot) => [robot.id, robot]));
    const taskByRobot = new Map();
    const activeStatuses = new Set(["In progress", "Paused"]);
    mappedTasks.forEach((task) => {
      if (task.robotId && activeStatuses.has(task.status)) {
        taskByRobot.set(task.robotId, task);
      }
    });
    const mapped = (Array.isArray(coreRobots) ? coreRobots : []).map((core) => {
      const base = baseById.get(core.id) || {};
      const baseDispatchable = helpers.resolveBoolean(base.dispatchable, true);
      const baseControlled = helpers.resolveBoolean(base.controlled, true);
      const baseOnline = helpers.resolveBoolean(base.online, true);
      const baseManualMode = helpers.resolveBoolean(base.manualMode, false);
      const baseBlocked = helpers.resolveBoolean(base.blocked, false);
      const pose = core.pose || {};
      const pos =
        Number.isFinite(pose.x) && Number.isFinite(pose.y)
          ? { x: pose.x, y: pose.y }
          : base.pos || { x: 0, y: 0 };
      const task = taskByRobot.get(core.id);
      const activity =
        core.activity ||
        (task?.status === "Paused"
          ? "Paused"
          : task?.phase || (task ? "In progress" : "Idle"));
      return {
        ...base,
        id: core.id || base.id,
        name: base.name || core.id || "Robot",
        battery: Number.isFinite(core.battery) ? core.battery : base.battery,
        blocked: helpers.resolveBoolean(core.blocked, baseBlocked),
        task: task ? task.id : null,
        activity,
        taskStatus: Number.isFinite(core.taskStatus) ? core.taskStatus : null,
        currentStation: core.currentStation || null,
        lastStation: core.lastStation || null,
        pos,
        heading: Number.isFinite(pose.angle) ? pose.angle : base.heading || 0,
        speed: Number.isFinite(core.speed) ? core.speed : base.speed || 0,
        dispatchable: helpers.resolveBoolean(core.dispatchable, baseDispatchable),
        online: helpers.resolveBoolean(core.online, baseOnline),
        controlled: helpers.resolveBoolean(core.controlled, baseControlled),
        manualMode: helpers.resolveBoolean(core.manualMode, baseManualMode),
        state: core.state || null,
        diagnostics: core.diagnostics || null
      };
    });
    const mappedIds = new Set(mapped.map((robot) => robot.id));
    baseRobots.forEach((base) => {
      if (!mappedIds.has(base.id)) {
        mapped.push(base);
      }
    });
    return mapped;
  };

  const applyFleetStatus = (payload) => {
    if (!payload || typeof payload !== "object") return;
    if (!state.graphData) return;
    const baseRobots = App.robots?.buildRobots?.(state.graphData, state.worksites, state.robotsConfig) || [];
    const mappedTasks = mapCoreTasks(payload.tasks || []);
    const mappedRobots = mapCoreRobots(payload.robots || [], baseRobots, mappedTasks);
    if (services.robotRepo) {
      services.robotRepo.setAll(mappedRobots);
    } else {
      state.robots = mappedRobots;
    }
    if (services.taskRepo) {
      services.taskRepo.setAll(mappedTasks);
    } else {
      state.tasks = mappedTasks;
    }
    state.lastFleetUpdateAt = Date.now();
    App.robots?.syncDomainState?.();
    if (state.manualTargetRobotId) {
      const target = App.robots?.getRobotById?.(state.manualTargetRobotId);
      if (!target || !target.manualMode) {
        state.manualTargetRobotId = null;
      }
    }
    services.manualDriveService?.syncRobotAvailability?.();
    App.robots?.refreshRobotViews?.();
    App.ui?.renderTasks?.();
    services.robotsView?.syncFaultRobotSelect?.();
    App.map?.updateWorksiteStateFromCore?.(payload.worksites || []);
  };

  const refreshFleetStatus = async () => {
    if (!isRemoteSim() || state.fleetPollInFlight) return;
    state.fleetPollInFlight = true;
    try {
      const statusPath = state.fleetStatePath || `${state.fleetApiBase}/status`;
      const payload = await fetchJson(statusPath);
      applyFleetStatus(payload);
      if (isLocalSim()) {
        App.packaging?.refreshPackagingState?.();
        App.map?.refreshSimObstacles?.();
      }
    } catch (error) {
      console.warn("Fleet status refresh failed", error);
    } finally {
      state.fleetPollInFlight = false;
    }
  };

  const startFleetPolling = () => {
    if (!isRemoteSim() || state.fleetPollTimer || state.fleetStream) return;
    if (!state.fleetCoreAvailable) return;
    refreshFleetStatus();
    state.fleetPollTimer = window.setInterval(() => {
      refreshFleetStatus();
    }, state.fleetPollMs);
  };

  const stopFleetPolling = () => {
    if (state.fleetPollTimer) {
      window.clearInterval(state.fleetPollTimer);
      state.fleetPollTimer = null;
    }
    state.fleetPollInFlight = false;
  };

  const startFleetStream = () => {
    if (!isRemoteSim() || state.fleetStream) return;
    if (!state.fleetCoreAvailable) return;
    const streamUrl = state.fleetStreamPath || `${state.fleetApiBase}/stream`;
    if (services.dataSource?.streamStatus) {
      state.fleetStream = services.dataSource.streamStatus(streamUrl, {
        onMessage: (payload) => {
          if (!payload || !payload.ok) return;
          applyFleetStatus(payload);
          if (isLocalSim()) {
            App.packaging?.refreshPackagingState?.();
            App.map?.refreshSimObstacles?.();
          }
        },
        onError: () => {
          stopFleetStream();
          startFleetPolling();
        }
      });
      if (state.fleetStream) return;
    }
    if (typeof window.EventSource === "undefined") {
      startFleetPolling();
      return;
    }
    try {
      state.fleetStream = new EventSource(streamUrl);
    } catch (_error) {
      state.fleetStream = null;
      startFleetPolling();
      return;
    }
    state.fleetStream.addEventListener("state", (event) => {
      if (!event?.data) return;
      let payload = null;
      try {
        payload = JSON.parse(event.data);
      } catch (_err) {
        return;
      }
      if (!payload || !payload.ok) return;
      applyFleetStatus(payload);
      if (isLocalSim()) {
        App.packaging?.refreshPackagingState?.();
        App.map?.refreshSimObstacles?.();
      }
    });
    state.fleetStream.addEventListener("error", () => {
      stopFleetStream();
      startFleetPolling();
    });
  };

  const stopFleetStream = () => {
    if (state.fleetStream) {
      state.fleetStream.close();
      state.fleetStream = null;
    }
  };

  const startFleetUpdates = () => {
    stopFleetPolling();
    stopFleetStream();
    if (!isRemoteSim() || !state.fleetCoreAvailable) return;
    startFleetStream();
  };

  const stopFleetUpdates = () => {
    stopFleetStream();
    stopFleetPolling();
  };

  const sendRobotCommand = async (robotId, action, payload = null) => {
    if (!robotId || !action) return null;
    const path = `${state.fleetApiBase}/robots/${encodeURIComponent(robotId)}/${action}`;
    if (services.dataSource?.postJson) {
      return services.dataSource.postJson(path, payload);
    }
    const body = payload ? JSON.stringify(payload) : null;
    const response = await fetch(path, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : {},
      body
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `robot_command_failed_${response.status}`);
    }
    return response.json();
  };

  const postFleetJson = async (path, payload = null) => {
    const target = `${state.fleetApiBase}${path}`;
    if (services.dataSource?.postJson) {
      return services.dataSource.postJson(target, payload);
    }
    const body = payload ? JSON.stringify(payload) : null;
    const response = await fetch(target, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : {},
      body
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `fleet_post_failed_${response.status}`);
    }
    return response.json();
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

  const syncLocalSimSettings = async () => {
    if (!isLocalSim()) return;
    const payload = {
      dispatchStrategy: state.settingsState.dispatchStrategy,
      trafficStrategy: state.settingsState.trafficStrategy
    };
    const forwardStopDistance = Number.isFinite(state.settingsState.forwardStopDistanceM)
      ? state.settingsState.forwardStopDistanceM
      : resolveTrafficForwardStopDistance(state.robotsConfig);
    if (Number.isFinite(forwardStopDistance)) {
      payload.trafficOptions = {
        forwardStopDistanceM: forwardStopDistance
      };
    }
    const response = await postSimJson("/settings", payload);
    if (!response.ok) return;
    const data = await response.json().catch(() => null);
    if (!data?.ok) return;
  };

  App.data = {
    applyAlgorithmCatalog,
    applyAlgorithmOverrides,
    applyFleetConfig,
    applyFleetStatus,
    applySettingsOverrides,
    fetchJson,
    fetchJsonSafe,
    isLocalSim,
    isRemoteSim,
    isRobokitSim,
    loadAlgorithmCatalog,
    loadData,
    loadFleetConfig,
    loadScenes,
    refreshFleetStatus,
    resolveDispatchStrategy,
    resolveSimModeOverride,
    resolveTrafficForwardStopDistance,
    resolveTrafficStrategyName,
    sendRobotCommand,
    startFleetUpdates,
    stopFleetUpdates,
    syncLocalSimSettings,
    postFleetJson
  };
})();

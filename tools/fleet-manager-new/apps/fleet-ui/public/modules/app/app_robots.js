(() => {
  const App = window.FleetUI.App;
  const { constants, state, elements, helpers, services } = App;

  const syncDomainState = () => {
    if (!services.domainStore) return;
    const snapshot = services.domainStore.getState() || {};
    state.robots = Array.isArray(snapshot.robots) ? snapshot.robots : [];
    state.tasks = Array.isArray(snapshot.tasks) ? snapshot.tasks : [];
  };

  const refreshRobotDiagnostics = () => {
    services.robotDiagnosticsService?.refresh?.(state.robots);
  };

  const getRobotDiagnostics = (robotId) => services.robotDiagnosticsService?.get?.(robotId) || null;

  const ensureRobotMotion = (robot) => {
    if (!robot) return;
    if (!Number.isFinite(robot.heading)) robot.heading = 0;
    if (!Number.isFinite(robot.speed)) robot.speed = 0;
  };

  const normalizeRobotState = (value) => {
    if (!value || typeof value !== "object") {
      return {
        dispatchable: true,
        online: true,
        controlled: true,
        blocked: false,
        manualMode: false
      };
    }
    const online = value.online !== false;
    return {
      dispatchable: online ? value.dispatchable !== false : false,
      online,
      controlled: Boolean(value.controlled),
      blocked: Boolean(value.blocked),
      manualMode: Boolean(value.manualMode)
    };
  };

  const loadRobotState = (robotList) =>
    robotList.map((robot) => ({
      ...robot,
      ...normalizeRobotState({})
    }));

  const persistRobotState = () => {};

  const refreshRobotViews = () => {
    persistRobotState();
    refreshRobotDiagnostics();
    App.ui?.renderRobots?.();
    services.mapView?.updateRobots?.(state.robots);
    renderNavControls();
    renderManualDrivePanel();
  };

  const updateRobotState = (id, updates) => {
    if (services.robotRepo) {
      if (updates && Object.keys(updates).length) {
        services.robotRepo.update(id, updates);
      }
      syncDomainState();
    } else {
      state.robots = state.robots.map((robot) => (robot.id === id ? { ...robot, ...updates } : robot));
    }
    refreshRobotViews();
  };

  const getRobotById = (id) => state.robots.find((item) => item.id === id);

  const getFaultRobotId = () => {
    if (elements.faultRobotSelect && elements.faultRobotSelect.value) return elements.faultRobotSelect.value;
    if (state.manualTargetRobotId) return state.manualTargetRobotId;
    return state.robots[0]?.id || null;
  };

  const clearRobotBlock = (robotId) => {
    if (App.data?.isRobokitSim?.()) return false;
    const diagnostics = robotId ? getRobotDiagnostics(robotId) : null;
    if (diagnostics?.reason === "blocked_collision") {
      return clearRobotCollision(robotId);
    }
    App.data?.postFleetJson?.("/faults/clear-block", { robotId })
      .then((payload) => {
        if (!payload?.ok) {
          console.warn("Clear block rejected", payload);
        }
        App.data?.refreshFleetStatus?.();
      })
      .catch((error) => {
        console.warn("Clear block failed", error);
      });
    return true;
  };

  const clearRobotCollision = (robotId) => {
    if (App.data?.isRobokitSim?.()) return false;
    App.data?.postFleetJson?.("/faults/clear-collision", { robotId })
      .then((payload) => {
        if (!payload?.ok) {
          console.warn("Clear collision rejected", payload);
        }
        App.data?.refreshFleetStatus?.();
      })
      .catch((error) => {
        console.warn("Clear collision failed", error);
      });
    return true;
  };

  const simulatePickProblem = (robotId) => {
    if (App.data?.isRobokitSim?.()) return false;
    App.data?.postFleetJson?.("/faults/pick-problem", { robotId })
      .then(() => App.data?.refreshFleetStatus?.())
      .catch((error) => {
        console.warn("Pick problem failed", error);
      });
    return true;
  };

  const simulatePickRobotBlocked = (robotId) => {
    if (App.data?.isRobokitSim?.()) return false;
    App.data?.postFleetJson?.("/faults/pick-blocked", { robotId })
      .then(() => App.data?.refreshFleetStatus?.())
      .catch((error) => {
        console.warn("Pick blocked failed", error);
      });
    return true;
  };

  const simulateDropProblem = (robotId) => {
    if (App.data?.isRobokitSim?.()) return false;
    App.data?.postFleetJson?.("/faults/drop-problem", { robotId })
      .then(() => App.data?.refreshFleetStatus?.())
      .catch((error) => {
        console.warn("Drop problem failed", error);
      });
    return true;
  };

  const simulateDriveProblem = (robotId, mode) => {
    if (App.data?.isRobokitSim?.()) return false;
    return Boolean(App.map?.addObstacleForRobot?.(robotId, mode));
  };

  const normalizeRobotModel = (model) => {
    if (!model || typeof model !== "object") return null;
    const head = Number(model.head);
    const tail = Number(model.tail);
    const width = Number(model.width);
    if (!Number.isFinite(head) || !Number.isFinite(tail) || !Number.isFinite(width)) {
      return null;
    }
    if (head <= 0 || tail <= 0 || width <= 0) {
      return null;
    }
    return { head, tail, width };
  };

  const resolveDefaultRobotModel = (config) => {
    if (!config || typeof config !== "object") return { ...constants.DEFAULT_ROBOT_MODEL };
    const models = config.models && typeof config.models === "object" ? config.models : {};
    let candidate = null;
    if (config.defaultModel) {
      candidate =
        typeof config.defaultModel === "string" ? models[config.defaultModel] : config.defaultModel;
    }
    if (!candidate && config.model && typeof config.model === "object") {
      candidate = config.model;
    }
    const normalized = normalizeRobotModel(candidate);
    return normalized || { ...constants.DEFAULT_ROBOT_MODEL };
  };

  const resolveRobotModel = (robot, config) => {
    const models = config?.models && typeof config.models === "object" ? config.models : {};
    let candidate = null;
    if (robot) {
      if (typeof robot.model === "string") {
        candidate = models[robot.model];
      } else if (robot.model && typeof robot.model === "object") {
        candidate = robot.model;
      }
    }
    const normalized = normalizeRobotModel(candidate);
    return normalized || resolveDefaultRobotModel(config);
  };

  const buildRobots = (graph, worksiteList, config) => {
    const worksiteIndex = new Map(worksiteList.map((site) => [site.id, site.pos]));
    const nodeIndex = new Map((graph?.nodes || []).map((node) => [node.id, node.pos]));

    const resolvePos = (ref, fallbackPos) => {
      if (fallbackPos && typeof fallbackPos === "object") return fallbackPos;
      if (worksiteIndex.has(ref)) return worksiteIndex.get(ref);
      if (nodeIndex.has(ref)) return nodeIndex.get(ref);
      return worksiteList[0]?.pos || { x: 0, y: 0 };
    };

    const baseModel = resolveDefaultRobotModel(config);
    const baseRobots = [
      {
        id: "RB-01",
        name: "Robot 01",
        battery: 82,
        radius: constants.ROBOT_RADIUS,
        model: { ...baseModel },
        blocked: false,
        task: null,
        activity: "Idle",
        ref: "PICK-03",
        pos: resolvePos("PICK-03", null),
        heading: 0,
        speed: 0,
        dispatchable: true,
        online: true,
        controlled: false,
        manualMode: false
      }
    ];

    const configRobots = (config?.robots || []).map((robot, index) => {
      const id = robot.id || `RB-${String(index + 1).padStart(2, "0")}`;
      const name = robot.name || `Robot ${String(index + 1).padStart(2, "0")}`;
      const ref = robot.ref || robot.point || robot.start || "PICK-03";
      const pos = resolvePos(ref, robot.pos);
      const model = resolveRobotModel(robot, config);
      return {
        id,
        name,
        battery: Number.isFinite(robot.battery) ? robot.battery : 80,
        radius: Number.isFinite(robot.radius) ? robot.radius : constants.ROBOT_RADIUS,
        model,
        blocked: Boolean(robot.blocked),
        task: null,
        activity: "Idle",
        ref,
        pos,
        heading: Number.isFinite(robot.heading) ? robot.heading : 0,
        speed: Number.isFinite(robot.speed) ? robot.speed : 0,
        dispatchable: robot.dispatchable !== false,
        online: robot.online !== false,
        controlled: robot.controlled !== false,
        manualMode: Boolean(robot.manualMode)
      };
    });

    const robotsToUse = configRobots.length ? configRobots : baseRobots;
    return loadRobotState(robotsToUse);
  };

  const getManualCommandRobot = () => {
    if (state.manualTargetRobotId) {
      const robot = getRobotById(state.manualTargetRobotId);
      if (robot?.manualMode) return robot;
    }
    const manualRobots = state.robots.filter((robot) => robot.manualMode);
    return manualRobots.length === 1 ? manualRobots[0] : null;
  };

  const isRobotSelected = (robotId) => {
    if (state.manualTargetRobotId === robotId) return true;
    const selection = services.mapStore?.getState?.().selection;
    return selection?.type === "robot" && Array.isArray(selection.ids) && selection.ids.includes(robotId);
  };

  const buildRobotMarkerClass = (robot) => {
    const classes = ["robot-marker"];
    if (isRobotSelected(robot.id)) classes.push("selected");
    const stateValue = robot?.state || null;
    if (stateValue === "blocked") {
      classes.push("blocked");
    } else if (stateValue === "paused") {
      classes.push("paused");
    } else if (stateValue === "manual") {
      classes.push("manual");
    } else if (stateValue === "stalled" || stateValue === "stuck" || stateValue === "offline") {
      classes.push("stuck");
    } else {
      if (robot.manualMode) classes.push("manual");
      if (robot.taskStatus === 3) classes.push("paused");
      if (robot.blocked) classes.push("blocked");
    }
    return classes.join(" ");
  };

  const getNavControlTarget = () => {
    if (state.manualTargetRobotId) {
      const robot = getRobotById(state.manualTargetRobotId);
      if (robot) {
        return { robot, paused: robot.taskStatus === 3 };
      }
    }
    const active = state.robots.find((robot) => robot.taskStatus === 2 || robot.taskStatus === 3);
    if (active) {
      return { robot: active, paused: active.taskStatus === 3 };
    }
    return null;
  };

  const renderNavControls = () => {
    if (!elements.navControls || !elements.navControlsName || !elements.navControlsPause || !elements.navControlsStop) {
      return;
    }
    const target = getNavControlTarget();
    if (!target) {
      elements.navControls.classList.add("hidden");
      return;
    }
    elements.navControls.classList.remove("hidden");
    const suffix = target.robot.manualMode ? " (Manual)" : "";
    elements.navControlsName.textContent = `${target.robot.name}${suffix}`;
    elements.navControlsPause.textContent = target.paused ? "Wznow" : "Pauzuj";
    elements.navControlsPause.dataset.id = target.robot.id;
    elements.navControlsStop.dataset.id = target.robot.id;
  };

  const setRobotManualModeRemote = async (robotId, enabled) => {
    try {
      await App.data?.sendRobotCommand?.(robotId, "manual", { enabled: Boolean(enabled) });
      if (enabled) {
        state.manualTargetRobotId = robotId;
      } else if (state.manualTargetRobotId === robotId) {
        state.manualTargetRobotId = null;
      }
      App.data?.refreshFleetStatus?.();
    } catch (error) {
      console.warn("Manual mode update failed", error);
    }
  };

  const setRobotManualMode = (robotId, enabled) => {
    setRobotManualModeRemote(robotId, enabled);
  };

  const handleRobotMarkerClick = (robotId) => {
    const robot = getRobotById(robotId);
    if (!robot) return;
    services.mapStore?.setSelection?.({ type: "robot", ids: [robotId], primaryId: robotId }, "marker");
    if (!robot.manualMode) {
      setRobotManualMode(robotId, true);
      return;
    }
    state.manualTargetRobotId = robotId;
    if (services.manualDriveService?.getState?.()?.enabled) {
      services.manualDriveService.setTarget(robotId);
    }
    renderNavControls();
    renderManualDrivePanel();
    if (services.mapView?.updateRobots) {
      services.mapView.updateRobots(state.robots);
    }
  };

  const setManualDriveTarget = (robotId) => {
    services.manualDriveService?.setTarget?.(robotId);
  };

  const setManualDriveEnabled = (robotId, enabled) => {
    services.manualDriveService?.setEnabled?.(robotId, enabled);
  };

  const manualDriveEnabled = (robotId) => services.manualDriveService?.enabledFor?.(robotId) || false;

  const renderManualDrivePanel = () => {
    if (!elements.manualDrivePanel || !elements.manualDriveRobot || !elements.manualDriveToggle) return;
    const robot = getManualCommandRobot();
    if (!robot) {
      elements.manualDrivePanel.classList.add("hidden");
      return;
    }
    const current = services.manualDriveService?.getState?.();
    elements.manualDrivePanel.classList.remove("hidden");
    elements.manualDrivePanel.classList.toggle("active", Boolean(current?.enabled));
    elements.manualDriveRobot.textContent = robot.name;
    elements.manualDriveToggle.textContent = current?.enabled ? "Wylacz sterowanie" : "Wlacz sterowanie";
    elements.manualDriveToggle.dataset.id = robot.id;
  };

  const handleManualDriveKey = (event, pressed) => {
    if (!services.manualDriveService) return;
    const current = services.manualDriveService.getState();
    if (!current.enabled || !current.robotId) return;
    if (elements.manualDrivePanel?.classList.contains("hidden")) return;
    const mapPanel = helpers.select(services.selectors?.VIEW_MAP);
    if (mapPanel && !mapPanel.classList.contains("active")) return;
    const target = event.target;
    const tag = target?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable) {
      return;
    }
    const key = event.key.toLowerCase();
    const mapped = constants.MANUAL_KEY_MAP[key];
    if (!mapped) return;
    event.preventDefault();
    services.manualDriveService.setKey(mapped, pressed);
  };

  const clearManualDriveKeys = () => {
    services.manualDriveService?.clearKeys?.();
  };

  const initManualDriveControls = () => {
    if (elements.manualDriveToggle) {
      elements.manualDriveToggle.addEventListener("click", () => {
        const robotId = elements.manualDriveToggle.dataset.id;
        if (!robotId || !services.manualDriveService) return;
        const current = services.manualDriveService.getState();
        const enable = !current.enabled || current.robotId !== robotId;
        if (!current.enabled && current.robotId !== robotId) {
          services.manualDriveService.setTarget(robotId);
        }
        services.manualDriveService.setEnabled(robotId, enable);
      });
    }

    document.addEventListener("keydown", (event) => {
      handleManualDriveKey(event, true);
    });
    document.addEventListener("keyup", (event) => {
      handleManualDriveKey(event, false);
    });
    window.addEventListener("blur", () => {
      clearManualDriveKeys();
    });
  };

  const toggleNavigationPause = (robotId) => {
    const robot = getRobotById(robotId);
    const paused = robot?.taskStatus === 3;
    const action = paused ? "resume" : "pause";
    App.data?.sendRobotCommand?.(robotId, action)
      .then(() => App.data?.refreshFleetStatus?.())
      .catch((error) => {
        console.warn("Pause/resume failed", error);
      });
  };

  const stopNavigation = (robotId) => {
    App.data?.sendRobotCommand?.(robotId, "cancel")
      .then(() => App.data?.refreshFleetStatus?.())
      .catch((error) => {
        console.warn("Cancel failed", error);
      });
  };

  const issueManualCommand = (robotId, pointId, actionKey) => {
    if (services.manualDriveService?.enabledFor?.(robotId)) {
      services.manualDriveService.setEnabled(robotId, false);
    }
    App.data?.sendRobotCommand?.(robotId, "go-target", { id: pointId, action: actionKey })
      .then(() => App.data?.refreshFleetStatus?.())
      .catch((error) => {
        console.warn("Manual command failed", error);
      });
  };

  const toggleRobotDispatchable = (id) => {
    if (App.data?.isRobokitSim?.()) return;
    const robot = state.robots.find((item) => item.id === id);
    if (!robot) return;
    if (App.data?.isLocalSim?.()) {
      App.data?.postFleetJson?.(`/robots/${encodeURIComponent(id)}/dispatchable`, {
        dispatchable: !robot.dispatchable
      })
        .then(() => App.data?.refreshFleetStatus?.())
        .catch((error) => {
          console.warn("Dispatchable update failed", error);
        });
      return;
    }
    if (services.robotService) {
      services.robotService.setDispatchable(id, !robot.dispatchable);
      syncDomainState();
      refreshRobotViews();
      return;
    }
    const next = !robot.dispatchable;
    const dispatchable = robot.online ? next : false;
    updateRobotState(id, { dispatchable });
  };

  const toggleRobotControl = (id) => {
    if (App.data?.isRobokitSim?.()) return;
    const robot = state.robots.find((item) => item.id === id);
    if (!robot) return;
    if (App.data?.isLocalSim?.()) {
      App.data?.postFleetJson?.(`/robots/${encodeURIComponent(id)}/control`, {
        controlled: !robot.controlled
      })
        .then(() => App.data?.refreshFleetStatus?.())
        .catch((error) => {
          console.warn("Control update failed", error);
        });
      return;
    }
    if (services.robotService) {
      services.robotService.setControlled(id, !robot.controlled);
      syncDomainState();
      refreshRobotViews();
      return;
    }
    updateRobotState(id, { controlled: !robot.controlled });
  };

  const handleRobotAction = (action, id) => {
    if (!action || !id) return;
    if (action === "toggle-dispatchable") {
      toggleRobotDispatchable(id);
    } else if (action === "toggle-control") {
      toggleRobotControl(id);
    } else if (action === "toggle-manual") {
      setRobotManualMode(id, !getRobotById(id)?.manualMode);
    } else if (action === "toggle-nav-pause") {
      toggleNavigationPause(id);
    } else if (action === "stop-nav") {
      stopNavigation(id);
    }
  };

  const initFaultControls = () => {
    if (!elements.faultRobotSelect) return;
    services.robotsView?.syncFaultRobotSelect?.();
    if (elements.faultPickProblemBtn) {
      elements.faultPickProblemBtn.addEventListener("click", () => {
        const robotId = getFaultRobotId();
        if (robotId) simulatePickProblem(robotId);
      });
    }
    if (elements.faultPickRobotBlockedBtn) {
      elements.faultPickRobotBlockedBtn.addEventListener("click", () => {
        const robotId = getFaultRobotId();
        if (robotId) simulatePickRobotBlocked(robotId);
      });
    }
    if (elements.faultDropProblemBtn) {
      elements.faultDropProblemBtn.addEventListener("click", () => {
        const robotId = getFaultRobotId();
        if (robotId) simulateDropProblem(robotId);
      });
    }
    if (elements.faultDriveBlockBtn) {
      elements.faultDriveBlockBtn.addEventListener("click", () => {
        const robotId = getFaultRobotId();
        if (robotId) simulateDriveProblem(robotId, "block");
      });
    }
    if (elements.faultDriveAvoidBtn) {
      elements.faultDriveAvoidBtn.addEventListener("click", () => {
        const robotId = getFaultRobotId();
        if (robotId) simulateDriveProblem(robotId, "avoid");
      });
    }
    if (elements.faultClearObstaclesBtn) {
      elements.faultClearObstaclesBtn.addEventListener("click", () => {
        App.map?.clearObstacles?.();
      });
    }
    if (elements.faultClearBlockBtn) {
      elements.faultClearBlockBtn.addEventListener("click", () => {
        const robotId = getFaultRobotId();
        if (robotId) clearRobotBlock(robotId);
      });
    }
  };

  const startManualDriveLoop = () => {
    services.manualDriveService?.start?.();
  };

  const stopManualDriveLoop = () => {
    services.manualDriveService?.stop?.();
  };

  App.robots = {
    buildRobotMarkerClass,
    buildRobots,
    clearRobotBlock,
    clearManualDriveKeys,
    ensureRobotMotion,
    getManualCommandRobot,
    getRobotById,
    getRobotDiagnostics,
    handleRobotAction,
    handleRobotMarkerClick,
    initFaultControls,
    initManualDriveControls,
    issueManualCommand,
    manualDriveEnabled,
    refreshRobotDiagnostics,
    refreshRobotViews,
    renderManualDrivePanel,
    renderNavControls,
    resolveRobotModel,
    setManualDriveEnabled,
    setManualDriveTarget,
    setRobotManualMode,
    simulateDriveProblem,
    startManualDriveLoop,
    stopManualDriveLoop,
    syncDomainState,
    toggleNavigationPause,
    stopNavigation,
    updateRobotState
  };
})();

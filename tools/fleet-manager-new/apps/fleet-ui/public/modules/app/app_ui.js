(() => {
  const App = window.FleetUI.App;
  const { constants, state, elements, helpers, viewMeta, services } = App;

  const loadSession = () => {
    const stored = helpers.safeParse(localStorage.getItem(constants.SESSION_KEY));
    if (!stored || !stored.expiresAt || !stored.username) {
      localStorage.removeItem(constants.SESSION_KEY);
      return null;
    }
    if (Date.now() > stored.expiresAt) {
      localStorage.removeItem(constants.SESSION_KEY);
      return null;
    }
    return stored.username;
  };

  const saveSession = (username) => {
    localStorage.setItem(
      constants.SESSION_KEY,
      JSON.stringify({ username, expiresAt: Date.now() + constants.SESSION_TTL_MS })
    );
  };

  const clearSession = () => {
    localStorage.removeItem(constants.SESSION_KEY);
  };

  const renderRobots = () => {
    services.robotsView?.render?.();
  };

  const renderStreams = () => {
    services.streamsView?.render?.();
  };

  const renderFields = () => {
    services.streamsView?.renderFields?.();
  };

  const renderTasks = () => {
    services.streamsView?.renderTasks?.();
  };

  const renderTrafficDiagnostics = () => {
    services.streamsView?.renderTrafficDiagnostics?.();
  };

  const syncSettingsPanel = () => {
    services.settingsView?.render?.();
  };

  const initBus = () => {
    if (!App.bus?.on) return;
    App.bus.on("state:changed", (payload = {}) => {
      if (payload?.reason === "map_bundle") {
        App.map?.renderMap?.();
        const refreshObstacles = App.map?.refreshSimObstacles?.();
        if (refreshObstacles?.catch) {
          refreshObstacles.catch(() => {});
        }
        App.robots?.refreshRobotDiagnostics?.();
        renderRobots();
        App.robots?.renderManualDrivePanel?.();
        renderStreams();
        renderFields();
        renderTasks();
        renderTrafficDiagnostics();
        App.packaging?.renderPackaging?.();
        syncSettingsPanel();
        if (App.data?.isLocalSim?.()) {
          App.packaging?.refreshPackagingState?.();
        }
      }
      if (payload?.reason === "fleet_status") {
        App.robots?.refreshRobotViews?.();
        renderTasks();
        services.robotsView?.syncFaultRobotSelect?.();
      }
    });
  };

  const showLogin = () => {
    elements.loginView.classList.remove("hidden");
    elements.appView.classList.add("hidden");
    elements.loginUserInput.focus();
  };

  const showApp = (username) => {
    elements.loginView.classList.add("hidden");
    elements.appView.classList.remove("hidden");
    elements.sessionUser.textContent = username;
    setView("map");
    if (!state.dataLoaded) {
      App.data?.loadData?.();
    }
  };

  const setView = (viewName) => {
    state.currentView = viewName;
    elements.navItems.forEach((item) => {
      item.classList.toggle("active", item.dataset.view === viewName);
    });

    elements.panels.forEach((panel) => {
      panel.classList.toggle("active", panel.id === `view-${viewName}`);
    });

    const meta = viewMeta[viewName];
    if (meta) {
      elements.viewTitle.textContent = meta.title;
      elements.viewSubtitle.textContent = meta.subtitle;
    }
    if (viewName === "scenes") {
      App.data?.loadScenes?.({ silent: true });
    }
    if (viewName === "traffic") {
      renderTrafficDiagnostics();
    }
    if (viewName === "settings") {
      syncSettingsPanel();
    }
    if (viewName !== "map") {
      App.robots?.clearManualDriveKeys?.();
    }
  };

  const initNavigation = () => {
    elements.navItems.forEach((item) => {
      item.addEventListener("click", () => {
        setView(item.dataset.view);
      });
    });
  };

  const loadSettingsState = () => {
    const stored = helpers.safeParse(localStorage.getItem(constants.SETTINGS_KEY));
    if (!stored || typeof stored !== "object") return;
    state.settingsState = {
      simMode: helpers.normalizeOption(
        stored.simMode,
        constants.SIM_MODE_OPTIONS.map((item) => item.value)
      ),
      dispatchStrategy: helpers.normalizeOption(
        stored.dispatchStrategy,
        constants.DISPATCH_STRATEGY_OPTIONS.map((item) => item.value)
      ),
      trafficStrategy: helpers.normalizeOption(
        stored.trafficStrategy,
        constants.TRAFFIC_STRATEGY_OPTIONS.map((item) => item.value)
      ),
      forwardStopDistanceM: helpers.normalizeForwardStopDistance(stored.forwardStopDistanceM)
    };
  };

  const persistSettingsState = () => {
    localStorage.setItem(constants.SETTINGS_KEY, JSON.stringify(state.settingsState));
  };

  const applySimModeSetting = async (mode) => {
    const nextMode = helpers.normalizeOption(
      mode,
      constants.SIM_MODE_OPTIONS.map((item) => item.value)
    );
    if (!nextMode || !state.fleetSimModeMutable) return;
    try {
      const response = await fetch(constants.FLEET_CONFIG_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ simMode: nextMode })
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `sim_mode_failed_${response.status}`);
      }
      const payload = await response.json().catch(() => null);
      App.data?.applyFleetConfig?.(payload);
      App.data?.stopFleetUpdates?.();
      await App.data?.loadData?.({ reset: true, silent: true });
    } catch (error) {
      if (elements.settingsSimNote) {
        elements.settingsSimNote.textContent = `Blad zmiany trybu: ${error.message || "update_failed"}`;
      }
    }
  };

  const applyAlgorithmSettings = async (dispatchStrategy, trafficStrategy, forwardStopDistance) => {
    state.settingsState.dispatchStrategy = helpers.normalizeOption(
      dispatchStrategy,
      constants.DISPATCH_STRATEGY_OPTIONS.map((item) => item.value)
    );
    state.settingsState.trafficStrategy = helpers.normalizeOption(
      trafficStrategy,
      constants.TRAFFIC_STRATEGY_OPTIONS.map((item) => item.value)
    );
    state.settingsState.forwardStopDistanceM = helpers.normalizeForwardStopDistance(forwardStopDistance);
    persistSettingsState();
    App.data?.applyAlgorithmOverrides?.();
    if (App.data?.isLocalSim?.()) {
      await App.data?.syncLocalSimSettings?.();
    }
    syncSettingsPanel();
    if (!App.data?.isRemoteSim?.()) {
      renderTrafficDiagnostics();
    }
  };

  const resetAlgorithmSettings = async () => {
    state.settingsState.dispatchStrategy = null;
    state.settingsState.trafficStrategy = null;
    state.settingsState.forwardStopDistanceM = null;
    persistSettingsState();
    App.data?.applyAlgorithmOverrides?.();
    if (App.data?.isLocalSim?.()) {
      await App.data?.syncLocalSimSettings?.();
    }
    syncSettingsPanel();
    if (!App.data?.isRemoteSim?.()) {
      renderTrafficDiagnostics();
    }
  };

  const initSettingsControls = () => {
    syncSettingsPanel();
    if (elements.settingsSimApplyBtn && elements.settingsSimModeSelect) {
      elements.settingsSimApplyBtn.addEventListener("click", () => {
        applySimModeSetting(elements.settingsSimModeSelect.value).catch(() => {});
      });
    }
    if (elements.settingsSimResetBtn) {
      elements.settingsSimResetBtn.addEventListener("click", () => {
        App.data?.stopFleetUpdates?.();
        App.data?.loadData?.({ reset: true, silent: true });
      });
    }
    if (elements.settingsAlgoApplyBtn && elements.settingsDispatchSelect && elements.settingsTrafficSelect) {
      elements.settingsAlgoApplyBtn.addEventListener("click", () => {
        const stopDistance = elements.settingsTrafficStopDistanceInput
          ? elements.settingsTrafficStopDistanceInput.value
          : null;
        applyAlgorithmSettings(
          elements.settingsDispatchSelect.value,
          elements.settingsTrafficSelect.value,
          stopDistance
        ).catch(() => {});
      });
    }
    if (elements.settingsAlgoResetBtn) {
      elements.settingsAlgoResetBtn.addEventListener("click", () => {
        resetAlgorithmSettings().catch(() => {});
      });
    }
  };

  const initLogin = () => {
    elements.loginForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const username = elements.loginUserInput.value.trim();
      const password = elements.loginPassInput.value.trim();
      if (username === constants.DEFAULT_USER.username && password === constants.DEFAULT_USER.password) {
        elements.loginError.classList.add("hidden");
        saveSession(username);
        showApp(username);
      } else {
        elements.loginError.classList.remove("hidden");
      }
    });

    elements.logoutBtn.addEventListener("click", () => {
      clearSession();
      showLogin();
    });
  };

  App.ui = {
    applyAlgorithmSettings,
    applySimModeSetting,
    initBus,
    initLogin,
    initNavigation,
    initSettingsControls,
    loadSession,
    loadSettingsState,
    persistSettingsState,
    renderFields,
    renderRobots,
    renderStreams,
    renderTasks,
    renderTrafficDiagnostics,
    resetAlgorithmSettings,
    setView,
    showApp,
    showLogin,
    syncSettingsPanel
  };
})();

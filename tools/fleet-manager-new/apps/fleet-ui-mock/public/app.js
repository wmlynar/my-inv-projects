(() => {
  const App = window.FleetUI?.App;
  if (!App) return;
  const { constants, state, services, helpers } = App;
  const FleetDomain = window.FleetDomain || {};

  const bindDomainStore = () => {
    if (!services.domainStore) return;
    services.domainStore.subscribe(() => {
      App.robots?.syncDomainState?.();
    });
  };

  const initViews = () => {
    services.dataSource = window.FleetUI?.DataSource?.create?.() || window.FleetUI?.DataSource || null;
    services.scenesManager = window.FleetUI?.ScenesManager?.create?.({
      fetchJson: App.data?.fetchJson,
      postJson: services.dataSource?.postJson || window.FleetUI?.DataSource?.postJson,
      logger: services.logger,
      events: services.events
    });
    services.mapView = window.FleetUI?.MapView?.init({
      elements: {
        mapShell: App.elements.mapShell,
        mapWrap: App.elements.mapWrap,
        mapSvg: App.elements.mapSvg,
        miniMapSvg: App.elements.miniMapSvg,
        layerPanel: App.elements.mapLayerPanel,
        fitViewBtn: App.elements.fitViewBtn,
        resetViewBtn: App.elements.resetViewBtn,
        navControlsPause: App.elements.navControlsPause,
        navControlsStop: App.elements.navControlsStop,
        worksiteMenu: App.elements.worksiteMenu,
        manualMenu: App.elements.manualMenu,
        manualMenuRobot: App.elements.manualMenuRobot,
        mapMenu: App.elements.mapMenu
      },
      store: services.mapStore,
      geometry: services.geometry,
      logger: services.logger,
      events: services.events,
      constants: {
        LABEL_SIZE_PX: constants.LABEL_SIZE_PX,
        LABEL_OFFSET_PX: constants.LABEL_OFFSET_PX,
        NODE_LABEL_SIZE_PX: constants.NODE_LABEL_SIZE_PX,
        NODE_LABEL_OFFSET_PX: constants.NODE_LABEL_OFFSET_PX,
        NODE_LABEL_MIN_ZOOM: constants.NODE_LABEL_MIN_ZOOM,
        LABEL_MIN_ZOOM: constants.LABEL_MIN_ZOOM,
        MAP_OUTER_MARGIN: constants.MAP_OUTER_MARGIN,
        WORKSITE_AP_OFFSET: constants.WORKSITE_AP_OFFSET,
        WORKSITE_POS_MAX_DRIFT: constants.WORKSITE_POS_MAX_DRIFT
      },
      layerConfig: constants.MAP_LAYER_CONFIG,
      handlers: {
        onRobotClick: App.robots?.handleRobotMarkerClick,
        removeObstacle: App.map?.removeObstacle,
        buildRobotMarkerClass: App.robots?.buildRobotMarkerClass,
        resolveRobotModel: App.robots?.resolveRobotModel,
        ensureRobotMotion: App.robots?.ensureRobotMotion,
        setWorksiteOccupancy: App.map?.setWorksiteOccupancy,
        setWorksiteBlocked: App.map?.setWorksiteBlocked,
        issueManualCommand: App.robots?.issueManualCommand,
        getManualCommandRobot: App.robots?.getManualCommandRobot,
        sendRobotCommand: App.data?.sendRobotCommand,
        refreshFleetStatus: App.data?.refreshFleetStatus,
        addObstacle: App.map?.addObstacle,
        isRemoteSim: App.data?.isRemoteSim,
        getWorksiteState: App.map?.getWorksiteState,
        manualDriveEnabled: App.robots?.manualDriveEnabled,
        setManualDriveEnabled: App.robots?.setManualDriveEnabled,
        toggleNavigationPause: App.robots?.toggleNavigationPause,
        stopNavigation: App.robots?.stopNavigation
      }
    });
    if (services.mapStore) {
      services.mapStore.subscribe((_nextState, reason) => {
        if (reason === "map_state" || reason === "viewport") return;
        if (services.mapView?.updateRobots) {
          services.mapView.updateRobots(state.robots);
        }
      });
    }
    services.scenesView = services.scenesManager
      ? window.FleetUI?.ScenesView?.init({
          elements: { scenesList: App.elements.scenesList, scenesRefreshBtn: App.elements.scenesRefreshBtn },
          services: { scenesManager: services.scenesManager },
          handlers: {
            onSceneActivated: async () => {
              await App.data?.loadData?.({ reset: true, silent: true });
            }
          },
          logger: services.logger
        })
      : null;
    services.robotsView = window.FleetUI?.RobotsView?.init({
      elements: { robotsList: App.elements.robotsList, faultRobotSelect: App.elements.faultRobotSelect },
      state: {
        getRobots: () => state.robots,
        getDiagnostics: App.robots?.getRobotDiagnostics,
        isRobokitSim: App.data?.isRobokitSim,
        isRemoteSim: App.data?.isRemoteSim
      },
      handlers: {
        onAction: App.robots?.handleRobotAction
      }
    });
    services.streamsView = window.FleetUI?.StreamsView?.init({
      elements: {
        streamsList: App.elements.streamsList,
        streamsAdvancedList: App.elements.streamsAdvancedList,
        fieldsList: App.elements.fieldsList,
        tasksList: App.elements.tasksList,
        trafficLocksList: App.elements.trafficLocksList,
        trafficQueuesList: App.elements.trafficQueuesList,
        trafficNodesList: App.elements.trafficNodesList,
        trafficStallsList: App.elements.trafficStallsList
      },
      state: {
        getPackagingConfig: () => state.packagingConfig,
        getWorkflowData: () => state.workflowData,
        getLineRequests: () => services.packagingService?.getLineRequests?.() || [],
        getWorksites: () => state.worksites,
        getWorksiteState: App.map?.getWorksiteState,
        getTasks: () => state.tasks,
        getCurrentView: () => state.currentView,
        getFleetCoreAvailable: () => state.fleetCoreAvailable
      },
      helpers: {
        sortWorksites: App.map?.sortWorksites,
        orderAsc: constants.ORDER_ASC,
        orderDesc: constants.ORDER_DESC
      }
    });
    services.settingsView = window.FleetUI?.SettingsView?.init({
      elements: {
        settingsSimModeSelect: App.elements.settingsSimModeSelect,
        settingsDispatchSelect: App.elements.settingsDispatchSelect,
        settingsTrafficSelect: App.elements.settingsTrafficSelect,
        settingsTrafficStopDistanceInput: App.elements.settingsTrafficStopDistanceInput,
        settingsSimApplyBtn: App.elements.settingsSimApplyBtn,
        settingsSimNote: App.elements.settingsSimNote,
        settingsAlgoNote: App.elements.settingsAlgoNote,
        taxonomyDispatchCurrent: App.elements.taxonomyDispatchCurrent,
        taxonomyTrafficCurrent: App.elements.taxonomyTrafficCurrent,
        taxonomyDispatchAxes: App.elements.taxonomyDispatchAxes,
        taxonomyTrafficAxes: App.elements.taxonomyTrafficAxes
      },
      state: {
        getSimMode: () => state.simMode,
        getFleetSimModeMutable: () => state.fleetSimModeMutable,
        getFleetCoreAvailable: () => state.fleetCoreAvailable,
        getSettingsState: () => state.settingsState,
        getRobotsConfig: () => state.robotsConfig,
        getAlgorithmCatalog: () => state.algorithmCatalog
      },
      helpers: {
        normalizeOption: helpers.normalizeOption,
        resolveDispatchStrategy: App.data?.resolveDispatchStrategy,
        resolveTrafficStrategyName: App.data?.resolveTrafficStrategyName,
        resolveTrafficForwardStopDistance: App.data?.resolveTrafficForwardStopDistance,
        isRobokitSim: App.data?.isRobokitSim
      },
      options: {
        simModeOptions: constants.SIM_MODE_OPTIONS,
        robokitSimMode: constants.ROBOKIT_SIM_MODE,
        dispatchOptions: constants.DISPATCH_STRATEGY_OPTIONS,
        trafficOptions: constants.TRAFFIC_STRATEGY_OPTIONS,
        defaultDispatchLabels: constants.DEFAULT_DISPATCH_LABELS,
        defaultTrafficLabels: constants.DEFAULT_TRAFFIC_LABELS
      }
    });
    services.robotDiagnosticsService = FleetDomain.RobotDiagnosticsService
      ? new FleetDomain.RobotDiagnosticsService({
          staleMinMs: constants.DIAG_STALE_MIN_MS,
          staleMultiplier: constants.DIAG_STALE_MULTIPLIER,
          getFleetPollMs: () => state.fleetPollMs,
          getLastFleetUpdateAt: () => state.lastFleetUpdateAt
        })
      : null;
    services.manualDriveService = FleetDomain.ManualDriveService
      ? new FleetDomain.ManualDriveService({
          speedMps: constants.MANUAL_DRIVE_SPEED_MPS,
          turnRateRadS: constants.ROBOT_TURN_RATE_RAD_S,
          tickMs: constants.SIM_TICK_MS,
          getRobotById: App.robots?.getRobotById,
          updateRobotState: App.robots?.updateRobotState,
          sendRobotCommand: App.data?.sendRobotCommand,
          stopNavigation: App.robots?.stopNavigation,
          isRemoteSim: App.data?.isRemoteSim,
          logger: services.logger,
          onStateChange: () => {
            App.robots?.renderManualDrivePanel?.();
          }
        })
      : null;
    services.packagingService = FleetDomain.PackagingService
      ? new FleetDomain.PackagingService({
          engine: services.packagingEngine,
          storage: window.localStorage,
          isLocalSim: App.data?.isLocalSim,
          postFleetJson: App.data?.postFleetJson,
          logger: services.logger,
          storageKeys: {
            state: constants.PACKAGING_STATE_KEY,
            signature: constants.PACKAGING_SIGNATURE_KEY,
            lineRequests: constants.LINE_REQUEST_KEY,
            ops: constants.OPS_STATE_KEY
          }
        })
      : null;
    window.FleetUI?.Compat?.bind?.({ mapView: services.mapView, scenesView: services.scenesView, logger: services.logger });
  };

  const init = () => {
    bindDomainStore();
    initViews();
    App.ui?.loadSettingsState?.();
    App.ui?.initBus?.();
    App.ui?.initNavigation?.();
    App.robots?.initFaultControls?.();
    App.robots?.initManualDriveControls?.();
    App.ui?.initSettingsControls?.();
    App.ui?.initLogin?.();

    const session = App.ui?.loadSession?.();
    if (session) {
      App.ui?.showApp?.(session);
    } else {
      App.ui?.showLogin?.();
    }
  };

  init();
})();

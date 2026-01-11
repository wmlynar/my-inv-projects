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

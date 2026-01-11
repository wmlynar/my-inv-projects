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

(() => {
  const init = ({ elements = {}, services = {}, handlers = {}, logger } = {}) => {
    const { scenesList, scenesRefreshBtn } = elements;
    const scenesManager = services.scenesManager;
    let scenesState = { activeSceneId: null, scenes: [] };
    let scenesLoading = false;
    let scenesBusy = false;
    let scenesError = null;
    let scenesBound = false;

    const formatSceneTimestamp = (value) => {
      if (!value) return '--';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return String(value);
      const pad = (num) => String(num).padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
        date.getHours()
      )}:${pad(date.getMinutes())}`;
    };

    const buildSceneMapMeta = (map) => {
      const meta = map?.meta || {};
      const parts = [];
      if (meta.mapType) parts.push(meta.mapType);
      if (meta.version) parts.push(`v${meta.version}`);
      if (meta.md5) parts.push(meta.md5.slice(0, 8));
      return parts.join(' | ');
    };

    const renderScenes = () => {
      if (!scenesList) return;
      const scenes = Array.isArray(scenesState?.scenes) ? scenesState.scenes : [];
      scenesList.innerHTML = '';

      if (scenesError) {
        const errorCard = document.createElement('div');
        errorCard.className = 'card';
        errorCard.textContent = `Blad scen: ${scenesError}`;
        scenesList.appendChild(errorCard);
      }

      if (!scenes.length) {
        if (!scenesError) {
          scenesList.innerHTML = '<div class="card">Brak scen.</div>';
        }
        return;
      }

      scenes.forEach((scene) => {
        const isActiveScene = scene.id === scenesState.activeSceneId;
        const createdLabel = formatSceneTimestamp(scene.createdAt);
        const maps = Array.isArray(scene.maps) ? scene.maps : [];
        const headerBadge = isActiveScene ? '<span class="badge">Aktywna</span>' : '';
        const mapRows = maps
          .map((map) => {
            const mapId = map.id || '';
            const mapLabel = map.name || map.fileName || mapId || '--';
            const metaLabel = buildSceneMapMeta(map);
            const fileLabel = map.fileName ? `Plik: ${map.fileName}` : '';
            const details = [fileLabel, metaLabel].filter(Boolean).join(' | ');
            const isActiveMap = mapId && scene.activeMapId && mapId === scene.activeMapId;
            const badge = isActiveMap ? '<span class="badge">Aktywna mapa</span>' : '';
            const disabled = scenesBusy ? 'disabled' : '';
            const actionLabel = isActiveScene && isActiveMap ? 'Aktywna' : 'Aktywuj';
            const showButton = !(isActiveScene && isActiveMap);
            return `
              <div class="scene-map">
                <div>
                  <div class="scene-map-title">${mapLabel}</div>
                  <div class="scene-map-meta">${details || '--'}</div>
                </div>
                <div class="scene-map-actions">
                  ${badge}
                  ${showButton ? `<button class="ghost-btn small" data-action="activate-scene" data-scene-id="${scene.id}" data-map-id="${mapId}" ${disabled}>${actionLabel}</button>` : ''}
                </div>
              </div>
            `;
          })
          .join('');

        const card = document.createElement('div');
        card.className = 'card scene-card';
        card.innerHTML = `
          <div class="scene-header">
            <div>
              <div class="card-title">${scene.name || scene.id}</div>
              <div class="card-meta">ID: ${scene.id || '--'} | ${createdLabel} | ${scene.kind || 'custom'}</div>
            </div>
            ${headerBadge}
          </div>
          <div class="scene-map-list">
            ${mapRows || '<div class="card-meta">Brak map.</div>'}
          </div>
        `;
        scenesList.appendChild(card);
      });

      if (!scenesBound) {
        scenesList.addEventListener('click', (event) => {
          const button = event.target.closest('button[data-action]');
          if (!button) return;
          const action = button.dataset.action;
          if (action !== 'activate-scene') return;
          const sceneId = button.dataset.sceneId;
          const mapId = button.dataset.mapId;
          if (!sceneId) return;
          activateScene(sceneId, mapId);
        });
        scenesBound = true;
      }
    };

    const loadScenes = async ({ silent = false } = {}) => {
      if (!scenesList || scenesLoading) return;
      scenesLoading = true;
      scenesError = null;
      if (!silent) {
        scenesList.innerHTML = '<div class="card">Ladowanie scen...</div>';
      }
      try {
        const payload = await scenesManager.load();
        scenesState = payload;
      } catch (error) {
        scenesState = { activeSceneId: null, scenes: [] };
        scenesError = error.message || 'load_failed';
      } finally {
        scenesLoading = false;
        renderScenes();
      }
    };

    const activateScene = async (sceneId, mapId) => {
      if (!sceneId || scenesBusy) return;
      scenesBusy = true;
      scenesError = null;
      renderScenes();
      try {
        const payload = await scenesManager.activate(sceneId, mapId);
        scenesState.activeSceneId = payload?.activeSceneId || sceneId;
        const scene = scenesState.scenes.find((item) => item.id === scenesState.activeSceneId);
        if (scene) {
          scene.activeMapId = payload?.activeMapId || mapId || scene.activeMapId;
        }
        await handlers.onSceneActivated?.();
        await loadScenes({ silent: true });
        handlers.onSceneChanged?.(scenesState);
      } catch (error) {
        scenesError = error.message || 'activate_failed';
      } finally {
        scenesBusy = false;
        renderScenes();
      }
    };

    if (scenesRefreshBtn) {
      scenesRefreshBtn.addEventListener('click', () => {
        loadScenes();
      });
    }

    return {
      loadScenes,
      render: renderScenes,
      getState: () => scenesState
    };
  };

  window.FleetUI = window.FleetUI || {};
  window.FleetUI.ScenesView = { init };
})();

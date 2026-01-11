(() => {
  const create = ({ fetchJson, postJson, logger, events } = {}) => {
    let state = { activeSceneId: null, scenes: [] };
    const dispatchSceneChanged = (detail) => {
      if (!events?.SCENE_CHANGED || typeof window === 'undefined') return;
      window.dispatchEvent(new CustomEvent(events.SCENE_CHANGED, { detail }));
    };

    const load = async () => {
      const payload = await fetchJson('/api/scenes');
      state = payload && typeof payload === 'object' ? payload : { activeSceneId: null, scenes: [] };
      return state;
    };

    const activate = async (sceneId, mapId) => {
      const payload = await postJson('/api/scenes/activate', { sceneId, mapId });
      if (payload && typeof payload === 'object') {
        state.activeSceneId = payload.activeSceneId || sceneId || null;
        const scene = state.scenes.find((item) => item.id === state.activeSceneId);
        if (scene) {
          scene.activeMapId = payload.activeMapId || mapId || scene.activeMapId;
        }
      }
      dispatchSceneChanged({ sceneId, mapId, state });
      return payload;
    };

    return {
      load,
      activate,
      getState: () => state
    };
  };

  window.FleetUI = window.FleetUI || {};
  window.FleetUI.ScenesManager = { create };
})();

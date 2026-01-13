(() => {
  const fetchJson = async (path) => {
    const response = await fetch(path);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `fetch_failed_${response.status}`);
    }
    return response.json();
  };

  const fetchJsonSafe = async (path) => {
    try {
      return await fetchJson(path);
    } catch (_err) {
      return null;
    }
  };

  const postJson = async (path, payload = null) => {
    const body = payload ? JSON.stringify(payload) : null;
    const response = await fetch(path, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : {},
      body
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `post_failed_${response.status}`);
    }
    return response.json().catch(() => null);
  };

  const normalizeGraph = (graph) => (graph && typeof graph === "object" ? graph : null);

  const normalizeWorkflow = (workflow) => (workflow && typeof workflow === "object" ? workflow : null);

  const streamStatus = (path, handlers = {}) => {
    if (typeof window === "undefined" || typeof window.EventSource === "undefined") {
      return null;
    }
    const source = new EventSource(path);
    source.addEventListener("state", (event) => {
      if (!event?.data) return;
      let payload = null;
      try {
        payload = JSON.parse(event.data);
      } catch (_err) {
        return;
      }
      handlers.onMessage?.(payload);
    });
    source.addEventListener("error", (event) => {
      handlers.onError?.(event);
    });
    return source;
  };

  const createDataSource = (options = {}) => {
    const fetcher = options.fetchJson || fetchJson;
    const fetcherSafe = options.fetchJsonSafe || fetchJsonSafe;
    const poster = options.postJson || postJson;

    const fetchConfig = async (path = "/api/fleet/config") => fetcherSafe(path);

    const fetchMapBundle = async ({
      graphPath = "/data/graph.json",
      workflowPath = "/data/workflow.json5",
      packagingPath = "/data/packaging.json",
      robotsPath = "/data/robots.json"
    } = {}) => {
      const [graph, workflow, packaging, robotsCfg] = await Promise.all([
        fetcher(graphPath),
        fetcher(workflowPath),
        fetcherSafe(packagingPath),
        fetcherSafe(robotsPath)
      ]);
      return {
        graph: normalizeGraph(graph),
        workflow: normalizeWorkflow(workflow),
        packaging: packaging || null,
        robotsCfg: robotsCfg || null
      };
    };

    return {
      fetchJson: fetcher,
      fetchJsonSafe: fetcherSafe,
      postJson: poster,
      fetchConfig,
      fetchMapBundle,
      streamStatus
    };
  };

  const createScenesManager = ({ fetchJson, postJson, logger, events } = {}) => {
    let state = { activeSceneId: null, scenes: [] };
    const dispatchSceneChanged = (detail) => {
      if (!events?.SCENE_CHANGED || typeof window === "undefined") return;
      window.dispatchEvent(new CustomEvent(events.SCENE_CHANGED, { detail }));
    };

    const load = async () => {
      const payload = await fetchJson("/api/scenes");
      state = payload && typeof payload === "object" ? payload : { activeSceneId: null, scenes: [] };
      return state;
    };

    const activate = async (sceneId, mapId) => {
      const payload = await postJson("/api/scenes/activate", { sceneId, mapId });
      if (payload && typeof payload === "object") {
        state.activeSceneId = payload.activeSceneId || sceneId || null;
        const scene = state.scenes.find((item) => item.id === state.activeSceneId);
        if (scene) {
          scene.activeMapId = payload.activeMapId || mapId || scene.activeMapId;
        }
      }
      dispatchSceneChanged({ sceneId, mapId, state });
      return payload;
    };

    if (logger?.debug) {
      logger.debug("scenes", "init");
    }

    return {
      load,
      activate,
      getState: () => state
    };
  };

  window.FleetUI = window.FleetUI || {};
  window.FleetUI.DataSource = {
    create: createDataSource,
    fetchJson,
    fetchJsonSafe,
    postJson,
    fetchConfig: (path) => createDataSource().fetchConfig(path),
    fetchMapBundle: (options) => createDataSource().fetchMapBundle(options),
    streamStatus,
    normalizeGraph,
    normalizeWorkflow
  };
  window.FleetUI.ScenesManager = { create: createScenesManager };
})();

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
      method: 'POST',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `post_failed_${response.status}`);
    }
    return response.json().catch(() => null);
  };

  const normalizeGraph = (graph) => (graph && typeof graph === 'object' ? graph : null);

  const normalizeWorkflow = (workflow) => (workflow && typeof workflow === 'object' ? workflow : null);

  const streamStatus = (path, handlers = {}) => {
    if (typeof window === 'undefined' || typeof window.EventSource === 'undefined') {
      return null;
    }
    const source = new EventSource(path);
    source.addEventListener('state', (event) => {
      if (!event?.data) return;
      let payload = null;
      try {
        payload = JSON.parse(event.data);
      } catch (_err) {
        return;
      }
      handlers.onMessage?.(payload);
    });
    source.addEventListener('error', (event) => {
      handlers.onError?.(event);
    });
    return source;
  };

  const create = (options = {}) => {
    const fetcher = options.fetchJson || fetchJson;
    const fetcherSafe = options.fetchJsonSafe || fetchJsonSafe;
    const poster = options.postJson || postJson;

    const fetchConfig = async (path = '/api/fleet/config') => fetcherSafe(path);

    const fetchMapBundle = async ({
      graphPath = '/data/graph.json',
      workflowPath = '/data/workflow.json5',
      packagingPath = '/data/packaging.json',
      robotsPath = '/data/robots.json'
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

  window.FleetUI = window.FleetUI || {};
  window.FleetUI.DataSource = {
    create,
    fetchJson,
    fetchJsonSafe,
    postJson,
    fetchConfig: (path) => create().fetchConfig(path),
    fetchMapBundle: (options) => create().fetchMapBundle(options),
    streamStatus,
    normalizeGraph,
    normalizeWorkflow
  };
})();

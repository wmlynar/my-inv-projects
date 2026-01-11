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

  const create = () => ({
    fetchJson,
    fetchJsonSafe,
    postJson
  });

  window.FleetUI = window.FleetUI || {};
  window.FleetUI.DataSource = { create, fetchJson, fetchJsonSafe, postJson };
})();

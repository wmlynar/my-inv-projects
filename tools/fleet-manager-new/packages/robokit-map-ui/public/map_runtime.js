(() => {
  const mapWindowInit = ({ shell, wrap, svg, miniMapSvg } = {}) => {
    const api = {
      shell,
      wrap,
      svg,
      miniMapSvg,
      state: {},
      toMap(point) {
        return point;
      },
      toScreen(point) {
        return point;
      },
      requestRender() {}
    };
    return api;
  };

  const mapLayersInit = ({ svg } = {}) => {
    const layers = [];
    const api = {
      svg,
      register(layer) {
        if (layer && !layers.includes(layer)) {
          layers.push(layer);
        }
      },
      unregister(layer) {
        const index = layers.indexOf(layer);
        if (index >= 0) {
          layers.splice(index, 1);
        }
      },
      render(state) {
        layers.forEach((layer) => {
          if (layer && typeof layer.render === "function") {
            layer.render({ svg, state });
          }
        });
      }
    };
    return api;
  };

  const mapStoreCreate = (initial = {}) => {
    let state = {
      mapState: null,
      selection: { type: null, ids: [], primaryId: null },
      layers: {},
      ...initial
    };
    const listeners = new Set();

    const notify = (reason) => {
      listeners.forEach((listener) => {
        try {
          listener(state, reason);
        } catch (_err) {}
      });
    };

    return {
      getState() {
        return state;
      },
      setMapState(mapState, reason = "map_state") {
        state = { ...state, mapState };
        notify(reason);
      },
      setSelection(selection, reason = "selection") {
        state = { ...state, selection };
        notify(reason);
      },
      setLayers(layers, reason = "layers") {
        if (!layers || typeof layers !== "object") return;
        state = { ...state, layers: { ...state.layers, ...layers } };
        notify(reason);
      },
      notify(reason = "update") {
        notify(reason);
      },
      subscribe(listener) {
        if (listener) listeners.add(listener);
        return () => listeners.delete(listener);
      }
    };
  };

  const mapAdaptersInit = ({ store } = {}) => {
    const adapters = [];
    return {
      store,
      register(adapter) {
        if (adapter && !adapters.includes(adapter)) {
          adapters.push(adapter);
        }
      },
      unregister(adapter) {
        const index = adapters.indexOf(adapter);
        if (index >= 0) {
          adapters.splice(index, 1);
        }
      },
      sync(reason = "sync") {
        adapters.forEach((adapter) => {
          if (adapter && typeof adapter.sync === "function") {
            adapter.sync(store, reason);
          }
        });
      }
    };
  };

  window.MapWindow = { init: mapWindowInit };
  window.MapLayers = { init: mapLayersInit };
  window.MapStore = { create: mapStoreCreate };
  window.MapAdapters = { init: mapAdaptersInit };
})();

(() => {
  const create = (initial = {}) => {
    let state = {
      mapState: null,
      selection: { type: null, ids: [], primaryId: null },
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
      setMapState(mapState, reason = 'map_state') {
        state = { ...state, mapState };
        notify(reason);
      },
      setSelection(selection, reason = 'selection') {
        state = { ...state, selection };
        notify(reason);
      },
      notify(reason = 'update') {
        notify(reason);
      },
      subscribe(listener) {
        if (listener) listeners.add(listener);
        return () => listeners.delete(listener);
      }
    };
  };

  window.MapStore = { create };
})();

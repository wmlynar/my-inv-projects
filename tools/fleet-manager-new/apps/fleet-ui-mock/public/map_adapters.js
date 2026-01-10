(() => {
  const init = ({ store } = {}) => {
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
      sync(reason = 'sync') {
        adapters.forEach((adapter) => {
          if (adapter && typeof adapter.sync === 'function') {
            adapter.sync(store, reason);
          }
        });
      }
    };
  };

  window.MapAdapters = { init };
})();

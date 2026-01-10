(() => {
  const init = ({ svg } = {}) => {
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
          if (layer && typeof layer.render === 'function') {
            layer.render({ svg, state });
          }
        });
      }
    };
    return api;
  };

  window.MapLayers = { init };
})();

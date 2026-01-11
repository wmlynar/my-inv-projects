(() => {
  const init = ({ svg, logger } = {}) => {
    const layers = [];
    let visibility = {};

    const getVisibility = (layerId, fallback = true) => {
      if (!layerId) return fallback;
      if (Object.prototype.hasOwnProperty.call(visibility, layerId)) {
        return Boolean(visibility[layerId]);
      }
      return fallback;
    };

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
      setVisibility(nextVisibility) {
        if (!nextVisibility || typeof nextVisibility !== 'object') return;
        visibility = { ...visibility, ...nextVisibility };
      },
      getVisibility,
      render(state, helpers = {}) {
        layers.forEach((layer) => {
          if (layer && typeof layer.render === 'function') {
            layer.render({ svg, state, helpers, visible: getVisibility(layer.id, true) });
          }
        });
      }
    };
    if (logger?.debug) {
      logger.debug('map-layers', 'init', { count: layers.length });
    }
    return api;
  };

  window.FleetUI = window.FleetUI || {};
  window.FleetUI.MapLayers = { init };
})();

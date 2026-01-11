(() => {
  const bind = ({ mapView, scenesView, logger } = {}) => {
    const shim = {
      mapView,
      scenesView,
      warn(message) {
        console.warn(message);
      }
    };
    if (logger?.debug) {
      logger.debug('compat', 'bound', {
        mapView: Boolean(mapView),
        scenesView: Boolean(scenesView)
      });
    }
    return shim;
  };

  window.FleetUI = window.FleetUI || {};
  window.FleetUI.Compat = { bind };
})();

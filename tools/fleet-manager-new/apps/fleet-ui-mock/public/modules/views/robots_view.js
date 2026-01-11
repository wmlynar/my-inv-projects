(() => {
  const init = ({ handlers = {} } = {}) => {
    return {
      render() {
        handlers.renderRobots?.();
      }
    };
  };

  window.FleetUI = window.FleetUI || {};
  window.FleetUI.RobotsView = { init };
})();

(() => {
  const init = ({ handlers = {} } = {}) => {
    return {
      render() {
        handlers.renderStreams?.();
      }
    };
  };

  window.FleetUI = window.FleetUI || {};
  window.FleetUI.StreamsView = { init };
})();

(() => {
  const init = ({ handlers = {} } = {}) => {
    return {
      render() {
        handlers.syncSettingsPanel?.();
      }
    };
  };

  window.FleetUI = window.FleetUI || {};
  window.FleetUI.SettingsView = { init };
})();

(() => {
  const shim = {
    warn(message) {
      console.warn(message);
    }
  };

  window.FleetUI = window.FleetUI || {};
  window.FleetUI.Compat = shim;
})();

(() => {
  const resolveDebugFilter = () => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams(window.location.search);
    return (
      params.get('debug') ||
      (window.localStorage ? window.localStorage.getItem('fleetUiDebug') : '') ||
      ''
    );
  };

  const isEnabled = (tag) => {
    const filter = resolveDebugFilter();
    if (!filter) return false;
    if (filter === '*' || filter === 'all') return true;
    return filter.split(',').map((item) => item.trim()).includes(tag);
  };

  const debug = (tag, ...args) => {
    if (!isEnabled(tag)) return;
    console.log(`[${tag}]`, ...args);
  };

  window.FleetUI = window.FleetUI || {};
  window.FleetUI.Logger = { debug, isEnabled };
})();

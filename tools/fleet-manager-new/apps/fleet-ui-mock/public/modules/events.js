(() => {
  const Events = {
    MAP_CONTEXT: 'map:context',
    MAP_CLICK: 'map:click',
    MAP_VIEW_CHANGED: 'map:view:changed',
    SCENE_CHANGED: 'scene:changed',
    SELECTION_CHANGED: 'selection:changed',
    COMMAND_ISSUED: 'command:issued'
  };

  window.FleetUI = window.FleetUI || {};
  window.FleetUI.Events = Events;
})();

(() => {
  const create = ({ svgNS = 'http://www.w3.org/2000/svg' } = {}) => {
    let group = null;

    return {
      id: 'actionPoints',
      render({ svg, state, helpers, visible }) {
        if (!svg || !state?.mapState) return;
        const needsRebuild = state.needsRebuild || !group;
        if (needsRebuild) {
          if (group) group.remove();
          group = document.createElementNS(svgNS, 'g');
          group.setAttribute('class', 'map-action-points map-layer');
          helpers.refs.actionPointMarkers = new Map();
          (state.mapActionPoints || []).forEach((point) => {
            const pos = helpers.projectPoint(point.pos);
            const circle = document.createElementNS(svgNS, 'circle');
            circle.setAttribute('cx', pos.x);
            circle.setAttribute('cy', pos.y);
            circle.setAttribute('r', '1');
            circle.setAttribute('class', 'action-point');
            circle.dataset.sizePx = '3';
            circle.dataset.id = point.id;
            circle.addEventListener('click', (event) => {
              event.stopPropagation();
              helpers.handlers?.showManualMenu?.(event, point.id);
            });
            group.appendChild(circle);
            helpers.refs.actionPointMarkers.set(point.id, circle);
          });
          svg.appendChild(group);
        }
        helpers.applyLayerVisibility(group, visible);
      }
    };
  };

  window.FleetUI = window.FleetUI || {};
  window.FleetUI.MapLayerActionPoints = { create };
})();

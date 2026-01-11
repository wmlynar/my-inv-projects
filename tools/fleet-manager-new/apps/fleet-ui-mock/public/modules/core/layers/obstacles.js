(() => {
  const create = ({ svgNS = 'http://www.w3.org/2000/svg' } = {}) => {
    let group = null;

    const renderMarkers = (state, helpers) => {
      if (!group || !state?.mapState) return;
      group.innerHTML = '';
      (state.obstacles || []).forEach((obstacle) => {
        const point = helpers.projectPoint(obstacle);
        const circle = document.createElementNS(svgNS, 'circle');
        circle.setAttribute('cx', point.x);
        circle.setAttribute('cy', point.y);
        circle.setAttribute('r', obstacle.radius);
        circle.setAttribute('class', `obstacle-marker ${obstacle.mode}`);
        circle.dataset.id = obstacle.id;
        circle.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          helpers.handlers?.removeObstacle?.(obstacle.id);
        });
        group.appendChild(circle);
      });
    };

    return {
      id: 'obstacles',
      render({ svg, state, helpers, visible }) {
        if (!svg || !state?.mapState) return;
        const needsRebuild = state.needsRebuild || !group;
        if (needsRebuild) {
          if (group) group.remove();
          group = document.createElementNS(svgNS, 'g');
          group.setAttribute('class', 'map-obstacles map-layer');
          svg.appendChild(group);
        }
        renderMarkers(state, helpers);
        helpers.applyLayerVisibility(group, visible);
      }
    };
  };

  window.FleetUI = window.FleetUI || {};
  window.FleetUI.MapLayerObstacles = { create };
})();

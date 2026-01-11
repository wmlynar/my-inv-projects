(() => {
  const create = ({ svgNS = 'http://www.w3.org/2000/svg' } = {}) => {
    let group = null;

    return {
      id: 'links',
      render({ svg, state, helpers, visible }) {
        if (!svg || !state?.mapState) return;
        const needsRebuild = state.needsRebuild || !group;
        if (needsRebuild) {
          if (group) group.remove();
          group = document.createElementNS(svgNS, 'g');
          group.setAttribute('class', 'map-links map-layer');
          (state.worksites || []).forEach((site) => {
            const sitePos = site.displayPos || site.pos;
            if (!sitePos) return;
            const actionPos = site.point ? state.mapActionPointIndex?.get(site.point) : null;
            if (!actionPos) return;
            const point = helpers.projectPoint(sitePos);
            const actionPoint = helpers.projectPoint(actionPos);
            const link = document.createElementNS(svgNS, 'line');
            link.setAttribute('x1', point.x);
            link.setAttribute('y1', point.y);
            link.setAttribute('x2', actionPoint.x);
            link.setAttribute('y2', actionPoint.y);
            link.setAttribute('class', 'worksite-link');
            group.appendChild(link);
          });
          svg.appendChild(group);
        }
        helpers.applyLayerVisibility(group, visible);
      }
    };
  };

  window.FleetUI = window.FleetUI || {};
  window.FleetUI.MapLayerLinks = { create };
})();

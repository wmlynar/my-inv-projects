(() => {
  const create = ({ svgNS = 'http://www.w3.org/2000/svg' } = {}) => {
    let group = null;

    const updateWorksiteClasses = (state, helpers) => {
      const elements = helpers?.refs?.worksiteElements;
      const rings = helpers?.refs?.worksiteRings;
      const labels = helpers?.refs?.worksiteLabels;
      if (!elements || !rings || !labels) return;
      (state.worksites || []).forEach((site) => {
        const siteState = state.worksiteState?.[site.id] || { occupancy: 'empty', blocked: false };
        const occupancy = siteState.occupancy || 'empty';
        const marker = elements.get(site.id);
        if (marker) {
          marker.classList.remove('filled', 'empty', 'blocked');
          marker.classList.add(occupancy);
          if (siteState.blocked) marker.classList.add('blocked');
        }
        const ring = rings.get(site.id);
        if (ring) {
          ring.classList.toggle('blocked', siteState.blocked);
        }
        const label = labels.get(site.id);
        if (label) {
          label.classList.remove('filled', 'empty', 'blocked');
          label.classList.add(occupancy);
          if (siteState.blocked) label.classList.add('blocked');
        }
      });
    };

    return {
      id: 'worksites',
      render({ svg, state, helpers, visible }) {
        if (!svg || !state?.mapState) return;
        const needsRebuild = state.needsRebuild || !group;
        if (needsRebuild) {
          if (group) group.remove();
          group = document.createElementNS(svgNS, 'g');
          group.setAttribute('class', 'map-layer map-layer-worksites');
          const worksitesGroup = document.createElementNS(svgNS, 'g');
          worksitesGroup.setAttribute('class', 'map-worksites');
          const ringsGroup = document.createElementNS(svgNS, 'g');
          ringsGroup.setAttribute('class', 'map-worksite-rings');
          const labelsGroup = document.createElementNS(svgNS, 'g');
          labelsGroup.setAttribute('class', 'map-labels');
          helpers.refs.worksiteElements = new Map();
          helpers.refs.worksiteRings = new Map();
          helpers.refs.worksiteLabels = new Map();
          (state.worksites || []).forEach((site) => {
            const sitePos = site.displayPos || site.pos;
            if (!sitePos) return;
            const point = helpers.projectPoint(sitePos);
            const siteState = state.worksiteState?.[site.id] || { occupancy: 'empty', blocked: false };
            const occupancy = siteState.occupancy || 'empty';
            const circle = document.createElementNS(svgNS, 'circle');
            circle.setAttribute('cx', point.x);
            circle.setAttribute('cy', point.y);
            circle.setAttribute('r', '1');
            circle.setAttribute(
              'class',
              `worksite-marker ${site.kind} ${occupancy}${siteState.blocked ? ' blocked' : ''}`
            );
            circle.dataset.sizePx = site.kind === 'drop' ? '18' : '15';
            circle.dataset.id = site.id;
            circle.addEventListener('click', (event) => {
              event.stopPropagation();
              helpers.handlers?.showWorksiteMenu?.(event, site.id);
            });
            circle.addEventListener('contextmenu', (event) => {
              event.preventDefault();
              event.stopPropagation();
              helpers.handlers?.showWorksiteMenu?.(event, site.id);
            });
            worksitesGroup.appendChild(circle);
            helpers.refs.worksiteElements.set(site.id, circle);

            const ring = document.createElementNS(svgNS, 'circle');
            ring.setAttribute('cx', point.x);
            ring.setAttribute('cy', point.y);
            ring.setAttribute('r', '1');
            ring.setAttribute('class', `worksite-ring${siteState.blocked ? ' blocked' : ''}`);
            ring.dataset.sizePx = site.kind === 'drop' ? '27' : '24';
            ringsGroup.appendChild(ring);
            helpers.refs.worksiteRings.set(site.id, ring);

            const label = document.createElementNS(svgNS, 'text');
            label.textContent = site.id;
            label.setAttribute(
              'class',
              `worksite-label ${occupancy}${siteState.blocked ? ' blocked' : ''}`
            );
            label.dataset.baseX = point.x;
            label.dataset.baseY = point.y;
            label.setAttribute('x', point.x);
            label.setAttribute('y', point.y);
            label.setAttribute('text-anchor', 'middle');
            label.setAttribute('dominant-baseline', 'hanging');
            labelsGroup.appendChild(label);
            helpers.refs.worksiteLabels.set(site.id, label);
          });
          group.appendChild(worksitesGroup);
          group.appendChild(ringsGroup);
          group.appendChild(labelsGroup);
          svg.appendChild(group);
        }
        updateWorksiteClasses(state, helpers);
        helpers.applyLayerVisibility(group, visible);
      }
    };
  };

  window.FleetUI = window.FleetUI || {};
  window.FleetUI.MapLayerWorksites = { create };
})();

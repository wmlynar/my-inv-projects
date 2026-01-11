(() => {
  const create = ({ svgNS = 'http://www.w3.org/2000/svg' } = {}) => {
    let group = null;
    let labelsGroup = null;

    return {
      id: 'nodes',
      render({ svg, state, helpers, visible }) {
        if (!svg || !state?.mapState) return;
        const needsRebuild = state.needsRebuild || !group;
        if (needsRebuild) {
          if (group) group.remove();
          group = document.createElementNS(svgNS, 'g');
          group.setAttribute('class', 'map-nodes map-layer');
          labelsGroup = document.createElementNS(svgNS, 'g');
          labelsGroup.setAttribute('class', 'map-labels');
          helpers.refs.nodeMarkers = new Map();
          helpers.refs.nodeLabels = new Map();
          (state.mapNodesWithPos || []).forEach((node) => {
            const pos = helpers.projectPoint(node.pos);
            const circle = document.createElementNS(svgNS, 'circle');
            circle.setAttribute('cx', pos.x);
            circle.setAttribute('cy', pos.y);
            circle.setAttribute('r', '1');
            circle.setAttribute('class', `map-node ${node.className ? node.className.replace(/\\s+/g, '-').toLowerCase() : ''}`);
            circle.dataset.sizePx = '6';
            circle.dataset.id = node.id;
            group.appendChild(circle);
            helpers.refs.nodeMarkers.set(node.id, circle);

            const label = document.createElementNS(svgNS, 'text');
            label.textContent = node.id;
            label.setAttribute('class', 'node-label');
            label.dataset.baseX = pos.x;
            label.dataset.baseY = pos.y;
            label.setAttribute('x', pos.x);
            label.setAttribute('y', pos.y);
            label.setAttribute('text-anchor', 'middle');
            label.setAttribute('dominant-baseline', 'hanging');
            labelsGroup.appendChild(label);
            helpers.refs.nodeLabels.set(node.id, label);
          });
          group.appendChild(labelsGroup);
          svg.appendChild(group);
        }
        helpers.applyLayerVisibility(group, visible);
      }
    };
  };

  window.FleetUI = window.FleetUI || {};
  window.FleetUI.MapLayerNodes = { create };
})();

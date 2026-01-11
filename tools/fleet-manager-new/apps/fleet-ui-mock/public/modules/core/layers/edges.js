(() => {
  const create = ({ svgNS = 'http://www.w3.org/2000/svg' } = {}) => {
    let group = null;

    return {
      id: 'edges',
      render({ svg, state, helpers, visible }) {
        if (!svg || !state?.graph || !state?.mapState) return;
        const needsRebuild = state.needsRebuild || !group;
        if (needsRebuild) {
          if (group) group.remove();
          group = document.createElementNS(svgNS, 'g');
          group.setAttribute('class', 'map-edges map-layer');
          const nodesIndex = new Map((state.graph.nodes || []).map((node) => [node.id, node.pos]));
          (state.graph.edges || []).forEach((edge) => {
            const start = edge.startPos || nodesIndex.get(edge.start);
            const end = edge.endPos || nodesIndex.get(edge.end);
            if (!start || !end) return;
            const startPos = helpers.projectPoint(start);
            const endPos = helpers.projectPoint(end);
            const path = document.createElementNS(svgNS, 'path');
            if (edge.controlPos1 && edge.controlPos2) {
              const c1 = helpers.projectPoint(edge.controlPos1);
              const c2 = helpers.projectPoint(edge.controlPos2);
              path.setAttribute(
                'd',
                `M ${startPos.x} ${startPos.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${endPos.x} ${endPos.y}`
              );
            } else {
              path.setAttribute('d', `M ${startPos.x} ${startPos.y} L ${endPos.x} ${endPos.y}`);
            }
            const width = Number(edge?.props?.width || 0);
            path.setAttribute('class', `map-edge${Number.isFinite(width) && width > 0 ? ' corridor' : ''}`);
            if (Number.isFinite(width) && width > 0) {
              path.dataset.corridorWidth = String(width);
            }
            group.appendChild(path);
          });
          svg.appendChild(group);
        }
        helpers.applyLayerVisibility(group, visible);
      }
    };
  };

  window.FleetUI = window.FleetUI || {};
  window.FleetUI.MapLayerEdges = { create };
})();

(() => {
  const create = ({ svgNS = 'http://www.w3.org/2000/svg' } = {}) => {
    let group = null;
    let robotMarkers = new Map();

    const updateRobotMarkers = (state, helpers) => {
      if (!robotMarkers.size) return;
      robotMarkers.forEach((marker, id) => {
        const robot = (state.robots || []).find((item) => item.id === id);
        if (!robot?.pos) return;
        helpers.ensureRobotMotion(robot);
        const point = helpers.projectPoint(robot.pos);
        const headingDeg = (-robot.heading * 180) / Math.PI;
        marker.setAttribute('transform', `translate(${point.x} ${point.y}) rotate(${headingDeg})`);
        marker.setAttribute('class', helpers.buildRobotMarkerClass(robot));
      });
    };

    return {
      id: 'robots',
      render({ svg, state, helpers, visible }) {
        if (!svg) return;
        const robotIds = (state.robots || []).map((robot) => robot?.id).filter(Boolean);
        if (!robotIds.length) {
          if (group) {
            group.remove();
            group = null;
          }
          robotMarkers.clear();
          return;
        }
        const needsRebuild =
          state.needsRebuild ||
          !group ||
          robotMarkers.size !== robotIds.length ||
          robotIds.some((id) => !robotMarkers.has(id));
        if (needsRebuild) {
          if (group) {
            group.remove();
          }
          group = document.createElementNS(svgNS, 'g');
          group.setAttribute('class', 'map-robots map-layer');
          robotMarkers = new Map();
          (state.robots || []).forEach((robot) => {
            if (!robot?.pos) return;
            helpers.ensureRobotMotion(robot);
            const point = helpers.projectPoint(robot.pos);
            const container = document.createElementNS(svgNS, 'g');
            container.setAttribute('class', helpers.buildRobotMarkerClass(robot));
            container.dataset.id = robot.id;
            const model = helpers.resolveRobotModel(robot, state.robotsConfig);
            const length = model.head + model.tail;
            const halfWidth = model.width / 2;
            const body = document.createElementNS(svgNS, 'rect');
            body.setAttribute('x', String(-model.tail));
            body.setAttribute('y', String(-halfWidth));
            body.setAttribute('width', String(length));
            body.setAttribute('height', String(model.width));
            body.setAttribute('rx', String(Math.min(0.2, model.width * 0.2)));
            body.setAttribute('class', 'robot-body');
            const heading = document.createElementNS(svgNS, 'path');
            heading.setAttribute('class', 'robot-heading');
            const arrowLength = Math.max(model.width * 0.6, 0.4);
            const arrowHalfWidth = Math.max(model.width * 0.35, 0.25);
            const tipX = model.head + arrowLength;
            const baseX = model.head;
            heading.setAttribute(
              'd',
              `M ${tipX} 0 L ${baseX} ${arrowHalfWidth} L ${baseX} ${-arrowHalfWidth} Z`
            );
            container.appendChild(body);
            container.appendChild(heading);
            const headingDeg = (-robot.heading * 180) / Math.PI;
            container.setAttribute('transform', `translate(${point.x} ${point.y}) rotate(${headingDeg})`);
            container.addEventListener('click', (event) => {
              event.stopPropagation();
              helpers.handlers?.onRobotClick?.(robot.id);
            });
            group.appendChild(container);
            robotMarkers.set(robot.id, container);
          });
          svg.appendChild(group);
        }
        updateRobotMarkers(state, helpers);
        helpers.applyLayerVisibility(group, visible);
      }
    };
  };

  window.FleetUI = window.FleetUI || {};
  window.FleetUI.MapLayerRobots = { create };
})();

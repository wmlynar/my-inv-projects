(() => {
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const distanceBetweenPoints = (a, b) => {
    if (!a || !b) return Number.POSITIVE_INFINITY;
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  const projectPoint = (point, mapState) => {
    if (!mapState || !point) return { x: 0, y: 0 };
    return {
      x: point.x - mapState.offsetX,
      y: mapState.offsetY - point.y
    };
  };

  const unprojectPoint = (point, mapState) => {
    if (!mapState || !point) return { x: 0, y: 0 };
    return {
      x: point.x + mapState.offsetX,
      y: mapState.offsetY - point.y
    };
  };

  const getBounds = (graph, worksites = []) => {
    const bounds = graph?.meta?.bounds;
    if (bounds?.min && bounds?.max) {
      return {
        minX: bounds.min.x,
        maxX: bounds.max.x,
        minY: bounds.min.y,
        maxY: bounds.max.y
      };
    }

    const points = [];
    (graph?.nodes || []).forEach((node) => {
      if (node.pos) points.push(node.pos);
    });
    worksites.forEach((site) => {
      const pos = site.displayPos || site.pos;
      if (pos) points.push(pos);
    });

    if (!points.length) {
      return { minX: -10, maxX: 10, minY: -10, maxY: 10 };
    }

    const xs = points.map((point) => point.x);
    const ys = points.map((point) => point.y);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys)
    };
  };

  window.FleetUI = window.FleetUI || {};
  window.FleetUI.Geometry = {
    clamp,
    distanceBetweenPoints,
    projectPoint,
    unprojectPoint,
    getBounds
  };
})();

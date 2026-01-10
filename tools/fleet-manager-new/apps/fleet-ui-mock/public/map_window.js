(() => {
  const init = ({ shell, wrap, svg, miniMapSvg } = {}) => {
    const api = {
      shell,
      wrap,
      svg,
      miniMapSvg,
      state: {},
      toMap(point) {
        return point;
      },
      toScreen(point) {
        return point;
      },
      requestRender() {}
    };
    return api;
  };

  window.MapWindow = { init };
})();

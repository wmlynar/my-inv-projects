const path = require('path');

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const createClassList = () => ({
  add: () => {},
  remove: () => {},
  toggle: () => {},
  contains: () => false
});

const createStubElement = (tag = 'div') => ({
  tagName: tag.toUpperCase(),
  innerHTML: '',
  dataset: {},
  children: [],
  classList: createClassList(),
  setAttribute: () => {},
  appendChild(child) {
    this.children.push(child);
    return child;
  },
  remove: () => {},
  addEventListener: () => {},
  getBoundingClientRect: () => ({ width: 100, height: 100, left: 0, top: 0 }),
  setPointerCapture: () => {},
  releasePointerCapture: () => {}
});

const createSvgElement = () => {
  const el = createStubElement('svg');
  el.createSVGPoint = () => ({
    x: 0,
    y: 0,
    matrixTransform: () => ({ x: 0, y: 0 })
  });
  el.getScreenCTM = () => ({ inverse: () => ({}) });
  return el;
};

global.window = {
  addEventListener: () => {},
  dispatchEvent: () => {},
  FleetUI: {}
};
global.document = {
  createElementNS: (_ns, tag) => createStubElement(tag),
  createDocumentFragment: () => createStubElement('fragment'),
  addEventListener: () => {},
  activeElement: null
};
global.CustomEvent = function CustomEvent(type, options) {
  this.type = type;
  this.detail = options?.detail;
};

require(path.resolve(__dirname, '../../public/modules/lib/core_utils.js'));
require(path.resolve(__dirname, '../../../../packages/robokit-map-ui/public/map_bundle.js'));

const { Geometry, MapCore } = global.window.FleetUI;
assert(Geometry, 'Geometry module missing');
assert(MapCore, 'MapCore module missing');

const svg = createSvgElement();
const miniSvg = createSvgElement();
const wrap = createStubElement('div');
const layers = { render: () => {}, setVisibility: () => {} };
const store = { setMapState: () => {}, notify: () => {} };

const mapCore = MapCore.init({
  svg,
  wrap,
  miniSvg,
  store,
  layers,
  geometry: Geometry,
  constants: {
    LABEL_SIZE_PX: 40,
    LABEL_OFFSET_PX: 40,
    NODE_LABEL_SIZE_PX: 40,
    NODE_LABEL_OFFSET_PX: -40,
    NODE_LABEL_MIN_ZOOM: 1,
    LABEL_MIN_ZOOM: 1,
    MAP_OUTER_MARGIN: 10,
    WORKSITE_AP_OFFSET: 0.5,
    WORKSITE_POS_MAX_DRIFT: 2.6
  }
});

assert(mapCore && typeof mapCore.setData === 'function', 'MapCore.setData missing');

mapCore.setData({
  graph: {
    meta: { bounds: { min: { x: 0, y: 0 }, max: { x: 10, y: 10 } } },
    nodes: [],
    edges: []
  },
  workflow: { bin_locations: {} },
  worksites: [],
  worksiteState: {},
  robots: [],
  robotsConfig: null,
  obstacles: []
});

console.log('ok - map core setData');

const path = require('path');

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

global.window = {};
require(path.resolve(__dirname, '../../public/modules/lib/geometry.js'));

const geometry = global.window?.FleetUI?.Geometry;
assert(geometry, 'geometry module missing');

const { clamp, distanceBetweenPoints, projectPoint, unprojectPoint, getBounds } = geometry;

assert(clamp(5, 0, 10) === 5, 'clamp should keep values in range');
assert(clamp(-2, 0, 10) === 0, 'clamp should floor to min');
assert(clamp(12, 0, 10) === 10, 'clamp should cap to max');

const dist = distanceBetweenPoints({ x: 0, y: 0 }, { x: 3, y: 4 });
assert(Math.abs(dist - 5) < 1e-6, 'distanceBetweenPoints should use euclidean distance');

const mapState = { offsetX: 10, offsetY: 20 };
const original = { x: 12, y: 18 };
const projected = projectPoint(original, mapState);
assert(projected.x === 2 && projected.y === 2, 'projectPoint should apply offsets');
const unprojected = unprojectPoint(projected, mapState);
assert(unprojected.x === original.x && unprojected.y === original.y, 'unprojectPoint should invert projection');

const boundsFromMeta = getBounds({
  meta: { bounds: { min: { x: -2, y: -3 }, max: { x: 4, y: 7 } } }
});
assert(boundsFromMeta.minX === -2 && boundsFromMeta.maxX === 4, 'getBounds should use meta bounds');
assert(boundsFromMeta.minY === -3 && boundsFromMeta.maxY === 7, 'getBounds should use meta bounds');

const boundsFromPoints = getBounds(
  {
    nodes: [{ pos: { x: 1, y: 2 } }, { pos: { x: 5, y: -1 } }]
  },
  [{ pos: { x: -3, y: 4 } }]
);
assert(boundsFromPoints.minX === -3 && boundsFromPoints.maxX === 5, 'getBounds should derive min/max X');
assert(boundsFromPoints.minY === -1 && boundsFromPoints.maxY === 4, 'getBounds should derive min/max Y');

console.log('ok - geometry tests');

/* eslint-disable no-var */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.MotionKernel = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function normalizeAngle(angle) {
    var value = angle;
    while (value > Math.PI) value -= Math.PI * 2;
    while (value < -Math.PI) value += Math.PI * 2;
    return value;
  }

  function toRad(deg) {
    return (deg * Math.PI) / 180;
  }

  function distancePointToSegmentCoords(px, py, ax, ay, bx, by) {
    var abx = bx - ax;
    var aby = by - ay;
    var apx = px - ax;
    var apy = py - ay;
    var abLenSq = abx * abx + aby * aby;
    if (abLenSq === 0) {
      return Math.hypot(px - ax, py - ay);
    }
    var t = clamp((apx * abx + apy * aby) / abLenSq, 0, 1);
    var cx = ax + abx * t;
    var cy = ay + aby * t;
    return Math.hypot(px - cx, py - cy);
  }

  function distancePointToSegment(point, a, b) {
    if (!point || !a || !b) return Number.POSITIVE_INFINITY;
    return distancePointToSegmentCoords(point.x, point.y, a.x, a.y, b.x, b.y);
  }

  function unitVector(dx, dy) {
    var len = Math.hypot(dx, dy);
    if (len === 0) return { x: 0, y: 0 };
    return { x: dx / len, y: dy / len };
  }

  function sampleBezierPoints(p0, p1, p2, p3, samples) {
    var points = [];
    for (var i = 0; i <= samples; i += 1) {
      var t = i / samples;
      var mt = 1 - t;
      var mt2 = mt * mt;
      var t2 = t * t;
      var x =
        mt2 * mt * p0.x +
        3 * mt2 * t * p1.x +
        3 * mt * t2 * p2.x +
        t2 * t * p3.x;
      var y =
        mt2 * mt * p0.y +
        3 * mt2 * t * p1.y +
        3 * mt * t2 * p2.y +
        t2 * t * p3.y;
      points.push({ x: x, y: y });
    }
    return points;
  }

  function buildPolyline(points) {
    var lengths = [0];
    var total = 0;
    for (var i = 1; i < points.length; i += 1) {
      var dx = points[i].x - points[i - 1].x;
      var dy = points[i].y - points[i - 1].y;
      total += Math.hypot(dx, dy);
      lengths.push(total);
    }
    var headings = points.map(function (pt, idx) {
      var next = points[idx + 1] || points[idx];
      var prev = points[idx - 1] || points[idx];
      var dx = next.x - prev.x;
      var dy = next.y - prev.y;
      if (dx === 0 && dy === 0) {
        return 0;
      }
      return Math.atan2(dy, dx);
    });
    return { points: points, lengths: lengths, totalLength: total, headings: headings };
  }

  function reversePolyline(polyline) {
    var points = polyline.points.slice().reverse();
    var headings = polyline.headings
      .slice()
      .reverse()
      .map(function (heading) {
        return normalizeAngle(heading + Math.PI);
      });
    var total = polyline.totalLength;
    var lengths = polyline.lengths.map(function (dist) {
      return total - dist;
    });
    lengths.reverse();
    return { points: points, headings: headings, lengths: lengths, totalLength: total };
  }

  function polylineAtDistance(polyline, distance) {
    if (!polyline.points.length) {
      return { x: 0, y: 0, heading: 0 };
    }
    if (distance <= 0) {
      return {
        x: polyline.points[0].x,
        y: polyline.points[0].y,
        heading: polyline.headings[0]
      };
    }
    if (distance >= polyline.totalLength) {
      var lastIdx = polyline.points.length - 1;
      return {
        x: polyline.points[lastIdx].x,
        y: polyline.points[lastIdx].y,
        heading: polyline.headings[lastIdx]
      };
    }
    var lengths = polyline.lengths;
    var idx = 0;
    while (idx < lengths.length - 1 && lengths[idx + 1] < distance) {
      idx += 1;
    }
    var segStart = lengths[idx];
    var segEnd = lengths[idx + 1];
    var ratio = segEnd === segStart ? 0 : (distance - segStart) / (segEnd - segStart);
    var a = polyline.points[idx];
    var b = polyline.points[idx + 1];
    var x = a.x + (b.x - a.x) * ratio;
    var y = a.y + (b.y - a.y) * ratio;
    var heading = polyline.headings[idx];
    return { x: x, y: y, heading: heading };
  }

  return {
    clamp: clamp,
    normalizeAngle: normalizeAngle,
    toRad: toRad,
    distancePointToSegment: distancePointToSegment,
    distancePointToSegmentCoords: distancePointToSegmentCoords,
    unitVector: unitVector,
    sampleBezierPoints: sampleBezierPoints,
    buildPolyline: buildPolyline,
    reversePolyline: reversePolyline,
    polylineAtDistance: polylineAtDistance
  };
});

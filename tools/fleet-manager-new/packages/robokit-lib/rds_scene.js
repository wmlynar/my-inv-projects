const fs = require('fs');

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function propValue(prop) {
  if (!prop || typeof prop !== 'object') {
    return null;
  }
  if (prop.type === 'bool' && Object.prototype.hasOwnProperty.call(prop, 'boolValue')) {
    return Boolean(prop.boolValue);
  }
  if ((prop.type === 'int32' || prop.type === 'int64') && Object.prototype.hasOwnProperty.call(prop, 'int32Value')) {
    return Number(prop.int32Value);
  }
  if (prop.type === 'double' && Object.prototype.hasOwnProperty.call(prop, 'doubleValue')) {
    return Number(prop.doubleValue);
  }
  if (Object.prototype.hasOwnProperty.call(prop, 'stringValue')) {
    return prop.stringValue;
  }
  if (Object.prototype.hasOwnProperty.call(prop, 'value') && prop.value !== '') {
    return prop.value;
  }
  if (Object.prototype.hasOwnProperty.call(prop, 'boolValue')) {
    return Boolean(prop.boolValue);
  }
  if (Object.prototype.hasOwnProperty.call(prop, 'int32Value')) {
    return Number(prop.int32Value);
  }
  if (Object.prototype.hasOwnProperty.call(prop, 'doubleValue')) {
    return Number(prop.doubleValue);
  }
  return null;
}

function propsToMap(props) {
  const map = {};
  if (!Array.isArray(props)) {
    return map;
  }
  for (const prop of props) {
    if (!prop || !prop.key) {
      continue;
    }
    map[prop.key] = propValue(prop);
  }
  return map;
}

function parseRobotTag(tag) {
  if (!tag || typeof tag !== 'string') {
    return null;
  }
  const [robotId, rawFlag] = tag.split(':');
  if (!robotId) {
    return null;
  }
  return {
    robotId,
    flag: rawFlag ? Number(rawFlag) : null
  };
}

function parseRobotProps(robot, groupName) {
  const props = propsToMap(robot.property);
  return {
    id: robot.id,
    group: groupName,
    currentMap: props.current_map || null,
    ip: props.ip || null,
    isSimulation: props.is_simulation === true,
    initialArea: props.initialArea || null,
    initialPosition: props.initialPosition || null,
    dir: Number.isFinite(props.dir) ? props.dir : null,
    chargeLevels: {
      chargeNeed: Number.isFinite(props.chargeNeed) ? props.chargeNeed : null,
      chargeOnly: Number.isFinite(props.chargeOnly) ? props.chargeOnly : null,
      chargedOk: Number.isFinite(props.chargedOk) ? props.chargedOk : null,
      chargedFull: Number.isFinite(props.chargedFull) ? props.chargedFull : null
    },
    props
  };
}

function parseAdvancedPoints(areas) {
  const points = [];
  for (const area of areas || []) {
    const logicalMap = area.logicalMap || {};
    for (const point of logicalMap.advancedPoints || []) {
      const rawProps = Array.isArray(point.property) ? point.property : [];
      const props = propsToMap(rawProps);
      const binding = typeof props.bindRobotMap === 'string' ? props.bindRobotMap : '';
      const [bindRobotId, bindMapName] = binding.split(':');
      points.push({
        area: area.name || null,
        className: point.className,
        instanceName: point.instanceName,
        pos: point.pos,
        dir: point.dir,
        ignoreDir: point.ignoreDir,
        bindRobotId: bindRobotId || null,
        bindMapName: bindMapName || null,
        props,
        rawProps
      });
    }
  }
  return points;
}

function parseBinLocations(areas) {
  const bins = [];
  for (const area of areas || []) {
    const logicalMap = area.logicalMap || {};
    for (const entry of logicalMap.binLocationsList || []) {
      for (const bin of entry.binLocationList || []) {
        const props = propsToMap(bin.property);
        let points = null;
        let model3d = null;
        if (typeof props.points === 'string' && props.points.trim()) {
          try {
            points = JSON.parse(props.points);
          } catch (err) {
            points = null;
          }
        }
        if (typeof props['3DProperty'] === 'string' && props['3DProperty'].trim()) {
          try {
            model3d = JSON.parse(props['3DProperty']);
          } catch (err) {
            model3d = null;
          }
        }
        bins.push({
          area: area.name || null,
          className: bin.className,
          instanceName: bin.instanceName,
          groupName: bin.groupName,
          pointName: bin.pointName,
          pos: bin.pos,
          bindRobotMap: props.bindRobotMap || null,
          points,
          model3d,
          props
        });
      }
    }
  }
  return bins;
}

function parseMaps(areas) {
  const maps = [];
  for (const area of areas || []) {
    for (const map of area.maps || []) {
      maps.push({
        area: area.name || null,
        robotId: map.robotId || null,
        mapName: map.mapName || null,
        md5: map.md5 || null
      });
    }
  }
  return maps;
}

function parseRdsScene(scene) {
  const robotGroups = [];
  const robots = [];
  for (const group of scene.robotGroup || []) {
    const groupName = group.name || null;
    robotGroups.push({
      name: groupName,
      props: propsToMap(group.property)
    });
    for (const robot of group.robot || []) {
      robots.push(parseRobotProps(robot, groupName));
    }
  }

  const areas = Array.isArray(scene.areas) ? scene.areas : [];
  const points = parseAdvancedPoints(areas);
  const bins = parseBinLocations(areas);
  const maps = parseMaps(areas);

  const chargePoints = [];
  const parkPoints = [];
  for (const point of points) {
    const chargeValue = point.props.chargePoint;
    const parkValue = point.props.parkPoint;
    if (point.className === 'ChargePoint' || chargeValue === true) {
      const tagged = parseRobotTag(findTag(point, 'chargePoint'));
      chargePoints.push({
        instanceName: point.instanceName,
        area: point.area,
        pos: point.pos,
        dir: point.dir,
        bindRobotId: point.bindRobotId,
        bindMapName: point.bindMapName,
        assignedRobotId: tagged ? tagged.robotId : null
      });
    }
    if (point.className === 'ParkPoint' || parkValue === true) {
      const tagged = parseRobotTag(findTag(point, 'parkPoint'));
      parkPoints.push({
        instanceName: point.instanceName,
        area: point.area,
        pos: point.pos,
        dir: point.dir,
        bindRobotId: point.bindRobotId,
        bindMapName: point.bindMapName,
        assignedRobotId: tagged ? tagged.robotId : null
      });
    }
  }

  return {
    robots,
    robotsById: Object.fromEntries(robots.map((robot) => [robot.id, robot])),
    robotGroups,
    labels: Array.isArray(scene.labels) ? scene.labels : [],
    maps,
    points,
    chargePoints,
    parkPoints,
    binLocations: bins,
    assignments: buildAssignments(robots, chargePoints, parkPoints)
  };
}

function findTag(point, key) {
  if (!point || !Array.isArray(point.rawProps)) {
    return '';
  }
  for (const prop of point.rawProps) {
    if (prop.key === key && prop.tag) {
      return prop.tag;
    }
  }
  return '';
}

function buildAssignments(robots, chargePoints, parkPoints) {
  const assignments = {};
  for (const robot of robots || []) {
    assignments[robot.id] = {
      chargePoints: [],
      parkPoints: [],
      initialPosition: robot.initialPosition || null,
      chargeLevels: robot.chargeLevels || null
    };
  }
  for (const point of chargePoints || []) {
    if (!point.assignedRobotId) {
      continue;
    }
    if (!assignments[point.assignedRobotId]) {
      assignments[point.assignedRobotId] = { chargePoints: [], parkPoints: [] };
    }
    assignments[point.assignedRobotId].chargePoints.push(point.instanceName);
  }
  for (const point of parkPoints || []) {
    if (!point.assignedRobotId) {
      continue;
    }
    if (!assignments[point.assignedRobotId]) {
      assignments[point.assignedRobotId] = { chargePoints: [], parkPoints: [] };
    }
    assignments[point.assignedRobotId].parkPoints.push(point.instanceName);
  }
  return assignments;
}

function loadRdsScene(scenePath) {
  const scene = readJson(scenePath);
  return parseRdsScene(scene);
}

module.exports = {
  loadRdsScene,
  parseRdsScene,
  propsToMap
};

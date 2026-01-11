const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { loadMapGraphLight } = require('../../../packages/robokit-lib/map_loader');

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_err) {
    return null;
  }
}

function formatTimestamp(value) {
  const date = value instanceof Date ? value : new Date(value || Date.now());
  const pad = (num) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function computeFileMd5(filePath) {
  if (!filePath) return '';
  try {
    const data = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(data).digest('hex');
  } catch (_err) {
    return '';
  }
}

function resolveMapName(graphData, mapPath) {
  if (graphData && graphData.meta && graphData.meta.mapName) {
    return graphData.meta.mapName;
  }
  if (!mapPath) {
    return '';
  }
  const base = path.basename(mapPath);
  return base.replace(path.extname(base), '');
}

function listMapFiles(mapPath) {
  if (!mapPath) {
    return [];
  }
  let dir = mapPath;
  try {
    if (fs.existsSync(mapPath) && fs.statSync(mapPath).isFile()) {
      dir = path.dirname(mapPath);
    }
  } catch (_err) {
    dir = path.dirname(mapPath);
  }
  let entries = [];
  try {
    entries = fs.readdirSync(dir);
  } catch (_err) {
    entries = [];
  }
  const files = entries
    .filter((name) => name.toLowerCase().endsWith('.smap'))
    .map((name) => {
      const fullPath = path.join(dir, name);
      try {
        const stat = fs.statSync(fullPath);
        return { name, size: stat.size, modified: formatTimestamp(stat.mtime) };
      } catch (_err) {
        return null;
      }
    })
    .filter(Boolean);
  if (files.length === 0 && fs.existsSync(mapPath)) {
    try {
      const stat = fs.statSync(mapPath);
      if (stat.isFile()) {
        files.push({
          name: path.basename(mapPath),
          size: stat.size,
          modified: formatTimestamp(stat.mtime)
        });
      }
    } catch (_err) {
      return files;
    }
  }
  return files;
}

function buildMapInfo(mapPath, graphData) {
  const name = resolveMapName(graphData, mapPath);
  const files = listMapFiles(mapPath);
  const names = files.map((entry) => path.basename(entry.name, path.extname(entry.name)));
  if (name && !names.includes(name)) {
    names.push(name);
  }
  return {
    name,
    md5: computeFileMd5(mapPath),
    files,
    names
  };
}

function defaultRobotConfigPath(mapPath) {
  const dir = path.dirname(mapPath);
  const base = path.basename(mapPath, path.extname(mapPath));
  return path.join(dir, `${base}.robots.json`);
}

function loadRobotConfig(mapPath, robotConfigPath) {
  const configPath = robotConfigPath || defaultRobotConfigPath(mapPath);
  if (!configPath || !fs.existsSync(configPath)) {
    return null;
  }
  const data = readJsonSafe(configPath);
  if (!data || typeof data !== 'object') {
    return null;
  }
  return { path: configPath, data };
}

function findRobotConfigEntry(config, robotId) {
  if (!config || typeof config !== 'object') {
    return null;
  }
  const list = Array.isArray(config.robots) ? config.robots : [];
  if (list.length === 0) {
    return null;
  }
  return (
    list.find((entry) => entry && entry.id === robotId) ||
    list.find((entry) => entry && entry.name === robotId) ||
    null
  );
}

function createMapContext({ graphPath, robotConfigPath, robotFileRoots, robotId }) {
  const graph = loadMapGraphLight(graphPath);
  const mapInfo = buildMapInfo(graphPath, graph);
  const mapEntries = mapInfo.name
    ? [{ '3dFeatureTrans': [0, 0, 0], md5: mapInfo.md5 || '', name: mapInfo.name }]
    : [];
  const chargeStationIds = new Set(
    (graph.nodes || [])
      .map((node) => {
        if (!node) {
          return null;
        }
        const className = String(node.className || node.type || '').toLowerCase();
        if (className !== 'chargepoint') {
          return null;
        }
        return node.id;
      })
      .filter(Boolean)
  );
  const fileRoots = Array.from(
    new Set([...(robotFileRoots || []), path.dirname(graphPath)].filter(Boolean))
  );
  const robotConfigInfo = loadRobotConfig(graphPath, robotConfigPath);
  const robotConfigEntry = findRobotConfigEntry(robotConfigInfo ? robotConfigInfo.data : null, robotId);
  return {
    graph,
    mapInfo,
    mapEntries,
    fileRoots,
    chargeStationIds,
    robotConfigInfo,
    robotConfigEntry
  };
}

module.exports = {
  createMapContext,
  buildMapInfo,
  listMapFiles,
  computeFileMd5,
  resolveMapName,
  loadRobotConfig,
  findRobotConfigEntry,
  formatTimestamp
};

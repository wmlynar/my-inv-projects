const fs = require('fs');
const path = require('path');

const SMAP_STREAM_PARSE = process.env.SMAP_STREAM_PARSE !== '0';
const SMAP_STREAM_CHUNK = Number.parseInt(process.env.SMAP_STREAM_CHUNK || '65536', 10);

function propValue(prop) {
  if (!prop || typeof prop !== 'object') {
    return null;
  }
  if (Object.prototype.hasOwnProperty.call(prop, 'boolValue')) {
    return prop.boolValue;
  }
  if (Object.prototype.hasOwnProperty.call(prop, 'int32Value')) {
    return prop.int32Value;
  }
  if (Object.prototype.hasOwnProperty.call(prop, 'doubleValue')) {
    return prop.doubleValue;
  }
  if (Object.prototype.hasOwnProperty.call(prop, 'stringValue')) {
    return prop.stringValue;
  }
  if (Object.prototype.hasOwnProperty.call(prop, 'value')) {
    return prop.value;
  }
  return null;
}

function propsMap(props) {
  const out = {};
  for (const prop of props || []) {
    const key = prop && prop.key;
    if (!key) {
      continue;
    }
    out[key] = propValue(prop);
  }
  return out;
}

function readSmapFieldsSync(filePath, fields) {
  const wanted = new Set(fields);
  const result = {};
  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.alloc(SMAP_STREAM_CHUNK);

  let inString = false;
  let escape = false;
  let depth = 0;
  let stringToken = '';
  let pendingKey = null;
  let expectingValue = false;
  let pendingValueKey = null;
  let expectingKey = false;

  let capture = null;

  function startCapture(key, firstChar) {
    const type = firstChar === '{' ? 'object' : firstChar === '[' ? 'array' : firstChar === '"' ? 'string' : 'scalar';
    capture = {
      key,
      type,
      buffer: firstChar,
      depth: type === 'object' || type === 'array' ? 1 : 0,
      inString: type === 'string',
      escape: false
    };
  }

  function finalizeCapture() {
    try {
      result[capture.key] = JSON.parse(capture.buffer);
    } catch (err) {
      result[capture.key] = null;
    }
    wanted.delete(capture.key);
    capture = null;
  }

  let bytesRead = 0;
  let offset = 0;
  while ((bytesRead = fs.readSync(fd, buffer, 0, buffer.length, offset)) > 0) {
    offset += bytesRead;
    const chunk = buffer.slice(0, bytesRead).toString('utf8');
    for (let i = 0; i < chunk.length; i += 1) {
      const ch = chunk[i];

      if (capture) {
        if (capture.type === 'object' || capture.type === 'array') {
          capture.buffer += ch;
          if (capture.inString) {
            if (capture.escape) {
              capture.escape = false;
            } else if (ch === '\\') {
              capture.escape = true;
            } else if (ch === '"') {
              capture.inString = false;
            }
          } else {
            if (ch === '"') {
              capture.inString = true;
            } else if (ch === '{' || ch === '[') {
              capture.depth += 1;
            } else if (ch === '}' || ch === ']') {
              capture.depth -= 1;
              if (capture.depth === 0) {
                finalizeCapture();
                if (wanted.size === 0) {
                  fs.closeSync(fd);
                  return result;
                }
              }
            }
          }
        } else if (capture.type === 'string') {
          capture.buffer += ch;
          if (capture.escape) {
            capture.escape = false;
          } else if (ch === '\\') {
            capture.escape = true;
          } else if (ch === '"') {
            finalizeCapture();
          }
        } else {
          capture.buffer += ch;
          if (ch === ',' || ch === '}' || ch === ']') {
            capture.buffer = capture.buffer.slice(0, -1);
            finalizeCapture();
            if (wanted.size === 0) {
              fs.closeSync(fd);
              return result;
            }
          }
        }
        continue;
      }

      if (inString) {
        if (escape) {
          escape = false;
          stringToken += ch;
          continue;
        }
        if (ch === '\\') {
          escape = true;
          stringToken += ch;
          continue;
        }
        if (ch === '"') {
          inString = false;
          if (depth === 1 && expectingKey) {
            pendingKey = stringToken;
            expectingKey = false;
          }
          stringToken = '';
          continue;
        }
        stringToken += ch;
        continue;
      }

      if (ch === '"') {
        inString = true;
        stringToken = '';
        continue;
      }

      if (ch === '{') {
        depth += 1;
        if (depth === 1) {
          expectingKey = true;
        }
        continue;
      }
      if (ch === '}') {
        depth = Math.max(0, depth - 1);
        continue;
      }
      if (ch === ',' && depth === 1) {
        expectingKey = true;
        continue;
      }

      if (pendingKey && ch === ':' && depth === 1) {
        if (wanted.has(pendingKey)) {
          expectingValue = true;
          pendingValueKey = pendingKey;
        }
        pendingKey = null;
        continue;
      }

      if (expectingValue) {
        if (/\s/.test(ch)) {
          continue;
        }
        expectingValue = false;
        startCapture(pendingValueKey, ch);
        pendingValueKey = null;
      }
    }
  }

  fs.closeSync(fd);
  return result;
}

function normalizeGraph(data, sourcePath) {
  const meta = data.meta || {};
  return {
    meta: {
      source: meta.source || sourcePath,
      mapType: meta.mapType || '',
      mapName: meta.mapName || '',
      version: meta.version || '',
      resolution: meta.resolution || null,
      bounds: meta.bounds || null
    },
    nodes: Array.isArray(data.nodes) ? data.nodes : [],
    edges: Array.isArray(data.edges) ? data.edges : [],
    lines: Array.isArray(data.lines) ? data.lines : [],
    areas: Array.isArray(data.areas) ? data.areas : [],
    bins: Array.isArray(data.bins) ? data.bins : []
  };
}

function loadFromSmap(data, sourcePath) {
  const header = data.header || {};
  const points = data.advancedPointList || [];
  const curves = data.advancedCurveList || [];
  const lines = data.advancedLineList || [];
  const areas = data.advancedAreaList || [];

  const nodes = points
    .filter((pt) => pt && pt.instanceName && pt.pos)
    .map((pt) => ({
      id: pt.instanceName,
      className: pt.className,
      pos: pt.pos,
      props: propsMap(pt.property),
      ignoreDir: Boolean(pt.ignoreDir)
    }));

  const edges = curves
    .filter((curve) => curve && curve.startPos && curve.endPos)
    .map((curve) => ({
      id: curve.instanceName || `${curve.startPos.instanceName}-${curve.endPos.instanceName}`,
      className: curve.className,
      start: curve.startPos.instanceName,
      end: curve.endPos.instanceName,
      startPos: curve.startPos.pos,
      endPos: curve.endPos.pos,
      controlPos1: curve.controlPos1 || null,
      controlPos2: curve.controlPos2 || null,
      props: propsMap(curve.property)
    }));

  const lineSegments = lines
    .filter((line) => line && line.line && line.line.startPos && line.line.endPos)
    .map((line) => ({
      id: line.instanceName,
      className: line.className,
      startPos: line.line.startPos,
      endPos: line.line.endPos,
      props: propsMap(line.property)
    }));

  const areaList = areas
    .filter((area) => area && area.instanceName)
    .map((area) => ({
      id: area.instanceName,
      className: area.className,
      dir: area.dir,
      posGroup: area.posGroup,
      props: propsMap(area.property),
      attribute: area.attribute
    }));

  const bins = [];
  for (const entry of data.binLocationsList || []) {
    for (const bin of entry.binLocationList || []) {
      if (!bin || !bin.instanceName) {
        continue;
      }
      bins.push({
        className: bin.className,
        instanceName: bin.instanceName,
        groupName: bin.groupName,
        pointName: bin.pointName,
        pos: bin.pos,
        props: propsMap(bin.property)
      });
    }
  }

  return {
    meta: {
      source: sourcePath,
      mapType: header.mapType || '',
      mapName: header.mapName || '',
      version: header.version || '',
      resolution: header.resolution || null,
      bounds: header.minPos && header.maxPos ? { min: header.minPos, max: header.maxPos } : null
    },
    nodes,
    edges,
    lines: lineSegments,
    areas: areaList,
    bins
  };
}

function loadMapGraph(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  if (data && Array.isArray(data.nodes) && Array.isArray(data.edges)) {
    return normalizeGraph(data, filePath);
  }
  return loadFromSmap(data, filePath);
}

function loadMapGraphLight(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext !== '.smap') {
    return loadMapGraph(filePath);
  }
  if (!SMAP_STREAM_PARSE) {
    return loadMapGraph(filePath);
  }
  const fields = [
    'header',
    'advancedPointList',
    'advancedLineList',
    'advancedCurveList',
    'advancedAreaList',
    'binLocationsList'
  ];
  const partial = readSmapFieldsSync(filePath, fields);
  return loadFromSmap(partial, filePath);
}

module.exports = {
  loadMapGraph,
  loadMapGraphLight
};

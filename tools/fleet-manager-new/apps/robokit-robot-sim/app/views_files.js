const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function createFileViews(deps) {
  const {
    createOn,
    cloneJson,
    fileRoots,
    mapInfo,
    ROBOT_MODEL,
    deviceTypesPayloadFull,
    deviceTypesPayloadExt,
    deviceTypesPayloadModule,
    mapPropertiesPayload,
    configMapDataPayload
  } = deps;

  function buildDeviceTypesResponse() {
    if (deviceTypesPayloadFull && typeof deviceTypesPayloadFull === 'object') {
      const payload = cloneJson(deviceTypesPayloadFull);
      if (ROBOT_MODEL) {
        payload.model = ROBOT_MODEL;
      }
      return payload;
    }
    return { model: ROBOT_MODEL, deviceTypes: [] };
  }

  function buildDeviceTypesLiteResponse() {
    if (deviceTypesPayloadExt && typeof deviceTypesPayloadExt === 'object') {
      const payload = cloneJson(deviceTypesPayloadExt);
      if (payload.deviceTypes) {
        return payload;
      }
      return { deviceTypes: payload };
    }
    return { deviceTypes: [] };
  }

  function buildModuleDeviceTypesResponse() {
    if (deviceTypesPayloadModule && typeof deviceTypesPayloadModule === 'object') {
      return cloneJson(deviceTypesPayloadModule);
    }
    return { model: 'module', deviceTypes: [] };
  }

  function buildMapPropertiesResponse() {
    if (mapPropertiesPayload && typeof mapPropertiesPayload === 'object') {
      const payload = cloneJson(mapPropertiesPayload);
      payload.create_on = createOn();
      payload.ret_code = 0;
      return payload;
    }
    return { create_on: createOn(), maproperties: {}, ret_code: 0 };
  }

  function buildConfigMapResponse() {
    if (configMapDataPayload && typeof configMapDataPayload === 'object') {
      const payload = cloneJson(configMapDataPayload);
      if (payload.header && mapInfo.name) {
        payload.header.mapName = mapInfo.name;
      }
      return payload;
    }
    return {
      header: {
        mapType: '2D-Map',
        mapName: mapInfo.name || '',
        minPos: { x: 0, y: 0 },
        maxPos: { x: 0, y: 0 },
        resolution: 0,
        version: '1.0.0'
      },
      normalPosList: [],
      advancedPointList: [],
      advancedCurveList: []
    };
  }

  function buildFileMd5(filePath) {
    try {
      const buffer = fs.readFileSync(filePath);
      return crypto.createHash('md5').update(buffer).digest('hex');
    } catch (_err) {
      return '';
    }
  }

  function normalizeRelativePath(value) {
    return String(value || '').split(path.sep).join('/');
  }

  function listFilesFromRoots(roots) {
    const entries = [];
    const seen = new Set();
    for (const root of roots) {
      if (!root) continue;
      let stat;
      try {
        stat = fs.statSync(root);
      } catch (_err) {
        continue;
      }
      const queue = [];
      if (stat.isFile()) {
        queue.push({ abs: root, root });
      } else if (stat.isDirectory()) {
        queue.push({ abs: root, root });
      } else {
        continue;
      }
      while (queue.length) {
        const current = queue.pop();
        if (!current) continue;
        let currentStat;
        try {
          currentStat = fs.statSync(current.abs);
        } catch (_err) {
          continue;
        }
        if (currentStat.isDirectory()) {
          let children = [];
          try {
            children = fs.readdirSync(current.abs);
          } catch (_err) {
            continue;
          }
          for (const child of children) {
            queue.push({ abs: path.join(current.abs, child), root: current.root });
          }
          continue;
        }
        if (!currentStat.isFile()) {
          continue;
        }
        const rel = normalizeRelativePath(path.relative(current.root, current.abs));
        if (!rel || rel.startsWith('..')) {
          continue;
        }
        if (seen.has(rel)) {
          continue;
        }
        seen.add(rel);
        entries.push({
          md5: buildFileMd5(current.abs),
          relative_path: rel
        });
      }
    }
    entries.sort((a, b) => a.relative_path.localeCompare(b.relative_path));
    return entries;
  }

  function buildFileListResponse() {
    const list = listFilesFromRoots(fileRoots);
    return { create_on: createOn(), list, ret_code: 0 };
  }

  function buildFileListModulesResponse() {
    const list = listFilesFromRoots(fileRoots);
    return { create_on: createOn(), list, ret_code: 0 };
  }

  function resolveRequestedFile(payload) {
    if (!payload || typeof payload !== 'object') return null;
    const filePath =
      payload.file_path || payload.filePath || payload.path || payload.file || payload.fileName;
    const namedPath =
      filePath ||
      payload.name ||
      payload.file_name ||
      payload.filename ||
      payload.relative_path ||
      payload.relativePath;
    if (!namedPath) return null;
    const normalized = String(namedPath).trim();
    if (!normalized) return null;
    if (path.isAbsolute(normalized)) {
      try {
        return fs.statSync(normalized).isFile() ? normalized : null;
      } catch (_err) {
        return null;
      }
    }
    for (const root of fileRoots) {
      const resolvedRoot = path.resolve(root);
      const candidate = path.resolve(resolvedRoot, normalized);
      if (!candidate.startsWith(`${resolvedRoot}${path.sep}`)) {
        continue;
      }
      try {
        if (fs.statSync(candidate).isFile()) {
          return candidate;
        }
      } catch (_err) {
        continue;
      }
    }
    return null;
  }

  function buildFileResponse(payload) {
    const resolved = resolveRequestedFile(payload);
    if (!resolved) return null;
    try {
      return fs.readFileSync(resolved);
    } catch (_err) {
      return null;
    }
  }

  return {
    buildDeviceTypesResponse,
    buildDeviceTypesLiteResponse,
    buildModuleDeviceTypesResponse,
    buildMapPropertiesResponse,
    buildConfigMapResponse,
    buildFileListResponse,
    buildFileListModulesResponse,
    buildFileResponse
  };
}

module.exports = {
  createFileViews
};

const fs = require('fs');

const SCHEMA_VERSION = 1;

function wrapState(data) {
  return { schemaVersion: SCHEMA_VERSION, data };
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    return null;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function loadStateFile(filePath) {
  const raw = readJsonSafe(filePath);
  if (!raw) {
    return null;
  }
  if (raw.schemaVersion === SCHEMA_VERSION && raw.data !== undefined) {
    return raw.data;
  }
  return raw;
}

function ensureWrapped(filePath, data) {
  writeJson(filePath, wrapState(data));
}

class WorksiteStore {
  constructor(filePath, buildDefaultState) {
    this.filePath = filePath;
    this.buildDefaultState = buildDefaultState;
    this.state = this.load();
  }

  load() {
    const raw = loadStateFile(this.filePath);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      const fresh = this.buildDefaultState();
      ensureWrapped(this.filePath, fresh);
      return fresh;
    }
    const defaults = this.buildDefaultState();
    for (const [id, value] of Object.entries(defaults)) {
      if (!raw[id]) {
        raw[id] = value;
      }
      if (typeof raw[id].filled !== 'boolean') {
        raw[id].filled = Boolean(value.filled);
      }
      if (typeof raw[id].blocked !== 'boolean') {
        raw[id].blocked = Boolean(value.blocked);
      }
    }
    ensureWrapped(this.filePath, raw);
    return raw;
  }

  get(id) {
    return this.state[id] || { filled: false, blocked: false };
  }

  set(id, updates) {
    if (!this.state[id]) {
      this.state[id] = { filled: false, blocked: false };
    }
    Object.assign(this.state[id], updates);
    ensureWrapped(this.filePath, this.state);
  }

  all() {
    return this.state;
  }
}

class TaskStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.tasks = this.load();
  }

  load() {
    const raw = loadStateFile(this.filePath);
    if (!Array.isArray(raw)) {
      ensureWrapped(this.filePath, []);
      return [];
    }
    ensureWrapped(this.filePath, raw);
    return raw.map((task) => task).filter(Boolean);
  }

  all() {
    return this.tasks;
  }

  save(tasks) {
    this.tasks = tasks;
    ensureWrapped(this.filePath, this.tasks);
  }
}

module.exports = {
  ensureDir,
  WorksiteStore,
  TaskStore
};

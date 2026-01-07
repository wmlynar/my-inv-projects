"use strict";

const crypto = require("crypto");

const PROD_CONFIG = {
  appName: "modbus-sync-worksites",
  http: {
    host: "127.0.0.1",
    port: 3010
  },
  log: {
    level: "error"
  },
  rds: {
    host: "http://127.0.0.1:8080",
    requestTimeoutMs: 5000,
    errorLogThrottleMs: 5000,
    fatalOnErrors: true,
    maxConsecutiveErrors: 200
  },
  modbus: {
    socketTimeoutMs: 1000,
    requestTimeoutMs: 1000,
    pollIntervalMs: 500,
    reconnectBackoffMs: 5000,
    fillDebounceMs: 2000,
    fatalOnErrors: true,
    maxConsecutiveErrors: 100
  },
  sites: [
    { siteId: "PICK-01", ip: "10.6.44.70", port: 502, slaveId: 255, offset: 0, default: "EMPTY" },
    { siteId: "PICK-02", ip: "10.6.44.70", port: 502, slaveId: 255, offset: 1, default: "EMPTY" },
    { siteId: "PICK-03", ip: "10.6.44.70", port: 502, slaveId: 255, offset: 2, default: "EMPTY" },
    { siteId: "PICK-04", ip: "10.6.44.70", port: 502, slaveId: 255, offset: 3, default: "EMPTY" },
    { siteId: "PICK-05", ip: "10.6.44.70", port: 502, slaveId: 255, offset: 4, default: "EMPTY" },
    { siteId: "PICK-06", ip: "10.6.44.70", port: 502, slaveId: 255, offset: 5, default: "EMPTY" },
    { siteId: "PICK-07", ip: "10.6.44.70", port: 502, slaveId: 255, offset: 6, default: "EMPTY" },
    { siteId: "PICK-08", ip: "10.6.44.70", port: 502, slaveId: 255, offset: 7, default: "EMPTY" },
    { siteId: "PICK-09", ip: "10.6.44.70", port: 502, slaveId: 255, offset: 8, default: "EMPTY" },
    { siteId: "PICK-10", ip: "10.6.44.70", port: 502, slaveId: 255, offset: 9, default: "EMPTY" },
    { siteId: "PICK-11", ip: "10.6.44.70", port: 502, slaveId: 255, offset: 10, default: "EMPTY" },
    { siteId: "PICK-12", ip: "10.6.44.70", port: 502, slaveId: 255, offset: 11, default: "EMPTY" },
    { siteId: "PICK-13", ip: "10.6.44.70", port: 502, slaveId: 255, offset: 12, default: "EMPTY" },
    { siteId: "PICK-14", ip: "10.6.44.70", port: 502, slaveId: 255, offset: 13, default: "EMPTY" },
    { siteId: "PICK-15", ip: "10.6.44.70", port: 502, slaveId: 255, offset: 14, default: "EMPTY" },
    { siteId: "PICK-16", ip: "10.6.44.70", port: 502, slaveId: 255, offset: 15, default: "EMPTY" },
    { siteId: "PICK-51", ip: "10.6.44.71", port: 502, slaveId: 255, offset: 0, default: "EMPTY" },
    { siteId: "PICK-52", ip: "10.6.44.71", port: 502, slaveId: 255, offset: 1, default: "EMPTY" },
    { siteId: "PICK-53", ip: "10.6.44.71", port: 502, slaveId: 255, offset: 2, default: "EMPTY" },
    { siteId: "PICK-54", ip: "10.6.44.71", port: 502, slaveId: 255, offset: 3, default: "EMPTY" },
    { siteId: "PICK-55", ip: "10.6.44.71", port: 502, slaveId: 255, offset: 4, default: "EMPTY" },
    { siteId: "PICK-56", ip: "10.6.44.71", port: 502, slaveId: 255, offset: 5, default: "EMPTY" },
    { siteId: "PICK-57", ip: "10.6.44.71", port: 502, slaveId: 255, offset: 6, default: "EMPTY" },
    { siteId: "PICK-58", ip: "10.6.44.71", port: 502, slaveId: 255, offset: 7, default: "EMPTY" },
    { siteId: "PICK-59", ip: "10.6.44.71", port: 502, slaveId: 255, offset: 8, default: "EMPTY" },
    { siteId: "PICK-60", ip: "10.6.44.71", port: 502, slaveId: 255, offset: 9, default: "EMPTY" },
    { siteId: "PICK-61", ip: "10.6.44.71", port: 502, slaveId: 255, offset: 10, default: "EMPTY" },
    { siteId: "PICK-62", ip: "10.6.44.71", port: 502, slaveId: 255, offset: 11, default: "EMPTY" },
    { siteId: "PICK-63", ip: "10.6.44.71", port: 502, slaveId: 255, offset: 12, default: "EMPTY" },
    { siteId: "PICK-64", ip: "10.6.44.71", port: 502, slaveId: 255, offset: 13, default: "EMPTY" },
    { siteId: "PICK-65", ip: "10.6.44.71", port: 502, slaveId: 255, offset: 14, default: "EMPTY" },
    { siteId: "PICK-66", ip: "10.6.44.71", port: 502, slaveId: 255, offset: 15, default: "EMPTY" }
  ]
};

function stableStringify(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return "[" + value.map(stableStringify).join(",") + "]";
  }
  const keys = Object.keys(value).sort();
  const parts = keys.map((k) => {
    return JSON.stringify(k) + ":" + stableStringify(value[k]);
  });
  return "{" + parts.join(",") + "}";
}

function hashConfig(cfg) {
  const stable = stableStringify(cfg);
  const hash = crypto.createHash("sha256").update(stable).digest("hex");
  return `sha256:${hash}`;
}

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function validateConfig(cfg) {
  const errors = [];

  if (!isObject(cfg)) errors.push("config must be an object");

  if (!isObject(cfg.http)) errors.push("http must be an object");
  if (!cfg.http || typeof cfg.http.host !== "string") errors.push("http.host must be a string");
  if (!cfg.http || !Number.isFinite(cfg.http.port)) errors.push("http.port must be a number");

  if (!isObject(cfg.log)) errors.push("log must be an object");
  if (!cfg.log || typeof cfg.log.level !== "string") errors.push("log.level must be a string");

  if (!isObject(cfg.rds)) errors.push("rds must be an object");
  if (!cfg.rds || typeof cfg.rds.host !== "string") errors.push("rds.host must be a string");
  if (!cfg.rds || !Number.isFinite(cfg.rds.requestTimeoutMs)) errors.push("rds.requestTimeoutMs must be a number");
  if (!cfg.rds || !Number.isFinite(cfg.rds.errorLogThrottleMs)) errors.push("rds.errorLogThrottleMs must be a number");
  if (!cfg.rds || typeof cfg.rds.fatalOnErrors !== "boolean") errors.push("rds.fatalOnErrors must be a boolean");
  if (!cfg.rds || !Number.isInteger(cfg.rds.maxConsecutiveErrors)) errors.push("rds.maxConsecutiveErrors must be an integer");

  if (!isObject(cfg.modbus)) errors.push("modbus must be an object");
  if (!cfg.modbus || !Number.isFinite(cfg.modbus.socketTimeoutMs)) errors.push("modbus.socketTimeoutMs must be a number");
  if (!cfg.modbus || !Number.isFinite(cfg.modbus.requestTimeoutMs)) errors.push("modbus.requestTimeoutMs must be a number");
  if (!cfg.modbus || !Number.isFinite(cfg.modbus.pollIntervalMs)) errors.push("modbus.pollIntervalMs must be a number");
  if (!cfg.modbus || !Number.isFinite(cfg.modbus.reconnectBackoffMs)) errors.push("modbus.reconnectBackoffMs must be a number");
  if (!cfg.modbus || !Number.isFinite(cfg.modbus.fillDebounceMs)) errors.push("modbus.fillDebounceMs must be a number");
  if (!cfg.modbus || typeof cfg.modbus.fatalOnErrors !== "boolean") errors.push("modbus.fatalOnErrors must be a boolean");
  if (!cfg.modbus || !Number.isInteger(cfg.modbus.maxConsecutiveErrors)) errors.push("modbus.maxConsecutiveErrors must be an integer");

  if (!Array.isArray(cfg.sites)) errors.push("sites must be an array");

  if (Array.isArray(cfg.sites)) {
    const ids = new Set();
    for (const s of cfg.sites) {
      if (!isObject(s)) {
        errors.push("site must be an object");
        continue;
      }
      if (!s.siteId || typeof s.siteId !== "string") errors.push("site.siteId must be a string");
      if (s.siteId && ids.has(s.siteId)) errors.push(`duplicate siteId: ${s.siteId}`);
      if (s.siteId) ids.add(s.siteId);
      if (!s.ip || typeof s.ip !== "string") errors.push(`site.ip must be a string (${s.siteId || "unknown"})`);
      if (!Number.isFinite(s.port)) errors.push(`site.port must be a number (${s.siteId || "unknown"})`);
      if (!Number.isFinite(s.slaveId)) errors.push(`site.slaveId must be a number (${s.siteId || "unknown"})`);
      if (!Number.isInteger(s.offset) || s.offset < 0) errors.push(`site.offset must be a non-negative integer (${s.siteId || "unknown"})`);
      if (s.default !== "EMPTY" && s.default !== "FILLED") errors.push(`site.default must be EMPTY or FILLED (${s.siteId || "unknown"})`);
    }
  }

  return errors;
}

function loadRuntimeConfig() {
  const cfg = PROD_CONFIG;
  const errors = validateConfig(cfg);
  if (errors.length) {
    const err = new Error(`Invalid config: ${errors.join("; ")}`);
    err.code = "CONFIG_INVALID";
    err.details = errors;
    throw err;
  }

  const configHash = hashConfig(cfg);
  return { cfg, configPath: "inline:prod", configHash };
}

module.exports = { loadRuntimeConfig };

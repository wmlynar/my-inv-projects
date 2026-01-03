"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

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

function resolveRuntimeConfigPath() {
  const candidates = [];
  if (process.env.SEAL_RUNTIME_CONFIG) candidates.push(process.env.SEAL_RUNTIME_CONFIG);
  candidates.push(path.join(process.cwd(), "seal-out", "runtime", "config.runtime.json5"));
  candidates.push(path.join(process.cwd(), "config.runtime.json5"));
  for (const cand of candidates) {
    if (cand && fs.existsSync(cand)) return cand;
  }
  return null;
}

function loadRuntimeConfig() {
  const configPath = resolveRuntimeConfigPath();
  if (!configPath) {
    const err = new Error("Missing runtime config");
    err.code = "CONFIG_MISSING";
    err.hint = "Dev: set SEAL_RUNTIME_CONFIG=./seal-out/runtime/config.runtime.json5. Sealed: copy seal-config/configs/<env>.json5 to ./config.runtime.json5 (release dir).";
    throw err;
  }

  const raw = fs.readFileSync(configPath, "utf-8");
  let cfg;
  try {
    cfg = JSON.parse(raw);
  } catch (e) {
    const err = new Error(`Config parse error (${configPath}): ${e.message}`);
    err.code = "CONFIG_PARSE";
    err.configPath = configPath;
    throw err;
  }

  cfg.http = cfg.http || {};
  cfg.log = cfg.log || {};
  cfg.rds = cfg.rds || {};
  cfg.modbus = cfg.modbus || {};

  cfg.http.host = cfg.http.host || "127.0.0.1";
  cfg.http.port = Number(cfg.http.port || 8090);

  cfg.log.level = cfg.log.level || "info";

  cfg.rds.requestTimeoutMs = Number(cfg.rds.requestTimeoutMs || 5000);
  cfg.rds.errorLogThrottleMs = Number(cfg.rds.errorLogThrottleMs || 5000);
  cfg.rds.fatalOnErrors = cfg.rds.fatalOnErrors !== false;
  cfg.rds.maxConsecutiveErrors = Number(cfg.rds.maxConsecutiveErrors || 200);

  cfg.modbus.socketTimeoutMs = Number(cfg.modbus.socketTimeoutMs || 1000);
  cfg.modbus.requestTimeoutMs = Number(cfg.modbus.requestTimeoutMs || 1000);
  cfg.modbus.pollIntervalMs = Number(cfg.modbus.pollIntervalMs || 500);
  cfg.modbus.reconnectBackoffMs = Number(cfg.modbus.reconnectBackoffMs || 5000);
  cfg.modbus.fillDebounceMs = Number(cfg.modbus.fillDebounceMs || 2000);
  cfg.modbus.fatalOnErrors = cfg.modbus.fatalOnErrors !== false;
  cfg.modbus.maxConsecutiveErrors = Number(cfg.modbus.maxConsecutiveErrors || 100);

  const errors = validateConfig(cfg);
  if (errors.length) {
    const err = new Error(`Invalid runtime config (${configPath}): ${errors.join("; ")}`);
    err.code = "CONFIG_INVALID";
    err.details = errors;
    err.configPath = configPath;
    throw err;
  }

  const configHash = hashConfig(cfg);
  return { cfg, configPath, configHash };
}

module.exports = { loadRuntimeConfig };

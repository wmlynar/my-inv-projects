"use strict";

const fs = require("fs");
const path = require("path");
const JSON5 = require("json5");

function loadRuntimeConfig() {
  const p = path.join(process.cwd(), "config.runtime.json5");
  if (!fs.existsSync(p)) {
    const err = new Error("Missing config.runtime.json5 in CWD");
    err.code = "CONFIG_MISSING";
    throw err;
  }
  const raw = fs.readFileSync(p, "utf-8");
  const cfg = JSON5.parse(raw);

  // small normalization
  cfg.http = cfg.http || {};
  cfg.log = cfg.log || {};
  cfg.external = cfg.external || {};
  cfg.http.host = cfg.http.host || "127.0.0.1";
  cfg.http.port = Number(cfg.http.port || 3000);
  cfg.log.level = cfg.log.level || "debug";
  cfg.log.file = cfg.log.file || null;
  cfg.external.echoUrl = cfg.external.echoUrl || "https://postman-echo.com/get?source=seal";
  cfg.external.timeoutMs = Number(cfg.external.timeoutMs || 5000);
  cfg.featuresFile = cfg.featuresFile || "./data/feature_flags.json";

  return cfg;
}

module.exports = { loadRuntimeConfig };

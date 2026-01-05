"use strict";

const fs = require("node:fs");

const loadConfig = (filePath) => {
  if (!filePath) return {};
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
};

const mergeConfig = (base, override) => {
  return { ...(base || {}), ...(override || {}) };
};

module.exports = {
  loadConfig,
  mergeConfig
};

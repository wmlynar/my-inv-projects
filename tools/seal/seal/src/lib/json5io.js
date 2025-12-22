"use strict";

const fs = require("fs");
const JSON5 = require("json5");

function readJson5(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON5.parse(raw);
}

function writeJson5(filePath, obj) {
  // Keep it human-editable; JSON5 allows trailing commas and comments but we output stable JSON-ish.
  const pretty = JSON.stringify(obj, null, 2);
  fs.writeFileSync(filePath, pretty + "\n", "utf-8");
}

module.exports = { readJson5, writeJson5 };

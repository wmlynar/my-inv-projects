"use strict";

const fs = require("fs");
const path = require("path");

function readJsonFile(relPath) {
  const p = path.resolve(process.cwd(), relPath);
  const raw = fs.readFileSync(p, "utf-8");
  return JSON.parse(raw);
}

module.exports = { readJsonFile };

"use strict";

const fs = require("fs");
const path = require("path");

let json5 = null;
try {
  json5 = require("json5");
} catch {
  json5 = null;
}

function normalizeString(value, fallback = "") {
  if (value === undefined || value === null) return fallback;
  return String(value);
}

function normalizeBool(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const text = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y"].includes(text)) return true;
  if (["0", "false", "no", "n"].includes(text)) return false;
  return fallback;
}

function normalizeRequirements(value) {
  if (!value) return [];
  const list = Array.isArray(value) ? value : [value];
  return list
    .map((item) => normalizeString(item, "").trim().toLowerCase())
    .filter(Boolean);
}

function parseJsonLike(raw, filePath) {
  if (json5) {
    return json5.parse(raw);
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    const hint = "Install tools/seal/seal dependencies or use a TSV manifest.";
    const message = `Failed to parse manifest JSON (${filePath}). ${hint}`;
    const error = new Error(message);
    error.cause = err;
    throw error;
  }
}

function normalizeTest(raw, index) {
  if (!raw || typeof raw !== "object") {
    throw new Error(`Manifest entry #${index + 1} is not an object.`);
  }
  const name = normalizeString(raw.name || raw.test, "").trim();
  if (!name) {
    throw new Error(`Manifest entry #${index + 1} is missing "name".`);
  }
  const category = normalizeString(raw.category, "").trim();
  const parallel = normalizeBool(raw.parallel, false) ? "1" : "0";
  const description = normalizeString(raw.description, "").trim();
  const skipRisk = normalizeString(raw.skipRisk || raw.skip_risk, "").trim();
  const failHint = normalizeString(raw.failHint || raw.fail_hint, "").trim();
  const script = normalizeString(raw.script, "").trim();
  const hostOnly = normalizeBool(raw.hostOnly ?? raw.host_only, false) ? "1" : "0";
  const requirements = normalizeRequirements(raw.requirements || raw.requires);
  if (hostOnly === "1" && !requirements.includes("host")) {
    requirements.push("host");
  }
  return {
    name,
    category,
    parallel,
    description,
    skipRisk,
    failHint,
    script,
    hostOnly,
    requirements,
  };
}

function normalizeManifest(data, filePath) {
  const list = Array.isArray(data)
    ? data
    : (data && Array.isArray(data.tests) ? data.tests : null);
  if (!Array.isArray(list)) {
    throw new Error(`Manifest ${filePath} must contain a "tests" array.`);
  }
  const tests = [];
  const order = [];
  const categories = [];
  const categorySeen = new Set();
  const nameSeen = new Set();
  list.forEach((entry, index) => {
    const test = normalizeTest(entry, index);
    if (nameSeen.has(test.name)) {
      throw new Error(`Duplicate test name in manifest: ${test.name}`);
    }
    nameSeen.add(test.name);
    tests.push(test);
    order.push(test.name);
    const cat = test.category || "misc";
    if (!categorySeen.has(cat)) {
      categorySeen.add(cat);
      categories.push(cat);
    }
  });
  return { tests, order, categories, format: "json5", path: filePath };
}

function parseTsvManifest(filePath) {
  const rows = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  const tests = [];
  const order = [];
  const categories = [];
  const categorySeen = new Set();
  for (const row of rows) {
    if (!row.trim() || row.startsWith("#")) continue;
    const cols = row.split("\t");
    if (cols[0] === "name") continue;
    const [name, category, parallel, description, skipRisk, failHint, script, hostOnly] = cols;
    if (!name) continue;
    const requirements = [];
    const hostFlag = normalizeBool(hostOnly, false) ? "1" : "0";
    if (hostFlag === "1") requirements.push("host");
    tests.push({
      name,
      category: category || "",
      parallel: normalizeBool(parallel, false) ? "1" : "0",
      description: description || "",
      skipRisk: skipRisk || "",
      failHint: failHint || "",
      script: script || "",
      hostOnly: hostFlag,
      requirements,
    });
    order.push(name);
    const cat = category || "misc";
    if (!categorySeen.has(cat)) {
      categorySeen.add(cat);
      categories.push(cat);
    }
  }
  return { tests, order, categories, format: "tsv", path: filePath };
}

function loadManifest(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".tsv") {
    return parseTsvManifest(filePath);
  }
  if (ext === ".json" || ext === ".json5") {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = parseJsonLike(raw, filePath);
    return normalizeManifest(parsed, filePath);
  }
  const raw = fs.readFileSync(filePath, "utf8");
  try {
    const parsed = parseJsonLike(raw, filePath);
    return normalizeManifest(parsed, filePath);
  } catch (err) {
    return parseTsvManifest(filePath);
  }
}

module.exports = {
  loadManifest,
};

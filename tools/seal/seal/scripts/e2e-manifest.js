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

function normalizeList(value) {
  if (value === undefined || value === null) return [];
  const list = Array.isArray(value) ? value : [value];
  return list
    .map((item) => normalizeString(item, "").trim())
    .filter(Boolean);
}

function normalizeRequirements(value) {
  return normalizeList(value).map((item) => item.toLowerCase());
}

function warnOrThrow(options, message) {
  const strict = !(options && options.strict === false);
  if (strict) {
    throw new Error(message);
  }
  const log = options && typeof options.log === "function" ? options.log : null;
  if (log) {
    log(`WARN: ${message}`);
  }
}

function requireField(value, label, fallback, context, options) {
  if (value) return value;
  warnOrThrow(options, `Manifest ${context} is missing "${label}".`);
  return fallback;
}

function normalizeAllowlist(value, label, options) {
  const items = normalizeList(value).map((item) => item.toLowerCase());
  const unique = Array.from(new Set(items));
  if (!unique.length) {
    warnOrThrow(options, `Manifest meta.${label} is required.`);
  }
  return unique;
}

function normalizeMeta(rawMeta, options) {
  const meta = rawMeta && typeof rawMeta === "object" ? rawMeta : {};
  return {
    categories: normalizeAllowlist(meta.categories, "categories", options),
    skipRisk: normalizeAllowlist(meta.skipRisk || meta.skip_risk, "skipRisk", options),
    requirements: normalizeAllowlist(meta.requirements, "requirements", options),
  };
}

function parseJsonLike(raw, filePath) {
  if (json5) {
    return json5.parse(raw);
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    const hint = "Install tools/seal/seal dependencies to enable JSON5 parsing.";
    const message = `Failed to parse manifest JSON (${filePath}). ${hint}`;
    const error = new Error(message);
    error.cause = err;
    throw error;
  }
}

function normalizeTest(raw, index, meta, options) {
  if (!raw || typeof raw !== "object") {
    throw new Error(`Manifest entry #${index + 1} is not an object.`);
  }
  const name = normalizeString(raw.name || raw.test, "").trim();
  if (!name) {
    throw new Error(`Manifest entry #${index + 1} is missing "name".`);
  }
  const context = `entry "${name}"`;
  const strict = !(options && options.strict === false);
  const parallel = normalizeBool(raw.parallel, false) ? "1" : "0";
  const hostOnly = normalizeBool(raw.hostOnly ?? raw.host_only, false) ? "1" : "0";
  const requirements = normalizeRequirements(raw.requirements || raw.requires);

  let category = normalizeString(raw.category, "").trim().toLowerCase();
  category = requireField(category, "category", "misc", context, options);
  if (meta.categories.length && !meta.categories.includes(category)) {
    warnOrThrow(options, `Manifest ${context} has unknown category "${category}".`);
    if (!strict && meta.categories.includes("misc")) {
      category = "misc";
    }
  }

  let skipRisk = normalizeString(raw.skipRisk || raw.skip_risk, "").trim().toLowerCase();
  skipRisk = requireField(skipRisk, "skipRisk", "unknown", context, options);
  if (meta.skipRisk.length && !meta.skipRisk.includes(skipRisk)) {
    warnOrThrow(options, `Manifest ${context} has unknown skipRisk "${skipRisk}".`);
    if (!strict) {
      skipRisk = "unknown";
    }
  }

  const description = requireField(
    normalizeString(raw.description, "").trim(),
    "description",
    "(missing description)",
    context,
    options,
  );
  const failHint = requireField(
    normalizeString(raw.failHint || raw.fail_hint, "").trim(),
    "failHint",
    "(missing fail hint)",
    context,
    options,
  );

  const script = normalizeString(raw.script, "").trim();
  if (!script) {
    throw new Error(`Manifest ${context} is missing "script".`);
  }

  if (hostOnly === "1" && !requirements.includes("host")) {
    requirements.push("host");
  }

  if (meta.requirements.length) {
    const unknownReqs = requirements.filter((req) => !meta.requirements.includes(req));
    if (unknownReqs.length) {
      warnOrThrow(options, `Manifest ${context} has unknown requirements: ${unknownReqs.join(", ")}.`);
      if (!strict) {
        for (const req of unknownReqs) {
          const idx = requirements.indexOf(req);
          if (idx !== -1) requirements.splice(idx, 1);
        }
      }
    }
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

function normalizeManifest(data, filePath, options) {
  const list = Array.isArray(data)
    ? data
    : (data && Array.isArray(data.tests) ? data.tests : null);
  if (!Array.isArray(list)) {
    throw new Error(`Manifest ${filePath} must contain a "tests" array.`);
  }
  const meta = normalizeMeta(data && data.meta ? data.meta : null, options);
  const tests = [];
  const order = [];
  const categories = [];
  const categorySeen = new Set();
  const nameSeen = new Set();
  list.forEach((entry, index) => {
    const test = normalizeTest(entry, index, meta, options);
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
  return { tests, order, categories, format: "json5", path: filePath, meta };
}

function loadManifest(filePath, options = {}) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".tsv") {
    throw new Error("TSV E2E manifests are deprecated. Use e2e-tests.json5 instead.");
  }
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = parseJsonLike(raw, filePath);
  return normalizeManifest(parsed, filePath, options);
}

module.exports = {
  loadManifest,
};

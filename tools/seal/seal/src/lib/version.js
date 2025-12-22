"use strict";

// Single source of truth: seal/package.json
// (keeps CLI and AI bundles in sync with the actual published version)
const pkg = require("../../package.json");

module.exports = { version: pkg.version };

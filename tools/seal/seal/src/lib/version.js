"use strict";

// Single source of truth: seal/package.json
const pkg = require("../../package.json");

module.exports = { version: pkg.version };

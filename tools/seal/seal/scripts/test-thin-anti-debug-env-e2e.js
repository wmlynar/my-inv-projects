#!/usr/bin/env node
"use strict";

const path = require("path");

process.env.SEAL_THIN_ANTI_DEBUG_E2E = "1";
process.env.SEAL_THIN_ANTI_DEBUG_SUITES = "env";

require(path.join(__dirname, "test-thin-anti-debug-e2e.js"));

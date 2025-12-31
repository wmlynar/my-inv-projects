#!/usr/bin/env node
"use strict";

const { createLogger } = require("./e2e-utils");

const { log } = createLogger("noop-b-e2e");

log("OK: noop-b");

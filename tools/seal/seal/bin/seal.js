#!/usr/bin/env node
"use strict";

require("../src/cli").main(process.argv).catch((err) => {
  // Last resort: never crash silently.
  const msg = err && err.stack ? err.stack : String(err);
  console.error(msg);
  process.exitCode = 1;
});

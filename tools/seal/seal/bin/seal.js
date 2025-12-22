#!/usr/bin/env node
"use strict";

require("../src/cli").main(process.argv).catch((err) => {
  // Last resort: never crash silently. Also generate an AI/support bundle.
  try {
    const { writeAiBundle } = require("../src/lib/aiBundle");
    const bundle = writeAiBundle(process.cwd(), err);
    if (bundle) {
      console.error(`[INFO] AI bundle written: ${bundle}`);
    }
  } catch {
    // ignore bundle failures; we still want to print the original error
  }

  const msg = err && err.stack ? err.stack : String(err);
  console.error(msg);
  process.exitCode = 1;
});

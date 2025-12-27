#!/usr/bin/env node
"use strict";

const { formatError } = require("../src/lib/errors");

require("../src/cli").main(process.argv).catch((err) => {
  // Last resort: never crash silently.
  const { message, hint, stack } = formatError(err);
  console.error(message);
  if (hint) console.error(`Hint: ${hint}`);
  if (stack) console.error(stack);
  process.exitCode = 1;
});

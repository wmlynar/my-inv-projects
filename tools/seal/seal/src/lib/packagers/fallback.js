"use strict";

const fs = require("fs");
const path = require("path");

function packFallback({ stageDir, releaseDir, appName, obfPath }) {
  try {
    const bundleDst = path.join(releaseDir, "app.bundle.cjs");
    fs.copyFileSync(obfPath, bundleDst);

    const runPath = path.join(releaseDir, appName);
    const script = `#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"
exec node "$DIR/app.bundle.cjs" "$@"
`;
    fs.writeFileSync(runPath, script, "utf-8");
    fs.chmodSync(runPath, 0o755);

    return { ok: true };
  } catch (e) {
    return { ok: false, errorShort: e && e.message ? e.message : String(e), error: e && e.stack ? e.stack : String(e) };
  }
}

module.exports = { packFallback };

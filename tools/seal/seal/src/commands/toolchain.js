"use strict";

const path = require("path");

const { spawnSyncSafe } = require("../lib/spawn");
const { info, ok, warn } = require("../lib/ui");

function shQuote(value) {
  const str = String(value);
  return "'" + str.replace(/'/g, "'\\''") + "'";
}

function hasCmd(cmd) {
  const res = spawnSyncSafe("bash", ["-lc", `command -v -- ${shQuote(cmd)} >/dev/null 2>&1`], { stdio: "pipe" });
  return !!res.ok;
}

function nodeMajor() {
  const m = /^v(\d+)\./.exec(process.version);
  return m ? parseInt(m[1], 10) : 0;
}

async function cmdToolchainStatus() {
  info("Toolchain status:");
  const checks = [
    { id: "node", ok: nodeMajor() >= 20, hint: "Install Node.js >= 20" },
    { id: "npm", ok: hasCmd("npm"), hint: "Install npm (comes with Node.js)" },
    { id: "cc", ok: hasCmd("cc") || hasCmd("gcc") || hasCmd("clang"), hint: "Install build-essential or gcc/clang" },
    { id: "pkg-config", ok: hasCmd("pkg-config"), hint: "Install pkg-config" },
    { id: "zstd", ok: hasCmd("zstd"), hint: "Install zstd + libzstd-dev" },
  ];
  const missing = [];
  for (const check of checks) {
    if (check.ok) {
      ok(`  ${check.id}: OK`);
    } else {
      warn(`  ${check.id}: missing (${check.hint})`);
      missing.push(check.id);
    }
  }
  if (missing.length) {
    throw new Error(`Toolchain missing: ${missing.join(", ")}`);
  }
}

async function cmdToolchainInstall() {
  const script = path.join(__dirname, "..", "scripts", "install-seal-deps.sh");
  info(`Toolchain install: ${script}`);
  const res = spawnSyncSafe("bash", [script], { stdio: "inherit" });
  if (!res.ok) {
    throw new Error(`Toolchain install failed (status=${res.status ?? "?"})`);
  }
}

module.exports = { cmdToolchainStatus, cmdToolchainInstall };

"use strict";

const { spawnSync } = require("child_process");

function spawnSyncSafe(cmd, args, opts = {}) {
  const spawnOpts = {
    stdio: opts.stdio || "inherit",
    cwd: opts.cwd,
    env: { ...process.env, ...(opts.env || {}) },
    encoding: "utf-8",
  };
  if (opts.input !== undefined) spawnOpts.input = opts.input;
  const res = spawnSync(cmd, args, spawnOpts);

  return {
    ok: res.status === 0,
    status: res.status,
    signal: res.signal,
    stdout: res.stdout || "",
    stderr: res.stderr || "",
    error: res.error ? (res.error.message || String(res.error)) : null,
  };
}

module.exports = { spawnSyncSafe };

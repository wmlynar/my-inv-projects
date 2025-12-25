"use strict";

const { spawnSync } = require("child_process");

function spawnSyncSafe(cmd, args, opts = {}) {
  const envTimeoutRaw = process.env.SEAL_SPAWN_TIMEOUT_MS || process.env.SEAL_CMD_TIMEOUT_MS;
  const envTimeout = envTimeoutRaw !== undefined ? Number(envTimeoutRaw) : null;
  const spawnOpts = {
    stdio: opts.stdio || "inherit",
    cwd: opts.cwd,
    env: { ...process.env, ...(opts.env || {}) },
    encoding: "utf-8",
  };
  if (opts.input !== undefined) spawnOpts.input = opts.input;
  if (opts.timeoutMs !== undefined) {
    spawnOpts.timeout = opts.timeoutMs;
  } else if (Number.isFinite(envTimeout) && envTimeout > 0) {
    spawnOpts.timeout = envTimeout;
  }
  if (opts.killSignal) spawnOpts.killSignal = opts.killSignal;
  const res = spawnSync(cmd, args, spawnOpts);
  const timedOut = !!(res.error && res.error.code === "ETIMEDOUT");

  return {
    ok: res.status === 0 && !timedOut,
    status: res.status,
    signal: res.signal,
    stdout: res.stdout || "",
    stderr: res.stderr || "",
    error: res.error ? (res.error.message || String(res.error)) : null,
    timedOut,
  };
}

module.exports = { spawnSyncSafe };

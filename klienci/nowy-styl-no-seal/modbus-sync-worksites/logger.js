"use strict";

const crypto = require("crypto");

const LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50,
};

function nowIso() {
  return new Date().toISOString();
}

function makeErrorId() {
  return crypto.randomBytes(6).toString("hex");
}

function normalizeError(err) {
  if (!err) return null;
  if (err instanceof Error) {
    const out = {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
    if (err.code) out.code = err.code;
    if (err.cause) out.cause = String(err.cause);
    return out;
  }
  return { name: "Error", message: String(err), stack: null };
}

function createLogger({ level = "info" } = {}) {
  const threshold = LEVELS[String(level).toLowerCase()] ?? LEVELS.info;

  function log(lvl, evt, msg, ctx, err) {
    const lvlValue = LEVELS[lvl] ?? LEVELS.info;
    if (lvlValue < threshold) return null;

    const entry = {
      ts: nowIso(),
      lvl,
      evt,
    };
    if (msg) entry.msg = msg;
    if (ctx && typeof ctx === "object") entry.ctx = ctx;

    let errorId = null;
    if (lvl === "error" || lvl === "fatal") {
      errorId = makeErrorId();
      entry.errorId = errorId;
      entry.err = normalizeError(err);
    }

    const line = JSON.stringify(entry);
    if (lvl === "error" || lvl === "fatal") console.error(line);
    else console.log(line);

    return errorId;
  }

  return {
    debug: (evt, msg, ctx) => log("debug", evt, msg, ctx),
    info: (evt, msg, ctx) => log("info", evt, msg, ctx),
    warn: (evt, msg, ctx, err) => log("warn", evt, msg, ctx, err),
    error: (evt, msg, ctx, err) => log("error", evt, msg, ctx, err),
    fatal: (evt, msg, ctx, err) => log("fatal", evt, msg, ctx, err),
  };
}

module.exports = { createLogger };

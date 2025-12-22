"use strict";

const fs = require("fs");
const path = require("path");

function nowIso() { return new Date().toISOString(); }

function createLogger({ level = "debug", file = null }) {
  const lvl = (level || "debug").toLowerCase();
  const levels = { debug: 10, info: 20, warn: 30, error: 40 };
  const threshold = levels[lvl] ?? 20;

  const filePath = file ? path.resolve(process.cwd(), file) : null;
  if (filePath) {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
  }

  function emit(lvlName, msg, data) {
    const n = levels[lvlName] ?? 20;
    if (n < threshold) return;

    const entry = {
      ts: nowIso(),
      level: lvlName,
      msg,
      ...((data && typeof data === "object") ? { data } : {}),
    };

    const line = JSON.stringify(entry);
    // stdout/stderr
    if (lvlName === "error") console.error(line);
    else console.log(line);

    if (filePath) {
      fs.appendFileSync(filePath, line + "\n", "utf-8");
    }
  }

  return {
    isDebug: threshold <= levels.debug,
    debug: (msg, data) => emit("debug", msg, data),
    info: (msg, data) => emit("info", msg, data),
    warn: (msg, data) => emit("warn", msg, data),
    error: (msg, data) => emit("error", msg, data),
  };
}

module.exports = { createLogger };

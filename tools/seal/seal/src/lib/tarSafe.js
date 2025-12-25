"use strict";

const { spawnSyncSafe } = require("./spawn");

function normalizeEntry(entry) {
  const raw = String(entry || "").trim();
  const noDot = raw.replace(/^\.\/+/, "");
  return noDot.replace(/\\/g, "/");
}

function validateTarEntries(entries) {
  if (!entries.length) throw new Error("artifact is empty");
  const root = normalizeEntry(entries[0]).split("/")[0];
  if (!root || root === ".") throw new Error("artifact root folder missing");

  for (const raw of entries) {
    const p = normalizeEntry(raw);
    if (!p) throw new Error("artifact contains empty entry");
    if (p.startsWith("/") || /^[A-Za-z]:\//.test(p)) {
      throw new Error(`artifact contains absolute path: ${raw}`);
    }
    const parts = p.split("/");
    if (parts.some((part) => part === "..")) {
      throw new Error(`artifact contains path traversal: ${raw}`);
    }
    if (p !== root && !p.startsWith(root + "/")) {
      throw new Error(`artifact entry escapes root: ${raw}`);
    }
  }

  return root;
}

function listTarEntries(artifactPath) {
  const res = spawnSyncSafe("tar", ["-tzf", artifactPath], { stdio: "pipe" });
  if (!res.ok) {
    throw new Error(`tar -tzf failed (status=${res.status ?? "?"})`);
  }
  return (res.stdout || "").split(/\r?\n/).filter(Boolean);
}

function getTarRoot(artifactPath) {
  const entries = listTarEntries(artifactPath);
  return validateTarEntries(entries);
}

module.exports = { listTarEntries, validateTarEntries, getTarRoot };

"use strict";

const fs = require("fs");
const path = require("path");
const tar = require("tar");

function looksLikeLeak(filePath) {
  const p = filePath.replace(/\\/g, "/");
  const lower = p.toLowerCase();

  if (lower.includes("node_modules/")) return { leak: true, reason: "node_modules present" };
  if (lower.includes("/src/")) return { leak: true, reason: "src/ directory present" };
  if (lower.endsWith(".map")) return { leak: true, reason: "source map (.map) present" };
  if (lower.endsWith(".ts") || lower.endsWith(".tsx")) return { leak: true, reason: "TypeScript source present" };
  if (lower.endsWith(".jsx")) return { leak: true, reason: "JSX source present" };

  return { leak: false };
}

async function listTarEntries(artifactPath) {
  const entries = [];
  await tar.t({
    file: artifactPath,
    onentry: (e) => entries.push(e.path),
  });
  return entries;
}

async function verifyArtifact(artifactPath) {
  if (!fs.existsSync(artifactPath)) {
    return { ok: false, errors: [`Artifact not found: ${artifactPath}`], entries: [] };
  }

  const entries = await listTarEntries(artifactPath);

  const leaks = [];
  for (const e of entries) {
    const res = looksLikeLeak(e);
    if (res.leak) leaks.push({ path: e, reason: res.reason });
  }

  // Additional: version.json must exist (minimal, non-revealing metadata)
  const hasVersion = entries.some(e => e.endsWith("/version.json") || e === "version.json");
  if (!hasVersion) leaks.push({ path: "<missing version.json>", reason: "version.json missing (artifact not SEAL-like)" });

  // meta.json must NOT be shipped (it can reveal build/obfuscation details)
  const metaEntries = entries.filter(e => e.endsWith("/meta.json") || e === "meta.json");
  for (const me of metaEntries) {
    leaks.push({ path: me, reason: "meta.json present (leaks build details)" });
  }

  return {
    ok: leaks.length === 0,
    entries,
    leaks,
  };
}

function explainChecklist(result) {
  const lines = [];
  lines.push("SEAL verify checklist:");
  lines.push(`- artifact exists: ${result.entries.length ? "OK" : "FAIL"}`);
  lines.push(`- version.json present: ${result.leaks.some(l => l.reason.includes("version.json")) ? "FAIL" : "OK"}`);
  lines.push(`- no meta.json: ${result.leaks.some(l => l.reason.includes("meta.json present")) ? "FAIL" : "OK"}`);
  lines.push(`- no src/ directory: ${result.leaks.some(l => l.reason.includes("src/")) ? "FAIL" : "OK"}`);
  lines.push(`- no .map files: ${result.leaks.some(l => l.reason.includes(".map")) ? "FAIL" : "OK"}`);
  lines.push(`- no node_modules/: ${result.leaks.some(l => l.reason.includes("node_modules")) ? "FAIL" : "OK"}`);
  lines.push(`- no TS/JSX sources: ${result.leaks.some(l => l.reason.includes("TypeScript") || l.reason.includes("JSX")) ? "FAIL" : "OK"}`);
  return lines.join("\n");
}

module.exports = { verifyArtifact, explainChecklist };

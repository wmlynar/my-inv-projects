#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { readJson5, writeJson5 } = require("../src/lib/json5io");
const { createLogger, stripAnsi, resolveExampleRoot } = require("./e2e-utils");

const { log, fail } = createLogger("compat-e2e");
const EXAMPLE_ROOT = resolveExampleRoot();
const SEAL_BIN = path.resolve(__dirname, "..", "bin", "seal.js");

function runSeal(cwd, args) {
  const res = spawnSync(process.execPath, [SEAL_BIN, ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, SEAL_BATCH_SKIP: "1" },
  });
  if (res.error) throw res.error;
  const out = stripAnsi(`${res.stdout || ""}${res.stderr || ""}`);
  if (res.status !== 0) {
    throw new Error(`seal ${args.join(" ")} failed (status=${res.status})\n${out}`);
  }
  return out;
}

function extractSection(lines, header) {
  const idx = lines.findIndex((line) => line.trim() === header);
  if (idx < 0) throw new Error(`Missing section: ${header}`);
  const out = [];
  for (let i = idx + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line || !line.trim()) break;
    out.push(line.trim());
  }
  return out;
}

function extractNotes(lines) {
  const idx = lines.findIndex((line) => line.trim() === "Notes:");
  if (idx < 0) return [];
  const out = [];
  for (let i = idx + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line || !line.trim()) break;
    out.push(line.trim());
  }
  return out;
}

function ensureCompatConfig(sealPath) {
  const cfg = readJson5(sealPath) || {};
  cfg.build = cfg.build || {};
  cfg.build.sentinel = Object.assign({}, cfg.build.sentinel || {}, { enabled: true });
  const protection = (cfg.build.protection && typeof cfg.build.protection === "object")
    ? { ...cfg.build.protection }
    : {};
  protection.enabled = true;
  protection.strip = Object.assign({}, protection.strip || {}, { enabled: true });
  protection.elfPacker = Object.assign({}, protection.elfPacker || {}, {
    tool: "kiteshield",
    cmd: "kiteshield",
    args: ["-n", "{in}", "{out}"],
  });
  cfg.build.protection = protection;
  writeJson5(sealPath, cfg);
}

function main() {
  if (!fs.existsSync(EXAMPLE_ROOT)) {
    fail(`Missing example root: ${EXAMPLE_ROOT}`);
  }

  const sealPath = path.join(EXAMPLE_ROOT, "seal.json5");
  const targetsDir = path.join(EXAMPLE_ROOT, "seal-config", "targets");
  const targetSingle = `compat-thin-single-${process.pid}`;
  const targetSplit = `compat-thin-split-${process.pid}`;
  const targetSea = `compat-sea-${process.pid}`;
  const targetSinglePath = path.join(targetsDir, `${targetSingle}.json5`);
  const targetSplitPath = path.join(targetsDir, `${targetSplit}.json5`);
  const targetSeaPath = path.join(targetsDir, `${targetSea}.json5`);
  const sealBackup = fs.existsSync(sealPath) ? fs.readFileSync(sealPath, "utf-8") : null;
  const targetSingleBackup = fs.existsSync(targetSinglePath) ? fs.readFileSync(targetSinglePath, "utf-8") : null;
  const targetSplitBackup = fs.existsSync(targetSplitPath) ? fs.readFileSync(targetSplitPath, "utf-8") : null;
  const targetSeaBackup = fs.existsSync(targetSeaPath) ? fs.readFileSync(targetSeaPath, "utf-8") : null;
  let failure = null;

  try {
    ensureCompatConfig(sealPath);
    writeJson5(targetSinglePath, {
      target: targetSingle,
      kind: "ssh",
      host: "127.0.0.1",
      user: "root",
      config: "local",
      packager: "thin-single",
    });
    writeJson5(targetSplitPath, {
      target: targetSplit,
      kind: "ssh",
      host: "127.0.0.1",
      user: "root",
      config: "local",
      packager: "thin-split",
    });
    writeJson5(targetSeaPath, {
      target: targetSea,
      kind: "ssh",
      host: "127.0.0.1",
      user: "root",
      config: "local",
      packager: "sea",
    });

    const outSingle = runSeal(EXAMPLE_ROOT, ["config", "explain", targetSingle]);
    if (!outSingle.includes("packager: thin-single")) {
      throw new Error("config explain did not report packager=thin-single");
    }
    const singleLines = outSingle.split(/\r?\n/);
    const sentinelSingle = extractSection(singleLines, "Sentinel:");
    const sentinelSingleEnabled = sentinelSingle.find((line) => line.startsWith("enabled:"));
    if (!sentinelSingleEnabled || !/^enabled:\s*false/.test(sentinelSingleEnabled)) {
      throw new Error(`Expected sentinel to be disabled for thin-single, got: ${sentinelSingleEnabled || "missing"}`);
    }
    const protectionSingle = extractSection(singleLines, "Protection:");
    const stripSingle = protectionSingle.find((line) => line.startsWith("strip:"));
    if (!stripSingle || !stripSingle.includes("disabled (auto)")) {
      throw new Error(`Expected strip disabled (auto) for thin-single, got: ${stripSingle || "missing"}`);
    }
    const elfSingle = protectionSingle.find((line) => line.startsWith("elfPacker:"));
    if (!elfSingle || !elfSingle.includes("disabled (auto)")) {
      throw new Error(`Expected elfPacker disabled (auto) for thin-single, got: ${elfSingle || "missing"}`);
    }
    const notesSingle = extractNotes(singleLines);
    if (!notesSingle.some((line) => line.includes("ignores sentinel") && line.includes("thin-split"))) {
      throw new Error("Expected sentinel compatibility note for thin-single");
    }

    const outSplit = runSeal(EXAMPLE_ROOT, ["config", "explain", targetSplit]);
    if (!outSplit.includes("packager: thin-split")) {
      throw new Error("config explain did not report packager=thin-split");
    }
    const splitLines = outSplit.split(/\r?\n/);
    const sentinelSplit = extractSection(splitLines, "Sentinel:");
    const sentinelSplitEnabled = sentinelSplit.find((line) => line.startsWith("enabled:"));
    if (!sentinelSplitEnabled || !/^enabled:\s*true/.test(sentinelSplitEnabled)) {
      throw new Error(`Expected sentinel enabled for thin-split, got: ${sentinelSplitEnabled || "missing"}`);
    }
    const protectionSplit = extractSection(splitLines, "Protection:");
    const stripSplit = protectionSplit.find((line) => line.startsWith("strip:"));
    if (!stripSplit || stripSplit.includes("disabled")) {
      throw new Error(`Expected strip enabled for thin-split, got: ${stripSplit || "missing"}`);
    }
    const elfSplit = protectionSplit.find((line) => line.startsWith("elfPacker:"));
    if (!elfSplit || !elfSplit.includes("kiteshield")) {
      throw new Error(`Expected elfPacker kiteshield for thin-split, got: ${elfSplit || "missing"}`);
    }

    const outSea = runSeal(EXAMPLE_ROOT, ["config", "explain", targetSea]);
    if (!outSea.includes("packager: sea")) {
      throw new Error("config explain did not report packager=sea");
    }
    const seaLines = outSea.split(/\r?\n/);
    const sentinelSea = extractSection(seaLines, "Sentinel:");
    const sentinelSeaEnabled = sentinelSea.find((line) => line.startsWith("enabled:"));
    if (!sentinelSeaEnabled || !/^enabled:\s*false/.test(sentinelSeaEnabled)) {
      throw new Error(`Expected sentinel to be disabled for SEA, got: ${sentinelSeaEnabled || "missing"}`);
    }
    const protectionSea = extractSection(seaLines, "Protection:");
    const stripSea = protectionSea.find((line) => line.startsWith("strip:"));
    if (!stripSea || !stripSea.includes("disabled (auto)")) {
      throw new Error(`Expected strip disabled (auto) for SEA, got: ${stripSea || "missing"}`);
    }
    const elfSea = protectionSea.find((line) => line.startsWith("elfPacker:"));
    if (!elfSea || !elfSea.includes("disabled (auto)")) {
      throw new Error(`Expected elfPacker disabled (auto) for SEA, got: ${elfSea || "missing"}`);
    }
    const notesSea = extractNotes(seaLines);
    if (!notesSea.some((line) => line.includes("SEA ignores sentinel") && line.includes("thin-split"))) {
      throw new Error("Expected sentinel compatibility note for SEA");
    }

    log("OK");
  } catch (err) {
    failure = err;
  } finally {
    if (sealBackup !== null) {
      fs.writeFileSync(sealPath, sealBackup, "utf-8");
    }
    if (targetSingleBackup !== null) {
      fs.writeFileSync(targetSinglePath, targetSingleBackup, "utf-8");
    } else if (fs.existsSync(targetSinglePath)) {
      fs.rmSync(targetSinglePath, { force: true });
    }
    if (targetSplitBackup !== null) {
      fs.writeFileSync(targetSplitPath, targetSplitBackup, "utf-8");
    } else if (fs.existsSync(targetSplitPath)) {
      fs.rmSync(targetSplitPath, { force: true });
    }
    if (targetSeaBackup !== null) {
      fs.writeFileSync(targetSeaPath, targetSeaBackup, "utf-8");
    } else if (fs.existsSync(targetSeaPath)) {
      fs.rmSync(targetSeaPath, { force: true });
    }
  }

  if (failure) {
    fail(failure.stack || failure.message || String(failure));
    process.exit(1);
  }
}

main();

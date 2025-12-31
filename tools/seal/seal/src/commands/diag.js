"use strict";

const fs = require("fs");
const path = require("path");

const { findProjectRoot } = require("../lib/paths");
const { resolveTargetName, loadTargetConfig } = require("../lib/project");
const { ensureDir } = require("../lib/fsextra");
const { spawnSyncSafe } = require("../lib/spawn");
const { ok, warn, hr, info } = require("../lib/ui");
const { logsSnapshotSsh } = require("../lib/deploySsh");

function runCli(cliPath, args, cwd) {
  const res = spawnSyncSafe(process.execPath, [cliPath, ...args], { cwd, stdio: "pipe" });
  const stdout = String(res.stdout || "");
  const stderr = String(res.stderr || "");
  const combined = [stdout, stderr].filter(Boolean).join("\n");
  return { ok: res.ok, status: res.status, output: combined };
}

function writeResult(dir, name, res) {
  const header = `# exit=${res.status}\n# ok=${res.ok}\n`;
  fs.writeFileSync(path.join(dir, name), header + (res.output || ""), "utf-8");
}

async function cmdDiag(cwd, targetArg) {
  const projectRoot = findProjectRoot(cwd);
  const targetName = resolveTargetName(projectRoot, targetArg || null);
  const t = loadTargetConfig(projectRoot, targetName);
  if (!t) throw new Error(`Brak targetu ${targetName}. Zrób: seal target add ${targetName}`);
  const targetCfg = t.cfg;

  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const diagRoot = path.join(projectRoot, "seal-out", "diagnostics", `${targetName}-${ts}`);
  ensureDir(diagRoot);

  const cliPath = path.join(__dirname, "..", "cli.js");

  hr();
  info(`SEAL diag -> ${diagRoot}`);
  hr();

  writeResult(diagRoot, "check.txt", runCli(cliPath, ["check", targetName, "--verbose"], projectRoot));
  writeResult(diagRoot, "config-explain.txt", runCli(cliPath, ["config", "explain", targetName], projectRoot));

  const cfgDiff = runCli(cliPath, ["config", "diff", targetName], projectRoot);
  if (!cfgDiff.ok) warn("diag: config diff failed (see config-diff.txt)");
  writeResult(diagRoot, "config-diff.txt", cfgDiff);

  const status = runCli(cliPath, ["remote", targetName, "status"], projectRoot);
  if (!status.ok) warn("diag: remote status failed (see remote-status.txt)");
  writeResult(diagRoot, "remote-status.txt", status);

  if ((targetCfg.kind || "local").toLowerCase() === "ssh") {
    const logs = logsSnapshotSsh(targetCfg, 200);
    writeResult(diagRoot, "remote-logs.txt", { ok: logs.ok, status: logs.ok ? 0 : 1, output: logs.output });
  } else {
    writeResult(diagRoot, "remote-logs.txt", { ok: true, status: 0, output: "SKIP: remote logs not available for local target." });
  }


  ok(`Diagnostic bundle ready: ${diagRoot}`);
  return { dir: diagRoot };
}

module.exports = { cmdDiag };

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

function cleanupOldDiags(baseDir, keepCount) {
  if (!baseDir || !fs.existsSync(baseDir)) return;
  const entries = fs.readdirSync(baseDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(baseDir, d.name));
  if (entries.length <= keepCount) return;
  entries.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  const toDelete = entries.slice(keepCount);
  for (const dir of toDelete) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

async function cmdDiag(cwd, targetArg) {
  const projectRoot = findProjectRoot(cwd);
  const targetName = resolveTargetName(projectRoot, targetArg || null);
  const t = loadTargetConfig(projectRoot, targetName);
  if (!t) throw new Error(`Brak targetu ${targetName}. Zrób: seal target add ${targetName}`);
  const targetCfg = t.cfg;

  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const diagBase = path.join(projectRoot, "seal-out", "diagnostics");
  const diagRoot = path.join(diagBase, `${targetName}-${ts}`);
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


  const keepRaw = process.env.SEAL_DIAG_KEEP || "5";
  const keepCount = Number.isFinite(Number(keepRaw)) ? Math.max(0, Math.floor(Number(keepRaw))) : 5;
  if (keepCount > 0) {
    cleanupOldDiags(diagBase, keepCount);
  }
  ok(`Diagnostic bundle ready: ${diagRoot}`);
  return { dir: diagRoot };
}

module.exports = { cmdDiag };

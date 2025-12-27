#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { hasCommand } = require("./e2e-utils");

function log(msg) {
  process.stdout.write(`[completion-e2e] ${msg}\n`);
}

function fail(msg) {
  process.stderr.write(`[completion-e2e] ERROR: ${msg}\n`);
}

function bashQuote(value) {
  const str = String(value);
  return `'${str.replace(/'/g, "'\\''")}'`;
}

function runBash(script, cwd) {
  return spawnSync("bash", ["-lc", script], { cwd, encoding: "utf8" });
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

function ensureProjectRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "seal-completion-e2e-"));
  writeFile(path.join(root, "seal.json5"), "{ appName: \"app\" }\n");
  writeFile(path.join(root, "seal-config", "targets", "alpha.json5"), "{ host: \"127.0.0.1\" }\n");
  writeFile(path.join(root, "seal-config", "targets", "beta.json5"), "{ host: \"127.0.0.2\" }\n");
  writeFile(path.join(root, "seal-config", "configs", "local.json5"), "{ http: { port: 3000 } }\n");
  writeFile(path.join(root, "seal-config", "configs", "prod.json5"), "{ http: { port: 3001 } }\n");
  return root;
}

function readCompletionScript() {
  const { cmdCompletion } = require("../src/commands/completion");
  let output = "";
  const origWrite = process.stdout.write;
  process.stdout.write = (chunk) => {
    output += String(chunk);
    return true;
  };
  try {
    cmdCompletion("bash");
  } finally {
    process.stdout.write = origWrite;
  }
  return output;
}

function getCompletions({ completionPath, cwd, words, cword, label }) {
  const args = words.map((word) => bashQuote(word)).join(" ");
  const script = `
set -euo pipefail
if [ ! -s ${bashQuote(completionPath)} ]; then
  echo "__SEAL_COMPLETION_MISSING__"
  exit 90
fi
source ${bashQuote(completionPath)}
if ! declare -F _seal_complete >/dev/null 2>&1; then
  echo "__SEAL_COMPLETION_NOFUNC__"
  exit 91
fi
unset -f _init_completion 2>/dev/null || true
COMP_WORDS=(${args})
COMP_CWORD=${cword}
_seal_complete
printf '%s\\n' "\${COMPREPLY[@]}"
`;
  const res = runBash(script, cwd);
  if (res.status !== 0) {
    const out = `${res.stdout || ""}\n${res.stderr || ""}`.trim();
    const prefix = label ? `${label}: ` : "";
    throw new Error(`${prefix}bash completion failed (status=${res.status})${out ? `: ${out}` : ""}`);
  }
  const raw = (res.stdout || "").trim();
  if (!raw) return [];
  return raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function assertIncludes(list, value, label) {
  assert(list.includes(value), `${label}: missing "${value}" in [${list.join(", ")}]`);
}

function assertNotIncludes(list, value, label) {
  assert(!list.includes(value), `${label}: unexpected "${value}" in [${list.join(", ")}]`);
}

function run() {
  if (!hasCommand("bash")) {
    log("SKIP: bash not found");
    return;
  }
  const root = ensureProjectRoot();
  let completionPath = null;
  try {
    const script = readCompletionScript();
    if (!script.trim()) {
      throw new Error("completion script empty");
    }
    completionPath = path.join(root, ".completion.bash");
    writeFile(completionPath, script);

    const top = getCompletions({ completionPath, cwd: root, words: ["seal", ""], cword: 1, label: "root" });
    assertIncludes(top, "deploy", "root commands");
    assertIncludes(top, "completion", "root commands");

    const sentinelCmds = getCompletions({ completionPath, cwd: root, words: ["seal", "sentinel", ""], cword: 2, label: "sentinel cmd" });
    assertIncludes(sentinelCmds, "install", "sentinel subcommands");
    assertIncludes(sentinelCmds, "verify", "sentinel subcommands");

    const sentinelTargets = getCompletions({ completionPath, cwd: root, words: ["seal", "sentinel", "install", ""], cword: 3, label: "sentinel targets" });
    assertIncludes(sentinelTargets, "alpha", "sentinel targets");
    assertIncludes(sentinelTargets, "beta", "sentinel targets");

    const configCmds = getCompletions({ completionPath, cwd: root, words: ["seal", "config", ""], cword: 2, label: "config cmd" });
    assertIncludes(configCmds, "add", "config subcommands");
    assertIncludes(configCmds, "diff", "config subcommands");
    assertIncludes(configCmds, "pull", "config subcommands");
    assertIncludes(configCmds, "push", "config subcommands");

    const configDiff = getCompletions({ completionPath, cwd: root, words: ["seal", "config", "diff", ""], cword: 3, label: "config diff" });
    assertIncludes(configDiff, "alpha", "config diff target");
    assertIncludes(configDiff, "prod", "config diff config");

    const deployTargets = getCompletions({ completionPath, cwd: root, words: ["seal", "deploy", ""], cword: 2, label: "deploy targets" });
    assertIncludes(deployTargets, "alpha", "deploy targets");
    assertIncludes(deployTargets, "beta", "deploy targets");

    const deployOpts = getCompletions({ completionPath, cwd: root, words: ["seal", "deploy", "--"], cword: 2, label: "deploy opts" });
    assertIncludes(deployOpts, "--bootstrap", "deploy options");
    assertIncludes(deployOpts, "--skip-sentinel-verify", "deploy options");

    const packagerOpts = getCompletions({ completionPath, cwd: root, words: ["seal", "release", "--packager", ""], cword: 3, label: "packager opts" });
    assertIncludes(packagerOpts, "thin-split", "packager options");
    assertIncludes(packagerOpts, "sea", "packager options");
    assertIncludes(packagerOpts, "bundle", "packager options");

    const configOpts = getCompletions({ completionPath, cwd: root, words: ["seal", "release", "--config", ""], cword: 3, label: "release config opts" });
    assertIncludes(configOpts, "local", "config options");
    assertIncludes(configOpts, "prod", "config options");

    const pullOpts = getCompletions({ completionPath, cwd: root, words: ["seal", "config", "pull", "--"], cword: 3, label: "config pull opts" });
    assertIncludes(pullOpts, "--apply", "config pull options");
    assertNotIncludes(pullOpts, "--push-config", "config pull options");

    log("OK");
  } finally {
    try {
      fs.rmSync(root, { recursive: true, force: true });
    } catch {}
  }
}

try {
  run();
} catch (err) {
  fail(err.message || String(err));
  process.exitCode = 1;
}

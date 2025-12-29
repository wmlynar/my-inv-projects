#!/usr/bin/env node
"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { createLogger } = require("./e2e-utils");

const { log, fail, skip } = createLogger("install-e2e");

function bashQuote(value) {
  const str = String(value);
  return `'${str.replace(/'/g, "'\\''")}'`;
}

function runBash(script, env, cwd) {
  const res = spawnSync("bash", ["-lc", script], {
    cwd,
    env,
    encoding: "utf8",
    timeout: 30 * 60 * 1000,
  });
  if (res.status !== 0) {
    const out = `${res.stdout || ""}\n${res.stderr || ""}`.trim();
    throw new Error(`bash failed (status=${res.status})${out ? `: ${out}` : ""}`);
  }
  return res;
}

function readFileOrEmpty(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function run() {
  if (process.env.SEAL_DOCKER_E2E !== "1") {
    return skip("docker-only");
  }
  if (typeof process.getuid === "function" && process.getuid() !== 0) {
    return skip("root required for install.sh");
  }

  const repoRoot = path.resolve(__dirname, "../../../..");
  const installScript = path.join(repoRoot, "tools", "seal", "install.sh");
  if (!fs.existsSync(installScript)) {
    throw new Error(`install.sh not found: ${installScript}`);
  }

  const home = fs.mkdtempSync(path.join(os.tmpdir(), "seal-install-e2e-"));
  const env = { ...process.env };
  env.HOME = home;
  env.XDG_CACHE_HOME = path.join(home, ".cache");
  env.XDG_CONFIG_HOME = path.join(home, ".config");
  env.XDG_DATA_HOME = path.join(home, ".local", "share");
  env.XDG_STATE_HOME = path.join(home, ".local", "state");
  env.BASH_COMPLETION_USER_DIR = path.join(env.XDG_DATA_HOME, "bash-completion");
  env.NPM_CONFIG_PREFIX = path.join(home, ".npm-global");
  env.SEAL_INSTALL_EXTRAS = "0";
  env.SEAL_INSTALL_E2E_TOOLS = "0";
  env.SEAL_INSTALL_ANTIDEBUG = "0";
  env.SEAL_INSTALL_DOCKER = "0";
  env.SEAL_INSTALL_PLAYWRIGHT = "0";
  env.SEAL_INSTALL_PACKERS = "1";
  env.SEAL_INSTALL_C_OBFUSCATOR = "1";
  env.SEAL_INSTALL_LINK = "1";
  env.SEAL_INSTALL_COMPLETION = "1";
  env.SEAL_INSTALL_BASH_COMPLETION_PKG = "1";

  ensureDir(env.XDG_CACHE_HOME);
  ensureDir(env.XDG_CONFIG_HOME);
  ensureDir(env.XDG_DATA_HOME);
  ensureDir(env.XDG_STATE_HOME);

  const cwd = path.join(repoRoot, "tools", "seal");
  runBash(`cd ${bashQuote(cwd)}\n./install.sh`, env, cwd);

  const bashrcPath = path.join(home, ".bashrc");
  const profilePath = path.join(home, ".profile");
  const bashrcFirst = readFileOrEmpty(bashrcPath);
  const profileFirst = readFileOrEmpty(profilePath);

  runBash(`cd ${bashQuote(cwd)}\n./install.sh`, env, cwd);

  const bashrcSecond = readFileOrEmpty(bashrcPath);
  const profileSecond = readFileOrEmpty(profilePath);
  assert.strictEqual(bashrcSecond, bashrcFirst, "install.sh should not append duplicate bashrc entries");
  assert.strictEqual(profileSecond, profileFirst, "install.sh should not append duplicate profile entries");

  runBash(`
set -euo pipefail
source ~/.profile >/dev/null 2>&1 || true
source ~/.bashrc >/dev/null 2>&1 || true
command -v seal >/dev/null
seal --help >/dev/null
`, env, cwd);

  const completionPath = path.join(env.BASH_COMPLETION_USER_DIR, "completions", "seal");
  if (!fs.existsSync(completionPath)) {
    throw new Error(`completion file missing: ${completionPath}`);
  }
  const completionScript = readFileOrEmpty(completionPath);
  if (!completionScript.trim()) {
    throw new Error("completion file is empty");
  }

  runBash(`
set -euo pipefail
source ${bashQuote(completionPath)}
declare -F _seal_complete >/dev/null 2>&1
complete -p seal | grep -q "_seal_complete"
`, env, cwd);

  log("OK");
}

try {
  run();
} catch (err) {
  fail(err.message || String(err));
  process.exitCode = 1;
}

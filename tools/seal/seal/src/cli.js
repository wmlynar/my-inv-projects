"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

const { Command } = require("commander");

const { wizard } = require("./commands/wizard");
const { cmdInit } = require("./commands/init");
const { cmdCheck } = require("./commands/check");
const { cmdBatch } = require("./commands/batch");
const { cmdClean } = require("./commands/clean");
const { cmdCompletion, getCompletionScript } = require("./commands/completion");
const { cmdRelease } = require("./commands/release");
const { cmdVerify } = require("./commands/verify");
const { cmdRunLocal } = require("./commands/runLocal");
const { cmdTargetAdd } = require("./commands/targetAdd");
const { cmdConfigAdd, cmdConfigDiff, cmdConfigPull, cmdConfigPush, cmdConfigExplain } = require("./commands/config");
const { cmdProfiles } = require("./commands/profiles");
const { cmdSentinelProbe, cmdSentinelInspect, cmdSentinelInstall, cmdSentinelVerify, cmdSentinelUninstall } = require("./commands/sentinel");
const { cmdDeploy, cmdShip, cmdRollback, cmdUninstall, cmdRunRemote, cmdRemote } = require("./commands/deploy");
const { loadSealFile, isWorkspaceConfig } = require("./lib/project");
const { version } = require("./lib/version");

const BATCH_SKIP_ENV = "SEAL_BATCH_SKIP";

function isWorkspaceRoot(cwd) {
  const cfg = loadSealFile(cwd);
  return !!cfg && isWorkspaceConfig(cfg);
}

function hasHelpOrVersionFlag(args) {
  if (args[0] === "help") return true;
  return args.some((a) => a === "--help" || a === "-h" || a === "--version" || a === "-V");
}

function shouldAutoInstallCompletion() {
  if (process.env.SEAL_NO_COMPLETION_AUTO === "1") return false;
  if (process.env.CI) return false;
  const shell = process.env.SHELL || "";
  const isBash = shell.endsWith("/bash") || shell === "bash" || !!process.env.BASH_VERSION;
  if (!isBash) return false;
  if (!process.stdout.isTTY && !process.stdin.isTTY) return false;
  return true;
}

function ensureBashCompletionInstalled() {
  if (!shouldAutoInstallCompletion()) return;
  const userDir =
    process.env.BASH_COMPLETION_USER_DIR ||
    path.join(process.env.XDG_DATA_HOME || path.join(os.homedir(), ".local", "share"), "bash-completion");
  const completionDir = path.join(userDir, "completions");
  const completionPath = path.join(completionDir, "seal");
  try {
    const script = getCompletionScript("bash");
    const existing = fs.existsSync(completionPath)
      ? fs.readFileSync(completionPath, "utf-8")
      : null;
    if (existing === script) return;
    fs.mkdirSync(completionDir, { recursive: true });
    fs.writeFileSync(completionPath, script, "utf-8");
  } catch {
    // Best-effort only; completion should never break CLI usage.
  }
}

function applyFastOverlay(opts) {
  if (!opts) return opts;
  if (opts.fast) {
    if (opts.profileOverlay && String(opts.profileOverlay) !== "fast") {
      throw new Error(`--fast is shorthand for --profile-overlay fast (got: ${opts.profileOverlay})`);
    }
    opts.profileOverlay = "fast";
  }
  return opts;
}

function getAutoBatchRequest(argv, cwd) {
  if (process.env[BATCH_SKIP_ENV] === "1") return null;
  const args = argv.slice(2);
  if (!args.length) return null;
  if (hasHelpOrVersionFlag(args)) return null;
  const cmd = args[0];
  if (!cmd || cmd.startsWith("-")) return null;
  if (cmd === "batch" || cmd === "wizard") return null;
  if (!isWorkspaceRoot(cwd)) return null;
  return { cmd, args: args.slice(1) };
}

async function main(argv) {
  const cwd = process.cwd();
  ensureBashCompletionInstalled();
  const autoBatch = getAutoBatchRequest(argv, cwd);
  if (autoBatch) {
    await cmdBatch(cwd, autoBatch.cmd, autoBatch.args, {
      root: ".",
      depth: 4,
      filter: null,
      dryRun: false,
      keepGoing: false,
    });
    return;
  }

  const program = new Command();

  program
    .name("seal")
    .description("SEAL v0.6 (first implementation) – local sealing + deploy helpers")
    .version(version)
    .showHelpAfterError(true);

  // Wizard: when no args, run interactive guide (or print hints if no TTY)
  program.action(async () => {
    await wizard(process.cwd());
  });

  program
    .command("init")
    .description("Initialize / adopt project into SEAL (creates seal.json5 + local target/config)")
    .option("--force", "Overwrite existing files (careful)", false)
    .action(async (opts) => cmdInit(process.cwd(), opts));

  program
    .command("wizard")
    .description("Interactive guide: choose next steps (init/check/release/deploy/remote)")
    .action(async () => {
      await wizard(process.cwd());
    });

  program
    .command("completion")
    .description("Print shell completion script (bash)")
    .argument("[shell]", "Shell name (default: bash)", "bash")
    .action((shell) => cmdCompletion(shell));

  program
    .command("check")
    .description("Preflight checks: config, entrypoint, toolchain, SEA availability")
    .argument("[target]", "Target name (optional; enables SSH preflight)")
    .option("--strict", "Treat warnings as errors", false)
    .option("--verbose", "Show tool output (diagnostics for slow/hanging checks)", false)
    .option("--cc <compiler>", "C compiler for thin toolchain check (e.g. gcc/clang)", null)
    .option("--profile-overlay <name>", "Apply build profile overlay (seal.json5 build.profileOverlays.<name>)", null)
    .option("--fast", "Shorthand for --profile-overlay fast", false)
    .action(async (target, opts) => cmdCheck(process.cwd(), target, applyFastOverlay(opts)));

  program
    .command("target")
    .description("Manage targets")
    .command("add <target>")
    .description("Add target in seal-config/targets")
    .action(async (target) => cmdTargetAdd(process.cwd(), target));

  const configCmd = program.command("config").description("Manage runtime config (and drift helpers)");
  configCmd
    .command("add <config>")
    .description("Add config in seal-config/configs")
    .action(async (name) => cmdConfigAdd(process.cwd(), name));
  configCmd
    .command("explain [targetOrConfig]")
    .description("Explain resolved config (profiles, packager, thin/protection/sentinel)")
    .option("--profile-overlay <name>", "Apply build profile overlay for explain (seal.json5 build.profileOverlays.<name>)", null)
    .option("--fast", "Shorthand for --profile-overlay fast", false)
    .action(async (targetOrConfig, opts) => cmdConfigExplain(process.cwd(), targetOrConfig, applyFastOverlay(opts)));
  configCmd
    .command("diff [targetOrConfig]")
    .description("Show diff between repo seal-config/configs and server shared/config.json5 (requires SSH). Accepts target or config path/name.")
    .action(async (targetOrConfig) => cmdConfigDiff(process.cwd(), targetOrConfig));
  configCmd
    .command("pull [targetOrConfig]")
    .description("Pull server shared/config.json5 into repo seal-config/configs (requires SSH)")
    .option("--apply", "Overwrite repo config file", false)
    .action(async (targetOrConfig, opts) => cmdConfigPull(process.cwd(), targetOrConfig, opts));
  configCmd
    .command("push [targetOrConfig]")
    .description("Push repo seal-config/configs to server shared/config.json5 (requires SSH)")
    .action(async (targetOrConfig) => cmdConfigPush(process.cwd(), targetOrConfig));

  const sentinelCmd = program.command("sentinel").description("Manage sentinel (thin-only)");
  sentinelCmd
    .command("probe [target]")
    .description("Probe host and baseDir for sentinel readiness (SSH)")
    .action(async (target) => cmdSentinelProbe(process.cwd(), target));
  sentinelCmd
    .command("inspect [target]")
    .description("Inspect target for sentinel L4 options (USB/file/TPM) (SSH)")
    .option("--json", "Print JSON output", false)
    .action(async (target, opts) => cmdSentinelInspect(process.cwd(), target, opts));
  sentinelCmd
    .command("install [target]")
    .description("Install sentinel blob on target (SSH)")
    .option("--force", "Rebind sentinel (regenerate install_id)", false)
    .option("--insecure", "Skip baseDir safety checks (NOT recommended)", false)
    .option("--skip-verify", "Skip post-install runner verify (NOT recommended)", false)
    .action(async (target, opts) => cmdSentinelInstall(process.cwd(), target, opts));
  sentinelCmd
    .command("verify [target]")
    .description("Verify sentinel blob against host fingerprint (SSH)")
    .option("--json", "Print JSON output", false)
    .action(async (target, opts) => cmdSentinelVerify(process.cwd(), target, opts));
  sentinelCmd
    .command("uninstall [target]")
    .description("Remove sentinel blob from target (SSH)")
    .action(async (target) => cmdSentinelUninstall(process.cwd(), target));

  program
    .command("release")
    .description("Build sealed release artifact (default target=config=local)")
    .argument("[target]", "Target name (defaults: project defaultTarget or 'local')")
    .option("--config <config>", "Override config variant (rare)", null)
    .option("--skip-check", "Skip preflight checks", false)
    .option("--check-verbose", "Show tool output during preflight checks", false)
    .option("--check-cc <compiler>", "C compiler for preflight checks (e.g. gcc/clang)", null)
    .option("--packager <packager>", "Override packager: thin-split|sea|bundle|none|auto(=thin-split)", null)
    .option("--payload-only", "Build thin payload only (skip launcher/runtime; requires thin-split bootstrap)", false)
    .option("--profile-overlay <name>", "Apply build profile overlay (seal.json5 build.profileOverlays.<name>)", null)
    .option("--fast", "Shorthand for --profile-overlay fast", false)
    .option("--timing", "Print timing summary for the build", false)
    .action(async (target, opts) => cmdRelease(process.cwd(), target, applyFastOverlay(opts)));

  program
    .command("run-local")
    .description("Run locally: dev (node) or sealed (from seal-out/release)")
    .option("--sealed", "Run sealed binary from latest release", false)
    .option("--config <config>", "Config variant to copy into sealed run dir", null)
    .action(async (opts) => cmdRunLocal(process.cwd(), opts));

  program
    .command("verify")
    .description("Verify last build artifact (or given .tgz) for leaks (.map/src/etc)")
    .argument("[artifactOrTarget]", "Artifact path (.tgz) or target name (defaults to last artifact)", null)
    .option("--explain", "Print a readable checklist", false)
    .action(async (arg, opts) => cmdVerify(process.cwd(), arg, opts));

  program
    .command("clean")
    .description("Remove seal-out/ for this project (generated artifacts)")
    .action(async () => cmdClean(process.cwd()));

  program
    .command("profiles")
    .description("List security + obfuscation profiles and what they do")
    .action(() => cmdProfiles());

  program
    .command("deploy")
    .description("Manual deploy: copy/install release (no restart unless --restart)")
    .argument("[target]", "Target name (default: project defaultTarget)", null)
    .option("--bootstrap", "Install prerequisites on the target (first time)", false)
    .option("--push-config", "Overwrite server runtime config with repo config (explicit)", false)
    .option("--skip-sentinel-verify", "Skip post-install sentinel verify (runner check)", false)
    .option("--restart", "Restart target service after deploy (explicit)", false)
    .option("--wait", "Wait for readiness after restart (systemd or HTTP)", false)
    .option("--wait-timeout <ms>", "Readiness timeout in ms (default: 60000)", null)
    .option("--wait-interval <ms>", "Readiness poll interval in ms (default: 1000)", null)
    .option("--wait-url <url>", "HTTP readiness URL (e.g. http://127.0.0.1:3000/healthz)", null)
    .option("--wait-mode <mode>", "Readiness mode: systemd|http|both (default: auto)", null)
    .option("--wait-http-timeout <ms>", "HTTP readiness timeout in ms (default: 2000)", null)
    .option("--accept-drift", "Allow start/restart when repo config differs from target", false)
    .option("--warn-drift", "Warn before deploy if repo config differs from target", false)
    .option("--artifact <path>", "Deploy a specific artifact (.tgz) instead of building", null)
    .option("--profile-overlay <name>", "Apply build profile overlay (seal.json5 build.profileOverlays.<name>)", null)
    .option("--fast", "Shorthand for --profile-overlay fast", false)
    .option("--timing", "Print timing summary for deploy steps", false)
    .action(async (target, opts) => cmdDeploy(process.cwd(), target, applyFastOverlay(opts)));

  program
    .command("ship")
    .description("Main flow: release + deploy + restart + readiness")
    .argument("[target]", "Target name (default: project defaultTarget)", null)
    .option("--bootstrap", "Install prerequisites on the target (first time)", false)
    .option("--push-config", "Overwrite server runtime config with repo config (explicit)", false)
    .option("--skip-sentinel-verify", "Skip post-install sentinel verify (runner check)", false)
    .option("--no-wait", "Skip readiness wait after restart (default: wait)")
    .option("--wait-timeout <ms>", "Readiness timeout in ms (default: 60000)", null)
    .option("--wait-interval <ms>", "Readiness poll interval in ms (default: 1000)", null)
    .option("--wait-url <url>", "HTTP readiness URL (e.g. http://127.0.0.1:3000/healthz)", null)
    .option("--wait-mode <mode>", "Readiness mode: systemd|http|both (default: auto)", null)
    .option("--wait-http-timeout <ms>", "HTTP readiness timeout in ms (default: 2000)", null)
    .option("--accept-drift", "Allow start/restart when repo config differs from target", false)
    .option("--warn-drift", "Warn before deploy if repo config differs from target", false)
    .option("--skip-check", "Skip preflight checks", false)
    .option("--check-verbose", "Show tool output during preflight checks", false)
    .option("--check-cc <compiler>", "C compiler for preflight checks (e.g. gcc/clang)", null)
    .option("--packager <packager>", "Override packager: thin-split|sea|bundle|none|auto(=thin-split)", null)
    .option("--payload-only", "Build thin payload only (skip launcher/runtime; requires thin-split bootstrap)", false)
    .option("--profile-overlay <name>", "Apply build profile overlay (seal.json5 build.profileOverlays.<name>)", null)
    .option("--fast", "Shorthand for --profile-overlay fast", false)
    .option("--timing", "Print timing summary for ship steps", false)
    .action(async (target, opts) => cmdShip(process.cwd(), target, applyFastOverlay(opts)));

  program
    .command("rollback")
    .description("Rollback to previous release on target (minimal implementation)")
    .argument("[target]", "Target name", null)
    .option("--accept-drift", "Allow rollback when repo config differs from target", false)
    .action(async (target, opts) => cmdRollback(process.cwd(), target, opts));

  program
    .command("run")
    .description("Run application on target in foreground (ssh/systemd)")
    .argument("[target]", "Target name", null)
    .option("--kill", "Kill running app process from current release before starting", false)
    .option("--sudo", "Run application as root (uses sudo)", false)
    .option("--accept-drift", "Allow run when repo config differs from target", false)
    .action(async (target, opts) => cmdRunRemote(process.cwd(), target, opts));

  program
    .command("uninstall")
    .description("Uninstall SEAL service from target (sandbox-friendly)")
    .argument("[target]", "Target name", null)
    .action(async (target) => cmdUninstall(process.cwd(), target));

  program
    .command("remote")
    .description("Service control on target (mirrors appctl)")
    .argument("<target>", "Target name")
    .argument("<action>", "up|enable|start|restart|stop|disable|down|status|logs")
    .option("--accept-drift", "Allow start/restart when repo config differs from target", false)
    .option("--skip-sentinel-verify", "Skip post-install sentinel verify (runner check)", false)
    .action(async (target, action, opts) => cmdRemote(process.cwd(), target, action, opts));

  await program.parseAsync(argv);
}

module.exports = { main };

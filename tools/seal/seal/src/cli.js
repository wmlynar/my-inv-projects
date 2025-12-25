"use strict";

const { Command } = require("commander");

const { wizard } = require("./commands/wizard");
const { cmdInit } = require("./commands/init");
const { cmdCheck } = require("./commands/check");
const { cmdBatch } = require("./commands/batch");
const { cmdClean } = require("./commands/clean");
const { cmdRelease } = require("./commands/release");
const { cmdVerify } = require("./commands/verify");
const { cmdRunLocal } = require("./commands/runLocal");
const { cmdTargetAdd } = require("./commands/targetAdd");
const { cmdConfigAdd, cmdConfigDiff, cmdConfigPull, cmdConfigPush } = require("./commands/config");
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
    .command("check")
    .description("Preflight checks: config, entrypoint, toolchain, SEA availability")
    .argument("[target]", "Target name (optional; enables SSH preflight)")
    .option("--strict", "Treat warnings as errors", false)
    .option("--verbose", "Show tool output (diagnostics for slow/hanging checks)", false)
    .option("--cc <compiler>", "C compiler for thin toolchain check (e.g. gcc/clang)", null)
    .action(async (target, opts) => cmdCheck(process.cwd(), target, opts));

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

  program
    .command("release")
    .description("Build sealed release artifact (default target=config=local)")
    .argument("[target]", "Target name (defaults: project defaultTarget or 'local')")
    .option("--config <config>", "Override config variant (rare)", null)
    .option("--skip-check", "Skip preflight checks", false)
    .option("--check-verbose", "Show tool output during preflight checks", false)
    .option("--check-cc <compiler>", "C compiler for preflight checks (e.g. gcc/clang)", null)
    .option("--packager <packager>", "Override packager: thin-split|thin-single|sea|bundle|none|auto(=thin-split)", null)
    .action(async (target, opts) => cmdRelease(process.cwd(), target, opts));

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
    .command("deploy")
    .description("Deploy artifact to target (copy files; service control is explicit)")
    .argument("[target]", "Target name (default: project defaultTarget)", null)
    .option("--bootstrap", "Install prerequisites on the target (first time)", false)
    .option("--push-config", "Overwrite server runtime config with repo config (explicit)", false)
    .option("--restart", "Restart target service after deploy (explicit)", false)
    .option("--artifact <path>", "Deploy a specific artifact (.tgz) instead of building", null)
    .option("--fast", "Fast deploy from sources (unsafe)", false)
    .option("--fast-no-node-modules", "Exclude node_modules in fast mode", false)
    .action(async (target, opts) => cmdDeploy(process.cwd(), target, opts));

  program
    .command("ship")
    .description("Build, deploy, and restart service on target")
    .argument("[target]", "Target name (default: project defaultTarget)", null)
    .option("--bootstrap", "Install prerequisites on the target (first time)", false)
    .option("--push-config", "Overwrite server runtime config with repo config (explicit)", false)
    .option("--skip-check", "Skip preflight checks", false)
    .option("--check-verbose", "Show tool output during preflight checks", false)
    .option("--check-cc <compiler>", "C compiler for preflight checks (e.g. gcc/clang)", null)
    .option("--packager <packager>", "Override packager: thin-split|thin-single|sea|bundle|none|auto(=thin-split)", null)
    .option("--fast", "Fast ship from sources (unsafe)", false)
    .option("--fast-no-node-modules", "Exclude node_modules in fast mode", false)
    .action(async (target, opts) => cmdShip(process.cwd(), target, opts));

  program
    .command("rollback")
    .description("Rollback to previous release on target (minimal implementation)")
    .argument("[target]", "Target name", null)
    .action(async (target) => cmdRollback(process.cwd(), target));

  program
    .command("run")
    .description("Run application on target in foreground (ssh/systemd)")
    .argument("[target]", "Target name", null)
    .option("--kill", "Kill running app process from current release before starting", false)
    .option("--sudo", "Run application as root (uses sudo)", false)
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
    .action(async (target, action) => cmdRemote(process.cwd(), target, action));

  await program.parseAsync(argv);
}

module.exports = { main };

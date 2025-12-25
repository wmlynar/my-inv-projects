"use strict";

const { findProjectRoot } = require("../lib/paths");
const { loadProjectConfig, loadTargetConfig, resolveTargetName } = require("../lib/project");
const { resolveThinConfig, normalizePackager } = require("../lib/packagerConfig");
const { resolveSentinelConfig, resolveAutoLevel } = require("../lib/sentinelConfig");
const { probeSentinelSsh, installSentinelSsh, verifySentinelSsh, uninstallSentinelSsh } = require("../lib/sentinelOps");
const { hr, info, warn, ok } = require("../lib/ui");

function resolveContext(cwd, targetArg) {
  const projectRoot = findProjectRoot(cwd);
  const proj = loadProjectConfig(projectRoot);
  if (!proj) throw new Error("Brak seal.json5 (projekt). Zrób: seal init");

  const targetName = resolveTargetName(projectRoot, targetArg);
  const t = loadTargetConfig(projectRoot, targetName);
  if (!t) throw new Error(`Brak targetu ${targetName}. Zrób: seal target add ${targetName}`);

  const targetCfg = t.cfg;
  targetCfg.appName = proj.appName;
  targetCfg.serviceName = targetCfg.serviceName || proj.appName;

  const thinCfg = resolveThinConfig(targetCfg, proj);
  const packagerSpec = normalizePackager(targetCfg.packager || proj.build.packager || "auto", thinCfg.mode);
  const sentinelCfg = resolveSentinelConfig({
    projectRoot,
    projectCfg: proj,
    targetCfg,
    targetName,
    packagerSpec,
  });

  return { projectRoot, proj, targetName, targetCfg, sentinelCfg };
}

function ensureEnabled(ctx) {
  if (!ctx.sentinelCfg.enabled) {
    warn("Sentinel disabled (build.sentinel.enabled=false or auto disabled).");
    return false;
  }
  if ((ctx.targetCfg.kind || "local").toLowerCase() !== "ssh") {
    warn("Sentinel commands are supported only for SSH targets in MVP.");
    return false;
  }
  return true;
}

async function cmdSentinelProbe(cwd, targetArg) {
  const ctx = resolveContext(cwd, targetArg);
  if (!ensureEnabled(ctx)) return;

  hr();
  info(`Sentinel probe -> ${ctx.targetName} (${ctx.targetCfg.kind})`);
  const res = probeSentinelSsh({ targetCfg: ctx.targetCfg, sentinelCfg: ctx.sentinelCfg });

  const host = res.hostInfo || {};
  const level = ctx.sentinelCfg.level === "auto" ? resolveAutoLevel(host) : ctx.sentinelCfg.level;

  console.log("Host:");
  console.log(`  mid: ${host.mid || "(missing)"}`);
  console.log(`  rid: ${host.rid || "(missing)"}`);
  console.log(`  fstype: ${host.fstype || "(unknown)"}`);
  console.log(`  puid: ${host.puid || "(missing)"}`);
  console.log(`  level(auto): ${level}`);

  const base = res.base || {};
  console.log("Storage:");
  console.log(`  baseDir: ${ctx.sentinelCfg.storage.baseDir}`);
  console.log(`  exists: ${base.exists ? "yes" : "no"}`);
  console.log(`  symlink: ${base.isSymlink ? "yes" : "no"}`);
  console.log(`  uid: ${base.uid !== null ? base.uid : "?"}`);
  console.log(`  gid: ${base.gid !== null ? base.gid : "?"}`);
  console.log(`  mode: ${base.mode || "?"}`);
  console.log(`  execOk: ${base.execOk ? "yes" : "no"}`);

  ok("Probe done.");
}

async function cmdSentinelInstall(cwd, targetArg, opts) {
  const ctx = resolveContext(cwd, targetArg);
  if (!ensureEnabled(ctx)) return;

  hr();
  info(`Sentinel install -> ${ctx.targetName} (${ctx.targetCfg.kind})`);
  const res = installSentinelSsh({
    targetCfg: ctx.targetCfg,
    sentinelCfg: ctx.sentinelCfg,
    force: !!opts.force,
    insecure: !!opts.insecure,
  });
  const level = res.level;
  ok(`Sentinel installed (level=${level})`);
}

async function cmdSentinelVerify(cwd, targetArg, opts) {
  const ctx = resolveContext(cwd, targetArg);
  if (!ensureEnabled(ctx)) return;

  const res = verifySentinelSsh({ targetCfg: ctx.targetCfg, sentinelCfg: ctx.sentinelCfg });
  if (opts.json) {
    process.stdout.write(JSON.stringify(res, null, 2) + "\n");
    if (!res.ok) throw new Error(`Sentinel verify failed (${res.reason || "unknown"})`);
    return;
  }

  if (!res.ok) {
    warn(`Sentinel verify failed: ${res.reason || "unknown"}`);
    throw new Error("Sentinel verify failed");
  }
  ok("Sentinel verify OK");
}

async function cmdSentinelUninstall(cwd, targetArg) {
  const ctx = resolveContext(cwd, targetArg);
  if (!ensureEnabled(ctx)) return;

  hr();
  info(`Sentinel uninstall -> ${ctx.targetName} (${ctx.targetCfg.kind})`);
  uninstallSentinelSsh({ targetCfg: ctx.targetCfg, sentinelCfg: ctx.sentinelCfg });
  ok("Sentinel removed");
}

module.exports = {
  cmdSentinelProbe,
  cmdSentinelInstall,
  cmdSentinelVerify,
  cmdSentinelUninstall,
};

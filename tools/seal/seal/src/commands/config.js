"use strict";

const fs = require("fs");
const path = require("path");

const { findProjectRoot } = require("../lib/paths");
const { getSealPaths, loadProjectConfig, loadTargetConfig, resolveTargetName, resolveConfigName, getConfigFile } = require("../lib/project");
const { ensureDir, fileExists, safeWriteFile } = require("../lib/fsextra");
const {
  normalizePackager,
  resolveThinConfig,
  resolveProtectionConfig,
  resolveBundleFallback,
  applyThinCompatibility,
  applyProtectionCompatibility,
} = require("../lib/packagerConfig");
const { resolveSentinelConfig } = require("../lib/sentinelConfig");
const { readJson5 } = require("../lib/json5io");
const { info, ok, warn } = require("../lib/ui");
const { configDiffSsh, configPullSsh, configPushSsh } = require("../lib/deploySsh");

function templateConfig(name, appName) {
  return `// seal-config/configs/${name}.json5 – runtime config
{
  appName: "${appName}",
  http: {
    host: "0.0.0.0",
    port: ${name === "prod" ? 8080 : 3000},
  },

  log: {
    level: "${name === "prod" ? "error" : "debug"}",
    file: "./logs/app.log",
  },

  external: {
    echoUrl: "https://postman-echo.com/get?source=seal",
    timeoutMs: 5000,
  },

  featuresFile: "./data/feature_flags.json",
}
`;
}

async function cmdConfigAdd(cwd, name) {
  const projectRoot = findProjectRoot(cwd);
  const paths = getSealPaths(projectRoot);
  const proj = loadProjectConfig(projectRoot);
  if (!proj) throw new Error("Brak seal.json5 (projekt). Zrób: seal init");

  ensureDir(paths.configDir);
  const file = path.join(paths.configDir, `${name}.json5`);
  if (fileExists(file)) {
    warn(`Config already exists: ${file}`);
    return;
  }
  safeWriteFile(file, templateConfig(name, proj.appName), { force: false });
  ok(`Created config: ${file}`);
}

function listTargets(projectRoot) {
  const { targetsDir } = getSealPaths(projectRoot);
  let entries = [];
  try {
    entries = fs.readdirSync(targetsDir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((d) => d.isFile() && d.name.endsWith(".json5"))
    .map((d) => path.basename(d.name, ".json5"))
    .map((name) => loadTargetConfig(projectRoot, name))
    .filter(Boolean)
    .map((t) => {
      const cfgName = resolveConfigName(t.cfg, null);
      return { name: t.cfg.target || tNameFromFile(t.file), cfgName, cfg: t.cfg };
    });
}

function tNameFromFile(filePath) {
  return path.basename(filePath, ".json5");
}

function formatTargets(targets) {
  if (!targets.length) return "  (no targets found)";
  return targets
    .map((t) => {
      const kind = (t.cfg.kind || "local").toLowerCase();
      const host = kind === "ssh" ? (t.cfg.host || "?") : "local";
      return `  - ${t.name} (config: ${t.cfgName}, kind: ${kind}, host: ${host})`;
    })
    .join("\n");
}

function normalizeConfigArg(arg) {
  if (!arg) return null;
  const raw = String(arg).trim();
  if (!raw) return null;
  if (raw.includes("/") || raw.includes("\\")) {
    const base = path.basename(raw);
    return base.replace(/\.json5$/i, "");
  }
  if (raw.toLowerCase().endsWith(".json5")) return raw.replace(/\.json5$/i, "");
  return raw;
}

function resolveTargetAndConfig(projectRoot, targetNameOrConfig) {
  const proj = loadProjectConfig(projectRoot);
  if (!proj) throw new Error("Brak seal.json5 (projekt). Zrób: seal init");

  const targets = listTargets(projectRoot);
  const input = targetNameOrConfig ? String(targetNameOrConfig).trim() : "";

  if (!input) {
    const msg = [
      "Missing target name.",
      "Available targets:",
      formatTargets(targets),
      "Tip: seal config diff <target>",
    ].join("\n");
    throw new Error(msg);
  }

  // Prefer explicit target name if it exists.
  const direct = loadTargetConfig(projectRoot, input);
  if (direct) {
    direct.cfg.appName = direct.cfg.appName || proj.appName;
    direct.cfg.serviceName = direct.cfg.serviceName || proj.appName;
    const cfgName = resolveConfigName(direct.cfg, null);
    const localCfg = getConfigFile(projectRoot, cfgName);
    return { targetName: input, targetCfg: direct.cfg, cfgName, localCfg };
  }

  // Fallback: treat argument as config name or config path.
  const cfgNameGuess = normalizeConfigArg(input);
  const matches = targets.filter((t) => t.cfgName === cfgNameGuess);
  if (matches.length === 1) {
    const match = matches[0];
    const t = loadTargetConfig(projectRoot, match.name);
    if (!t) throw new Error(`Missing target: ${match.name} (create: seal target add ${match.name})`);
    t.cfg.appName = t.cfg.appName || proj.appName;
    t.cfg.serviceName = t.cfg.serviceName || proj.appName;
    const cfgName = resolveConfigName(t.cfg, null);
    const localCfg = getConfigFile(projectRoot, cfgName);
    return { targetName: match.name, targetCfg: t.cfg, cfgName, localCfg };
  }

  if (matches.length > 1) {
    const msg = [
      `Config "${cfgNameGuess}" is used by multiple targets.`,
      "Pick one:",
      formatTargets(matches),
    ].join("\n");
    throw new Error(msg);
  }

  const msg = [
    `Missing target: ${input}`,
    cfgNameGuess ? `Tried config "${cfgNameGuess}" but no target uses it.` : null,
    "Available targets:",
    formatTargets(targets),
  ].filter(Boolean).join("\n");
  throw new Error(msg);
}

function hasPath(obj, pathParts) {
  let cur = obj;
  for (const key of pathParts) {
    if (!cur || typeof cur !== "object" || Array.isArray(cur)) return false;
    if (!Object.prototype.hasOwnProperty.call(cur, key)) return false;
    cur = cur[key];
  }
  return true;
}

function readSentinelProfile(rawCfg) {
  if (!rawCfg || typeof rawCfg !== "object" || Array.isArray(rawCfg)) return null;
  if (rawCfg.sentinel && typeof rawCfg.sentinel === "object" && !Array.isArray(rawCfg.sentinel)) {
    if (Object.prototype.hasOwnProperty.call(rawCfg.sentinel, "profile")) {
      return rawCfg.sentinel.profile;
    }
  }
  if (rawCfg.build && typeof rawCfg.build === "object" && !Array.isArray(rawCfg.build)) {
    const buildSentinel = rawCfg.build.sentinel;
    if (buildSentinel && typeof buildSentinel === "object" && !Array.isArray(buildSentinel)) {
      if (Object.prototype.hasOwnProperty.call(buildSentinel, "profile")) {
        return buildSentinel.profile;
      }
    }
  }
  return null;
}

function resolveConsoleMode(raw) {
  if (raw === undefined || raw === null) {
    return { mode: "full", warning: null };
  }
  if (typeof raw === "boolean") {
    return { mode: raw ? "errors-only" : "full", warning: null };
  }
  const val = String(raw).toLowerCase();
  if (val === "1" || val === "true" || val === "yes" || val === "on") {
    return { mode: "errors-only", warning: null };
  }
  if (val === "0" || val === "false" || val === "no" || val === "off") {
    return { mode: "full", warning: null };
  }
  if (val === "full" || val === "all" || val === "debug") {
    return { mode: "full", warning: null };
  }
  if (val === "errors-only" || val === "errors" || val === "error" || val === "error-only") {
    return { mode: "errors-only", warning: null };
  }
  return { mode: "full", warning: `Unknown build.consoleMode "${raw}", using "full"` };
}

function sourceTag(source) {
  return source ? ` (${source})` : "";
}

function resolveExplainTarget(projectRoot, targetNameOrConfig) {
  if (targetNameOrConfig) {
    return resolveTargetAndConfig(projectRoot, targetNameOrConfig);
  }
  const proj = loadProjectConfig(projectRoot);
  if (!proj) throw new Error("Brak seal.json5 (projekt). Zrób: seal init");
  const targetName = resolveTargetName(projectRoot, null);
  const t = loadTargetConfig(projectRoot, targetName);
  if (!t) throw new Error(`Brak targetu ${targetName}. Zrób: seal target add ${targetName}`);
  t.cfg.appName = t.cfg.appName || proj.appName;
  t.cfg.serviceName = t.cfg.serviceName || proj.appName;
  const cfgName = resolveConfigName(t.cfg, null);
  const localCfg = getConfigFile(projectRoot, cfgName);
  return { targetName, targetCfg: t.cfg, cfgName, localCfg };
}

async function cmdConfigExplain(cwd, targetNameOrConfig) {
  const projectRoot = findProjectRoot(cwd);
  const paths = getSealPaths(projectRoot);
  const proj = loadProjectConfig(projectRoot);
  if (!proj) throw new Error("Brak seal.json5 (projekt). Zrób: seal init");

  const rawProj = fileExists(paths.sealFile) ? readJson5(paths.sealFile) : {};
  const { targetName, targetCfg, cfgName, localCfg } = resolveExplainTarget(projectRoot, targetNameOrConfig);
  const rawTarget = targetName
    ? readJson5(path.join(paths.targetsDir, `${targetName}.json5`))
    : {};

  const packagerRaw = targetCfg.packager || proj.build.packager || "auto";
  const packagerSpec = normalizePackager(packagerRaw);
  const thinCfgRaw = resolveThinConfig(targetCfg, proj);
  const protectionRaw = resolveProtectionConfig(proj);
  const thinCompat = applyThinCompatibility(packagerSpec.label, thinCfgRaw);
  const protectionCompat = applyProtectionCompatibility(packagerSpec.label, protectionRaw);
  const thinCfg = thinCompat.thinCfg;
  const protectionCfg = protectionCompat.protectionCfg;
  const allowBundleFallback = resolveBundleFallback(targetCfg, proj);
  const sentinelCfg = resolveSentinelConfig({
    projectRoot,
    projectCfg: proj,
    targetCfg,
    targetName: targetCfg.target || targetCfg.config || "default",
    packagerSpec,
  });

  const securityProfile = proj.build.securityProfile || null;
  const securitySource = hasPath(rawProj, ["build", "securityProfile"]) ? "project" : null;

  const obfProfile = proj.build.obfuscationProfile || "balanced";
  const obfSource = hasPath(rawProj, ["build", "obfuscationProfile"])
    ? "project"
    : (securityProfile ? "securityProfile" : "default");

  const consoleEnv = process.env.SEAL_CONSOLE_MODE;
  const consoleRaw = consoleEnv !== undefined
    ? consoleEnv
    : (proj.build.consoleMode !== undefined ? proj.build.consoleMode : proj.build.stripConsole);
  const consoleRes = resolveConsoleMode(consoleRaw);
  const consoleSource = consoleEnv !== undefined
    ? "env"
    : (hasPath(rawProj, ["build", "consoleMode"]) || hasPath(rawProj, ["build", "stripConsole"])
        ? "project"
        : "default");

  const packagerSource = hasPath(rawTarget, ["packager"])
    ? "target"
    : (hasPath(rawProj, ["build", "packager"]) ? "project" : "default");
  const packagerFallbackSource = hasPath(rawTarget, ["packagerFallback"])
    ? "target"
    : (hasPath(rawProj, ["build", "packagerFallback"]) ? "project" : "default");

  const frontendCfg = proj.build.frontendObfuscation;
  const frontendEnabled = frontendCfg === false ? false : !(typeof frontendCfg === "object" && frontendCfg && frontendCfg.enabled === false);
  const frontendProfile = (typeof frontendCfg === "object" && frontendCfg && frontendCfg.profile) ? frontendCfg.profile : obfProfile;
  const frontendProfileSource = (typeof frontendCfg === "object" && frontendCfg && frontendCfg.profile)
    ? "project"
    : obfSource;

  const rawTargetSentinelProfile = readSentinelProfile(rawTarget);
  const rawProjSentinelProfile = readSentinelProfile(rawProj);
  const sentinelProfileRaw = rawTargetSentinelProfile ?? rawProjSentinelProfile;
  const targetProfilePresent = rawTargetSentinelProfile !== null && rawTargetSentinelProfile !== undefined;
  const projProfilePresent = rawProjSentinelProfile !== null && rawProjSentinelProfile !== undefined;
  const sentinelProfileSource = targetProfilePresent
    ? "target"
    : (projProfilePresent ? "project" : null);
  const sentinelProfile = sentinelProfileRaw !== null && sentinelProfileRaw !== undefined
    ? String(sentinelProfileRaw)
    : null;

  info("Config explain");
  console.log(`  project: ${projectRoot}`);
  console.log(`  seal.json5: ${paths.sealFile}`);
  console.log(`  target: ${targetName} (kind=${(targetCfg.kind || "local")})`);
  console.log(`  config: ${cfgName} (${fileExists(localCfg) ? "ok" : "missing"})`);
  console.log("");

  console.log("Profiles:");
  console.log(`  securityProfile: ${securityProfile || "none"}${sourceTag(securitySource)}`);
  console.log(`  obfuscationProfile: ${obfProfile}${sourceTag(obfSource)}`);
  console.log(`  frontendObfuscation: ${frontendEnabled ? "enabled" : "disabled"} (profile=${frontendProfile}${sourceTag(frontendProfileSource)})`);
  console.log(`  sentinelProfile: ${sentinelProfile || "none"}${sourceTag(sentinelProfileSource)}`);
  if (consoleRes.warning) warn(consoleRes.warning);
  console.log(`  consoleMode: ${consoleRes.mode}${sourceTag(consoleSource)}`);
  console.log("");

  console.log("Packager:");
  console.log(`  packager: ${packagerSpec.label}${sourceTag(packagerSource)}`);
  console.log(`  packagerFallback: ${allowBundleFallback}${sourceTag(packagerFallbackSource)}`);
  console.log("");

  console.log("Thin:");
  console.log(`  mode: ${thinCfg.mode}`);
  console.log(`  level: ${thinCfg.level}`);
  console.log(`  envMode: ${thinCfg.envMode || "auto"}`);
  console.log(`  runtimeStore: ${thinCfg.runtimeStore || "auto"}`);
  console.log(`  snapshotGuard: ${thinCfg.snapshotGuard.enabled ? "enabled" : "disabled"}`);
  const integrityLabel = thinCfg.integrity.enabled
    ? `enabled (${thinCfg.integrity.mode})`
    : (thinCompat.disabled.integrity ? "disabled (auto)" : "disabled");
  console.log(`  integrity: ${integrityLabel}`);
  const nativeBootstrapLabel = thinCfg.nativeBootstrap.enabled
    ? "enabled"
    : (thinCompat.disabled.nativeBootstrap ? "disabled (auto)" : "disabled");
  console.log(`  nativeBootstrap: ${nativeBootstrapLabel}`);
  console.log(`  antiDebug: ${thinCfg.antiDebug.enabled ? "enabled" : "disabled"}`);
  if (thinCfg.antiDebug.enabled) {
    console.log(`    mapsDenylist: ${thinCfg.antiDebug.mapsDenylist.length ? thinCfg.antiDebug.mapsDenylist.join(", ") : "none"}`);
    console.log(`    seccomp: ${thinCfg.antiDebug.seccompNoDebug.enabled ? thinCfg.antiDebug.seccompNoDebug.mode : "disabled"}${thinCfg.antiDebug.seccompNoDebug.aggressive ? " (aggressive)" : ""}`);
  }
  console.log("");

  console.log("Protection:");
  const stripLabel = protectionCfg.stripSymbols
    ? "enabled"
    : (protectionCompat.disabled.strip ? "disabled (auto)" : "disabled");
  const elfPackerLabel = protectionCfg.elfPacker
    ? protectionCfg.elfPacker
    : (protectionCompat.disabled.elfPacker ? "disabled (auto)" : "disabled");
  console.log(`  strip: ${stripLabel}`);
  console.log(`  elfPacker: ${elfPackerLabel}`);
  console.log(`  cObfuscator: ${protectionCfg.cObfuscator || "disabled"}`);
  console.log("");

  console.log("Sentinel:");
  const sentinelLabel = sentinelCfg.enabled
    ? "true"
    : (sentinelCfg && sentinelCfg.compat && sentinelCfg.compat.disabled && sentinelCfg.compat.disabled.packager
        ? "false (auto)"
        : "false");
  console.log(`  enabled: ${sentinelLabel}`);
  if (sentinelCfg.enabled) {
    console.log(`  level: ${sentinelCfg.level}`);
    const timeLimit = sentinelCfg.timeLimit || { mode: "off", enforce: "always" };
    const enforce = timeLimit.enforce || "always";
    console.log(`  timeLimit: ${timeLimit.mode} (${enforce})`);
  }
  console.log("");

  const notes = [...thinCompat.notes, ...protectionCompat.notes];
  if (sentinelCfg && sentinelCfg.compat && Array.isArray(sentinelCfg.compat.notes)) {
    notes.push(...sentinelCfg.compat.notes);
  }
  if (thinCfg.integrity.enabled && thinCfg.integrity.mode === "inline" && protectionCfg.elfPacker) {
    notes.push("thin.integrity inline is incompatible with elfPacker (use sidecar)");
  }
  if (notes.length) {
    console.log("Notes:");
    for (const n of notes) console.log(`  - ${n}`);
  }
}

async function cmdConfigDiff(cwd, targetNameOrConfig) {
  const projectRoot = findProjectRoot(cwd);
  const { targetCfg, localCfg } = resolveTargetAndConfig(projectRoot, targetNameOrConfig);
  if (!fileExists(localCfg)) throw new Error(`Missing repo config: ${localCfg}`);

  if ((targetCfg.kind || "").toLowerCase() !== "ssh") {
    warn("config diff is only meaningful for SSH targets in this v0.6 baseline.");
    return;
  }
  configDiffSsh({ targetCfg, localConfigPath: localCfg });
}

async function cmdConfigPull(cwd, targetNameOrConfig, opts) {
  const projectRoot = findProjectRoot(cwd);
  const { targetCfg, localCfg } = resolveTargetAndConfig(projectRoot, targetNameOrConfig);
  if ((targetCfg.kind || "").toLowerCase() !== "ssh") {
    warn("config pull is only meaningful for SSH targets in this v0.6 baseline.");
    return;
  }
  configPullSsh({ targetCfg, localConfigPath: localCfg, apply: !!opts.apply });
}

async function cmdConfigPush(cwd, targetNameOrConfig) {
  const projectRoot = findProjectRoot(cwd);
  const { targetCfg, localCfg } = resolveTargetAndConfig(projectRoot, targetNameOrConfig);
  if (!fileExists(localCfg)) throw new Error(`Missing repo config: ${localCfg}`);

  if ((targetCfg.kind || "").toLowerCase() !== "ssh") {
    warn("config push is only meaningful for SSH targets in this v0.6 baseline.");
    return;
  }
  configPushSsh({ targetCfg, localConfigPath: localCfg });
}

module.exports = { cmdConfigAdd, cmdConfigDiff, cmdConfigPull, cmdConfigPush, cmdConfigExplain };

"use strict";

const fs = require("fs");
const path = require("path");

const { ensureDir, copyDir, rmrf, fileExists } = require("./fsextra");
const { getSealPaths } = require("./project");
const { normalizePackager, resolveThinConfig, resolveProtectionConfig, applyThinCompatibility, applyProtectionCompatibility } = require("./packagerConfig");
const { resolveSentinelConfig } = require("./sentinelConfig");

function getRunDir(projectRoot) {
  const { outDir } = getSealPaths(projectRoot);
  return path.join(outDir, "run");
}

function getRunFailedDir(projectRoot) {
  const { outDir } = getSealPaths(projectRoot);
  return path.join(outDir, "run.last_failed");
}

function snapshotRunOnFailure(projectRoot) {
  const runDir = getRunDir(projectRoot);
  if (!fileExists(runDir)) return;
  const failedDir = getRunFailedDir(projectRoot);
  rmrf(failedDir);
  copyDir(runDir, failedDir);
}

function summarizePayloadProtection(payloadProtection) {
  if (!payloadProtection || payloadProtection.enabled === false) return { enabled: false };
  const summary = { enabled: true, provider: payloadProtection.provider || null };
  if (payloadProtection.provider === "secret" && payloadProtection.secret) {
    summary.secret = {
      path: payloadProtection.secret.path || null,
      maxBytes: payloadProtection.secret.maxBytes || null,
    };
  }
  if (payloadProtection.provider === "tpm2" && payloadProtection.tpm2) {
    summary.tpm2 = {
      bank: payloadProtection.tpm2.bank || null,
      pcrs: payloadProtection.tpm2.pcrs || null,
    };
  }
  if (payloadProtection.bind) {
    summary.bind = {
      iface: payloadProtection.bind.iface || null,
      mac: payloadProtection.bind.mac || null,
      ip: payloadProtection.bind.ip || null,
    };
  }
  return summary;
}

function summarizeThin(thinCfg) {
  if (!thinCfg) return null;
  return {
    mode: thinCfg.mode || null,
    level: thinCfg.level || null,
    envMode: thinCfg.envMode || null,
    runtimeStore: thinCfg.runtimeStore || null,
    antiDebug: thinCfg.antiDebug || null,
    integrity: thinCfg.integrity || null,
    nativeBootstrap: thinCfg.nativeBootstrap || null,
    payloadProtection: summarizePayloadProtection(thinCfg.payloadProtection),
    snapshotGuard: thinCfg.snapshotGuard || null,
    appBind: thinCfg.appBind || null,
  };
}

function summarizeProtection(protectionCfg) {
  if (!protectionCfg) return null;
  return {
    enabled: protectionCfg.enabled !== false,
    seaMain: {
      pack: protectionCfg.packSeaMain !== false,
      method: protectionCfg.packSeaMainMethod || null,
      chunkSize: protectionCfg.packSeaMainChunkSize || null,
    },
    bundle: {
      pack: protectionCfg.packBundle !== false,
    },
    strip: {
      enabled: !!protectionCfg.stripSymbols,
      tool: protectionCfg.stripTool || null,
      args: protectionCfg.stripArgs || null,
    },
    elfPacker: protectionCfg.elfPacker
      ? { tool: protectionCfg.elfPacker, cmd: protectionCfg.elfPackerCmd || null, args: protectionCfg.elfPackerArgs || null }
      : { enabled: false },
    cObfuscator: protectionCfg.cObfuscator
      ? { tool: protectionCfg.cObfuscator, cmd: protectionCfg.cObfuscatorCmd || null, args: protectionCfg.cObfuscatorArgs || null }
      : null,
    strings: protectionCfg.stringObfuscation ? { obfuscation: protectionCfg.stringObfuscation } : null,
  };
}

function summarizeSentinel(sentinelCfg) {
  if (!sentinelCfg) return null;
  const out = {
    enabled: !!sentinelCfg.enabled,
    profile: sentinelCfg.profile || null,
    level: sentinelCfg.level || null,
    exitCodeBlock: sentinelCfg.exitCodeBlock || null,
  };
  if (sentinelCfg.externalAnchor) out.externalAnchor = sentinelCfg.externalAnchor;
  if (sentinelCfg.timeLimit) out.timeLimit = sentinelCfg.timeLimit;
  return out;
}

function buildSteps(action, targetName) {
  const target = targetName || "<target>";
  const steps = [];
  const wantsRelease = action === "plan" || action === "release" || action === "ship";
  const wantsShip = action === "plan" || action === "ship";
  if (wantsRelease) {
    steps.push({ id: "CHECK", cmd: `seal check ${target}` });
    steps.push({ id: "RELEASE", cmd: `seal release ${target}` });
  }
  if (action === "deploy") {
    steps.push({ id: "DEPLOY", cmd: `seal deploy ${target}` });
  }
  if (wantsShip) {
    steps.push({ id: "SHIP", cmd: `seal ship ${target}` });
  }
  return steps;
}

function buildDecisions({ packagerSpec, projectCfg, sentinelCfg }) {
  const decisions = [];
  const packagerAlternatives = ["thin-split", "sea", "bundle", "none"];
  const packagerReason = packagerSpec.auto ? "auto -> thin-split" : "explicit config";
  decisions.push({
    id: "PACKAGER",
    chosen: packagerSpec.label,
    alternatives: packagerAlternatives,
    reason: packagerReason,
  });

  const secProfile = projectCfg?.build?.securityProfile || "strict";
  decisions.push({
    id: "SECURITY_PROFILE",
    chosen: secProfile,
    alternatives: ["minimal", "balanced", "strict", "max"],
    reason: "project default",
  });

  const sent = sentinelCfg && sentinelCfg.enabled ? "enabled" : "disabled";
  decisions.push({
    id: "SENTINEL",
    chosen: sent,
    alternatives: ["enabled", "disabled"],
    reason: sentinelCfg && sentinelCfg.notes ? String(sentinelCfg.notes) : "profile/compat",
  });

  return decisions;
}

function buildPlan({
  projectRoot,
  projectCfg,
  targetCfg,
  targetName,
  configName,
  packagerOverride,
  action,
  buildResult,
  artifactPath,
}) {
  const packagerSpec = normalizePackager(packagerOverride || targetCfg.packager || projectCfg.build.packager || "auto");
  const thinRaw = resolveThinConfig(targetCfg, projectCfg);
  const thinCompat = applyThinCompatibility(packagerSpec.label, thinRaw);
  const protectionRaw = resolveProtectionConfig(projectCfg);
  const protectionCompat = applyProtectionCompatibility(packagerSpec.label, protectionRaw);
  const sentinelCfg = resolveSentinelConfig({
    projectRoot,
    projectCfg,
    targetCfg,
    targetName,
    packagerSpec,
  });

  const compatNotes = []
    .concat(thinCompat.notes || [])
    .concat(protectionCompat.notes || [])
    .concat((sentinelCfg && sentinelCfg.compat && sentinelCfg.compat.notes) ? sentinelCfg.compat.notes : []);

  const appName = projectCfg.appName;
  const entry = projectCfg.entry;
  const includeDirs = Array.isArray(projectCfg.build && projectCfg.build.includeDirs)
    ? projectCfg.build.includeDirs
    : ["public", "data"];
  const uiDir = includeDirs.includes("public") ? "public" : null;

  const plan = {
    version: 1,
    createdAt: new Date().toISOString(),
    action: action || "plan",
    target: targetName || null,
    appName,
    entry,
    config: configName || null,
    securityProfile: projectCfg.build.securityProfile || "strict",
    obfuscationProfile: projectCfg.build.obfuscationProfile || "balanced",
    inputs: {
      projectRoot: ".",
      entry,
      uiDir,
      includeDirs,
    },
    resolvedConfig: {
      packager: packagerSpec.label,
      thin: summarizeThin(thinCompat.thinCfg),
      protection: summarizeProtection(protectionCompat.protectionCfg),
      frontendObfuscation: projectCfg.build.frontendObfuscation,
      frontendMinify: projectCfg.build.frontendMinify,
      sentinel: summarizeSentinel(sentinelCfg),
    },
    decisions: buildDecisions({ packagerSpec, projectCfg, sentinelCfg }),
    steps: buildSteps(action || "plan", targetName),
    expectedArtifacts: {
      runDir: "seal-out/run",
      artifact: artifactPath || (appName ? `seal-out/${appName}-<buildId>.tgz` : null),
    },
    compatNotes: compatNotes.length ? compatNotes : null,
    build: buildResult
      ? {
        buildId: buildResult.buildId || null,
        artifactPath: buildResult.artifactPath || null,
        releaseDir: buildResult.releaseDir || null,
        payloadOnly: !!buildResult.payloadOnly,
      }
      : null,
  };

  return plan;
}

function renderPlanMarkdown(plan) {
  const lines = [];
  lines.push("# SEAL plan");
  lines.push("");
  lines.push(`action: ${plan.action || "plan"}`);
  lines.push(`target: ${plan.target || "-"}`);
  lines.push(`app: ${plan.appName || "-"}`);
  lines.push(`entry: ${plan.entry || "-"}`);
  lines.push(`config: ${plan.config || "-"}`);
  lines.push(`packager: ${plan.resolvedConfig && plan.resolvedConfig.packager ? plan.resolvedConfig.packager : "-"}`);
  lines.push(`securityProfile: ${plan.securityProfile || "-"}`);
  lines.push(`obfuscationProfile: ${plan.obfuscationProfile || "-"}`);
  if (plan.build && plan.build.artifactPath) {
    lines.push(`artifact: ${plan.build.artifactPath}`);
  } else if (plan.expectedArtifacts && plan.expectedArtifacts.artifact) {
    lines.push(`artifact: ${plan.expectedArtifacts.artifact}`);
  }
  lines.push("");
  lines.push("steps:");
  for (const step of plan.steps || []) {
    lines.push(`- ${step.id}: ${step.cmd}`);
  }
  if (plan.compatNotes && plan.compatNotes.length) {
    lines.push("");
    lines.push("compatNotes:");
    for (const note of plan.compatNotes) {
      lines.push(`- ${note}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

function writePlanArtifacts(projectRoot, plan) {
  const outDir = getRunDir(projectRoot);
  ensureDir(outDir);
  const jsonPath = path.join(outDir, "plan.json");
  const mdPath = path.join(outDir, "plan.md");
  fs.writeFileSync(jsonPath, JSON.stringify(plan, null, 2) + "\n", "utf-8");
  fs.writeFileSync(mdPath, renderPlanMarkdown(plan), "utf-8");
  return { jsonPath, mdPath };
}

module.exports = { buildPlan, writePlanArtifacts, snapshotRunOnFailure };

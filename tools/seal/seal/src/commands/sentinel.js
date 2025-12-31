"use strict";

const path = require("path");

const { findProjectRoot } = require("../lib/paths");
const { loadProjectConfig, loadTargetConfig, resolveTargetName } = require("../lib/project");
const { resolveThinConfig, normalizePackager } = require("../lib/packagerConfig");
const { resolveSentinelConfig, resolveAutoLevel } = require("../lib/sentinelConfig");
const { probeSentinelSsh, inspectSentinelSsh, installSentinelSsh, verifySentinelSsh, uninstallSentinelSsh } = require("../lib/sentinelOps");
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
  const packagerSpec = normalizePackager(targetCfg.packager || proj.build.packager || "auto");
  const sentinelCfg = resolveSentinelConfig({
    projectRoot,
    projectCfg: proj,
    targetCfg,
    targetName,
    packagerSpec,
  });

  return { projectRoot, proj, targetName, targetCfg, sentinelCfg };
}

function resolveBaseDirLoose(proj, targetCfg) {
  const projSentinel = (proj && proj.build && proj.build.sentinel) ? proj.build.sentinel : {};
  const targetSentinel = targetCfg && (targetCfg.sentinel || (targetCfg.build && targetCfg.build.sentinel))
    ? (targetCfg.sentinel || targetCfg.build.sentinel)
    : {};
  return (targetSentinel.storage && targetSentinel.storage.baseDir)
    || (projSentinel.storage && projSentinel.storage.baseDir)
    || "/var/lib";
}

function resolveInspectContext(cwd, targetArg) {
  const projectRoot = findProjectRoot(cwd);
  const proj = loadProjectConfig(projectRoot);
  if (!proj) throw new Error("Brak seal.json5 (projekt). Zrób: seal init");

  const targetName = resolveTargetName(projectRoot, targetArg);
  const t = loadTargetConfig(projectRoot, targetName);
  if (!t) throw new Error(`Brak targetu ${targetName}. Zrób: seal target add ${targetName}`);

  const targetCfg = t.cfg;
  targetCfg.appName = proj.appName;
  targetCfg.serviceName = targetCfg.serviceName || proj.appName;

  let sentinelCfg = null;
  let sentinelCfgError = null;
  try {
    const thinCfg = resolveThinConfig(targetCfg, proj);
    const packagerSpec = normalizePackager(targetCfg.packager || proj.build.packager || "auto");
    sentinelCfg = resolveSentinelConfig({
      projectRoot,
      projectCfg: proj,
      targetCfg,
      targetName,
      packagerSpec,
    });
  } catch (err) {
    sentinelCfgError = err;
  }

  if (!sentinelCfg) {
    const baseDir = resolveBaseDirLoose(proj, targetCfg);
    if (path.isAbsolute(baseDir) && !/\s/.test(baseDir)) {
      sentinelCfg = { enabled: false, storage: { baseDir } };
    }
  }
  if (sentinelCfg && !sentinelCfg.storage) {
    const baseDir = resolveBaseDirLoose(proj, targetCfg);
    if (path.isAbsolute(baseDir) && !/\s/.test(baseDir)) {
      sentinelCfg.storage = { baseDir };
    }
  }

  return { projectRoot, proj, targetName, targetCfg, sentinelCfg, sentinelCfgError };
}

function ensureSsh(ctx) {
  if ((ctx.targetCfg.kind || "local").toLowerCase() !== "ssh") {
    warn("Sentinel commands are supported only for SSH targets in MVP.");
    return false;
  }
  return true;
}

function ensureEnabled(ctx) {
  if (!ensureSsh(ctx)) return false;
  if (!ctx.sentinelCfg.enabled) {
    warn("Sentinel disabled (build.sentinel.enabled=false or auto disabled).");
    return false;
  }
  return true;
}

function formatList(label, items, formatter) {
  if (!items || !items.length) {
    console.log(`${label}: (none)`);
    return;
  }
  console.log(`${label}:`);
  items.forEach((item) => console.log(`  - ${formatter(item)}`));
}

function pickMountpoint(items) {
  for (const item of items || []) {
    const mp = item.mountpoint || "";
    if (!mp) continue;
    if (mp === "/" || mp === "/boot") continue;
    return mp;
  }
  return "";
}

function safeJson(value) {
  return JSON.stringify(value, (key, val) => (typeof val === "bigint" ? val.toString() : val), 2);
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
    skipVerify: !!opts.skipVerify,
  });
  const level = res.level;
  ok(`Sentinel installed (level=${level})`);
}

async function cmdSentinelVerify(cwd, targetArg, opts) {
  const ctx = resolveContext(cwd, targetArg);
  if (!ensureEnabled(ctx)) return;

  const res = verifySentinelSsh({ targetCfg: ctx.targetCfg, sentinelCfg: ctx.sentinelCfg });
  if (opts.json) {
    process.stdout.write(safeJson(res) + "\n");
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

async function cmdSentinelInspect(cwd, targetArg, opts) {
  const ctx = resolveInspectContext(cwd, targetArg);
  if (!ensureSsh(ctx)) return;

  hr();
  info(`Sentinel inspect -> ${ctx.targetName} (${ctx.targetCfg.kind})`);
  if (ctx.sentinelCfgError) {
    warn(`Sentinel config warning: ${ctx.sentinelCfgError.message || ctx.sentinelCfgError}`);
  }
  const res = inspectSentinelSsh({ targetCfg: ctx.targetCfg, sentinelCfg: ctx.sentinelCfg });

  if (opts.json) {
    process.stdout.write(safeJson(res) + "\n");
    return;
  }

  const host = res.host || {};
  const cpuId = (res.options && res.options.cpuId) || {};
  console.log("Host:");
  console.log(`  mid: ${host.mid || "(missing)"}`);
  console.log(`  rid: ${host.rid || "(missing)"}`);
  console.log(`  fstype: ${host.fstype || "(unknown)"}`);
  console.log(`  puid: ${host.puid || "(missing)"}`);
  console.log(`  cpuId.proc: ${cpuId.proc ? "yes" : "no"}`);
  if (cpuId.asm) {
    const asmMsg = cpuId.asm.available ? "yes" : (cpuId.asm.unsupported ? "unsupported" : "no");
    console.log(`  cpuId.asm: ${asmMsg}${cpuId.asm.error ? ` (${cpuId.asm.error})` : ""}`);
  }

  if (res.base) {
    const base = res.base;
    console.log("Storage:");
    console.log(`  baseDir: ${ctx.sentinelCfg.storage.baseDir}`);
    console.log(`  exists: ${base.exists ? "yes" : "no"}`);
    console.log(`  symlink: ${base.isSymlink ? "yes" : "no"}`);
    console.log(`  uid: ${base.uid !== null ? base.uid : "?"}`);
    console.log(`  gid: ${base.gid !== null ? base.gid : "?"}`);
    console.log(`  mode: ${base.mode || "?"}`);
    console.log(`  execOk: ${base.execOk ? "yes" : "no"}`);
  }

  const optsList = res.options || {};
  formatList("USB devices (sysfs)", optsList.usbDevices, (d) => {
    const bits = [`vid=${d.vid}`, `pid=${d.pid}`];
    if (d.serial) bits.push(`serial=${d.serial}`);
    if (d.product) bits.push(`product=${d.product}`);
    if (d.manufacturer) bits.push(`vendor=${d.manufacturer}`);
    if (d.usbClass) bits.push(`class=${d.usbClass}`);
    return bits.join(" ");
  });

  formatList("USB mounts", optsList.usbMounts, (m) => {
    const bits = [];
    if (m.mountpoint) bits.push(m.mountpoint);
    if (m.name) bits.push(`dev=${m.name}`);
    if (m.tran) bits.push(`tran=${m.tran}`);
    if (m.rm) bits.push(`rm=${m.rm}`);
    return bits.join(" ");
  });

  formatList("Host-shared mounts", optsList.hostShares, (m) => {
    const bits = [];
    if (m.mountpoint) bits.push(m.mountpoint);
    if (m.fstype) bits.push(`fstype=${m.fstype}`);
    if (m.device) bits.push(`dev=${m.device}`);
    return bits.join(" ");
  });

  const tpmInfo = optsList.tpm || {};
  const tpmLabel = tpmInfo.present ? (tpmInfo.tools ? "present" : "present (tools missing)") : "not found";
  console.log(`TPM2: ${tpmLabel}`);

  if (optsList.xattr) {
    const xattrLabel = optsList.xattr.ok ? "ok" : "not supported";
    const xattrErr = optsList.xattr.error ? ` (${optsList.xattr.error})` : "";
    const xattrPath = optsList.xattr.path ? ` on ${optsList.xattr.path}` : "";
    const xattrNote = optsList.xattr.note ? ` (${optsList.xattr.note})` : "";
    const xattrSudo = optsList.xattr.sudo ? " via sudo" : "";
    console.log(`XATTR: ${xattrLabel}${xattrErr}${xattrPath}${xattrSudo}${xattrNote}`);
  }

  const ext = optsList.externalAnchor || {};
  if (ext.configured) {
    console.log(`External anchor (configured): ${ext.type}`);
    if (ext.type === "usb" && ext.usb) {
      const match = ext.usb.ok ? "match" : "no match";
      console.log(`  usb: ${match} (vid=${ext.usb.vid || "?"} pid=${ext.usb.pid || "?"}${ext.usb.serial ? ` serial=${ext.usb.serial}` : ""})`);
    } else if (ext.type === "file" && ext.file) {
      const file = ext.file;
      const read = file.readable ? "readable" : "not readable";
      const exists = file.exists ? "exists" : "missing";
      const mount = file.mount;
      const mountInfo = mount && mount.mountpoint
        ? ` mount=${mount.mountpoint}${mount.fstype ? ` fstype=${mount.fstype}` : ""}${mount.hostShare ? " hostShare" : ""}${mount.usb ? " usb" : ""}`
        : "";
      console.log(`  file: ${exists}, ${read}${file.readableViaSudo ? " (via sudo)" : ""}${mountInfo}`);
    } else if (ext.type === "lease" && ext.lease) {
      const lease = ext.lease;
      const status = lease.ok ? (lease.status || "ok") : (lease.error || "unreachable");
      const body = lease.bodyBytes ? ` body=${lease.bodyBytes}${lease.bodyTruncated ? "+" : ""}` : "";
      const hash = lease.bodySha256 ? ` sha256=${lease.bodySha256.slice(0, 12)}…` : "";
      const scheme = lease.url && lease.url.startsWith("https://") ? "" : " (non-https)";
      console.log(`  lease: ${status}${lease.tool ? ` (tool=${lease.tool})` : ""}${body}${hash}`);
      if (scheme) {
        console.log(`  lease: warning${scheme} URL`);
      }
    } else if (ext.type === "tpm2" && ext.tpm2) {
      const tpmOk = ext.tpm2.present ? (ext.tpm2.tools ? "ok" : "present (tools missing)") : "not found";
      console.log(`  tpm2: ${tpmOk}`);
    }
  }

  if (optsList.notes && optsList.notes.length) {
    console.log("Notes:");
    optsList.notes.forEach((n) => console.log(`  - ${n}`));
  }

  console.log("Recommendations:");
  const usbDevices = optsList.usbDevices || [];
  if (!usbDevices.length) {
    console.log("  - USB anchor not detected; attach USB passthrough to enable externalAnchor.usb.");
  } else if (usbDevices.length === 1) {
    const d = usbDevices[0];
    const serialLine = d.serial ? `, serial: "${d.serial}"` : "";
    console.log("  - Use externalAnchor.usb (L4):");
    console.log(`    externalAnchor: { type: "usb", usb: { vid: "${d.vid}", pid: "${d.pid}"${serialLine} } }`);
  } else {
    console.log("  - Multiple USB devices detected. Pick one from the list above:");
    console.log('    externalAnchor: { type: "usb", usb: { vid: "<vid>", pid: "<pid>", serial: "<serial>" } }');
  }

  const usbMp = pickMountpoint(optsList.usbMounts || []);
  const hostMp = pickMountpoint(optsList.hostShares || []);
  if (usbMp || hostMp) {
    const mp = usbMp || hostMp || "/mnt/anchor";
    console.log("  - Use externalAnchor.file on a host/USB mount (L4):");
    console.log(`    externalAnchor: { type: "file", file: { path: "${mp}/.k" } }`);
  } else {
    console.log("  - File anchor not detected; mount host/USB folder to use externalAnchor.file.");
  }

  if (tpmInfo.present) {
    const tpmNote = tpmInfo.tools ? "" : " (tools missing)";
    console.log(`  - TPM2 available${tpmNote}: externalAnchor: { type: "tpm2" }`);
  }

  ok("Inspect done.");
}

module.exports = {
  cmdSentinelProbe,
  cmdSentinelInspect,
  cmdSentinelInstall,
  cmdSentinelVerify,
  cmdSentinelUninstall,
};

"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

const { spawnSyncSafe } = require("./spawn");
const { ensureDir, fileExists, rmrf, copyFile, copyDir } = require("./fsextra");
const { info, warn, err, ok, hr } = require("./ui");
const { normalizeRetention, filterReleaseNames, computeKeepSet } = require("./retention");

function expandHome(p) {
  if (!p) return p;
  if (p.startsWith("~/")) return path.join(os.homedir(), p.slice(2));
  return p;
}

function copyAtomic(src, dest, mode) {
  const dir = path.dirname(dest);
  ensureDir(dir);
  const tmp = path.join(dir, `.tmp-${path.basename(dest)}-${Date.now()}`);
  copyFile(src, tmp);
  if (mode) fs.chmodSync(tmp, mode);
  fs.renameSync(tmp, dest);
}

const CODEC_BIN_MAGIC = "SLCB";
const CODEC_BIN_VERSION = 1;
const CODEC_BIN_HASH_LEN = 32;
const CODEC_BIN_LEN = 4 + 1 + 1 + 2 + CODEC_BIN_HASH_LEN;

function readCodecHashFromBin(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < CODEC_BIN_LEN) return null;
  if (buf.slice(0, 4).toString("ascii") !== CODEC_BIN_MAGIC) return null;
  if (buf[4] !== CODEC_BIN_VERSION) return null;
  if (buf[5] !== CODEC_BIN_HASH_LEN) return null;
  const hash = buf.slice(8, 8 + CODEC_BIN_HASH_LEN);
  return hash.toString("hex");
}

function readThinCodecHash(dirPath) {
  if (!dirPath) return null;
  const candidates = [
    path.join(dirPath, "r", "c"),
    path.join(dirPath, "c"),
  ];
  for (const p of candidates) {
    if (!fileExists(p)) continue;
    try {
      const buf = fs.readFileSync(p);
      const hash = readCodecHashFromBin(buf);
      if (hash) return hash;
    } catch {
      return null;
    }
  }
  return null;
}

function assertSafeInstallDir(installDir) {
  if (process.env.SEAL_ALLOW_UNSAFE_RM === "1") return;
  const resolved = path.resolve(installDir || "");
  const banned = new Set([
    "/",
    "/root",
    "/home",
    "/opt",
    "/usr",
    "/var",
    "/etc",
    "/bin",
    "/sbin",
    "/lib",
    "/lib64",
    "/tmp",
    "/boot",
    "/dev",
    "/proc",
    "/sys",
    "/run",
  ]);
  const parts = resolved.split(path.sep).filter(Boolean);
  if (!path.isAbsolute(resolved) || banned.has(resolved) || parts.length < 3) {
    throw new Error(`Refusing to remove installDir: ${installDir}. Set SEAL_ALLOW_UNSAFE_RM=1 to override.`);
  }
}

function systemctlArgs(targetCfg) {
  const scope = (targetCfg.serviceScope || "user").toLowerCase();
  if (scope === "user") return ["systemctl", "--user"];
  // system scope requires sudo
  return ["sudo", "systemctl"];
}

function journalctlArgs(targetCfg) {
  const scope = (targetCfg.serviceScope || "user").toLowerCase();
  if (scope === "user") return ["journalctl", "--user-unit"];
  return ["journalctl", "-u"];
}

function serviceFilePath(targetCfg) {
  const scope = (targetCfg.serviceScope || "user").toLowerCase();
  const name = targetCfg.serviceName || targetCfg.appName || "app";
  if (scope === "user") {
    return path.join(os.homedir(), ".config", "systemd", "user", `${name}.service`);
  }
  return `/etc/systemd/system/${name}.service`;
}

function localInstallLayout(targetCfg) {
  const installDir = expandHome(targetCfg.installDir || path.join(os.tmpdir(), "seal-sandbox", targetCfg.appName || "app"));
  const releasesDir = path.join(installDir, "releases");
  const sharedDir = path.join(installDir, "shared");
  const currentFile = path.join(installDir, "current.buildId");
  const runner = path.join(installDir, "run-current.sh");
  return { installDir, releasesDir, sharedDir, currentFile, runner };
}

function localServiceUserGroup(targetCfg) {
  const scope = (targetCfg.serviceScope || "user").toLowerCase();
  if (scope !== "system") return { user: null, group: null };

  let user = targetCfg.serviceUser || null;
  let group = targetCfg.serviceGroup || null;

  if (user && /\s/.test(user)) {
    throw new Error(`Invalid serviceUser: ${user} (whitespace not allowed)`);
  }
  if (group && /\s/.test(group)) {
    throw new Error(`Invalid serviceGroup: ${group} (whitespace not allowed)`);
  }

  if (!user) {
    try { user = os.userInfo().username; } catch { user = null; }
  }
  if (user && /\s/.test(user)) {
    throw new Error(`Invalid serviceUser: ${user} (whitespace not allowed)`);
  }
  if (!group && user) group = user;
  if (group && /\s/.test(group)) {
    throw new Error(`Invalid serviceGroup: ${group} (whitespace not allowed)`);
  }

  return { user, group };
}

function writeRunnerScript(layout, targetCfg) {
  const script = `#!/usr/bin/env bash
set -euo pipefail
ROOT="${layout.installDir}"
if [ -x "$ROOT/b/a" ]; then
  # Thin BOOTSTRAP layout
  if [ -f "$ROOT/shared/config.json5" ]; then
    cp "$ROOT/shared/config.json5" "$ROOT/config.runtime.json5"
  fi
  cd "$ROOT"
  exec "$ROOT/b/a"
fi
BUILD_ID="$(cat "$ROOT/current.buildId")"
REL="$ROOT/releases/$BUILD_ID"
if [ ! -d "$REL" ]; then
  echo "[seal] release dir not found: $REL" 1>&2
  exit 2
fi

# runtime config: shared -> release
if [ -f "$ROOT/shared/config.json5" ]; then
  cp "$ROOT/shared/config.json5" "$REL/config.runtime.json5"
fi

cd "$REL"
exec "$REL/appctl" run
`;
  fs.writeFileSync(layout.runner, script, "utf-8");
  fs.chmodSync(layout.runner, 0o755);
}

function writeServiceFile(targetCfg, layout) {
  const name = targetCfg.serviceName || targetCfg.appName || "app";
  const scope = (targetCfg.serviceScope || "user").toLowerCase();
  const { user: serviceUser, group: serviceGroup } = localServiceUserGroup(targetCfg);
  const userGroupLines = (scope === "system" && (serviceUser || serviceGroup))
    ? [serviceUser ? `User=${serviceUser}` : null, serviceGroup ? `Group=${serviceGroup}` : null].filter(Boolean).join("\n") + "\n"
    : "";
  const unit = `[Unit]
Description=SEAL app ${name}
After=network.target

[Service]
Type=simple
${userGroupLines}WorkingDirectory=${layout.installDir}
ExecStart=${layout.runner}
Restart=always
RestartSec=1

# Keep logs in journald
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=default.target
`;

  const p = serviceFilePath({ ...targetCfg, serviceName: name });
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, unit, "utf-8");
  return p;
}

function bootstrapLocal(targetCfg) {
  const layout = localInstallLayout(targetCfg);
  ensureDir(layout.installDir);
  ensureDir(layout.releasesDir);
  ensureDir(layout.sharedDir);
  ensureDir(path.join(layout.installDir, "b"));
  ensureDir(path.join(layout.installDir, "r"));

  writeRunnerScript(layout, targetCfg);
  const svcPath = writeServiceFile(targetCfg, layout);

  // reload systemd (install only)
  const ctl = systemctlArgs(targetCfg);
  spawnSyncSafe(ctl[0], ctl.slice(1).concat(["daemon-reload"]), { stdio: "inherit" });

  ok(`Bootstrap OK (service file: ${svcPath})`);
  return layout;
}

function extractArtifactToLocal(layout, artifactPath) {
  // Use system tar for speed and compatibility
  const res = spawnSyncSafe("tar", ["-xzf", artifactPath, "-C", layout.releasesDir], { stdio: "inherit" });
  if (!res.ok) throw new Error(`tar extract failed (status=${res.status})`);

  // Find extracted folder name (first entry)
  const list = spawnSyncSafe("tar", ["-tzf", artifactPath], { stdio: "pipe" });
  if (!list.ok) throw new Error("tar -tzf failed");
  const first = (list.stdout || "").split("\n").find(Boolean);
  if (!first) throw new Error("empty tar?");
  const folder = first.split("/")[0];
  return path.join(layout.releasesDir, folder);
}

function applyThinBootstrapLocal(layout, extractedDir, opts = {}) {
  const onlyPayload = !!opts.onlyPayload;
  const launcherSrc = path.join(extractedDir, "b", "a");
  const rtSrc = path.join(extractedDir, "r", "rt");
  const plSrc = path.join(extractedDir, "r", "pl");
  const codecSrc = path.join(extractedDir, "r", "c");

  if (!fileExists(launcherSrc)) throw new Error(`Missing thin launcher: ${launcherSrc}`);
  if (!fileExists(rtSrc)) throw new Error(`Missing thin runtime: ${rtSrc}`);
  if (!fileExists(plSrc)) throw new Error(`Missing thin payload: ${plSrc}`);

  const bDir = path.join(layout.installDir, "b");
  const rDir = path.join(layout.installDir, "r");
  ensureDir(bDir);
  ensureDir(rDir);

  if (!onlyPayload) {
    copyAtomic(launcherSrc, path.join(bDir, "a"), 0o755);
    copyAtomic(rtSrc, path.join(rDir, "rt"), 0o644);
  }
  copyAtomic(plSrc, path.join(rDir, "pl"), 0o644);
  if (fileExists(codecSrc)) {
    copyAtomic(codecSrc, path.join(rDir, "c"), 0o644);
  } else if (!onlyPayload) {
    rmrf(path.join(rDir, "c"));
  }
}

function cleanupThinBootstrapLocal(layout) {
  rmrf(path.join(layout.installDir, "b", "a"));
  rmrf(path.join(layout.installDir, "r", "rt"));
  rmrf(path.join(layout.installDir, "r", "pl"));
  rmrf(path.join(layout.installDir, "r", "c"));
}

function pickBuildIdFromFolder(folderName) {
  // folder is <appName>-<buildId>
  const idx = folderName.lastIndexOf("-");
  // buildId itself contains dashes; so we split at first dash after appName? We'll just strip prefix up to first '-'
  // Better: buildId is everything after appName + '-'
  return folderName; // caller can store full folder name; but current.buildId expects folder name in our layout
}

function cleanupLocalReleases({ targetCfg, layout, current, policy }) {
  const retention = normalizeRetention(policy);
  if (!retention.cleanupOnSuccess) return;

  const appName = targetCfg.appName || targetCfg.serviceName || "app";
  const releases = fs.readdirSync(layout.releasesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const sorted = filterReleaseNames(releases, appName).sort().reverse();
  if (!sorted.length) return;

  const { keep } = computeKeepSet(sorted, current, retention);
  const toDelete = sorted.filter((name) => !keep.has(name));
  if (!toDelete.length) return;

  for (const name of toDelete) {
    rmrf(path.join(layout.releasesDir, name));
  }

  ok(`Retention: removed ${toDelete.length} old release(s)`);
}

function cleanupFastReleasesLocal({ targetCfg, layout, current }) {
  const appName = targetCfg.appName || targetCfg.serviceName || "app";
  const prefix = `${appName}-fast`;

  const releases = fs.readdirSync(layout.releasesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => name.startsWith(prefix));

  const toDelete = releases.filter((name) => name !== current);
  if (!toDelete.length) return;

  for (const name of toDelete) {
    rmrf(path.join(layout.releasesDir, name));
  }

  ok(`Fast cleanup: removed ${toDelete.length} old fast release(s)`);
}

function deployLocal({ targetCfg, artifactPath, repoConfigPath, pushConfig, policy, fast, bootstrap }) {
  const layout = localInstallLayout(targetCfg);
  const thinMode = String(targetCfg.thinMode || "aio").toLowerCase();

  // Deploy is deploy: copy/extract files and update pointers.
  // It must NOT install or restart a systemd service implicitly.
  ensureDir(layout.installDir);
  ensureDir(layout.releasesDir);
  ensureDir(layout.sharedDir);

  const svc = serviceFilePath(targetCfg);
  if (!fileExists(svc)) {
    warn(`Service not installed (${svc}). Deploy will only copy files. If you want a local systemd service: seal deploy <target> --bootstrap`);
  }

  info(`Extracting artifact to ${layout.releasesDir}`);
  const extractedDir = extractArtifactToLocal(layout, artifactPath);
  const folderName = path.basename(extractedDir); // <appName>-<buildId>

  if (thinMode === "bootstrap") {
    const hasLauncher = fileExists(path.join(layout.installDir, "b", "a"));
    const hasRuntime = fileExists(path.join(layout.installDir, "r", "rt"));
    let canReuse = false;
    if (!bootstrap && hasLauncher && hasRuntime) {
      const releaseCodec = readThinCodecHash(extractedDir);
      const installCodec = readThinCodecHash(layout.installDir);
      if (releaseCodec && installCodec && releaseCodec === installCodec) {
        canReuse = true;
        info("Thin bootstrap: reusing launcher/runtime; updating payload only.");
      } else if (!releaseCodec) {
        warn("Thin bootstrap: codec metadata missing in release; copying full bootstrap.");
      } else if (!installCodec) {
        warn("Thin bootstrap: codec metadata missing on target; copying full bootstrap.");
      } else {
        warn("Thin bootstrap: codec mismatch; copying full bootstrap.");
      }
    } else if (!bootstrap) {
      warn("Thin bootstrap: launcher/runtime missing; copying full bootstrap.");
    }
    applyThinBootstrapLocal(layout, extractedDir, { onlyPayload: canReuse });
  } else {
    cleanupThinBootstrapLocal(layout);
  }

  // Config: do not overwrite unless explicit OR server missing
  const sharedCfg = path.join(layout.sharedDir, "config.json5");
  if (pushConfig || !fileExists(sharedCfg)) {
    copyFile(repoConfigPath, sharedCfg);
    ok(`Config updated: ${sharedCfg}`);
  } else {
    ok(`Config preserved (drift-safe): ${sharedCfg}`);
  }

  // Update current after successful deploy steps
  fs.writeFileSync(layout.currentFile, folderName, "utf-8");

  ok(`Deployed (files only): ${folderName}`);

  if (!fast) cleanupLocalReleases({ targetCfg, layout, current: folderName, policy });
  // Always clean fast releases after a successful normal deploy.
  cleanupFastReleasesLocal({ targetCfg, layout, current: folderName });

  return { layout, extractedDir, folderName };
}

function deployLocalFast({ targetCfg, releaseDir, repoConfigPath, pushConfig, buildId }) {
  const layout = localInstallLayout(targetCfg);
  const thinMode = String(targetCfg.thinMode || "aio").toLowerCase();

  ensureDir(layout.installDir);
  ensureDir(layout.releasesDir);
  ensureDir(layout.sharedDir);

  const appName = targetCfg.appName || targetCfg.serviceName || "app";
  const suffix = buildId ? String(buildId) : "fast";
  const folderName = `${appName}-fast-${suffix}`;
  const relDir = path.join(layout.releasesDir, folderName);

  rmrf(relDir);
  ensureDir(relDir);

  copyDir(releaseDir, relDir);

  if (thinMode === "bootstrap") {
    warn("FAST mode: removing thin bootstrap runtime so fallback release can run.");
  }
  cleanupThinBootstrapLocal(layout);

  fs.writeFileSync(layout.currentFile, folderName, "utf-8");

  const sharedCfg = path.join(layout.sharedDir, "config.json5");
  if (pushConfig || !fileExists(sharedCfg)) {
    copyFile(repoConfigPath, sharedCfg);
    ok(`Config updated: ${sharedCfg}`);
  } else {
    ok(`Config preserved (drift-safe): ${sharedCfg}`);
  }

  ok(`Deployed (fast): ${folderName} (${buildId || "fast"})`);
  cleanupFastReleasesLocal({ targetCfg, layout, current: folderName });
  return { layout, relDir, folderName };
}

function ensureCurrentReleaseLocal(targetCfg) {
  const layout = localInstallLayout(targetCfg);
  if (!fileExists(layout.currentFile)) {
    throw new Error(`Missing current.buildId in ${layout.installDir}. Deploy first.`);
  }
  const current = fs.readFileSync(layout.currentFile, "utf-8").trim();
  if (!current) {
    throw new Error(`Missing current.buildId in ${layout.installDir}. Deploy first.`);
  }
  const rel = path.join(layout.releasesDir, current);
  if (!fileExists(rel)) {
    throw new Error(`Missing release dir: ${rel}. Deploy again.`);
  }
  return { layout, current, rel };
}

function statusLocal(targetCfg) {
  const ctl = systemctlArgs(targetCfg);
  spawnSyncSafe(ctl[0], ctl.slice(1).concat(["status", `${targetCfg.serviceName}.service`, "--no-pager"]), { stdio: "inherit" });
}

function logsLocal(targetCfg) {
  const j = journalctlArgs(targetCfg);
  // For user: journalctl --user-unit name -f -n 200
  if (j[0] === "journalctl") {
    spawnSyncSafe("journalctl", j.slice(1).concat([`${targetCfg.serviceName}.service`, "-n", "200", "-f"]), { stdio: "inherit" });
  } else {
    spawnSyncSafe(j[0], j.slice(1).concat([`${targetCfg.serviceName}.service`, "-n", "200", "-f"]), { stdio: "inherit" });
  }
}

function enableLocal(targetCfg) {
  const ctl = systemctlArgs(targetCfg);
  const res = spawnSyncSafe(ctl[0], ctl.slice(1).concat(["enable", `${targetCfg.serviceName}.service`]), { stdio: "inherit" });
  if (!res.ok) throw new Error(`enable failed (status=${res.status})`);
}

function startLocal(targetCfg) {
  const ctl = systemctlArgs(targetCfg);
  const res = spawnSyncSafe(ctl[0], ctl.slice(1).concat(["start", `${targetCfg.serviceName}.service`]), { stdio: "inherit" });
  if (!res.ok) throw new Error(`start failed (status=${res.status})`);
}

function restartLocal(targetCfg) {
  const ctl = systemctlArgs(targetCfg);
  const res = spawnSyncSafe(ctl[0], ctl.slice(1).concat(["restart", `${targetCfg.serviceName}.service`]), { stdio: "inherit" });
  if (!res.ok) throw new Error(`restart failed (status=${res.status})`);
}

function stopLocal(targetCfg) {
  const ctl = systemctlArgs(targetCfg);
  const res = spawnSyncSafe(ctl[0], ctl.slice(1).concat(["stop", `${targetCfg.serviceName}.service`]), { stdio: "inherit" });
  if (!res.ok) throw new Error(`stop failed (status=${res.status})`);
}

function disableLocalOnly(targetCfg) {
  const ctl = systemctlArgs(targetCfg);
  const res = spawnSyncSafe(ctl[0], ctl.slice(1).concat(["disable", `${targetCfg.serviceName}.service`]), { stdio: "inherit" });
  if (!res.ok) throw new Error(`disable failed (status=${res.status})`);
}

function disableLocal(targetCfg) {
  const ctl = systemctlArgs(targetCfg);
  const res = spawnSyncSafe(ctl[0], ctl.slice(1).concat(["disable", "--now", `${targetCfg.serviceName}.service`]), { stdio: "inherit" });
  if (!res.ok) throw new Error(`stop/disable failed (status=${res.status})`);
}

function runLocalForeground(targetCfg, opts = {}) {
  const { layout, rel } = ensureCurrentReleaseLocal(targetCfg);
  const unit = `${targetCfg.serviceName}.service`;
  const ctl = systemctlArgs(targetCfg);
  const scope = (targetCfg.serviceScope || "user").toLowerCase();

  const list = spawnSyncSafe(ctl[0], ctl.slice(1).concat(["list-unit-files", unit, "--no-legend"]), { stdio: "pipe" });
  if (list.ok && (list.stdout || "").includes(unit)) {
    spawnSyncSafe(ctl[0], ctl.slice(1).concat(["stop", unit]), { stdio: "inherit" });
  } else if (!list.ok && scope === "system") {
    warn("sudo not available; skipping systemd stop");
  }

  if (opts.kill) {
    const appName = targetCfg.appName || targetCfg.serviceName || "app";
    const patterns = [
      path.join(rel, appName),
      path.join(rel, "seal.loader.cjs"),
      path.join(rel, "app.bundle.cjs"),
    ];
    const rootLauncher = path.join(layout.installDir, "b", "a");
    if (fileExists(rootLauncher)) patterns.push(rootLauncher);
    for (const pattern of patterns) {
      if (scope === "system") {
        spawnSyncSafe("sudo", ["-n", "pkill", "-f", pattern], { stdio: "pipe" });
      }
      spawnSyncSafe("pkill", ["-f", pattern], { stdio: "pipe" });
    }
  }

  if (fileExists(layout.runner)) {
    const res = opts.sudo
      ? spawnSyncSafe("sudo", ["-n", "bash", layout.runner], { stdio: "inherit" })
      : spawnSyncSafe("bash", [layout.runner], { stdio: "inherit" });
    if (!res.ok) throw new Error(`run failed (status=${res.status})`);
    return;
  }

  const appctl = path.join(rel, "appctl");
  if (!fileExists(appctl)) throw new Error(`Missing appctl: ${appctl}`);
  // copy config
  const sharedCfg = path.join(layout.sharedDir, "config.json5");
  if (fileExists(sharedCfg)) {
    fs.copyFileSync(sharedCfg, path.join(rel, "config.runtime.json5"));
  }
  const res = opts.sudo
    ? spawnSyncSafe("sudo", ["-n", "bash", appctl, "run"], { cwd: rel, stdio: "inherit" })
    : spawnSyncSafe("bash", [appctl, "run"], { cwd: rel, stdio: "inherit" });
  if (!res.ok) throw new Error(`run failed (status=${res.status})`);
}

function rollbackLocal(targetCfg) {
  const layout = localInstallLayout(targetCfg);
  const appName = targetCfg.appName || targetCfg.serviceName || "app";
  const fastPrefix = `${appName}-fast-`;
  const thinMode = String(targetCfg.thinMode || "aio").toLowerCase();
  if (!fileExists(layout.currentFile)) throw new Error("No current.buildId – deploy first.");

  const current = fs.readFileSync(layout.currentFile, "utf-8").trim();
  const releases = filterReleaseNames(
    fs.readdirSync(layout.releasesDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name),
    appName
  ).sort().reverse();

  const idx = releases.indexOf(current);
  if (idx < 0) {
    throw new Error("Current release not found in releases dir.");
  }
  let prev = null;
  for (let i = idx + 1; i < releases.length; i += 1) {
    const candidate = releases[i];
    if (!candidate.startsWith(fastPrefix)) {
      prev = candidate;
      break;
    }
  }
  if (!prev) {
    throw new Error("No previous release to rollback to.");
  }
  const prevDir = path.join(layout.releasesDir, prev);
  if (thinMode === "bootstrap") {
    applyThinBootstrapLocal(layout, prevDir);
  } else {
    cleanupThinBootstrapLocal(layout);
  }
  fs.writeFileSync(layout.currentFile, prev, "utf-8");

  restartLocal(targetCfg);
  ok(`Rolled back to: ${prev}`);
}

function downLocal(targetCfg) {
  const ctl = systemctlArgs(targetCfg);
  spawnSyncSafe(ctl[0], ctl.slice(1).concat(["disable", "--now", `${targetCfg.serviceName}.service`]), { stdio: "inherit" });
  spawnSyncSafe(ctl[0], ctl.slice(1).concat(["daemon-reload"]), { stdio: "inherit" });

  const svc = serviceFilePath(targetCfg);
  if (fileExists(svc)) {
    const scope = (targetCfg.serviceScope || "user").toLowerCase();
    if (scope === "system") {
      spawnSyncSafe("sudo", ["rm", "-f", svc], { stdio: "inherit" });
    } else {
      fs.rmSync(svc, { force: true });
    }
  }

  ok(`Service removed: ${targetCfg.serviceName}`);
}

function uninstallLocal(targetCfg) {
  const layout = localInstallLayout(targetCfg);
  const ctl = systemctlArgs(targetCfg);

  spawnSyncSafe(ctl[0], ctl.slice(1).concat(["disable", "--now", `${targetCfg.serviceName}.service`]), { stdio: "inherit" });
  spawnSyncSafe(ctl[0], ctl.slice(1).concat(["daemon-reload"]), { stdio: "inherit" });

  // Remove service file
  const svc = serviceFilePath(targetCfg);
  if (fileExists(svc)) fs.rmSync(svc, { force: true });

  // Remove installDir
  assertSafeInstallDir(layout.installDir);
  rmrf(layout.installDir);

  ok(`Uninstalled: ${targetCfg.serviceName}`);
}

module.exports = {
  bootstrapLocal,
  deployLocal,
  deployLocalFast,
  statusLocal,
  logsLocal,
  enableLocal,
  startLocal,
  restartLocal,
  stopLocal,
  disableLocalOnly,
  disableLocal,
  rollbackLocal,
  downLocal,
  uninstallLocal,
  ensureCurrentReleaseLocal,
  runLocalForeground,
};

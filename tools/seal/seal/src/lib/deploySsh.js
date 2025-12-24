"use strict";

const path = require("path");
const os = require("os");
const fs = require("fs");

const { sshExec, scpTo, scpFrom } = require("./ssh");
const { spawnSyncSafe } = require("./spawn");
const { fileExists, ensureDir } = require("./fsextra");
const { ok, info, warn } = require("./ui");
const { normalizeRetention, filterReleaseNames, computeKeepSet } = require("./retention");

/**
 * Minimal remote deploy baseline (Linux, systemd system scope).
 * Requires:
 * - ssh access (key-based)
 * - sudo without password for bootstrap/servicectl (mkdir, systemctl)
 *
 * This is intentionally simple for v0.6 experimentation.
 */

function remoteLayout(targetCfg) {
  const installDir = targetCfg.installDir || `/opt/${targetCfg.appName || "app"}`;
  return {
    installDir,
    releasesDir: `${installDir}/releases`,
    sharedDir: `${installDir}/shared`,
    currentFile: `${installDir}/current.buildId`,
    runner: `${installDir}/run-current.sh`,
    serviceFile: `/etc/systemd/system/${targetCfg.serviceName}.service`,
  };
}

function sshUserHost(targetCfg) {
  const scope = (targetCfg.serviceScope || "system").toLowerCase();
  if (scope !== "system") {
    throw new Error(`SSH targets currently support only serviceScope=system (got: ${scope}).`);
  }
  const user = targetCfg.user || "root";
  const host = targetCfg.host;
  if (!host) throw new Error("target.host missing");
  const svc = targetCfg.serviceName || targetCfg.appName;
  if (svc && !/^[A-Za-z0-9._-]+$/.test(svc)) {
    throw new Error(`Invalid serviceName: ${svc} (allowed: A-Z a-z 0-9 . _ -)`);
  }
  if (targetCfg.installDir && !/^\/[A-Za-z0-9._/-]+$/.test(targetCfg.installDir)) {
    throw new Error(`Invalid installDir: ${targetCfg.installDir} (must be absolute path without spaces)`);
  }
  if (targetCfg.serviceUser && /\s/.test(targetCfg.serviceUser)) {
    throw new Error(`Invalid serviceUser: ${targetCfg.serviceUser} (whitespace not allowed)`);
  }
  if (targetCfg.serviceGroup && /\s/.test(targetCfg.serviceGroup)) {
    throw new Error(`Invalid serviceGroup: ${targetCfg.serviceGroup} (whitespace not allowed)`);
  }
  if (/\s/.test(user)) {
    throw new Error(`Invalid user: ${user} (whitespace not allowed)`);
  }
  return { user, host };
}

function serviceUserGroup(targetCfg, fallbackUser) {
  const user = targetCfg.serviceUser || fallbackUser || "root";
  const group = targetCfg.serviceGroup || user;
  return { user, group };
}

function targetLabel(targetCfg) {
  return targetCfg.target || targetCfg.serviceName || "server";
}

function shQuote(value) {
  const str = String(value);
  return "'" + str.replace(/'/g, "'\\''") + "'";
}

function readArtifactFolderName(artifactPath) {
  const list = spawnSyncSafe("tar", ["-tzf", artifactPath], { stdio: "pipe" });
  if (!list.ok) return null;
  const first = (list.stdout || "").split(/\r?\n/).find(Boolean);
  if (!first) return null;
  const cleaned = first.replace(/^\.\//, "");
  return cleaned.split("/")[0] || null;
}

function ensureRsyncAvailable(user, host) {
  const local = spawnSyncSafe("rsync", ["--version"], { stdio: "pipe" });
  if (!local.ok) {
    throw new Error("Fast deploy requires rsync on the local machine.");
  }
  const remote = sshExec({ user, host, args: ["bash", "-lc", "command -v rsync >/dev/null 2>&1"], stdio: "pipe" });
  if (!remote.ok) {
    throw new Error(`Fast deploy requires rsync on ${host}.`);
  }
}

function bootstrapHint(targetCfg, layout, user, host, issues) {
  const targetName = targetLabel(targetCfg);
  const owner = shQuote(`${user}:${user}`);
  const manual = `ssh -t ${user}@${host} "sudo mkdir -p ${shQuote(layout.releasesDir)} ${shQuote(layout.sharedDir)} && sudo chown -R ${owner} ${shQuote(layout.installDir)}"`;
  const header = (issues && issues.length)
    ? issues
    : [`Remote install dir missing or not writable: ${layout.installDir}`];
  const hasServiceIssue = (issues || []).some((i) => i.includes("runner") || i.includes("systemd unit"));
  const manualLine = hasServiceIssue
    ? "Manual mkdir/chown only fixes directories; runner/unit still need bootstrap after deploy."
    : `  ${manual}`;
  return [
    ...header,
    `Run: seal deploy ${targetName} --bootstrap`,
    "Bootstrap uses sudo to create /opt dirs and chown them to the SSH user, then installs runner+unit after deploy.",
    "If you cannot use passwordless sudo, run manually:",
    manualLine,
  ].join("\n");
}

function checkRemoteWritable(targetCfg, opts) {
  const { user, host } = sshUserHost(targetCfg);
  const layout = remoteLayout(targetCfg);
  const requireService = !(opts && opts.requireService === false);
  const serviceChecks = requireService
    ? `
  if [ ! -f "$RUNNER" ]; then issues+=("__SEAL_MISSING_RUNNER__"); fi
  if [ ! -f "$UNIT" ]; then issues+=("__SEAL_MISSING_UNIT__"); fi
`
    : "";
  const cmd = ["bash", "-lc", `
ROOT=${shQuote(layout.installDir)}
REL=${shQuote(layout.releasesDir)}
SHARED=${shQuote(layout.sharedDir)}
RUNNER=${shQuote(layout.runner)}
UNIT=${shQuote(layout.serviceFile)}
issues=()

if [ ! -d "$ROOT" ]; then
  issues+=("__SEAL_MISSING_DIR__")
else
  if [ ! -w "$ROOT" ]; then issues+=("__SEAL_NOT_WRITABLE__"); fi
  if [ -d "$REL" ] && [ ! -w "$REL" ]; then issues+=("__SEAL_NOT_WRITABLE_RELEASES__"); fi
  if [ -d "$SHARED" ] && [ ! -w "$SHARED" ]; then issues+=("__SEAL_NOT_WRITABLE_SHARED__"); fi
${serviceChecks}
fi

if [ "\${#issues[@]}" -eq 0 ]; then
  echo "__SEAL_OK__"
else
  printf "%s\\n" "\${issues[@]}"
fi
exit 0
`];
  const res = sshExec({ user, host, args: cmd, stdio: "pipe" });
  return { res, layout, user, host };
}

function bootstrapSsh(targetCfg) {
  const { user, host } = sshUserHost(targetCfg);
  const layout = remoteLayout(targetCfg);

  const sudoCheck = sshExec({ user, host, args: ["bash", "-lc", "sudo -n true"], stdio: "pipe" });
  if (!sudoCheck.ok) {
  const owner = shQuote(`${user}:${user}`);
  const manual = `ssh -t ${user}@${host} "sudo mkdir -p ${shQuote(layout.releasesDir)} ${shQuote(layout.sharedDir)} && sudo chown -R ${owner} ${shQuote(layout.installDir)}"`;
    const sudoOut = `${sudoCheck.stdout}\n${sudoCheck.stderr}`.trim();
    const sudoLine = sudoOut.split(/\r?\n/).slice(0, 2).join(" | ");
    const msg = [
      "Bootstrap requires passwordless sudo on the server (BatchMode).",
      `sudo -n true failed: ${sudoLine || "no output"}`,
      `Configure NOPASSWD for ${user}, or run manually:`,
      `  ${manual}`,
    ].join("\n");
    throw new Error(msg);
  }

  // Create dirs only (no service install/start here)
  const cmd = [
    "bash", "-lc",
    [
      `sudo -n mkdir -p ${shQuote(layout.releasesDir)} ${shQuote(layout.sharedDir)} ${shQuote(`${layout.installDir}/b`)} ${shQuote(`${layout.installDir}/r`)}`,
      `sudo -n chown -R ${shQuote(`${user}:${user}`)} ${shQuote(layout.installDir)}`,
    ].join(" && ")
  ];

  const res = sshExec({ user, host, args: cmd, stdio: "pipe" });
  if (!res.ok) {
    const out = `${res.stdout}\n${res.stderr}`.trim();
    throw new Error(`bootstrap ssh failed (status=${res.status})${out ? `: ${out}` : ""}`);
  }

  ok(`Bootstrap OK on ${host} (dirs ready; service not installed)`);
  return layout;
}

function installServiceSsh(targetCfg) {
  const { user: sshUser, host } = sshUserHost(targetCfg);
  const { user: serviceUser, group: serviceGroup } = serviceUserGroup(targetCfg, sshUser);
  const layout = remoteLayout(targetCfg);

const runnerScript = `#!/usr/bin/env bash
set -euo pipefail
ROOT=${shQuote(layout.installDir)}
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

if [ -f "$ROOT/shared/config.json5" ]; then
  cp "$ROOT/shared/config.json5" "$REL/config.runtime.json5"
fi

cd "$REL"
exec "$REL/appctl" run
`;

  const unit = `[Unit]
Description=SEAL app ${targetCfg.serviceName}
After=network.target

[Service]
Type=simple
User=${serviceUser}
Group=${serviceGroup}
WorkingDirectory=${layout.installDir}
ExecStart=${layout.runner}
Restart=always
RestartSec=1
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
`;

  const sudoCheck = sshExec({ user: sshUser, host, args: ["bash", "-lc", "sudo -n true"], stdio: "pipe" });
  if (!sudoCheck.ok) {
    const sudoOut = `${sudoCheck.stdout}\n${sudoCheck.stderr}`.trim();
    const sudoLine = sudoOut.split(/\r?\n/).slice(0, 2).join(" | ");
    const msg = [
      "Service install requires passwordless sudo on the server (BatchMode).",
      `sudo -n true failed: ${sudoLine || "no output"}`,
      `Fix: configure NOPASSWD for ${sshUser} and rerun: seal deploy ${targetLabel(targetCfg)} --bootstrap`,
    ].join("\n");
    throw new Error(msg);
  }

  const cmd = [
    "bash", "-lc",
    `set -euo pipefail
cat <<'EOF' > ${shQuote(layout.runner)}
${runnerScript}
EOF
chmod 755 ${shQuote(layout.runner)}
sudo -n tee ${shQuote(layout.serviceFile)} >/dev/null << 'EOF'
${unit}
EOF
sudo -n systemctl daemon-reload
`
  ];

  const res = sshExec({ user: sshUser, host, args: cmd, stdio: "pipe" });
  if (!res.ok) {
    const out = `${res.stdout}\n${res.stderr}`.trim();
    throw new Error(`install service failed (status=${res.status})${out ? `: ${out}` : ""}`);
  }

  ok(`Service installed on ${host} (unit + runner)`);
}

function cleanupReleasesSsh({ targetCfg, current, policy }) {
  const retention = normalizeRetention(policy);
  if (!retention.cleanupOnSuccess) return;

  const { user, host } = sshUserHost(targetCfg);
  const layout = remoteLayout(targetCfg);
  const appName = targetCfg.appName || targetCfg.serviceName || "app";

  const listCmd = ["bash", "-lc", `ls -1 ${shQuote(layout.releasesDir)} 2>/dev/null || true`];
  const listRes = sshExec({ user, host, args: listCmd, stdio: "pipe" });
  if (!listRes.ok) {
    warn(`Retention cleanup skipped (cannot list releases on ${host})`);
    return;
  }

  const names = (listRes.stdout || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const sorted = filterReleaseNames(names, appName).sort().reverse();
  if (!sorted.length) return;

  const { keep } = computeKeepSet(sorted, current, retention);
  const toDelete = sorted.filter((name) => !keep.has(name));
  if (!toDelete.length) return;

  const rmArgs = toDelete.map((name) => shQuote(`${layout.releasesDir}/${name}`)).join(" ");
  const rmCmd = ["bash", "-lc", `rm -rf ${rmArgs}`];
  const rmRes = sshExec({ user, host, args: rmCmd, stdio: "pipe" });
  if (!rmRes.ok) {
    warn(`Retention cleanup failed on ${host} (status=${rmRes.status})`);
    return;
  }

  ok(`Retention: removed ${toDelete.length} old release(s) on ${host}`);
}

function cleanupFastReleasesSsh({ targetCfg, current }) {
  const { user, host } = sshUserHost(targetCfg);
  const layout = remoteLayout(targetCfg);
  const appName = targetCfg.appName || targetCfg.serviceName || "app";
  const prefix = `${appName}-fast`;

  const listCmd = ["bash", "-lc", `ls -1 ${shQuote(layout.releasesDir)} 2>/dev/null || true`];
  const listRes = sshExec({ user, host, args: listCmd, stdio: "pipe" });
  if (!listRes.ok) {
    warn(`Fast cleanup skipped (cannot list releases on ${host})`);
    return;
  }

  const names = (listRes.stdout || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((name) => name.startsWith(prefix));
  const toDelete = names.filter((name) => name !== current);
  if (!toDelete.length) return;

  const rmArgs = toDelete.map((name) => shQuote(`${layout.releasesDir}/${name}`)).join(" ");
  const rmCmd = ["bash", "-lc", `rm -rf ${rmArgs}`];
  const rmRes = sshExec({ user, host, args: rmCmd, stdio: "pipe" });
  if (!rmRes.ok) {
    warn(`Fast cleanup failed on ${host} (status=${rmRes.status})`);
    return;
  }

  ok(`Fast cleanup: removed ${toDelete.length} old fast release(s) on ${host}`);
}

function deploySsh({ targetCfg, artifactPath, repoConfigPath, pushConfig, bootstrap, policy, fast }) {
  const thinMode = String(targetCfg.thinMode || "aio").toLowerCase();
  const { res: preflight, layout, user, host } = checkRemoteWritable(targetCfg, { requireService: !bootstrap });
  const out = `${preflight.stdout}\n${preflight.stderr}`.trim();
  if (!preflight.ok) {
    throw new Error(`ssh preflight failed: ${out || preflight.error || "unknown"}`);
  }
  const issues = [];
  if (out.includes("__SEAL_MISSING_DIR__")) issues.push(`Missing installDir: ${layout.installDir}`);
  if (out.includes("__SEAL_NOT_WRITABLE__")) issues.push(`InstallDir not writable: ${layout.installDir}`);
  if (out.includes("__SEAL_NOT_WRITABLE_RELEASES__")) issues.push(`Releases dir not writable: ${layout.releasesDir}`);
  if (out.includes("__SEAL_NOT_WRITABLE_SHARED__")) issues.push(`Shared dir not writable: ${layout.sharedDir}`);
  if (out.includes("__SEAL_MISSING_RUNNER__")) issues.push(`Missing runner: ${layout.runner}`);
  if (out.includes("__SEAL_MISSING_UNIT__")) issues.push(`Missing systemd unit: ${layout.serviceFile}`);
  if (issues.length) {
    throw new Error(bootstrapHint(targetCfg, layout, user, host, issues));
  }

  let shouldPushConfig = !!pushConfig;
  const remoteCfg = `${layout.sharedDir}/config.json5`;
  const remoteCfgQ = shQuote(remoteCfg);

  if (!shouldPushConfig) {
    const cfgCheck = sshExec({
      user,
      host,
      args: ["bash", "-lc", `if [ -f ${remoteCfgQ} ]; then echo __SEAL_CFG_OK__; else echo __SEAL_CFG_MISSING__; fi`],
      stdio: "pipe",
    });
    if (!cfgCheck.ok) {
      const cfgOut = `${cfgCheck.stdout}\n${cfgCheck.stderr}`.trim();
      throw new Error(`ssh config check failed (status=${cfgCheck.status})${cfgOut ? `: ${cfgOut}` : ""}`);
    }
    if ((cfgCheck.stdout || "").includes("__SEAL_CFG_MISSING__")) {
      warn("Remote config missing. Pushing repo config once (safe default for first deploy).");
      shouldPushConfig = true;
    }
  }

  // Upload artifact
  const base = path.basename(artifactPath);
  const remoteTmp = `/tmp/${base}`;
  const remoteTmpQ = shQuote(remoteTmp);
  info(`Uploading artifact to ${host}:${remoteTmp}`);
  const up = scpTo({ user, host, localPath: artifactPath, remotePath: remoteTmp });
  if (!up.ok) throw new Error(`scp failed (status=${up.status})`);

  // Determine folderName from artifact file name without .tgz
  const fromTar = readArtifactFolderName(artifactPath);
  const folderName = fromTar || base.replace(/\.tgz$/, "");
  const relDir = `${layout.releasesDir}/${folderName}`;
  const relDirQ = shQuote(relDir);

  // Extract and switch current
  const releasesDirQ = shQuote(layout.releasesDir);
  const sharedDirQ = shQuote(layout.sharedDir);
  const currentFileQ = shQuote(layout.currentFile);
  const cmdParts = [
    `mkdir -p ${releasesDirQ} ${sharedDirQ}`,
  ];

  // Config: only overwrite if explicit or missing
  if (shouldPushConfig) {
    // upload repo config to tmp then move into shared
    const tmpCfg = `/tmp/${targetCfg.serviceName}-config.json5`;
    const tmpCfgQ = shQuote(tmpCfg);
    info(`Uploading config to ${host}:${tmpCfg}`);
    const upCfg = scpTo({ user, host, localPath: repoConfigPath, remotePath: tmpCfg });
    if (!upCfg.ok) throw new Error(`scp config failed (status=${upCfg.status})`);
    cmdParts.push(`tar -xzf ${remoteTmpQ} -C ${releasesDirQ}`);
    cmdParts.push(`cp ${tmpCfgQ} ${remoteCfgQ}`);
    cmdParts.push(`rm -f ${tmpCfgQ}`);
  } else {
    cmdParts.push(`if [ ! -f ${remoteCfgQ} ]; then echo '[seal] remote config missing -> creating from repo'; exit 99; fi`);
    cmdParts.push(`tar -xzf ${remoteTmpQ} -C ${releasesDirQ}`);
  }
  if (thinMode === "bootstrap") {
    const bDir = `${layout.installDir}/b`;
    const rDir = `${layout.installDir}/r`;
    const launcherSrc = `${relDir}/b/a`;
    const rtSrc = `${relDir}/r/rt`;
    const plSrc = `${relDir}/r/pl`;
    const bDirQ = shQuote(bDir);
    const rDirQ = shQuote(rDir);
    const launcherSrcQ = shQuote(launcherSrc);
    const rtSrcQ = shQuote(rtSrc);
    const plSrcQ = shQuote(plSrc);
    cmdParts.push(`test -f ${launcherSrcQ}`);
    cmdParts.push(`test -f ${rtSrcQ}`);
    cmdParts.push(`test -f ${plSrcQ}`);
    cmdParts.push(`mkdir -p ${bDirQ} ${rDirQ}`);
    cmdParts.push(`cp ${launcherSrcQ} ${bDirQ}/a.tmp && mv ${bDirQ}/a.tmp ${bDirQ}/a && chmod 755 ${bDirQ}/a`);
    cmdParts.push(`cp ${rtSrcQ} ${rDirQ}/rt.tmp && mv ${rDirQ}/rt.tmp ${rDirQ}/rt && chmod 644 ${rDirQ}/rt`);
    cmdParts.push(`cp ${plSrcQ} ${rDirQ}/pl.tmp && mv ${rDirQ}/pl.tmp ${rDirQ}/pl && chmod 644 ${rDirQ}/pl`);
  } else {
    const bFileQ = shQuote(`${layout.installDir}/b/a`);
    const rtFileQ = shQuote(`${layout.installDir}/r/rt`);
    const plFileQ = shQuote(`${layout.installDir}/r/pl`);
    cmdParts.push(`rm -f ${bFileQ} ${rtFileQ} ${plFileQ}`);
  }
  cmdParts.push(`echo ${shQuote(folderName)} > ${currentFileQ}`);
  cmdParts.push(`rm -f ${remoteTmpQ}`);

  const fullCmd = ["bash", "-lc", cmdParts.join(" && ")];
  let res = sshExec({ user, host, args: fullCmd, stdio: "pipe" });
  if (!res.ok && res.status === 99) {
    // Missing config (race) -> push config and retry without reuploading artifact
    warn("Remote config missing (race). Pushing repo config and retrying without reupload.");
    const tmpCheck = sshExec({
      user,
      host,
      args: ["bash", "-lc", `if [ -f ${remoteTmpQ} ]; then echo __SEAL_TMP_OK__; fi`],
      stdio: "pipe",
    });
    if (!tmpCheck.ok || !(tmpCheck.stdout || "").includes("__SEAL_TMP_OK__")) {
      info(`Re-uploading artifact to ${host}:${remoteTmp}`);
      const upRetry = scpTo({ user, host, localPath: artifactPath, remotePath: remoteTmp });
      if (!upRetry.ok) throw new Error(`scp failed (status=${upRetry.status})`);
    }

    const tmpCfg = `/tmp/${targetCfg.serviceName}-config.json5`;
    const tmpCfgQ = shQuote(tmpCfg);
    info(`Uploading config to ${host}:${tmpCfg}`);
    const upCfg = scpTo({ user, host, localPath: repoConfigPath, remotePath: tmpCfg });
    if (!upCfg.ok) throw new Error(`scp config failed (status=${upCfg.status})`);

    const retryParts = [
      `mkdir -p ${releasesDirQ} ${sharedDirQ}`,
      `tar -xzf ${remoteTmpQ} -C ${releasesDirQ}`,
      `cp ${tmpCfgQ} ${remoteCfgQ}`,
      `rm -f ${tmpCfgQ}`,
    ];
    if (thinMode === "bootstrap") {
      const bDir = `${layout.installDir}/b`;
      const rDir = `${layout.installDir}/r`;
      const launcherSrc = `${relDir}/b/a`;
      const rtSrc = `${relDir}/r/rt`;
      const plSrc = `${relDir}/r/pl`;
      const bDirQ = shQuote(bDir);
      const rDirQ = shQuote(rDir);
      const launcherSrcQ = shQuote(launcherSrc);
      const rtSrcQ = shQuote(rtSrc);
      const plSrcQ = shQuote(plSrc);
      retryParts.push(`test -f ${launcherSrcQ}`);
      retryParts.push(`test -f ${rtSrcQ}`);
      retryParts.push(`test -f ${plSrcQ}`);
      retryParts.push(`mkdir -p ${bDirQ} ${rDirQ}`);
      retryParts.push(`cp ${launcherSrcQ} ${bDirQ}/a.tmp && mv ${bDirQ}/a.tmp ${bDirQ}/a && chmod 755 ${bDirQ}/a`);
      retryParts.push(`cp ${rtSrcQ} ${rDirQ}/rt.tmp && mv ${rDirQ}/rt.tmp ${rDirQ}/rt && chmod 644 ${rDirQ}/rt`);
      retryParts.push(`cp ${plSrcQ} ${rDirQ}/pl.tmp && mv ${rDirQ}/pl.tmp ${rDirQ}/pl && chmod 644 ${rDirQ}/pl`);
    } else {
      const bFileQ = shQuote(`${layout.installDir}/b/a`);
      const rtFileQ = shQuote(`${layout.installDir}/r/rt`);
      const plFileQ = shQuote(`${layout.installDir}/r/pl`);
      retryParts.push(`rm -f ${bFileQ} ${rtFileQ} ${plFileQ}`);
    }
    retryParts.push(`echo ${shQuote(folderName)} > ${currentFileQ}`);
    retryParts.push(`rm -f ${remoteTmpQ}`);
    res = sshExec({ user, host, args: ["bash", "-lc", retryParts.join(" && ")], stdio: "pipe" });
  }
  if (!res.ok) {
    const deployOut = `${res.stdout}\n${res.stderr}`.trim();
    throw new Error(`deploy ssh failed (status=${res.status})${deployOut ? `: ${deployOut}` : ""}`);
  }

  ok(`Deployed on ${host}: ${folderName}`);

  if (!fast) cleanupReleasesSsh({ targetCfg, current: folderName, policy });
  // Always clean fast releases after a successful normal deploy.
  cleanupFastReleasesSsh({ targetCfg, current: folderName });
  return { layout, folderName, relDir };
}

function deploySshFast({ targetCfg, releaseDir, repoConfigPath, pushConfig, bootstrap, buildId }) {
  const thinMode = String(targetCfg.thinMode || "aio").toLowerCase();
  const { res: preflight, layout, user, host } = checkRemoteWritable(targetCfg, { requireService: !bootstrap });
  const out = `${preflight.stdout}\n${preflight.stderr}`.trim();
  if (!preflight.ok) {
    throw new Error(`ssh preflight failed: ${out || preflight.error || "unknown"}`);
  }
  const issues = [];
  if (out.includes("__SEAL_MISSING_DIR__")) issues.push(`Missing installDir: ${layout.installDir}`);
  if (out.includes("__SEAL_NOT_WRITABLE__")) issues.push(`InstallDir not writable: ${layout.installDir}`);
  if (out.includes("__SEAL_NOT_WRITABLE_RELEASES__")) issues.push(`Releases dir not writable: ${layout.releasesDir}`);
  if (out.includes("__SEAL_NOT_WRITABLE_SHARED__")) issues.push(`Shared dir not writable: ${layout.sharedDir}`);
  if (out.includes("__SEAL_MISSING_RUNNER__")) issues.push(`Missing runner: ${layout.runner}`);
  if (out.includes("__SEAL_MISSING_UNIT__")) issues.push(`Missing systemd unit: ${layout.serviceFile}`);
  if (issues.length) {
    throw new Error(bootstrapHint(targetCfg, layout, user, host, issues));
  }

  let shouldPushConfig = !!pushConfig;
  const remoteCfg = `${layout.sharedDir}/config.json5`;
  const remoteCfgQ = shQuote(remoteCfg);

  if (!shouldPushConfig) {
    const cfgCheck = sshExec({
      user,
      host,
      args: ["bash", "-lc", `if [ -f ${remoteCfgQ} ]; then echo __SEAL_CFG_OK__; else echo __SEAL_CFG_MISSING__; fi`],
      stdio: "pipe",
    });
    if (!cfgCheck.ok) {
      const cfgOut = `${cfgCheck.stdout}\n${cfgCheck.stderr}`.trim();
      throw new Error(`ssh config check failed (status=${cfgCheck.status})${cfgOut ? `: ${cfgOut}` : ""}`);
    }
    if ((cfgCheck.stdout || "").includes("__SEAL_CFG_MISSING__")) {
      warn("Remote config missing. Pushing repo config once (safe default for first deploy).");
      shouldPushConfig = true;
    }
  }

  ensureRsyncAvailable(user, host);

  const appName = targetCfg.appName || targetCfg.serviceName || "app";
  const suffix = buildId ? String(buildId) : "fast";
  const folderName = `${appName}-fast-${suffix}`;
  const relDir = `${layout.releasesDir}/${folderName}`;

  const mkdirRes = sshExec({
    user,
    host,
    args: ["bash", "-lc", `mkdir -p ${shQuote(relDir)} ${shQuote(layout.sharedDir)}`],
    stdio: "pipe",
  });
  if (!mkdirRes.ok) {
    const mkdirOut = `${mkdirRes.stdout}\n${mkdirRes.stderr}`.trim();
    throw new Error(`ssh mkdir failed (status=${mkdirRes.status})${mkdirOut ? `: ${mkdirOut}` : ""}`);
  }

  const sshOpts = "-o BatchMode=yes -o StrictHostKeyChecking=accept-new";
  const baseArgs = [
    "-az",
    "--delete",
    "--info=progress2",
    "-e",
    `ssh ${sshOpts}`,
  ];

  info(`Fast sync (fallback bundle) to ${host}:${relDir}`);
  const srcArg = releaseDir.endsWith(path.sep) ? releaseDir : `${releaseDir}${path.sep}`;
  const dstArg = `${user}@${host}:${relDir}/`;
  const rsyncRes = spawnSyncSafe("rsync", baseArgs.concat([srcArg, dstArg]), { stdio: "inherit" });
  if (!rsyncRes.ok) {
    throw new Error(`fast rsync failed (status=${rsyncRes.status})`);
  }

  if (shouldPushConfig) {
    const tmpCfg = `/tmp/${targetCfg.serviceName}-config.json5`;
    const tmpCfgQ = shQuote(tmpCfg);
    info(`Uploading config to ${host}:${tmpCfg}`);
    const upCfg = scpTo({ user, host, localPath: repoConfigPath, remotePath: tmpCfg });
    if (!upCfg.ok) throw new Error(`scp config failed (status=${upCfg.status})`);
    const cfgCmd = ["bash", "-lc", `cp ${tmpCfgQ} ${remoteCfgQ} && rm -f ${tmpCfgQ}`];
    const cfgRes = sshExec({ user, host, args: cfgCmd, stdio: "pipe" });
    if (!cfgRes.ok) {
      const cfgOut = `${cfgRes.stdout}\n${cfgRes.stderr}`.trim();
      throw new Error(`config write failed (status=${cfgRes.status})${cfgOut ? `: ${cfgOut}` : ""}`);
    }
  }

  if (thinMode === "bootstrap") {
    warn("FAST mode: removing thin bootstrap runtime so fallback release can run.");
  }
  const cleanupCmd = [
    "bash", "-lc",
    `rm -f ${shQuote(`${layout.installDir}/b/a`)} ${shQuote(`${layout.installDir}/r/rt`)} ${shQuote(`${layout.installDir}/r/pl`)}`
  ];
  const cleanupRes = sshExec({ user, host, args: cleanupCmd, stdio: "pipe" });
  if (!cleanupRes.ok) {
    const cleanupOut = `${cleanupRes.stdout}\n${cleanupRes.stderr}`.trim();
    throw new Error(`fast cleanup failed (status=${cleanupRes.status})${cleanupOut ? `: ${cleanupOut}` : ""}`);
  }

  const currentFileQ = shQuote(layout.currentFile);
  const curCmd = ["bash", "-lc", `echo ${shQuote(folderName)} > ${currentFileQ}`];
  const curRes = sshExec({ user, host, args: curCmd, stdio: "pipe" });
  if (!curRes.ok) {
    const curOut = `${curRes.stdout}\n${curRes.stderr}`.trim();
    throw new Error(`update current.buildId failed (status=${curRes.status})${curOut ? `: ${curOut}` : ""}`);
  }

  ok(`Deployed on ${host}: ${folderName} (${buildId || "fast"})`);

  cleanupFastReleasesSsh({ targetCfg, current: folderName });
  return { layout, folderName, relDir };
}

function statusSsh(targetCfg) {
  const { user, host } = sshUserHost(targetCfg);
  const unitName = `${targetCfg.serviceName}.service`;
  const unit = shQuote(unitName);
  const res = sshExec({ user, host, args: ["bash","-lc", `sudo -n systemctl status ${unit} --no-pager`], stdio: "pipe" });

  if (res.stdout) process.stdout.write(res.stdout);
  if (res.stderr) process.stderr.write(res.stderr);

  if (res.ok) return;

  const combined = `${res.stdout}\n${res.stderr}`.toLowerCase();
  const missing = combined.includes("could not be found") || combined.includes("not-found") || combined.includes("loaded: not-found");
  if (!missing) return;

  const appName = targetCfg.appName || targetCfg.serviceName || "app";
  const layout = remoteLayout(targetCfg);
  const pgrepScript = [
    "set -euo pipefail",
    `ROOT=${shQuote(layout.installDir)}`,
    `APP=${shQuote(appName)}`,
    "CUR=\"\"",
    "if [ -f \"$ROOT/current.buildId\" ]; then CUR=\"$(cat \"$ROOT/current.buildId\" || true)\"; fi",
    "if [ -n \"$CUR\" ]; then",
    "  REL=\"$ROOT/releases/$CUR\"",
    "  patterns=(\"$REL/$APP\" \"$REL/seal.loader.cjs\" \"$REL/app.bundle.cjs\")",
    "else",
    "  patterns=(\"$ROOT/releases/\")",
    "fi",
    "if [ -x \"$ROOT/b/a\" ]; then",
    "  patterns+=(\"$ROOT/b/a\")",
    "fi",
    "out=\"\"",
    "for p in \"${patterns[@]}\"; do",
    "  r=\"$(pgrep -af -- \"$p\" || true)\"",
    "  if [ -n \"$r\" ]; then out=\"${out}\\n${r}\"; fi",
    "done",
    "printf \"%s\" \"$out\"",
  ].join("\n");
  const pres = sshExec({ user, host, args: ["bash","-lc", pgrepScript], stdio: "pipe" });
  const lines = (pres.stdout || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !l.includes("pgrep -af"));
  const unique = Array.from(new Set(lines));
  if (unique.length) {
    console.log(`[INFO] Service not installed; running process(es) for current release:\n${unique.join("\n")}`);
  } else {
    console.log(`[INFO] Service not installed and no running process detected for current release.`);
  }
}

function logsSsh(targetCfg) {
  const { user, host } = sshUserHost(targetCfg);
  const unit = shQuote(`${targetCfg.serviceName}.service`);
  sshExec({ user, host, args: ["bash","-lc", `sudo -n journalctl -u ${unit} -n 200 -f`], stdio: "inherit" });
}

function enableSsh(targetCfg) {
  const { user, host } = sshUserHost(targetCfg);
  const unit = shQuote(`${targetCfg.serviceName}.service`);
  const res = sshExec({ user, host, args: ["bash","-lc", `sudo -n systemctl enable ${unit}`], stdio: "inherit" });
  if (!res.ok) throw new Error(`enable failed (status=${res.status})`);
}

function startSsh(targetCfg) {
  const { user, host } = sshUserHost(targetCfg);
  const unit = shQuote(`${targetCfg.serviceName}.service`);
  const res = sshExec({ user, host, args: ["bash","-lc", `sudo -n systemctl start ${unit}`], stdio: "inherit" });
  if (!res.ok) throw new Error(`start failed (status=${res.status})`);
}

function restartSsh(targetCfg) {
  const { user, host } = sshUserHost(targetCfg);
  const unit = shQuote(`${targetCfg.serviceName}.service`);
  const res = sshExec({ user, host, args: ["bash","-lc", `sudo -n systemctl restart ${unit}`], stdio: "inherit" });
  if (!res.ok) throw new Error(`restart failed (status=${res.status})`);
}

function stopSsh(targetCfg) {
  const { user, host } = sshUserHost(targetCfg);
  const unit = shQuote(`${targetCfg.serviceName}.service`);
  const res = sshExec({ user, host, args: ["bash","-lc", `sudo -n systemctl stop ${unit}`], stdio: "inherit" });
  if (!res.ok) throw new Error(`stop failed (status=${res.status})`);
}

function disableSshOnly(targetCfg) {
  const { user, host } = sshUserHost(targetCfg);
  const unit = shQuote(`${targetCfg.serviceName}.service`);
  const res = sshExec({ user, host, args: ["bash","-lc", `sudo -n systemctl disable ${unit}`], stdio: "inherit" });
  if (!res.ok) throw new Error(`disable failed (status=${res.status})`);
}

function disableSsh(targetCfg) {
  const { user, host } = sshUserHost(targetCfg);
  const unit = shQuote(`${targetCfg.serviceName}.service`);
  const res = sshExec({ user, host, args: ["bash","-lc", `sudo -n systemctl disable --now ${unit}`], stdio: "inherit" });
  if (!res.ok) throw new Error(`stop/disable failed (status=${res.status})`);
}

function runSshForeground(targetCfg, opts = {}) {
  const { user, host } = sshUserHost(targetCfg);
  const layout = remoteLayout(targetCfg);
  const unitName = `${targetCfg.serviceName}.service`;
  const unit = shQuote(unitName);
  const runPath = shQuote(`${layout.installDir}/run-current.sh`);
  const appName = targetCfg.appName || targetCfg.serviceName || "app";

  const script = [
    "set -euo pipefail",
    `UNIT=${unit}`,
    `RUN=${runPath}`,
    `ROOT=${shQuote(layout.installDir)}`,
    `APP=${shQuote(appName)}`,
    opts.kill ? "KILL_ON_START=1" : "KILL_ON_START=0",
    opts.sudo ? "RUN_AS_ROOT=1" : "RUN_AS_ROOT=0",
    "if sudo -n true >/dev/null 2>&1; then",
    "  if sudo -n systemctl list-unit-files \"$UNIT\" >/dev/null 2>&1; then",
    "    sudo -n systemctl stop \"$UNIT\" || true",
    "  fi",
    "else",
    "  echo \"[seal] WARN: sudo not available; skipping systemd stop\" 1>&2",
    "fi",
    "if [ \"$KILL_ON_START\" = \"1\" ] && [ -f \"$ROOT/current.buildId\" ]; then",
    "  CUR=\"$(cat \"$ROOT/current.buildId\" || true)\"",
    "  if [ -n \"$CUR\" ]; then",
    "    REL=\"$ROOT/releases/$CUR\"",
    "    if sudo -n true >/dev/null 2>&1; then",
    "      sudo -n pkill -f \"$REL/$APP\" || true",
    "      sudo -n pkill -f \"$REL/seal.loader.cjs\" || true",
    "      sudo -n pkill -f \"$REL/app.bundle.cjs\" || true",
    "      if [ -x \"$ROOT/b/a\" ]; then",
    "        sudo -n pkill -f \"$ROOT/b/a\" || true",
    "      fi",
    "    fi",
    "    pkill -f \"$REL/$APP\" || true",
    "    pkill -f \"$REL/seal.loader.cjs\" || true",
    "    pkill -f \"$REL/app.bundle.cjs\" || true",
    "    if [ -x \"$ROOT/b/a\" ]; then",
    "      pkill -f \"$ROOT/b/a\" || true",
    "    fi",
    "  fi",
    "fi",
    "if [ \"$RUN_AS_ROOT\" = \"1\" ]; then",
    "  exec sudo -n bash -lc \"$RUN\"",
    "fi",
    "exec \"$RUN\"",
  ].join("\n");

  const res = sshExec({ user, host, args: ["bash","-lc", script], stdio: "inherit", tty: true });
  if (!res.ok) throw new Error(`run failed (status=${res.status})`);
}

function ensureCurrentReleaseSsh(targetCfg) {
  const { user, host } = sshUserHost(targetCfg);
  const layout = remoteLayout(targetCfg);
  const cmd = ["bash", "-lc", `
set -euo pipefail
ROOT=${shQuote(layout.installDir)}
if [ ! -d "$ROOT" ]; then echo "__SEAL_MISSING_ROOT__"; exit 0; fi
if [ ! -f "$ROOT/current.buildId" ]; then echo "__SEAL_NO_CURRENT__"; exit 0; fi
CUR="$(cat "$ROOT/current.buildId" || true)"
if [ -z "$CUR" ]; then echo "__SEAL_NO_CURRENT__"; exit 0; fi
REL="$ROOT/releases/$CUR"
if [ ! -d "$REL" ]; then echo "__SEAL_MISSING_REL__:$REL"; exit 0; fi
echo "__SEAL_OK__"
`];

  const res = sshExec({ user, host, args: cmd, stdio: "pipe" });
  if (!res.ok) {
    const out = `${res.stdout}\n${res.stderr}`.trim();
    throw new Error(`ssh preflight failed (status=${res.status})${out ? `: ${out}` : ""}`);
  }

  const out = `${res.stdout}\n${res.stderr}`.trim();
  if (out.includes("__SEAL_OK__")) return true;
  if (out.includes("__SEAL_MISSING_ROOT__")) {
    throw new Error(`Missing installDir on ${host}: ${layout.installDir}. Deploy first.`);
  }
  if (out.includes("__SEAL_NO_CURRENT__")) {
    throw new Error(`Missing current.buildId on ${host} (${layout.installDir}). Deploy first.`);
  }
  if (out.includes("__SEAL_MISSING_REL__")) {
    const rel = (out.split("__SEAL_MISSING_REL__:")[1] || "").split(/\r?\n/)[0];
    throw new Error(`Missing release dir on ${host}: ${rel || "(unknown)"}. Deploy again.`);
  }
  throw new Error(`Unexpected preflight output: ${out || "(empty)"}`);
}

function rollbackSsh(targetCfg) {
  const { user, host } = sshUserHost(targetCfg);
  const layout = remoteLayout(targetCfg);
  const thinMode = String(targetCfg.thinMode || "aio").toLowerCase();
  const cmd = ["bash","-lc", `
set -euo pipefail
ROOT=${shQuote(layout.installDir)}
APP=${shQuote(targetCfg.appName || targetCfg.serviceName || "app")}
FAST_PREFIX="${targetCfg.appName || targetCfg.serviceName || "app"}-fast-"
cur="$(cat "$ROOT/current.buildId" || true)"
cd ${shQuote(layout.releasesDir)}
rels="$(ls -1 | sort -r)"
prev=""
found=0
for r in $rels; do
  case "$r" in
    "$APP"-*) ;;
    *) continue ;;
  esac
  if [ "$r" = "$cur" ]; then found=1; continue; fi
  if [ "$found" = "1" ]; then
    case "$r" in
      "$FAST_PREFIX"*) continue ;;
    esac
    prev="$r"; break;
  fi
done
if [ -z "$prev" ]; then echo "No previous release"; exit 2; fi
if [ "${thinMode}" = "bootstrap" ]; then
  PREV_DIR="$ROOT/releases/$prev"
  test -f "$PREV_DIR/b/a"
  test -f "$PREV_DIR/r/rt"
  test -f "$PREV_DIR/r/pl"
  mkdir -p "$ROOT/b" "$ROOT/r"
  cp "$PREV_DIR/b/a" "$ROOT/b/a.tmp" && mv "$ROOT/b/a.tmp" "$ROOT/b/a" && chmod 755 "$ROOT/b/a"
  cp "$PREV_DIR/r/rt" "$ROOT/r/rt.tmp" && mv "$ROOT/r/rt.tmp" "$ROOT/r/rt" && chmod 644 "$ROOT/r/rt"
  cp "$PREV_DIR/r/pl" "$ROOT/r/pl.tmp" && mv "$ROOT/r/pl.tmp" "$ROOT/r/pl" && chmod 644 "$ROOT/r/pl"
else
  rm -f "$ROOT/b/a" "$ROOT/r/rt" "$ROOT/r/pl"
fi
echo "$prev" > ${shQuote(layout.currentFile)}
sudo -n systemctl restart ${shQuote(`${targetCfg.serviceName}.service`)}
echo "Rolled back to $prev"
`];
  const res = sshExec({ user, host, args: cmd, stdio: "inherit" });
  if (!res.ok) throw new Error(`rollback ssh failed (status=${res.status})`);
}

function uninstallSsh(targetCfg) {
  const { user, host } = sshUserHost(targetCfg);
  const layout = remoteLayout(targetCfg);
  const cmd = ["bash","-lc", `
set -euo pipefail
sudo -n systemctl disable --now ${shQuote(`${targetCfg.serviceName}.service`)} || true
sudo -n rm -f ${shQuote(layout.serviceFile)}
sudo -n systemctl daemon-reload
sudo -n rm -rf ${shQuote(layout.installDir)}
echo "Uninstalled ${targetCfg.serviceName}"
`];
  const res = sshExec({ user, host, args: cmd, stdio: "inherit" });
  if (!res.ok) throw new Error(`uninstall ssh failed (status=${res.status})`);
}

function downSsh(targetCfg) {
  const { user, host } = sshUserHost(targetCfg);
  const layout = remoteLayout(targetCfg);
  const unit = shQuote(`${targetCfg.serviceName}.service`);
  const cmd = ["bash","-lc", `
set -euo pipefail
sudo -n systemctl disable --now ${unit} || true
sudo -n rm -f ${shQuote(layout.serviceFile)}
sudo -n systemctl daemon-reload
echo "Service removed ${targetCfg.serviceName}"
`];
  const res = sshExec({ user, host, args: cmd, stdio: "inherit" });
  if (!res.ok) throw new Error(`down ssh failed (status=${res.status})`);
}

function configDiffSsh({ targetCfg, localConfigPath }) {
  const { user, host } = sshUserHost(targetCfg);
  const layout = remoteLayout(targetCfg);
  const tmpLocal = path.join(os.tmpdir(), `${targetCfg.serviceName}-remote-config.json5`);
  ensureDir(path.dirname(tmpLocal));
  // Download remote config (best effort)
  const remoteCfg = `${layout.sharedDir}/config.json5`;
  const get = scpFrom({ user, host, remotePath: remoteCfg, localPath: tmpLocal });
  if (!get.ok) throw new Error("scp remote config failed");

  // Run diff -u
  const { spawnSyncSafe } = require("./spawn");
  spawnSyncSafe("diff", ["-u", localConfigPath, tmpLocal], { stdio: "inherit" });
}

function configPullSsh({ targetCfg, localConfigPath, apply }) {
  const { user, host } = sshUserHost(targetCfg);
  const layout = remoteLayout(targetCfg);
  const remoteCfg = `${layout.sharedDir}/config.json5`;

  const tmpLocal = apply ? localConfigPath : path.join(os.tmpdir(), `${targetCfg.serviceName}-remote-config.json5`);
  ensureDir(path.dirname(tmpLocal));
  const get = scpFrom({ user, host, remotePath: remoteCfg, localPath: tmpLocal });
  if (!get.ok) throw new Error("scp remote config failed");

  ok(apply ? `Pulled and applied config -> ${localConfigPath}` : `Pulled config -> ${tmpLocal}`);
}

function configPushSsh({ targetCfg, localConfigPath }) {
  const { res: preflight, layout, user, host } = checkRemoteWritable(targetCfg, { requireService: false });
  const out = `${preflight.stdout}\n${preflight.stderr}`.trim();
  if (!preflight.ok) {
    throw new Error(`ssh preflight failed: ${out || preflight.error || "unknown"}`);
  }
  const issues = [];
  if (out.includes("__SEAL_MISSING_DIR__")) issues.push(`Missing installDir: ${layout.installDir}`);
  if (out.includes("__SEAL_NOT_WRITABLE__")) issues.push(`InstallDir not writable: ${layout.installDir}`);
  if (out.includes("__SEAL_NOT_WRITABLE_RELEASES__")) issues.push(`Releases dir not writable: ${layout.releasesDir}`);
  if (out.includes("__SEAL_NOT_WRITABLE_SHARED__")) issues.push(`Shared dir not writable: ${layout.sharedDir}`);
  if (out.includes("__SEAL_MISSING_RUNNER__")) issues.push(`Missing runner: ${layout.runner}`);
  if (out.includes("__SEAL_MISSING_UNIT__")) issues.push(`Missing systemd unit: ${layout.serviceFile}`);
  if (issues.length) {
    throw new Error(bootstrapHint(targetCfg, layout, user, host, issues));
  }
  const tmpCfg = `/tmp/${targetCfg.serviceName}-config.json5`;
  const up = scpTo({ user, host, localPath: localConfigPath, remotePath: tmpCfg });
  if (!up.ok) throw new Error("scp config failed");

  const tmpCfgQ = shQuote(tmpCfg);
  const sharedDirQ = shQuote(layout.sharedDir);
  const remoteCfgQ = shQuote(`${layout.sharedDir}/config.json5`);
  const cmd = ["bash","-lc", `mkdir -p ${sharedDirQ} && cp ${tmpCfgQ} ${remoteCfgQ} && rm -f ${tmpCfgQ}`];
  const res = sshExec({ user, host, args: cmd, stdio: "inherit" });
  if (!res.ok) throw new Error(`push config failed (status=${res.status})`);

  ok(`Config pushed to ${host}:${layout.sharedDir}/config.json5`);
}

module.exports = {
  bootstrapSsh,
  deploySsh,
  deploySshFast,
  statusSsh,
  logsSsh,
  enableSsh,
  startSsh,
  restartSsh,
  stopSsh,
  disableSshOnly,
  disableSsh,
  rollbackSsh,
  runSshForeground,
  ensureCurrentReleaseSsh,
  uninstallSsh,
  downSsh,
  configDiffSsh,
  configPullSsh,
  configPushSsh,
  installServiceSsh,
};

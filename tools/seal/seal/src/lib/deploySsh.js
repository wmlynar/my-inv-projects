"use strict";

const path = require("path");
const os = require("os");
const fs = require("fs");

const { sshExec, scpTo, scpFrom } = require("./ssh");
const { spawnSyncSafe } = require("./spawn");
const { fileExists, ensureDir } = require("./fsextra");
const { ok, info, warn } = require("./ui");

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
      `sudo -n mkdir -p ${shQuote(layout.releasesDir)} ${shQuote(layout.sharedDir)}`,
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

function deploySsh({ targetCfg, artifactPath, repoConfigPath, pushConfig, bootstrap }) {
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

  // Extract and switch current
  const releasesDirQ = shQuote(layout.releasesDir);
  const sharedDirQ = shQuote(layout.sharedDir);
  const currentFileQ = shQuote(layout.currentFile);
  const cmdParts = [
    `mkdir -p ${releasesDirQ} ${sharedDirQ}`,
  ];

  // Config: only overwrite if explicit or missing
  const remoteCfg = `${layout.sharedDir}/config.json5`;
  const remoteCfgQ = shQuote(remoteCfg);
  if (pushConfig) {
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
    cmdParts.push(`if [ ! -f ${remoteCfgQ} ]; then echo '[seal] remote config missing -> creating from repo'; rm -f ${remoteTmpQ}; exit 99; fi`);
    cmdParts.push(`tar -xzf ${remoteTmpQ} -C ${releasesDirQ}`);
  }
  cmdParts.push(`echo ${shQuote(folderName)} > ${currentFileQ}`);
  cmdParts.push(`rm -f ${remoteTmpQ}`);

  const fullCmd = ["bash", "-lc", cmdParts.join(" && ")];
  let res = sshExec({ user, host, args: fullCmd, stdio: "pipe" });
  if (!res.ok && res.status === 99) {
    // Missing config and pushConfig not specified -> do a safe one-shot push
    warn("Remote config missing. Pushing repo config once (safe default for first deploy).");
    return deploySsh({ targetCfg, artifactPath, repoConfigPath, pushConfig: true, bootstrap });
  }
  if (!res.ok) {
    const deployOut = `${res.stdout}\n${res.stderr}`.trim();
    throw new Error(`deploy ssh failed (status=${res.status})${deployOut ? `: ${deployOut}` : ""}`);
  }

  ok(`Deployed on ${host}: ${folderName}`);
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
    "    fi",
    "    pkill -f \"$REL/$APP\" || true",
    "    pkill -f \"$REL/seal.loader.cjs\" || true",
    "    pkill -f \"$REL/app.bundle.cjs\" || true",
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
  const cmd = ["bash","-lc", `
set -euo pipefail
ROOT=${shQuote(layout.installDir)}
cur="$(cat "$ROOT/current.buildId" || true)"
cd ${shQuote(layout.releasesDir)}
rels="$(ls -1 | sort -r)"
prev=""
found=0
for r in $rels; do
  if [ "$found" = "1" ]; then prev="$r"; break; fi
  if [ "$r" = "$cur" ]; then found=1; fi
done
if [ -z "$prev" ]; then echo "No previous release"; exit 2; fi
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

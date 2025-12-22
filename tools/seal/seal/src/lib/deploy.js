"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

const { spawnSyncSafe } = require("./spawn");
const { ensureDir, fileExists, rmrf, copyFile } = require("./fsextra");
const { info, warn, err, ok, hr } = require("./ui");

function expandHome(p) {
  if (!p) return p;
  if (p.startsWith("~/")) return path.join(os.homedir(), p.slice(2));
  return p;
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

function writeRunnerScript(layout, targetCfg) {
  const script = `#!/usr/bin/env bash
set -euo pipefail
ROOT="${layout.installDir}"
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
  const unit = `[Unit]
Description=SEAL app ${name}
After=network.target

[Service]
Type=simple
WorkingDirectory=${layout.installDir}
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

  writeRunnerScript(layout, targetCfg);
  const svcPath = writeServiceFile(targetCfg, layout);

  // enable service
  const ctl = systemctlArgs(targetCfg);
  spawnSyncSafe(ctl[0], ctl.slice(1).concat(["daemon-reload"]), { stdio: "inherit" });
  spawnSyncSafe(ctl[0], ctl.slice(1).concat(["enable", "--now", `${targetCfg.serviceName}.service`]), { stdio: "inherit" });

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

function pickBuildIdFromFolder(folderName) {
  // folder is <appName>-<buildId>
  const idx = folderName.lastIndexOf("-");
  // buildId itself contains dashes; so we split at first dash after appName? We'll just strip prefix up to first '-'
  // Better: buildId is everything after appName + '-'
  return folderName; // caller can store full folder name; but current.buildId expects folder name in our layout
}

function deployLocal({ targetCfg, artifactPath, repoConfigPath, pushConfig }) {
  const layout = localInstallLayout(targetCfg);

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

  // Update current
  fs.writeFileSync(layout.currentFile, folderName, "utf-8");

  // Config: do not overwrite unless explicit OR server missing
  const sharedCfg = path.join(layout.sharedDir, "config.json5");
  if (pushConfig || !fileExists(sharedCfg)) {
    copyFile(repoConfigPath, sharedCfg);
    ok(`Config updated: ${sharedCfg}`);
  } else {
    ok(`Config preserved (drift-safe): ${sharedCfg}`);
  }

  ok(`Deployed (files only): ${folderName}`);

  return { layout, extractedDir, folderName };
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

function restartLocal(targetCfg) {
  const ctl = systemctlArgs(targetCfg);
  const res = spawnSyncSafe(ctl[0], ctl.slice(1).concat(["restart", `${targetCfg.serviceName}.service`]), { stdio: "inherit" });
  if (!res.ok) throw new Error(`restart failed (status=${res.status})`);
}

function disableLocal(targetCfg) {
  const ctl = systemctlArgs(targetCfg);
  const res = spawnSyncSafe(ctl[0], ctl.slice(1).concat(["disable", "--now", `${targetCfg.serviceName}.service`]), { stdio: "inherit" });
  if (!res.ok) throw new Error(`stop/disable failed (status=${res.status})`);
}

function runLocalForeground(targetCfg) {
  const layout = localInstallLayout(targetCfg);
  const current = fileExists(layout.currentFile) ? fs.readFileSync(layout.currentFile, "utf-8").trim() : null;
  if (!current) throw new Error("No current.buildId – deploy first.");
  const rel = path.join(layout.releasesDir, current);
  const appctl = path.join(rel, "appctl");
  if (!fileExists(appctl)) throw new Error(`Missing appctl: ${appctl}`);
  // copy config
  const sharedCfg = path.join(layout.sharedDir, "config.json5");
  if (fileExists(sharedCfg)) {
    fs.copyFileSync(sharedCfg, path.join(rel, "config.runtime.json5"));
  }
  const res = spawnSyncSafe("bash", [appctl, "run"], { cwd: rel, stdio: "inherit" });
  if (!res.ok) throw new Error(`run failed (status=${res.status})`);
}

function rollbackLocal(targetCfg) {
  const layout = localInstallLayout(targetCfg);
  if (!fileExists(layout.currentFile)) throw new Error("No current.buildId – deploy first.");

  const current = fs.readFileSync(layout.currentFile, "utf-8").trim();
  const releases = fs.readdirSync(layout.releasesDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort()
    .reverse();

  const idx = releases.indexOf(current);
  if (idx < 0 || idx === releases.length - 1) {
    throw new Error("No previous release to rollback to.");
  }
  const prev = releases[idx + 1];
  fs.writeFileSync(layout.currentFile, prev, "utf-8");

  restartLocal(targetCfg);
  ok(`Rolled back to: ${prev}`);
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
  rmrf(layout.installDir);

  ok(`Uninstalled: ${targetCfg.serviceName}`);
}

module.exports = {
  bootstrapLocal,
  deployLocal,
  statusLocal,
  logsLocal,
  restartLocal,
  disableLocal,
  rollbackLocal,
  uninstallLocal,
  runLocalForeground,
};

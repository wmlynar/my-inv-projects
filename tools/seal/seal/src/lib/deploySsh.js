"use strict";

const path = require("path");
const os = require("os");
const { resolveTmpBase } = require("./tmp");
const fs = require("fs");
const crypto = require("crypto");

const {
  sshExec,
  scpTo,
  scpFrom,
  normalizeStrictHostKeyChecking,
  normalizeSshPort,
  formatSshFailure,
} = require("./ssh");
const { spawnSyncSafe } = require("./spawn");
const { fileExists, ensureDir } = require("./fsextra");
const { ok, info, warn } = require("./ui");
const { normalizeRetention, filterReleaseNames, computeKeepSet } = require("./retention");
const { getTarRoot } = require("./tarSafe");
const { normalizeThinMode } = require("./packagerConfig");
const {
  THIN_NATIVE_BOOTSTRAP_FILE,
  THIN_TPM_SEAL_PUB_FILE,
  THIN_TPM_SEAL_PRIV_FILE,
} = require("./thinPaths");
const { normalizeSystemdHardening, renderSystemdHardening } = require("./systemdHardening");

/**
 * Minimal remote deploy baseline (Linux, systemd system scope).
 * Requires:
 * - ssh access (key-based)
 * - sudo without password for bootstrap/servicectl (mkdir, systemctl)
 *
 * This is intentionally simple for v0.6 experimentation.
 */

function remoteLayout(targetCfg) {
  const installDir = targetCfg.installDir || `/home/admin/apps/${targetCfg.appName || "app"}`;
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

function resolvePreflightThreshold(targetCfg, key, envKey, fallback) {
  const cfg = targetCfg && targetCfg.preflight && typeof targetCfg.preflight === "object"
    ? targetCfg.preflight[key]
    : undefined;
  const raw = cfg !== undefined ? cfg : (process.env[envKey] !== undefined ? process.env[envKey] : fallback);
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return Math.floor(num);
}

function resolveTmpDir(targetCfg) {
  const cfg = targetCfg && targetCfg.preflight && typeof targetCfg.preflight === "object"
    ? targetCfg.preflight.tmpDir
    : null;
  const tmpDir = cfg !== undefined && cfg !== null ? String(cfg).trim() : "";
  if (tmpDir) return tmpDir;
  const installDir = targetCfg && targetCfg.installDir ? String(targetCfg.installDir) : "";
  return installDir ? `${installDir}/.seal-tmp` : ".seal-tmp";
}

function resolvePreflightTools(targetCfg) {
  const cfg = targetCfg && targetCfg.preflight && typeof targetCfg.preflight === "object"
    ? targetCfg.preflight.requireTools
    : null;
  if (!cfg) return [];
  if (Array.isArray(cfg)) {
    return cfg.map((v) => String(v || "").trim()).filter(Boolean);
  }
  return [String(cfg).trim()].filter(Boolean);
}

function resolveNoexecPolicy(targetCfg) {
  const cfg = targetCfg && targetCfg.preflight && typeof targetCfg.preflight === "object"
    ? targetCfg.preflight.allowNoexec
    : undefined;
  return cfg === true;
}

function resolveSudoRequired(targetCfg) {
  const cfg = targetCfg && targetCfg.preflight && typeof targetCfg.preflight === "object"
    ? targetCfg.preflight.requireSudo
    : undefined;
  if (cfg === true) return true;
  if (cfg === false) return false;
  if (targetCfg && targetCfg.user === "root") return false;
  return true;
}

function resolveLockTtlSec(targetCfg) {
  const cfg = targetCfg && targetCfg.preflight && typeof targetCfg.preflight === "object"
    ? targetCfg.preflight.lockTtlSec
    : undefined;
  const raw = cfg !== undefined && cfg !== null ? cfg : process.env.SEAL_DEPLOY_LOCK_TTL_SEC;
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) return 900;
  return Math.floor(num);
}

function parseLockResult(out) {
  const ok = out.includes("__SEAL_LOCK_OK__");
  const busyMatch = out.match(/__SEAL_LOCK_BUSY__:(\d+):(\d+)/);
  if (busyMatch) {
    return { ok: false, ageSec: Number(busyMatch[1]), ttlSec: Number(busyMatch[2]) };
  }
  return { ok };
}

function acquireDeployLockSsh(targetCfg, tmpDir) {
  const { user, host } = sshUserHost(targetCfg);
  const ttlSec = resolveLockTtlSec(targetCfg);
  const lockBase = `${tmpDir || ".seal-tmp"}/seal-deploy-${targetCfg.serviceName || targetCfg.appName || "app"}.lock`;
  const cmd = [
    "bash",
    "-c",
    `
set +u
LOCK=${shQuote(lockBase)}
TTL=${Math.trunc(ttlSec)}
NOW="$(date +%s)"
TS=0
AGE=0
LOCK_DIR="$(dirname "$LOCK")"
mkdir -p "$LOCK_DIR" 2>/dev/null || true
if mkdir "$LOCK" 2>/dev/null; then
  echo "$NOW" > "$LOCK/ts"
  echo "$$" > "$LOCK/pid"
  echo "__SEAL_LOCK_OK__"
  exit 0
fi
if [ -f "$LOCK/ts" ]; then
  TS="$(cat "$LOCK/ts" 2>/dev/null || echo 0)"
  case "$TS" in
    ''|*[!0-9]*) TS=0 ;;
  esac
  AGE=$((NOW - TS))
  if [ "$AGE" -gt "$TTL" ]; then
    rm -rf "$LOCK" 2>/dev/null || true
    if mkdir "$LOCK" 2>/dev/null; then
      echo "$NOW" > "$LOCK/ts"
      echo "$$" > "$LOCK/pid"
      echo "__SEAL_LOCK_OK__"
      exit 0
    fi
  else
    echo "__SEAL_LOCK_BUSY__:$AGE:$TTL"
    exit 0
  fi
fi
echo "__SEAL_LOCK_BUSY__:$AGE:$TTL"
exit 0
`,
  ];
  const res = sshExecTarget(targetCfg, { user, host, args: cmd, stdio: "pipe" });
  const out = `${res.stdout}\n${res.stderr}`.trim();
  if (!res.ok) {
    throw new Error(`ssh lock failed${formatSshFailure(res) || (out ? `: ${out}` : "")}`);
  }
  const parsed = parseLockResult(out);
  if (!parsed.ok) {
    throw new Error(`deploy lock busy on ${host} (${lockBase}) age=${parsed.ageSec}s ttl=${parsed.ttlSec}s. Wait or remove lock.`);
  }
  return { lockBase };
}

function releaseDeployLockSsh(targetCfg, lock) {
  if (!lock || !lock.lockBase) return;
  const { user, host } = sshUserHost(targetCfg);
  const cmd = ["bash", "-c", `rm -rf ${shQuote(lock.lockBase)} 2>/dev/null || true`];
  sshExecTarget(targetCfg, { user, host, args: cmd, stdio: "pipe" });
}

function parsePreflightResources(out) {
  const res = {
    lowDisk: null,
    lowInodes: null,
    lowTmpDisk: null,
    lowTmpInodes: null,
    tmpMissing: false,
    noexecInstall: false,
    missingTools: [],
    missingSudo: false,
    diskCheckFailed: false,
    inodeCheckFailed: false,
    tmpDiskCheckFailed: false,
    tmpInodeCheckFailed: false,
  };
  const diskMatch = out.match(/__SEAL_DISK_LOW__:(\d+):(\d+)/);
  if (diskMatch) {
    res.lowDisk = { availMb: Number(diskMatch[1]), minMb: Number(diskMatch[2]) };
  }
  const inodeMatch = out.match(/__SEAL_INODES_LOW__:(\d+):(\d+)/);
  if (inodeMatch) {
    res.lowInodes = { avail: Number(inodeMatch[1]), min: Number(inodeMatch[2]) };
  }
  const tmpDiskMatch = out.match(/__SEAL_TMP_DISK_LOW__:(\d+):(\d+)/);
  if (tmpDiskMatch) {
    res.lowTmpDisk = { availMb: Number(tmpDiskMatch[1]), minMb: Number(tmpDiskMatch[2]) };
  }
  const tmpInodeMatch = out.match(/__SEAL_TMP_INODES_LOW__:(\d+):(\d+)/);
  if (tmpInodeMatch) {
    res.lowTmpInodes = { avail: Number(tmpInodeMatch[1]), min: Number(tmpInodeMatch[2]) };
  }
  if (out.includes("__SEAL_TMP_MISSING__")) res.tmpMissing = true;
  if (out.includes("__SEAL_NOEXEC__")) res.noexecInstall = true;
  const toolMatches = out.match(/__SEAL_TOOL_MISSING__:[^\s]+/g) || [];
  if (toolMatches.length) {
    res.missingTools = toolMatches.map((line) => line.split(":")[1]).filter(Boolean);
  }
  if (out.includes("__SEAL_SUDO_MISSING__")) res.missingSudo = true;
  if (out.includes("__SEAL_DISK_CHECK_FAILED__")) res.diskCheckFailed = true;
  if (out.includes("__SEAL_INODES_CHECK_FAILED__")) res.inodeCheckFailed = true;
  if (out.includes("__SEAL_TMP_DISK_CHECK_FAILED__")) res.tmpDiskCheckFailed = true;
  if (out.includes("__SEAL_TMP_INODES_CHECK_FAILED__")) res.tmpInodeCheckFailed = true;
  return res;
}

function buildPayloadExtrasTar(releaseDir, appName, buildId) {
  if (!releaseDir || !fileExists(releaseDir)) return null;
  const entries = fs.readdirSync(releaseDir, { withFileTypes: true })
    .map((entry) => entry.name)
    .filter((name) => !["b", "r", "config.runtime.json5"].includes(name));
  if (!entries.length) return null;
  const tmpDir = fs.mkdtempSync(path.join(resolveTmpBase(), "seal-payload-"));
  const tarName = `${appName || "app"}-extras-${buildId || Date.now()}.tgz`;
  const tarPath = path.join(tmpDir, tarName);
  const res = spawnSyncSafe("tar", ["-czf", tarPath, "-C", releaseDir, ...entries], { stdio: "pipe" });
  if (!res.ok) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    throw new Error(`payload extras tar failed (status=${res.status})`);
  }
  return { tarPath, tmpDir };
}

function shQuote(value) {
  const str = String(value);
  return "'" + str.replace(/'/g, "'\\''") + "'";
}

function sshStrictHostKeyChecking(targetCfg) {
  return normalizeStrictHostKeyChecking(targetCfg ? targetCfg.sshStrictHostKeyChecking : undefined);
}

function resolveThinMode(targetCfg) {
  if (targetCfg && typeof targetCfg._thinMode === "string") {
    return targetCfg._thinMode;
  }
  const raw = targetCfg && targetCfg.thin ? targetCfg.thin.mode : null;
  const norm = normalizeThinMode(raw);
  if (raw !== undefined && raw !== null && norm === null) {
    throw new Error(`Invalid target.thin.mode: ${raw} (expected: split|single)`);
  }
  return norm || "aio";
}

function sshPort(targetCfg) {
  return normalizeSshPort(targetCfg ? targetCfg.sshPort : undefined);
}

function sshExecTarget(targetCfg, params) {
  return sshExec({ ...params, strictHostKeyChecking: sshStrictHostKeyChecking(targetCfg), sshPort: sshPort(targetCfg) });
}

function scpToTarget(targetCfg, params) {
  return scpTo({ ...params, strictHostKeyChecking: sshStrictHostKeyChecking(targetCfg), sshPort: sshPort(targetCfg) });
}

function scpFromTarget(targetCfg, params) {
  return scpFrom({ ...params, strictHostKeyChecking: sshStrictHostKeyChecking(targetCfg), sshPort: sshPort(targetCfg) });
}

const CODEC_BIN_MAGIC = "SLCB";
const CODEC_BIN_VERSION = 1;
const CODEC_BIN_HASH_LEN = 32;
const CODEC_BIN_LEN = 4 + 1 + 1 + 2 + CODEC_BIN_HASH_LEN;
const THIN_RUNTIME_VERSION_FILE = "nv";
const RUNTIME_MARKER_LEN = 32;

function readCodecHashFromBin(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < CODEC_BIN_LEN) return null;
  if (buf.slice(0, 4).toString("ascii") !== CODEC_BIN_MAGIC) return null;
  if (buf[4] !== CODEC_BIN_VERSION) return null;
  if (buf[5] !== CODEC_BIN_HASH_LEN) return null;
  const hash = buf.slice(8, 8 + CODEC_BIN_HASH_LEN);
  return hash.toString("hex");
}

function hashRuntimeVersion(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function normalizeRuntimeMarker(buf) {
  if (!Buffer.isBuffer(buf)) return null;
  if (buf.length === RUNTIME_MARKER_LEN) return buf.toString("hex");
  const text = buf.toString("utf-8").trim();
  if (!text) return null;
  return hashRuntimeVersion(text);
}

function readThinCodecHashLocal(releaseDir) {
  if (!releaseDir) return null;
  const candidates = [
    path.join(releaseDir, "r", "c"),
    path.join(releaseDir, "c"),
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

function readThinRuntimeVersionLocal(releaseDir) {
  if (!releaseDir) return null;
  const candidates = [
    path.join(releaseDir, "r", THIN_RUNTIME_VERSION_FILE),
    path.join(releaseDir, THIN_RUNTIME_VERSION_FILE),
  ];
  for (const p of candidates) {
    if (!fileExists(p)) continue;
    try {
      const buf = fs.readFileSync(p);
      const marker = normalizeRuntimeMarker(buf);
      if (marker) return marker;
    } catch {
      return null;
    }
  }
  return null;
}

function readThinCodecHashRemote(targetCfg, { user, host, filePath }) {
  const res = sshExecTarget(targetCfg, {
    user,
    host,
    args: ["bash", "-c", `if [ -f ${shQuote(filePath)} ]; then (base64 -w 0 ${shQuote(filePath)} 2>/dev/null || base64 ${shQuote(filePath)} | tr -d '\\n'); fi`],
    stdio: "pipe",
  });
  if (!res.ok) return null;
  const text = (res.stdout || "").trim();
  if (!text) return null;
  try {
    const buf = Buffer.from(text, "base64");
    return readCodecHashFromBin(buf);
  } catch {
    return null;
  }
}

function readThinRuntimeVersionRemote(targetCfg, { user, host, filePath }) {
  const res = sshExecTarget(targetCfg, {
    user,
    host,
    args: ["bash", "-c", `if [ -f ${shQuote(filePath)} ]; then (base64 -w 0 ${shQuote(filePath)} 2>/dev/null || base64 ${shQuote(filePath)} | tr -d '\\n'); fi`],
    stdio: "pipe",
  });
  if (!res.ok) return null;
  const text = (res.stdout || "").trim();
  if (!text) return null;
  try {
    const buf = Buffer.from(text, "base64");
    return normalizeRuntimeMarker(buf);
  } catch {
    return null;
  }
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

function readArtifactFolderName(artifactPath) {
  if (!artifactPath) return null;
  try {
    return getTarRoot(artifactPath);
  } catch (e) {
    throw new Error(`Invalid artifact: ${e && e.message ? e.message : String(e)}`);
  }
}

function buildRemoteTarValidateCmd(remoteArtifactTmpQ, expectedRoot) {
  const expectedQ = shQuote(expectedRoot || "");
  const parts = [
    `expected=${expectedQ}`,
    "root=\"\"",
    "seen=0",
    "while IFS= read -r entry; do",
    "  seen=1",
    "  p=\"${entry#./}\"",
    "  p=\"${p//\\\\/\\/}\"",
    "  if [ -z \"$p\" ]; then echo \"__SEAL_TAR_BAD__ empty\" >&2; exit 10; fi",
    "  if [ -z \"$root\" ]; then root=\"${p%%/*}\"; if [ -z \"$root\" ]; then echo \"__SEAL_TAR_BAD__ emptyroot\" >&2; exit 11; fi; if [ -n \"$expected\" ] && [ \"$root\" != \"$expected\" ]; then echo \"__SEAL_TAR_ROOT__ $root\" >&2; exit 12; fi; fi",
    "  case \"$p\" in /*) echo \"__SEAL_TAR_BAD__ $p\" >&2; exit 13;; [A-Za-z]:/*) echo \"__SEAL_TAR_BAD__ $p\" >&2; exit 14;; esac",
    "  echo \"$p\" | grep -qE '(^|/)\\.\\.(/|$)' && { echo \"__SEAL_TAR_BAD__ $p\" >&2; exit 15; }",
    "  if [ \"$p\" != \"$root\" ] && [ \"${p#${root}/}\" = \"$p\" ]; then echo \"__SEAL_TAR_BAD__ $p\" >&2; exit 16; fi",
    `done < <(tar -tzf ${remoteArtifactTmpQ})`,
    "if [ \"$seen\" = \"0\" ]; then echo \"__SEAL_TAR_BAD__ empty\" >&2; exit 17; fi",
  ];
  return `( ${parts.join("\n")} )`;
}

function isRemoteTarFailure(output) {
  const text = String(output || "").toLowerCase();
  if (!text) return false;
  if (text.includes("__seal_tar_bad__") || text.includes("__seal_tar_root__")) return true;
  if (text.includes("tar:") && (text.includes("unexpected") || text.includes("invalid") || text.includes("error") || text.includes("short read"))) {
    return true;
  }
  if (text.includes("gzip:") && (text.includes("unexpected") || text.includes("invalid") || text.includes("not in gzip format"))) {
    return true;
  }
  return false;
}

function buildArtifactCorruptHint(targetCfg) {
  const label = targetLabel(targetCfg);
  return `Hint: Artifact appears corrupted or incomplete on target. Rebuild and re-run: seal ship ${label} (or re-upload with seal deploy ${label} --artifact <file>).`;
}

function bootstrapHint(targetCfg, layout, user, host, issues) {
  const targetName = targetLabel(targetCfg);
  const owner = shQuote(`${user}:${user}`);
  const port = sshPort(targetCfg);
  const portFlag = port ? `-p ${port} ` : "";
  const manual = `ssh -t ${portFlag}${user}@${host} "sudo mkdir -p ${shQuote(layout.releasesDir)} ${shQuote(layout.sharedDir)} && sudo chown -R ${owner} ${shQuote(layout.installDir)}"`;
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
    "Bootstrap uses sudo to create install dirs and chown them to the SSH user, then installs runner+unit after deploy.",
    `Or (build + deploy): seal ship ${targetName} --bootstrap`,
    "If you cannot use passwordless sudo, run manually:",
    manualLine,
  ].join("\n");
}

function collectPreflightIssues(out, layout) {
  const issues = [];
  if (out.includes("__SEAL_MISSING_DIR__")) issues.push(`Missing installDir: ${layout.installDir}`);
  if (out.includes("__SEAL_NOT_WRITABLE__")) issues.push(`InstallDir not writable: ${layout.installDir}`);
  if (out.includes("__SEAL_NOT_WRITABLE_RELEASES__")) issues.push(`Releases dir not writable: ${layout.releasesDir}`);
  if (out.includes("__SEAL_NOT_WRITABLE_SHARED__")) issues.push(`Shared dir not writable: ${layout.sharedDir}`);
  if (out.includes("__SEAL_MISSING_RUNNER__")) issues.push(`Missing runner: ${layout.runner}`);
  if (out.includes("__SEAL_MISSING_UNIT__")) issues.push(`Missing systemd unit: ${layout.serviceFile}`);
  return issues;
}

function requireServiceFilesSsh(targetCfg) {
  const { res, layout, user, host } = checkRemoteWritable(targetCfg, { requireService: true });
  const out = `${res.stdout}\n${res.stderr}`.trim();
  if (!res.ok) {
    throw new Error(`ssh preflight failed${formatSshFailure(res) || (out || res.error ? `: ${out || res.error}` : "")}`);
  }
  const issues = collectPreflightIssues(out, layout);
  if (issues.length) {
    throw new Error(bootstrapHint(targetCfg, layout, user, host, issues));
  }
}

function checkRemoteWritable(targetCfg, opts) {
  const { user, host } = sshUserHost(targetCfg);
  const layout = remoteLayout(targetCfg);
  const requireService = !(opts && opts.requireService === false);
  const minFreeMb = resolvePreflightThreshold(targetCfg, "minFreeMb", "SEAL_PREFLIGHT_MIN_FREE_MB", 100);
  const minFreeInodes = resolvePreflightThreshold(targetCfg, "minFreeInodes", "SEAL_PREFLIGHT_MIN_FREE_INODES", 1000);
  const minTmpFreeMb = resolvePreflightThreshold(targetCfg, "tmpMinFreeMb", "SEAL_PREFLIGHT_TMP_MIN_FREE_MB", 100);
  const minTmpFreeInodes = resolvePreflightThreshold(targetCfg, "tmpMinFreeInodes", "SEAL_PREFLIGHT_TMP_MIN_FREE_INODES", 1000);
  const tmpDir = resolveTmpDir(targetCfg);
  const requireTools = resolvePreflightTools(targetCfg);
  const allowNoexec = resolveNoexecPolicy(targetCfg) ? 1 : 0;
  const requireSudo = resolveSudoRequired(targetCfg) ? 1 : 0;
  const forceSudoFail = process.env.SEAL_PREFLIGHT_FORCE_SUDO_FAIL === "1" ? 1 : 0;
  const serviceChecks = requireService
    ? `
  if [ ! -f "$RUNNER" ]; then issues+=("__SEAL_MISSING_RUNNER__"); fi
  if [ ! -f "$UNIT" ]; then issues+=("__SEAL_MISSING_UNIT__"); fi
`
    : "";
  const cmd = ["bash", "-c", `
ROOT=${shQuote(layout.installDir)}
REL=${shQuote(layout.releasesDir)}
SHARED=${shQuote(layout.sharedDir)}
RUNNER=${shQuote(layout.runner)}
UNIT=${shQuote(layout.serviceFile)}
MIN_MB=${Math.trunc(minFreeMb)}
MIN_INODES=${Math.trunc(minFreeInodes)}
TMP_DIR=${shQuote(tmpDir)}
TMP_MIN_MB=${Math.trunc(minTmpFreeMb)}
TMP_MIN_INODES=${Math.trunc(minTmpFreeInodes)}
ALLOW_NOEXEC=${allowNoexec}
REQUIRED_TOOLS=${shQuote(requireTools.join(" "))}
REQUIRE_SUDO=${requireSudo}
FORCE_SUDO_FAIL=${forceSudoFail}
issues=()
ROOT_OK=0
TMP_OK=0

if [ ! -d "$ROOT" ]; then
  issues+=("__SEAL_MISSING_DIR__")
else
  ROOT_OK=1
  if [ ! -w "$ROOT" ]; then issues+=("__SEAL_NOT_WRITABLE__"); fi
  if [ -d "$REL" ] && [ ! -w "$REL" ]; then issues+=("__SEAL_NOT_WRITABLE_RELEASES__"); fi
  if [ -d "$SHARED" ] && [ ! -w "$SHARED" ]; then issues+=("__SEAL_NOT_WRITABLE_SHARED__"); fi
fi

if [ -d "$TMP_DIR" ]; then
  TMP_OK=1
else
  issues+=("__SEAL_TMP_MISSING__")
fi

if command -v df >/dev/null 2>&1; then
  if [ "$ROOT_OK" -eq 1 ]; then
    AVAIL_KB="$(df -Pk "$ROOT" 2>/dev/null | awk 'NR==2 {print $4}')"
    if [ -n "$AVAIL_KB" ]; then
      AVAIL_MB=$((AVAIL_KB / 1024))
      if [ "$AVAIL_MB" -lt "$MIN_MB" ]; then
        issues+=("__SEAL_DISK_LOW__:\${AVAIL_MB}:\${MIN_MB}")
      fi
    else
      issues+=("__SEAL_DISK_CHECK_FAILED__")
    fi
    AVAIL_INODES="$(df -Pi "$ROOT" 2>/dev/null | awk 'NR==2 {print $4}')"
    if [ -n "$AVAIL_INODES" ]; then
      if [ "$AVAIL_INODES" -lt "$MIN_INODES" ]; then
        issues+=("__SEAL_INODES_LOW__:\${AVAIL_INODES}:\${MIN_INODES}")
      fi
    else
      issues+=("__SEAL_INODES_CHECK_FAILED__")
    fi
  fi
  if [ "$TMP_OK" -eq 1 ]; then
    TMP_AVAIL_KB="$(df -Pk "$TMP_DIR" 2>/dev/null | awk 'NR==2 {print $4}')"
    if [ -n "$TMP_AVAIL_KB" ]; then
      TMP_AVAIL_MB=$((TMP_AVAIL_KB / 1024))
      if [ "$TMP_AVAIL_MB" -lt "$TMP_MIN_MB" ]; then
        issues+=("__SEAL_TMP_DISK_LOW__:\${TMP_AVAIL_MB}:\${TMP_MIN_MB}")
      fi
    else
      issues+=("__SEAL_TMP_DISK_CHECK_FAILED__")
    fi
    TMP_AVAIL_INODES="$(df -Pi "$TMP_DIR" 2>/dev/null | awk 'NR==2 {print $4}')"
    if [ -n "$TMP_AVAIL_INODES" ]; then
      if [ "$TMP_AVAIL_INODES" -lt "$TMP_MIN_INODES" ]; then
        issues+=("__SEAL_TMP_INODES_LOW__:\${TMP_AVAIL_INODES}:\${TMP_MIN_INODES}")
      fi
    else
      issues+=("__SEAL_TMP_INODES_CHECK_FAILED__")
    fi
  fi
  if [ "$ROOT_OK" -eq 1 ] && command -v findmnt >/dev/null 2>&1; then
    if [ "$ALLOW_NOEXEC" -ne 1 ]; then
      OPTS="$(findmnt -no OPTIONS --target "$ROOT" 2>/dev/null || true)"
      if echo "$OPTS" | grep -q "noexec"; then
        issues+=("__SEAL_NOEXEC__")
      fi
    fi
  fi
else
  if [ "$ROOT_OK" -eq 1 ]; then
    issues+=("__SEAL_DISK_CHECK_FAILED__")
    issues+=("__SEAL_INODES_CHECK_FAILED__")
  fi
  if [ "$TMP_OK" -eq 1 ]; then
    issues+=("__SEAL_TMP_DISK_CHECK_FAILED__")
    issues+=("__SEAL_TMP_INODES_CHECK_FAILED__")
  fi
fi

if [ -n "$REQUIRED_TOOLS" ]; then
  for tool in $REQUIRED_TOOLS; do
    if ! command -v "$tool" >/dev/null 2>&1; then
      issues+=("__SEAL_TOOL_MISSING__:$tool")
    fi
  done
fi
if [ "$REQUIRE_SUDO" -eq 1 ]; then
  if [ "$FORCE_SUDO_FAIL" -eq 1 ]; then
    issues+=("__SEAL_SUDO_MISSING__")
  else
    if ! sudo -n true >/dev/null 2>&1; then
      issues+=("__SEAL_SUDO_MISSING__")
    fi
  fi
fi
${serviceChecks}

if [ "\${#issues[@]}" -eq 0 ]; then
  echo "__SEAL_OK__"
else
  printf "%s\\n" "\${issues[@]}"
fi
exit 0
`];
  const res = sshExecTarget(targetCfg, { user, host, args: cmd, stdio: "pipe" });
  return { res, layout, user, host };
}

function bootstrapSsh(targetCfg) {
  const { user, host } = sshUserHost(targetCfg);
  const layout = remoteLayout(targetCfg);
  const tmpDir = resolveTmpDir(targetCfg);

  const sudoCheck = sshExecTarget(targetCfg, { user, host, args: ["bash", "-c", "sudo -n true"], stdio: "pipe" });
  if (!sudoCheck.ok) {
  const owner = shQuote(`${user}:${user}`);
  const port = sshPort(targetCfg);
  const portFlag = port ? `-p ${port} ` : "";
  const manual = `ssh -t ${portFlag}${user}@${host} "sudo mkdir -p ${shQuote(layout.releasesDir)} ${shQuote(layout.sharedDir)} && sudo chown -R ${owner} ${shQuote(layout.installDir)}"`;
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
    "bash", "-c",
    [
      `sudo -n mkdir -p ${shQuote(layout.releasesDir)} ${shQuote(layout.sharedDir)} ${shQuote(`${layout.installDir}/b`)} ${shQuote(`${layout.installDir}/r`)} ${shQuote(tmpDir)}`,
      `sudo -n chown -R ${shQuote(`${user}:${user}`)} ${shQuote(layout.installDir)}`,
    ].join(" && ")
  ];

  const res = sshExecTarget(targetCfg, { user, host, args: cmd, stdio: "pipe" });
  if (!res.ok) {
    throw new Error(`bootstrap ssh failed (status=${res.status})${formatSshFailure(res)}`);
  }

  ok(`Bootstrap OK on ${host} (dirs ready; service not installed)`);
  return layout;
}

function installServiceSsh(targetCfg, sentinelCfg) {
  const { user: sshUser, host } = sshUserHost(targetCfg);
  const { user: serviceUser, group: serviceGroup } = serviceUserGroup(targetCfg, sshUser);
  const layout = remoteLayout(targetCfg);
  const hardeningCfg = normalizeSystemdHardening(targetCfg?.deploy?.systemdHardening ?? targetCfg?.systemdHardening);
  if (hardeningCfg.enabled && (targetCfg.serviceScope || "system").toLowerCase() === "user") {
    warn("systemdHardening enabled for serviceScope=user; some directives may be ignored. Use serviceScope=system for full hardening.");
  }
  const hardening = renderSystemdHardening({
    config: targetCfg?.deploy?.systemdHardening ?? targetCfg?.systemdHardening,
    installDir: layout.installDir,
  });
  const useSentinel = !!(sentinelCfg && sentinelCfg.enabled);
  const exitCodeBlock = useSentinel ? Number(sentinelCfg.exitCodeBlock || 200) : null;
  const unitLimits = useSentinel
    ? "StartLimitIntervalSec=60\nStartLimitBurst=3\n"
    : "";
  const preventRestart = useSentinel
    ? `RestartPreventExitStatus=${exitCodeBlock}\n`
    : "";

const runnerScript = `#!/usr/bin/env bash
set -euo pipefail
ROOT=${shQuote(layout.installDir)}
if [ -x "$ROOT/b/a" ]; then
  # Thin BOOTSTRAP layout
  REL=""
  if [ -f "$ROOT/current.buildId" ]; then
    BUILD_ID="$(cat "$ROOT/current.buildId" || true)"
    if [ -n "$BUILD_ID" ] && [ -d "$ROOT/releases/$BUILD_ID" ]; then
      REL="$ROOT/releases/$BUILD_ID"
    fi
  fi
  if [ -f "$ROOT/shared/config.json5" ]; then
    cp "$ROOT/shared/config.json5" "$ROOT/config.runtime.json5"
    if [ -n "$REL" ]; then
      cp "$ROOT/shared/config.json5" "$REL/config.runtime.json5"
    fi
  fi
  if [ -n "$REL" ]; then
    cd "$REL"
  else
    cd "$ROOT"
  fi
  exec "$ROOT/b/a"
fi
BUILD_ID="$(cat "$ROOT/current.buildId")"
REL="$ROOT/releases/$BUILD_ID"
if [ ! -d "$REL" ]; then
  echo "[seal] release dir not found: $REL" 1>&2
  exit 2
fi
if [ ! -x "$REL/appctl" ]; then
  echo "[seal] Missing appctl in release: $REL/appctl" 1>&2
  echo "[seal] Fix: redeploy with --bootstrap (reinstall service/runner) or ensure full release upload." 1>&2
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
${unitLimits}

[Service]
Type=simple
User=${serviceUser}
Group=${serviceGroup}
WorkingDirectory=${layout.installDir}
ExecStart=${layout.runner}
Restart=always
RestartSec=1
${preventRestart}
StandardOutput=journal
StandardError=journal

${hardening}
[Install]
WantedBy=multi-user.target
`;

  const sudoCheck = sshExecTarget(targetCfg, { user: sshUser, host, args: ["bash", "-c", "sudo -n true"], stdio: "pipe" });
  if (!sudoCheck.ok) {
    const sudoOut = `${sudoCheck.stdout}\n${sudoCheck.stderr}`.trim();
    const sudoLine = sudoOut.split(/\r?\n/).slice(0, 2).join(" | ");
    const msg = [
      "Service install requires passwordless sudo on the server (BatchMode).",
      `sudo -n true failed: ${sudoLine || "no output"}`,
      `Fix: configure NOPASSWD for ${sshUser} and rerun: seal ship ${targetLabel(targetCfg)} --bootstrap`,
    ].join("\n");
    throw new Error(msg);
  }

  const cmd = [
    "bash", "-c",
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

  const res = sshExecTarget(targetCfg, { user: sshUser, host, args: cmd, stdio: "pipe" });
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

  const listCmd = ["bash", "-c", `ls -1 ${shQuote(layout.releasesDir)} 2>/dev/null || true`];
  const listRes = sshExecTarget(targetCfg, { user, host, args: listCmd, stdio: "pipe" });
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
  const rmCmd = ["bash", "-c", `rm -rf ${rmArgs}`];
  const rmRes = sshExecTarget(targetCfg, { user, host, args: rmCmd, stdio: "pipe" });
  if (!rmRes.ok) {
    warn(`Retention cleanup failed on ${host} (status=${rmRes.status})`);
    return;
  }

  ok(`Retention: removed ${toDelete.length} old release(s) on ${host}`);
}

function deploySsh({ targetCfg, artifactPath, repoConfigPath, pushConfig, bootstrap, policy, releaseDir, buildId, allowAutoBootstrap, payloadOnlyRequired, timing }) {
  const thinMode = resolveThinMode(targetCfg);
  const thinIntegrityMode = targetCfg && targetCfg._thinIntegrityMode ? targetCfg._thinIntegrityMode : null;
  const thinIntegrityFile = targetCfg && targetCfg._thinIntegrityFile ? targetCfg._thinIntegrityFile : "ih";
  const thinIntegritySidecar = !!(targetCfg && targetCfg._thinIntegrityEnabled && thinIntegrityMode === "sidecar");
  const autoBootstrapAllowed = allowAutoBootstrap !== false;
  let effectiveBootstrap = !!bootstrap;
  let autoBootstrap = false;
  const payloadOnlyRequested = !!payloadOnlyRequired;
  let payloadOnlyFallbackReason = null;
  let payloadOnlyFallbackLogged = false;
  const timeSync = timing && timing.timeSync ? timing.timeSync : (label, fn) => fn();
  const tmpDir = resolveTmpDir(targetCfg);
  let lock = null;
  try {
  const { res: preflight, layout, user, host } = timeSync(
    "deploy.ssh.preflight",
    () => checkRemoteWritable(targetCfg, { requireService: !effectiveBootstrap })
  );
  let out = `${preflight.stdout}\n${preflight.stderr}`.trim();
  if (!preflight.ok) {
    throw new Error(`ssh preflight failed${formatSshFailure(preflight) || (out || preflight.error ? `: ${out || preflight.error}` : "")}`);
  }
  const resourceCheck = parsePreflightResources(out);
  if (resourceCheck.lowDisk) {
    const { availMb, minMb } = resourceCheck.lowDisk;
    throw new Error(`ssh preflight failed: low disk space on target (${availMb} MB < ${minMb} MB). Free space or lower target.preflight.minFreeMb/SEAL_PREFLIGHT_MIN_FREE_MB.`);
  }
  if (resourceCheck.lowInodes) {
    const { avail, min } = resourceCheck.lowInodes;
    throw new Error(`ssh preflight failed: low inode count on target (${avail} < ${min}). Clean up files or lower target.preflight.minFreeInodes/SEAL_PREFLIGHT_MIN_FREE_INODES.`);
  }
  if (resourceCheck.lowTmpDisk) {
    const { availMb, minMb } = resourceCheck.lowTmpDisk;
    throw new Error(`ssh preflight failed: low disk space on target (${tmpDir}: ${availMb} MB < ${minMb} MB). Free space or lower target.preflight.tmpMinFreeMb/SEAL_PREFLIGHT_TMP_MIN_FREE_MB.`);
  }
  if (resourceCheck.lowTmpInodes) {
    const { avail, min } = resourceCheck.lowTmpInodes;
    throw new Error(`ssh preflight failed: low inode count on target (${tmpDir}: ${avail} < ${min}). Clean up files or lower target.preflight.tmpMinFreeInodes/SEAL_PREFLIGHT_TMP_MIN_FREE_INODES.`);
  }
  const defaultTmpDir = layout.installDir ? `${layout.installDir}/.seal-tmp` : ".seal-tmp";
  const ignoreTmpMissing = out.includes("__SEAL_MISSING_DIR__") && tmpDir === defaultTmpDir;
  if (resourceCheck.tmpMissing && !ignoreTmpMissing) {
    throw new Error(`ssh preflight failed: tmp dir missing on target (${tmpDir}). Set target.preflight.tmpDir or fix the path.`);
  }
  if (resourceCheck.noexecInstall) {
    throw new Error(`ssh preflight failed: installDir mounted with noexec (${layout.installDir}). Use a different path or set target.preflight.allowNoexec=true.`);
  }
  if (resourceCheck.missingTools && resourceCheck.missingTools.length) {
    throw new Error(`ssh preflight failed: missing tools on target: ${resourceCheck.missingTools.join(", ")}. Install them or set target.preflight.requireTools accordingly.`);
  }
  if (resourceCheck.missingSudo) {
    throw new Error(`ssh preflight failed: passwordless sudo missing on target. Configure NOPASSWD or set target.preflight.requireSudo=false.`);
  }
  if (resourceCheck.diskCheckFailed) {
    warn("SSH preflight: disk space check failed (df unavailable or unreadable).");
  }
  if (resourceCheck.inodeCheckFailed) {
    warn("SSH preflight: inode check failed (df unavailable or unreadable).");
  }
  if (resourceCheck.tmpDiskCheckFailed) {
    warn(`SSH preflight: tmp disk space check failed (${tmpDir}).`);
  }
  if (resourceCheck.tmpInodeCheckFailed) {
    warn(`SSH preflight: tmp inode check failed (${tmpDir}).`);
  }
  let issues = collectPreflightIssues(out, layout);
  if (issues.length && !effectiveBootstrap && autoBootstrapAllowed) {
    if (!lock) lock = acquireDeployLockSsh(targetCfg, tmpDir);
    if (payloadOnlyRequested) {
      payloadOnlyFallbackReason = `target needs bootstrap (${issues.join("; ")})`;
    }
    warn(`Auto bootstrap: ${issues.join("; ")}. Running bootstrap.`);
    timeSync("deploy.ssh.bootstrap", () => bootstrapSsh(targetCfg));
    effectiveBootstrap = true;
    autoBootstrap = true;
    const retry = timeSync(
      "deploy.ssh.preflight_retry",
      () => checkRemoteWritable(targetCfg, { requireService: false })
    );
    out = `${retry.res.stdout}\n${retry.res.stderr}`.trim();
    if (!retry.res.ok) {
      throw new Error(`ssh preflight failed after bootstrap${formatSshFailure(retry.res) || (out || retry.res.error ? `: ${out || retry.res.error}` : "")}`);
    }
    const retryResource = parsePreflightResources(out);
    const retryTmpDir = resolveTmpDir(targetCfg);
    if (retryResource.lowDisk) {
      const { availMb, minMb } = retryResource.lowDisk;
      throw new Error(`ssh preflight failed: low disk space on target (${availMb} MB < ${minMb} MB). Free space or lower target.preflight.minFreeMb/SEAL_PREFLIGHT_MIN_FREE_MB.`);
    }
    if (retryResource.lowInodes) {
      const { avail, min } = retryResource.lowInodes;
      throw new Error(`ssh preflight failed: low inode count on target (${avail} < ${min}). Clean up files or lower target.preflight.minFreeInodes/SEAL_PREFLIGHT_MIN_FREE_INODES.`);
    }
    if (retryResource.lowTmpDisk) {
      const { availMb, minMb } = retryResource.lowTmpDisk;
      throw new Error(`ssh preflight failed: low disk space on target (${retryTmpDir}: ${availMb} MB < ${minMb} MB). Free space or lower target.preflight.tmpMinFreeMb/SEAL_PREFLIGHT_TMP_MIN_FREE_MB.`);
    }
    if (retryResource.lowTmpInodes) {
      const { avail, min } = retryResource.lowTmpInodes;
      throw new Error(`ssh preflight failed: low inode count on target (${retryTmpDir}: ${avail} < ${min}). Clean up files or lower target.preflight.tmpMinFreeInodes/SEAL_PREFLIGHT_TMP_MIN_FREE_INODES.`);
    }
    if (retryResource.tmpMissing) {
      throw new Error(`ssh preflight failed: tmp dir missing on target (${retryTmpDir}). Set target.preflight.tmpDir or fix the path.`);
    }
    if (retryResource.noexecInstall) {
      throw new Error(`ssh preflight failed: installDir mounted with noexec (${layout.installDir}). Use a different path or set target.preflight.allowNoexec=true.`);
    }
    if (retryResource.missingTools && retryResource.missingTools.length) {
      throw new Error(`ssh preflight failed: missing tools on target: ${retryResource.missingTools.join(", ")}. Install them or set target.preflight.requireTools accordingly.`);
    }
    if (retryResource.missingSudo) {
      throw new Error(`ssh preflight failed: passwordless sudo missing on target. Configure NOPASSWD or set target.preflight.requireSudo=false.`);
    }
    if (retryResource.diskCheckFailed) {
      warn("SSH preflight: disk space check failed (df unavailable or unreadable).");
    }
    if (retryResource.inodeCheckFailed) {
      warn("SSH preflight: inode check failed (df unavailable or unreadable).");
    }
    if (retryResource.tmpDiskCheckFailed) {
      warn(`SSH preflight: tmp disk space check failed (${retryTmpDir}).`);
    }
    if (retryResource.tmpInodeCheckFailed) {
      warn(`SSH preflight: tmp inode check failed (${retryTmpDir}).`);
    }
    issues = collectPreflightIssues(out, layout);
  }
  if (issues.length) {
    throw new Error(bootstrapHint(targetCfg, layout, user, host, issues));
  }
  if (!lock) {
    lock = acquireDeployLockSsh(targetCfg, tmpDir);
  }
  let reuseBootstrap = thinMode === "bootstrap" && !effectiveBootstrap;

  const payloadLocal = releaseDir ? path.join(releaseDir, "r", "pl") : null;
  const nativeBootstrapLocal = releaseDir ? path.join(releaseDir, "r", THIN_NATIVE_BOOTSTRAP_FILE) : null;
  const nativeBootstrapPresent = !!(nativeBootstrapLocal && fileExists(nativeBootstrapLocal));
  const nativeBootstrapRequired = !!(targetCfg && targetCfg._thinNativeBootstrapEnabled);
  let payloadOnly = thinMode === "bootstrap" && !effectiveBootstrap && payloadLocal && fileExists(payloadLocal);
  let payloadOnlyReason = null;
  if (!payloadOnly) {
    if (thinMode !== "bootstrap") {
      payloadOnlyReason = "target not in thin-split (bootstrap) mode";
    } else if (effectiveBootstrap) {
      payloadOnlyReason = "bootstrap requested or auto bootstrap active";
    } else if (!releaseDir) {
      payloadOnlyReason = "releaseDir missing";
    } else {
      payloadOnlyReason = "payload file missing in release (r/pl)";
    }
  }
  let payloadCodec = null;
  if (payloadOnly) {
    payloadCodec = readThinCodecHashLocal(releaseDir);
    if (!payloadCodec) {
      warn("Thin bootstrap: codec metadata missing in release; falling back to full upload.");
      payloadOnly = false;
      payloadOnlyReason = "codec metadata missing in release";
      payloadOnlyFallbackLogged = true;
    }
  }
  if (payloadOnly) {
    const checkRt = timeSync("deploy.ssh.check_runtime", () => sshExecTarget(targetCfg, {
      user,
      host,
      args: ["bash", "-c", `if [ -x ${shQuote(`${layout.installDir}/b/a`)} ] && [ -f ${shQuote(`${layout.installDir}/r/rt`)} ]; then echo __SEAL_THIN_RT_OK__; else echo __SEAL_THIN_RT_MISSING__; fi`],
      stdio: "pipe",
    }));
    if (!checkRt.ok || !(checkRt.stdout || "").includes("__SEAL_THIN_RT_OK__")) {
      warn("Thin bootstrap: runtime/launcher missing on target; falling back to full upload.");
      payloadOnly = false;
      payloadOnlyReason = "runtime/launcher missing on target";
      payloadOnlyFallbackLogged = true;
    }
  }
  if (payloadOnly && nativeBootstrapRequired) {
    const nbCheck = timeSync("deploy.ssh.check_native_bootstrap", () => sshExecTarget(targetCfg, {
      user,
      host,
      args: ["bash", "-c", `if [ -f ${shQuote(`${layout.installDir}/r/${THIN_NATIVE_BOOTSTRAP_FILE}`)} ]; then echo __SEAL_THIN_NB_OK__; else echo __SEAL_THIN_NB_MISSING__; fi`],
      stdio: "pipe",
    }));
    if (!nbCheck.ok || !(nbCheck.stdout || "").includes("__SEAL_THIN_NB_OK__")) {
      warn("Thin bootstrap: native bootstrap missing on target; falling back to full upload.");
      payloadOnly = false;
      payloadOnlyReason = "native bootstrap missing on target";
      payloadOnlyFallbackLogged = true;
    }
  }
  if (payloadOnly && thinIntegritySidecar) {
    const ihCheck = timeSync("deploy.ssh.check_integrity_sidecar", () => sshExecTarget(targetCfg, {
      user,
      host,
      args: ["bash", "-c", `if [ -f ${shQuote(`${layout.installDir}/r/${thinIntegrityFile}`)} ]; then echo __SEAL_THIN_IH_OK__; else echo __SEAL_THIN_IH_MISSING__; fi`],
      stdio: "pipe",
    }));
    if (!ihCheck.ok || !(ihCheck.stdout || "").includes("__SEAL_THIN_IH_OK__")) {
      warn("Thin bootstrap: integrity sidecar missing on target; falling back to full upload.");
      payloadOnly = false;
      payloadOnlyReason = "integrity sidecar missing on target";
      payloadOnlyFallbackLogged = true;
    }
  }
  if (payloadOnly) {
    const remoteCodec = timeSync("deploy.ssh.check_codec", () => readThinCodecHashRemote(targetCfg, {
      user,
      host,
      filePath: `${layout.installDir}/r/c`,
    }));
    if (!remoteCodec) {
      warn("Thin bootstrap: codec metadata missing on target; falling back to full upload.");
      payloadOnly = false;
      payloadOnlyReason = "codec metadata missing on target";
      payloadOnlyFallbackLogged = true;
    } else if (remoteCodec !== payloadCodec) {
      warn("Thin bootstrap: codec mismatch on target; falling back to full upload.");
      payloadOnly = false;
      payloadOnlyReason = "codec mismatch on target";
      payloadOnlyFallbackLogged = true;
    }
  }
  if (payloadOnly) {
    const localRuntimeVersion = readThinRuntimeVersionLocal(releaseDir);
    if (!localRuntimeVersion) {
      warn("Thin bootstrap: runtime version metadata missing in release; falling back to full upload.");
      payloadOnly = false;
      payloadOnlyReason = "node version missing in release";
      payloadOnlyFallbackLogged = true;
    } else {
      const remoteRuntimeVersion = timeSync("deploy.ssh.check_runtime_version", () => readThinRuntimeVersionRemote(targetCfg, {
        user,
        host,
        filePath: `${layout.installDir}/r/${THIN_RUNTIME_VERSION_FILE}`,
      }));
      if (!remoteRuntimeVersion) {
        warn("Thin bootstrap: runtime version metadata missing on target; falling back to full upload.");
        payloadOnly = false;
        payloadOnlyReason = "node version missing on target";
        payloadOnlyFallbackLogged = true;
      } else if (remoteRuntimeVersion !== localRuntimeVersion) {
        warn(`Thin bootstrap: node version mismatch (target ${remoteRuntimeVersion}, release ${localRuntimeVersion}); falling back to full upload.`);
        payloadOnly = false;
        payloadOnlyReason = `node version mismatch (target ${remoteRuntimeVersion})`;
        payloadOnlyFallbackLogged = true;
      }
    }
  }
  const logPayloadOnlySkip = payloadOnlyRequested || (thinMode === "bootstrap" && !!releaseDir);
  if (!payloadOnly && logPayloadOnlySkip && !payloadOnlyFallbackLogged) {
    const reason = payloadOnlyFallbackReason || payloadOnlyReason || "unknown reason";
    const log = payloadOnlyRequested ? warn : info;
    log(`Payload-only skipped (${reason}). Falling back to full upload.`);
  }
  if (reuseBootstrap) {
    if (!releaseDir) {
      warn("Thin bootstrap: releaseDir unavailable; copying full bootstrap.");
      reuseBootstrap = false;
    } else {
      const releaseCodec = readThinCodecHashLocal(releaseDir);
      if (!releaseCodec) {
        warn("Thin bootstrap: codec metadata missing in release; copying full bootstrap.");
        reuseBootstrap = false;
      } else {
        const remoteCodec = readThinCodecHashRemote(targetCfg, {
          user,
          host,
          filePath: `${layout.installDir}/r/c`,
        });
        if (!remoteCodec) {
          warn("Thin bootstrap: codec metadata missing on target; copying full bootstrap.");
          reuseBootstrap = false;
        } else if (remoteCodec !== releaseCodec) {
          warn("Thin bootstrap: codec mismatch on target; copying full bootstrap.");
          reuseBootstrap = false;
        }
      }
    }
    if (reuseBootstrap) {
      const releaseRuntimeVersion = readThinRuntimeVersionLocal(releaseDir);
      if (!releaseRuntimeVersion) {
        warn("Thin bootstrap: runtime version metadata missing in release; copying full bootstrap.");
        reuseBootstrap = false;
      } else {
        const remoteRuntimeVersion = readThinRuntimeVersionRemote(targetCfg, {
          user,
          host,
          filePath: `${layout.installDir}/r/${THIN_RUNTIME_VERSION_FILE}`,
        });
        if (!remoteRuntimeVersion) {
          warn("Thin bootstrap: runtime version metadata missing on target; copying full bootstrap.");
          reuseBootstrap = false;
        } else if (remoteRuntimeVersion !== releaseRuntimeVersion) {
          warn(`Thin bootstrap: node version mismatch (target ${remoteRuntimeVersion}, release ${releaseRuntimeVersion}); copying full bootstrap.`);
          reuseBootstrap = false;
        }
      }
    }
    if (reuseBootstrap && nativeBootstrapRequired) {
      const nbCheck = timeSync("deploy.ssh.check_native_bootstrap_reuse", () => sshExecTarget(targetCfg, {
        user,
        host,
        args: ["bash", "-c", `if [ -f ${shQuote(`${layout.installDir}/r/${THIN_NATIVE_BOOTSTRAP_FILE}`)} ]; then echo __SEAL_THIN_NB_OK__; else echo __SEAL_THIN_NB_MISSING__; fi`],
        stdio: "pipe",
      }));
      if (!nbCheck.ok || !(nbCheck.stdout || "").includes("__SEAL_THIN_NB_OK__")) {
        warn("Thin bootstrap: native bootstrap missing on target; copying full bootstrap.");
        reuseBootstrap = false;
      }
    }
  }

  let shouldPushConfig = !!pushConfig;
  const remoteCfg = `${layout.sharedDir}/config.json5`;
  const remoteCfgQ = shQuote(remoteCfg);

  if (!shouldPushConfig) {
    const cfgCheck = timeSync("deploy.ssh.check_config", () => sshExecTarget(targetCfg, {
      user,
      host,
      args: ["bash", "-c", `if [ -f ${remoteCfgQ} ]; then echo __SEAL_CFG_OK__; else echo __SEAL_CFG_MISSING__; fi`],
      stdio: "pipe",
    }));
    if (!cfgCheck.ok) {
      throw new Error(`ssh config check failed (status=${cfgCheck.status})${formatSshFailure(cfgCheck)}`);
    }
    if ((cfgCheck.stdout || "").includes("__SEAL_CFG_MISSING__")) {
      warn("Remote config missing. Pushing repo config once (safe default for first deploy).");
      shouldPushConfig = true;
    }
  }

  const appName = targetCfg.appName || targetCfg.serviceName || "app";
  const remoteTmpDir = resolveTmpDir(targetCfg);
  const base = artifactPath ? path.basename(artifactPath) : `${appName}-${buildId || "release"}.tgz`;
  const remoteArtifactTmp = `${remoteTmpDir}/${base}`;
  const remoteArtifactTmpQ = shQuote(remoteArtifactTmp);
  const fromTar = artifactPath ? readArtifactFolderName(artifactPath) : null;
  const folderName = fromTar || base.replace(/\.tgz$/, "");
  const relDir = `${layout.releasesDir}/${folderName}`;
  const relDirQ = shQuote(relDir);

  const releasesDirQ = shQuote(layout.releasesDir);
  const sharedDirQ = shQuote(layout.sharedDir);
  const currentFileQ = shQuote(layout.currentFile);

  let res;
  if (payloadOnly) {
    info("Thin bootstrap: payload-only upload (no runtime).");
    const extras = buildPayloadExtrasTar(releaseDir, appName, buildId);
    const tpmFiles = [];
    const tpmPubLocal = releaseDir ? path.join(releaseDir, "r", THIN_TPM_SEAL_PUB_FILE) : null;
    const tpmPrivLocal = releaseDir ? path.join(releaseDir, "r", THIN_TPM_SEAL_PRIV_FILE) : null;
    if (tpmPubLocal && fileExists(tpmPubLocal)) {
      tpmFiles.push({ localPath: tpmPubLocal, file: THIN_TPM_SEAL_PUB_FILE, mode: "644" });
    }
    if (tpmPrivLocal && fileExists(tpmPrivLocal)) {
      tpmFiles.push({ localPath: tpmPrivLocal, file: THIN_TPM_SEAL_PRIV_FILE, mode: "600" });
    }
    let extrasRemote = null;
    const remoteTmp = `${remoteTmpDir}/${appName}-payload-${buildId || Date.now()}.pl`;
    const remoteTmpQ = shQuote(remoteTmp);
    info(`Uploading payload to ${host}:${remoteTmp}`);
    const upPl = timeSync("deploy.ssh.upload_payload", () => scpToTarget(targetCfg, {
      user,
      host,
      localPath: payloadLocal,
      remotePath: remoteTmp,
    }));
    if (!upPl.ok) throw new Error(`scp payload failed (status=${upPl.status})${formatSshFailure(upPl)}`);
    if (extras) {
      extrasRemote = `${remoteTmpDir}/${appName}-extras-${buildId || Date.now()}.tgz`;
      info(`Uploading release extras to ${host}:${extrasRemote}`);
      const upExtras = timeSync("deploy.ssh.upload_extras", () => scpToTarget(targetCfg, {
        user,
        host,
        localPath: extras.tarPath,
        remotePath: extrasRemote,
      }));
      fs.rmSync(extras.tmpDir, { recursive: true, force: true });
      if (!upExtras.ok) throw new Error(`scp extras failed (status=${upExtras.status})${formatSshFailure(upExtras)}`);
    }
    const tpmUploads = [];
    for (const file of tpmFiles) {
      const remoteFile = `${remoteTmpDir}/${appName}-${file.file}-${buildId || Date.now()}.tmp`;
      info(`Uploading TPM seal file to ${host}:${remoteFile}`);
      const upFile = timeSync("deploy.ssh.upload_tpm", () => scpToTarget(targetCfg, {
        user,
        host,
        localPath: file.localPath,
        remotePath: remoteFile,
      }));
      if (!upFile.ok) throw new Error(`scp TPM seal failed (status=${upFile.status})${formatSshFailure(upFile)}`);
      tpmUploads.push({ remote: remoteFile, file: file.file, mode: file.mode });
    }

    const cmdParts = [
      `mkdir -p ${releasesDirQ} ${sharedDirQ}`,
    ];
    if (shouldPushConfig) {
      const tmpCfg = `${remoteTmpDir}/${targetCfg.serviceName}-config.json5`;
      const tmpCfgQ = shQuote(tmpCfg);
      info(`Uploading config to ${host}:${tmpCfg}`);
      const upCfg = timeSync("deploy.ssh.upload_config", () => scpToTarget(targetCfg, {
        user,
        host,
        localPath: repoConfigPath,
        remotePath: tmpCfg,
      }));
      if (!upCfg.ok) throw new Error(`scp config failed (status=${upCfg.status})${formatSshFailure(upCfg)}`);
      cmdParts.push(`cp ${tmpCfgQ} ${remoteCfgQ}`);
      cmdParts.push(`rm -f ${tmpCfgQ}`);
    }

    const bDir = `${layout.installDir}/b`;
    const rDir = `${layout.installDir}/r`;
    const bDirQ = shQuote(bDir);
    const rDirQ = shQuote(rDir);
    const ihSrcQ = shQuote(`${rDir}/${thinIntegrityFile}`);
    const ihDstQ = shQuote(`${relDir}/r/${thinIntegrityFile}`);
    const nbSrcQ = shQuote(`${rDir}/${THIN_NATIVE_BOOTSTRAP_FILE}`);
    const nbDstQ = shQuote(`${relDir}/r/${THIN_NATIVE_BOOTSTRAP_FILE}`);
    const nvSrcQ = shQuote(`${rDir}/${THIN_RUNTIME_VERSION_FILE}`);
    const nvDstQ = shQuote(`${relDir}/r/${THIN_RUNTIME_VERSION_FILE}`);
    const tpmPubDstQ = shQuote(`${relDir}/r/${THIN_TPM_SEAL_PUB_FILE}`);
    const tpmPrivDstQ = shQuote(`${relDir}/r/${THIN_TPM_SEAL_PRIV_FILE}`);
    const tpmPubInstallQ = shQuote(`${rDir}/${THIN_TPM_SEAL_PUB_FILE}`);
    const tpmPrivInstallQ = shQuote(`${rDir}/${THIN_TPM_SEAL_PRIV_FILE}`);
    cmdParts.push(`mkdir -p ${relDirQ}/b ${relDirQ}/r`);
    if (extrasRemote) {
      const extrasRemoteQ = shQuote(extrasRemote);
      cmdParts.push(`tar -xzf ${extrasRemoteQ} -C ${relDirQ}`);
      cmdParts.push(`rm -f ${extrasRemoteQ}`);
    }
    cmdParts.push(`cp ${bDirQ}/a ${relDirQ}/b/a`);
    cmdParts.push(`cp ${rDirQ}/rt ${relDirQ}/r/rt`);
    cmdParts.push(`if [ -f ${rDirQ}/c ]; then cp ${rDirQ}/c ${relDirQ}/r/c; fi`);
    cmdParts.push(`if [ -f ${nbSrcQ} ]; then cp ${nbSrcQ} ${nbDstQ}; fi`);
    cmdParts.push(`if [ -f ${nvSrcQ} ]; then cp ${nvSrcQ} ${nvDstQ}; fi`);
    if (thinIntegritySidecar) {
      cmdParts.push(`if [ -f ${ihSrcQ} ]; then cp ${ihSrcQ} ${ihDstQ}; fi`);
    }
    for (const file of tpmUploads) {
      const tmpQ = shQuote(file.remote);
      const mode = file.mode || "644";
      if (file.file === THIN_TPM_SEAL_PUB_FILE) {
        cmdParts.push(`cp ${tmpQ} ${tpmPubDstQ} && cp ${tmpQ} ${tpmPubInstallQ} && chmod ${mode} ${tpmPubDstQ} ${tpmPubInstallQ}`);
      } else {
        cmdParts.push(`cp ${tmpQ} ${tpmPrivDstQ} && cp ${tmpQ} ${tpmPrivInstallQ} && chmod ${mode} ${tpmPrivDstQ} ${tpmPrivInstallQ}`);
      }
      cmdParts.push(`rm -f ${tmpQ}`);
    }
    cmdParts.push(`cp ${remoteTmpQ} ${relDirQ}/r/pl && chmod 644 ${relDirQ}/r/pl`);
    cmdParts.push(`cp ${remoteTmpQ} ${rDirQ}/pl.tmp && mv ${rDirQ}/pl.tmp ${rDirQ}/pl && chmod 644 ${rDirQ}/pl`);
    cmdParts.push(`echo ${shQuote(folderName)} > ${currentFileQ}`);
    cmdParts.push(`rm -f ${remoteTmpQ}`);

    const fullCmd = ["bash", "-c", cmdParts.join(" && ")];
    res = timeSync("deploy.ssh.apply_payload", () => sshExecTarget(targetCfg, { user, host, args: fullCmd, stdio: "pipe" }));
  } else {
    if (!artifactPath) {
      throw new Error("Full upload requires artifactPath (payload-only fallback unavailable). Provide --artifact or rerun without --payload-only.");
    }
    // Upload artifact
    info(`Uploading artifact to ${host}:${remoteArtifactTmp}`);
    const up = timeSync("deploy.ssh.upload_artifact", () => scpToTarget(targetCfg, {
      user,
      host,
      localPath: artifactPath,
      remotePath: remoteArtifactTmp,
    }));
    if (!up.ok) throw new Error(`scp failed (status=${up.status})${formatSshFailure(up)}`);

    // Extract and switch current
    const cmdParts = [
      `mkdir -p ${releasesDirQ} ${sharedDirQ}`,
    ];

    // Config: only overwrite if explicit or missing
    if (shouldPushConfig) {
      // upload repo config to tmp then move into shared
      const tmpCfg = `${remoteTmpDir}/${targetCfg.serviceName}-config.json5`;
      const tmpCfgQ = shQuote(tmpCfg);
      info(`Uploading config to ${host}:${tmpCfg}`);
      const upCfg = timeSync("deploy.ssh.upload_config", () => scpToTarget(targetCfg, {
        user,
        host,
        localPath: repoConfigPath,
        remotePath: tmpCfg,
      }));
      if (!upCfg.ok) throw new Error(`scp config failed (status=${upCfg.status})${formatSshFailure(upCfg)}`);
      cmdParts.push(buildRemoteTarValidateCmd(remoteArtifactTmpQ, folderName));
      cmdParts.push(`tar -xzf ${remoteArtifactTmpQ} -C ${releasesDirQ}`);
      cmdParts.push(`cp ${tmpCfgQ} ${remoteCfgQ}`);
      cmdParts.push(`rm -f ${tmpCfgQ}`);
    } else {
      cmdParts.push(`if [ ! -f ${remoteCfgQ} ]; then echo '[seal] remote config missing -> creating from repo'; exit 99; fi`);
      cmdParts.push(buildRemoteTarValidateCmd(remoteArtifactTmpQ, folderName));
      cmdParts.push(`tar -xzf ${remoteArtifactTmpQ} -C ${releasesDirQ}`);
    }
    if (thinMode === "bootstrap") {
      const bDir = `${layout.installDir}/b`;
      const rDir = `${layout.installDir}/r`;
      const launcherSrc = `${relDir}/b/a`;
      const rtSrc = `${relDir}/r/rt`;
      const plSrc = `${relDir}/r/pl`;
      const codecSrc = `${relDir}/r/c`;
      const ihSrc = `${relDir}/r/${thinIntegrityFile}`;
      const nbSrc = `${relDir}/r/${THIN_NATIVE_BOOTSTRAP_FILE}`;
      const nvSrc = `${relDir}/r/${THIN_RUNTIME_VERSION_FILE}`;
      const tpmPubSrc = `${relDir}/r/${THIN_TPM_SEAL_PUB_FILE}`;
      const tpmPrivSrc = `${relDir}/r/${THIN_TPM_SEAL_PRIV_FILE}`;
      const bDirQ = shQuote(bDir);
      const rDirQ = shQuote(rDir);
      const launcherSrcQ = shQuote(launcherSrc);
      const rtSrcQ = shQuote(rtSrc);
      const plSrcQ = shQuote(plSrc);
      const codecSrcQ = shQuote(codecSrc);
      const ihSrcQ = shQuote(ihSrc);
      const ihDstQ = shQuote(`${rDir}/${thinIntegrityFile}`);
      const nbSrcQ = shQuote(nbSrc);
      const nbDstQ = shQuote(`${rDir}/${THIN_NATIVE_BOOTSTRAP_FILE}`);
      const nvSrcQ = shQuote(nvSrc);
      const nvDstQ = shQuote(`${rDir}/${THIN_RUNTIME_VERSION_FILE}`);
      const tpmPubSrcQ = shQuote(tpmPubSrc);
      const tpmPrivSrcQ = shQuote(tpmPrivSrc);
      const tpmPubDstQ = shQuote(`${rDir}/${THIN_TPM_SEAL_PUB_FILE}`);
      const tpmPrivDstQ = shQuote(`${rDir}/${THIN_TPM_SEAL_PRIV_FILE}`);
      cmdParts.push(`test -f ${launcherSrcQ}`);
      cmdParts.push(`test -f ${rtSrcQ}`);
      cmdParts.push(`test -f ${plSrcQ}`);
      cmdParts.push(`mkdir -p ${bDirQ} ${rDirQ}`);
      if (reuseBootstrap) {
        cmdParts.push(`if [ -x ${bDirQ}/a ] && [ -f ${rDirQ}/rt ]; then echo '[seal] thin bootstrap: reuse launcher/runtime'; else cp ${launcherSrcQ} ${bDirQ}/a.tmp && mv ${bDirQ}/a.tmp ${bDirQ}/a && chmod 755 ${bDirQ}/a && cp ${rtSrcQ} ${rDirQ}/rt.tmp && mv ${rDirQ}/rt.tmp ${rDirQ}/rt && chmod 644 ${rDirQ}/rt; fi`);
      } else {
        cmdParts.push(`cp ${launcherSrcQ} ${bDirQ}/a.tmp && mv ${bDirQ}/a.tmp ${bDirQ}/a && chmod 755 ${bDirQ}/a`);
        cmdParts.push(`cp ${rtSrcQ} ${rDirQ}/rt.tmp && mv ${rDirQ}/rt.tmp ${rDirQ}/rt && chmod 644 ${rDirQ}/rt`);
      }
      cmdParts.push(`cp ${plSrcQ} ${rDirQ}/pl.tmp && mv ${rDirQ}/pl.tmp ${rDirQ}/pl && chmod 644 ${rDirQ}/pl`);
      cmdParts.push(`if [ -f ${codecSrcQ} ]; then cp ${codecSrcQ} ${rDirQ}/c.tmp && mv ${rDirQ}/c.tmp ${rDirQ}/c && chmod 644 ${rDirQ}/c; fi`);
      cmdParts.push(`if [ -f ${nbSrcQ} ]; then cp ${nbSrcQ} ${nbDstQ}.tmp && mv ${nbDstQ}.tmp ${nbDstQ} && chmod 644 ${nbDstQ}; fi`);
      cmdParts.push(`if [ -f ${nvSrcQ} ]; then cp ${nvSrcQ} ${nvDstQ}.tmp && mv ${nvDstQ}.tmp ${nvDstQ} && chmod 644 ${nvDstQ}; fi`);
      cmdParts.push(`if [ -f ${tpmPubSrcQ} ]; then cp ${tpmPubSrcQ} ${tpmPubDstQ}.tmp && mv ${tpmPubDstQ}.tmp ${tpmPubDstQ} && chmod 644 ${tpmPubDstQ}; fi`);
      cmdParts.push(`if [ -f ${tpmPrivSrcQ} ]; then cp ${tpmPrivSrcQ} ${tpmPrivDstQ}.tmp && mv ${tpmPrivDstQ}.tmp ${tpmPrivDstQ} && chmod 600 ${tpmPrivDstQ}; fi`);
      if (thinIntegritySidecar) {
        cmdParts.push(`if [ -f ${ihSrcQ} ]; then cp ${ihSrcQ} ${ihDstQ}.tmp && mv ${ihDstQ}.tmp ${ihDstQ} && chmod 644 ${ihDstQ}; fi`);
      }
    } else {
      const bFileQ = shQuote(`${layout.installDir}/b/a`);
      const rtFileQ = shQuote(`${layout.installDir}/r/rt`);
      const plFileQ = shQuote(`${layout.installDir}/r/pl`);
      const codecFileQ = shQuote(`${layout.installDir}/r/c`);
      const ihFileQ = shQuote(`${layout.installDir}/r/${thinIntegrityFile}`);
      const nbFileQ = shQuote(`${layout.installDir}/r/${THIN_NATIVE_BOOTSTRAP_FILE}`);
      const nvFileQ = shQuote(`${layout.installDir}/r/${THIN_RUNTIME_VERSION_FILE}`);
      const tpmPubQ = shQuote(`${layout.installDir}/r/${THIN_TPM_SEAL_PUB_FILE}`);
      const tpmPrivQ = shQuote(`${layout.installDir}/r/${THIN_TPM_SEAL_PRIV_FILE}`);
      cmdParts.push(`rm -f ${bFileQ} ${rtFileQ} ${plFileQ} ${codecFileQ} ${ihFileQ} ${nbFileQ} ${nvFileQ} ${tpmPubQ} ${tpmPrivQ}`);
    }
    cmdParts.push(`echo ${shQuote(folderName)} > ${currentFileQ}`);
    cmdParts.push(`rm -f ${remoteArtifactTmpQ}`);

    const fullCmd = ["bash", "-c", cmdParts.join(" && ")];
    res = timeSync("deploy.ssh.apply_release", () => sshExecTarget(targetCfg, { user, host, args: fullCmd, stdio: "pipe" }));
  }
  if (!res.ok && res.status === 99 && !payloadOnly) {
    // Missing config (race) -> push config and retry without reuploading artifact
    warn("Remote config missing (race). Pushing repo config and retrying without reupload.");
    const tmpCheck = sshExecTarget(targetCfg, {
      user,
      host,
      args: ["bash", "-c", `if [ -f ${remoteArtifactTmpQ} ]; then echo __SEAL_TMP_OK__; fi`],
      stdio: "pipe",
    });
    if (!tmpCheck.ok || !(tmpCheck.stdout || "").includes("__SEAL_TMP_OK__")) {
      info(`Re-uploading artifact to ${host}:${remoteArtifactTmp}`);
      const upRetry = scpToTarget(targetCfg, { user, host, localPath: artifactPath, remotePath: remoteArtifactTmp });
      if (!upRetry.ok) throw new Error(`scp failed (status=${upRetry.status})${formatSshFailure(upRetry)}`);
    }

    const tmpCfg = `${resolveTmpDir(targetCfg)}/${targetCfg.serviceName}-config.json5`;
    const tmpCfgQ = shQuote(tmpCfg);
    info(`Uploading config to ${host}:${tmpCfg}`);
    const upCfg = scpToTarget(targetCfg, { user, host, localPath: repoConfigPath, remotePath: tmpCfg });
    if (!upCfg.ok) throw new Error(`scp config failed (status=${upCfg.status})${formatSshFailure(upCfg)}`);

    const retryParts = [
      `mkdir -p ${releasesDirQ} ${sharedDirQ}`,
      buildRemoteTarValidateCmd(remoteArtifactTmpQ, folderName),
      `tar -xzf ${remoteArtifactTmpQ} -C ${releasesDirQ}`,
      `cp ${tmpCfgQ} ${remoteCfgQ}`,
      `rm -f ${tmpCfgQ}`,
    ];
    if (thinMode === "bootstrap") {
      const bDir = `${layout.installDir}/b`;
      const rDir = `${layout.installDir}/r`;
      const launcherSrc = `${relDir}/b/a`;
      const rtSrc = `${relDir}/r/rt`;
      const plSrc = `${relDir}/r/pl`;
      const nbSrc = `${relDir}/r/${THIN_NATIVE_BOOTSTRAP_FILE}`;
      const nvSrc = `${relDir}/r/${THIN_RUNTIME_VERSION_FILE}`;
      const tpmPubSrc = `${relDir}/r/${THIN_TPM_SEAL_PUB_FILE}`;
      const tpmPrivSrc = `${relDir}/r/${THIN_TPM_SEAL_PRIV_FILE}`;
      const bDirQ = shQuote(bDir);
      const rDirQ = shQuote(rDir);
      const launcherSrcQ = shQuote(launcherSrc);
      const rtSrcQ = shQuote(rtSrc);
      const plSrcQ = shQuote(plSrc);
      const nbSrcQ = shQuote(nbSrc);
      const nbDstQ = shQuote(`${rDir}/${THIN_NATIVE_BOOTSTRAP_FILE}`);
      const nvSrcQ = shQuote(nvSrc);
      const nvDstQ = shQuote(`${rDir}/${THIN_RUNTIME_VERSION_FILE}`);
      const tpmPubSrcQ = shQuote(tpmPubSrc);
      const tpmPrivSrcQ = shQuote(tpmPrivSrc);
      const tpmPubDstQ = shQuote(`${rDir}/${THIN_TPM_SEAL_PUB_FILE}`);
      const tpmPrivDstQ = shQuote(`${rDir}/${THIN_TPM_SEAL_PRIV_FILE}`);
      retryParts.push(`test -f ${launcherSrcQ}`);
      retryParts.push(`test -f ${rtSrcQ}`);
      retryParts.push(`test -f ${plSrcQ}`);
      retryParts.push(`mkdir -p ${bDirQ} ${rDirQ}`);
      if (reuseBootstrap) {
        retryParts.push(`if [ -x ${bDirQ}/a ] && [ -f ${rDirQ}/rt ]; then echo '[seal] thin bootstrap: reuse launcher/runtime'; else cp ${launcherSrcQ} ${bDirQ}/a.tmp && mv ${bDirQ}/a.tmp ${bDirQ}/a && chmod 755 ${bDirQ}/a && cp ${rtSrcQ} ${rDirQ}/rt.tmp && mv ${rDirQ}/rt.tmp ${rDirQ}/rt && chmod 644 ${rDirQ}/rt; fi`);
      } else {
        retryParts.push(`cp ${launcherSrcQ} ${bDirQ}/a.tmp && mv ${bDirQ}/a.tmp ${bDirQ}/a && chmod 755 ${bDirQ}/a`);
        retryParts.push(`cp ${rtSrcQ} ${rDirQ}/rt.tmp && mv ${rDirQ}/rt.tmp ${rDirQ}/rt && chmod 644 ${rDirQ}/rt`);
      }
      retryParts.push(`cp ${plSrcQ} ${rDirQ}/pl.tmp && mv ${rDirQ}/pl.tmp ${rDirQ}/pl && chmod 644 ${rDirQ}/pl`);
      retryParts.push(`if [ -f ${nbSrcQ} ]; then cp ${nbSrcQ} ${nbDstQ}.tmp && mv ${nbDstQ}.tmp ${nbDstQ} && chmod 644 ${nbDstQ}; fi`);
      retryParts.push(`if [ -f ${nvSrcQ} ]; then cp ${nvSrcQ} ${nvDstQ}.tmp && mv ${nvDstQ}.tmp ${nvDstQ} && chmod 644 ${nvDstQ}; fi`);
      retryParts.push(`if [ -f ${tpmPubSrcQ} ]; then cp ${tpmPubSrcQ} ${tpmPubDstQ}.tmp && mv ${tpmPubDstQ}.tmp ${tpmPubDstQ} && chmod 644 ${tpmPubDstQ}; fi`);
      retryParts.push(`if [ -f ${tpmPrivSrcQ} ]; then cp ${tpmPrivSrcQ} ${tpmPrivDstQ}.tmp && mv ${tpmPrivDstQ}.tmp ${tpmPrivDstQ} && chmod 600 ${tpmPrivDstQ}; fi`);
    } else {
      const bFileQ = shQuote(`${layout.installDir}/b/a`);
      const rtFileQ = shQuote(`${layout.installDir}/r/rt`);
      const plFileQ = shQuote(`${layout.installDir}/r/pl`);
      const nbFileQ = shQuote(`${layout.installDir}/r/${THIN_NATIVE_BOOTSTRAP_FILE}`);
      const nvFileQ = shQuote(`${layout.installDir}/r/${THIN_RUNTIME_VERSION_FILE}`);
      const tpmPubQ = shQuote(`${layout.installDir}/r/${THIN_TPM_SEAL_PUB_FILE}`);
      const tpmPrivQ = shQuote(`${layout.installDir}/r/${THIN_TPM_SEAL_PRIV_FILE}`);
      retryParts.push(`rm -f ${bFileQ} ${rtFileQ} ${plFileQ} ${nbFileQ} ${nvFileQ} ${tpmPubQ} ${tpmPrivQ}`);
    }
    retryParts.push(`echo ${shQuote(folderName)} > ${currentFileQ}`);
    retryParts.push(`rm -f ${remoteArtifactTmpQ}`);
    res = sshExecTarget(targetCfg, { user, host, args: ["bash", "-c", retryParts.join(" && ")], stdio: "pipe" });
  }
  if (!res.ok) {
    const combined = `${res.stdout || ""}\n${res.stderr || ""}`;
    const hint = isRemoteTarFailure(combined) ? `\n${buildArtifactCorruptHint(targetCfg)}` : "";
    throw new Error(`deploy ssh failed (status=${res.status})${formatSshFailure(res)}${hint}`);
  }

  ok(`Deployed on ${host}: ${folderName}`);

  cleanupReleasesSsh({ targetCfg, current: folderName, policy });
  return { layout, folderName, relDir, autoBootstrap };
  } finally {
    releaseDeployLockSsh(targetCfg, lock);
  }
}

function statusSsh(targetCfg) {
  const { user, host } = sshUserHost(targetCfg);
  const unitName = `${targetCfg.serviceName}.service`;
  const unit = shQuote(unitName);
  const res = sshExecTarget(targetCfg, { user, host, args: ["bash","-c", `sudo -n systemctl status ${unit} --no-pager`], stdio: "pipe" });

  if (res.stdout) process.stdout.write(res.stdout);
  if (res.stderr) process.stderr.write(res.stderr);

  if (res.ok) return;

  const combined = `${res.stdout}\n${res.stderr}`.toLowerCase();
  const missing = combined.includes("could not be found") || combined.includes("not-found") || combined.includes("loaded: not-found");
  if (!missing) {
    if (combined.includes("active:")) return;
    throw new Error(`status failed (status=${res.status ?? "?"})`);
  }

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
  const pres = sshExecTarget(targetCfg, { user, host, args: ["bash","-c", pgrepScript], stdio: "pipe" });
  if (!pres.ok) {
    const pOut = `${pres.stdout}\n${pres.stderr}`.trim();
    warn(`pgrep failed: ${pOut || pres.error || "unknown"}`);
    return;
  }
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

function systemctlIsActiveSsh(targetCfg) {
  const { user, host } = sshUserHost(targetCfg);
  const unitName = `${targetCfg.serviceName}.service`;
  const unit = shQuote(unitName);
  const res = sshExecTarget(targetCfg, { user, host, args: ["bash","-c", `sudo -n systemctl is-active ${unit}`], stdio: "pipe" });
  const output = `${res.stdout || ""}\n${res.stderr || ""}`.trim();
  const state = output.split(/\s+/)[0] || "";
  const lower = output.toLowerCase();
  if (lower.includes("sudo") && (lower.includes("password") || lower.includes("no tty") || lower.includes("not in the sudoers"))) {
    return { ok: false, fatal: true, state: "sudo", output };
  }
  if (lower.includes("could not be found") || lower.includes("not-found")) {
    return { ok: false, fatal: true, state: "not-found", output };
  }
  if (state === "failed") {
    return { ok: false, fatal: true, state, output };
  }
  return { ok: res.ok && state === "active", state, output };
}

function systemctlStatusSsh(targetCfg) {
  const { user, host } = sshUserHost(targetCfg);
  const unitName = `${targetCfg.serviceName}.service`;
  const unit = shQuote(unitName);
  const res = sshExecTarget(targetCfg, { user, host, args: ["bash","-c", `sudo -n systemctl status ${unit} --no-pager -l`], stdio: "pipe" });
  const output = `${res.stdout || ""}\n${res.stderr || ""}`.trim();
  return { ok: res.ok, output };
}

function systemctlShowSsh(targetCfg, prop) {
  const { user, host } = sshUserHost(targetCfg);
  const unitName = `${targetCfg.serviceName}.service`;
  const unit = shQuote(unitName);
  const res = sshExecTarget(targetCfg, {
    user,
    host,
    args: ["bash", "-c", `sudo -n systemctl show ${unit} -p ${shQuote(prop)} --value`],
    stdio: "pipe",
  });
  if (!res.ok) return "";
  return String(res.stdout || "").trim();
}

function buildSystemdHint(statusOutput, opts, execMainStatus) {
  const hints = [];
  const targetLabel = (opts && opts.targetName) ? opts.targetName : "<target>";
  if (String(statusOutput || "").toLowerCase().includes("status=200/chdir")) {
    hints.push(`Missing WorkingDirectory/installDir. Run: seal ship ${targetLabel} --bootstrap`);
  }
  if (/appctl: No such file or directory|Missing appctl/i.test(statusOutput)) {
    hints.push(`Missing release files. Run: seal ship ${targetLabel} --bootstrap`);
  }
  const sentinelEnabled = !!(opts && opts.sentinelEnabled);
  const sentinelExit = Number.isFinite(Number(opts && opts.sentinelExitCode)) ? Number(opts.sentinelExitCode) : 200;
  if (sentinelEnabled && Number(execMainStatus) === sentinelExit) {
    hints.push(`Sentinel missing/mismatch. Run: seal sentinel install ${targetLabel} (or seal ship ${targetLabel} --bootstrap)`);
  }
  if (sentinelEnabled && /\[thin\] runtime invalid/i.test(statusOutput)) {
    hints.push(`Possible sentinel block. Run: seal sentinel install ${targetLabel}`);
  }
  return hints.length ? `Hint: ${hints.join(" | ")}` : "";
}

function checkHttpSsh(targetCfg, url, timeoutMs) {
  const { user, host } = sshUserHost(targetCfg);
  const tm = Math.max(1, Math.ceil(timeoutMs / 1000));
  const urlQ = shQuote(url);
  const script = [
    "set -euo pipefail",
    "export NO_PROXY=127.0.0.1,localhost",
    "export no_proxy=127.0.0.1,localhost",
    `if command -v curl >/dev/null 2>&1; then curl -fsS --noproxy \"*\" --max-time ${tm} ${urlQ} >/dev/null; exit $?; fi`,
    `if command -v wget >/dev/null 2>&1; then wget -q -O /dev/null --timeout=${tm} ${urlQ}; exit $?; fi`,
    "echo '__SEAL_HTTP_TOOL_MISSING__' >&2; exit 127",
  ].join("; ");
  const res = sshExecTarget(targetCfg, { user, host, args: ["bash", "-c", script], stdio: "pipe" });
  const output = `${res.stdout || ""}\n${res.stderr || ""}`.trim();
  if (!res.ok && output.includes("__SEAL_HTTP_TOOL_MISSING__")) {
    return { ok: false, fatal: true, error: "missing_http_tool", output };
  }
  return { ok: res.ok, output };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForReadySsh(targetCfg, opts = {}) {
  const mode = opts.mode || (opts.url ? "both" : "systemd");
  const url = opts.url || null;
  const timeoutMs = Number.isFinite(opts.timeoutMs) && opts.timeoutMs > 0 ? Math.floor(opts.timeoutMs) : 60000;
  const intervalMs = Number.isFinite(opts.intervalMs) && opts.intervalMs > 0 ? Math.floor(opts.intervalMs) : 1000;
  const httpTimeoutMs = Number.isFinite(opts.httpTimeoutMs) && opts.httpTimeoutMs > 0 ? Math.floor(opts.httpTimeoutMs) : 2000;

  if ((mode === "http" || mode === "both") && !url) {
    throw new Error("readiness http mode requires url");
  }

  info(`Waiting for readiness (${targetCfg.host || "ssh"}, mode=${mode}, timeout=${timeoutMs}ms)`);
  const deadline = Date.now() + timeoutMs;
  let lastState = "";
  let lastHttp = "";

  while (Date.now() < deadline) {
    let systemdOk = true;
    let httpOk = true;

    if (mode === "systemd" || mode === "both") {
      const state = systemctlIsActiveSsh(targetCfg);
      lastState = state.state || state.output || "";
      if (state.fatal) {
        const statusOut = systemctlStatusSsh(targetCfg);
        const execMainStatus = systemctlShowSsh(targetCfg, "ExecMainStatus");
        const hint = buildSystemdHint(statusOut.output || "", opts, execMainStatus);
        throw new Error(`readiness failed: systemd ${state.state}${statusOut.output ? `\n${statusOut.output}` : ""}${hint ? `\n${hint}` : ""}`);
      }
      systemdOk = state.ok;
    }

    if (mode === "http" || mode === "both") {
      const res = checkHttpSsh(targetCfg, url, httpTimeoutMs);
      if (res.fatal && res.error === "missing_http_tool") {
        throw new Error("readiness failed: curl/wget not found on target (install curl or disable --wait-url)");
      }
      lastHttp = res.ok ? "http:ok" : `http:${res.output || "error"}`;
      httpOk = res.ok;
    }

    if (systemdOk && httpOk) {
      ok("Ready.");
      return { ok: true };
    }

    await sleep(intervalMs);
  }

  const statusOut = (mode === "systemd" || mode === "both") ? systemctlStatusSsh(targetCfg).output : "";
  const detail = [
    lastState ? `systemd=${lastState}` : null,
    lastHttp ? lastHttp : null,
  ].filter(Boolean).join(", ");
  throw new Error(`readiness timeout after ${timeoutMs}ms${detail ? ` (${detail})` : ""}${statusOut ? `\n${statusOut}` : ""}`);
}

function logsSsh(targetCfg) {
  const { user, host } = sshUserHost(targetCfg);
  const unit = shQuote(`${targetCfg.serviceName}.service`);
  const res = sshExecTarget(targetCfg, { user, host, args: ["bash","-c", `sudo -n journalctl -u ${unit} -n 200 -f`], stdio: "inherit" });
  if (!res.ok && res.signal !== "SIGINT" && res.status !== 130) {
    throw new Error(`logs failed (status=${res.status ?? "?"})`);
  }
}

function logsSnapshotSsh(targetCfg, lines = 200) {
  const { user, host } = sshUserHost(targetCfg);
  const unit = shQuote(`${targetCfg.serviceName}.service`);
  const limit = Number.isFinite(Number(lines)) && Number(lines) > 0 ? Math.trunc(Number(lines)) : 200;
  const res = sshExecTarget(targetCfg, { user, host, args: ["bash","-c", `sudo -n journalctl -u ${unit} -n ${limit} --no-pager`], stdio: "pipe" });
  const output = `${res.stdout || ""}\n${res.stderr || ""}`.trim();
  return { ok: res.ok, output };
}

function enableSsh(targetCfg) {
  const { user, host } = sshUserHost(targetCfg);
  const unit = shQuote(`${targetCfg.serviceName}.service`);
  const res = sshExecTarget(targetCfg, { user, host, args: ["bash","-c", `sudo -n systemctl enable ${unit}`], stdio: "inherit" });
  if (!res.ok) throw new Error(`enable failed (status=${res.status})`);
}

function startSsh(targetCfg) {
  requireServiceFilesSsh(targetCfg);
  const { user, host } = sshUserHost(targetCfg);
  const unit = shQuote(`${targetCfg.serviceName}.service`);
  const res = sshExecTarget(targetCfg, { user, host, args: ["bash","-c", `sudo -n systemctl start ${unit}`], stdio: "inherit" });
  if (!res.ok) throw new Error(`start failed (status=${res.status})`);
}

function restartSsh(targetCfg) {
  requireServiceFilesSsh(targetCfg);
  const { user, host } = sshUserHost(targetCfg);
  const unit = shQuote(`${targetCfg.serviceName}.service`);
  const res = sshExecTarget(targetCfg, { user, host, args: ["bash","-c", `sudo -n systemctl restart ${unit}`], stdio: "inherit" });
  if (!res.ok) throw new Error(`restart failed (status=${res.status})`);
}

function stopSsh(targetCfg) {
  const { user, host } = sshUserHost(targetCfg);
  const unit = shQuote(`${targetCfg.serviceName}.service`);
  const res = sshExecTarget(targetCfg, { user, host, args: ["bash","-c", `sudo -n systemctl stop ${unit}`], stdio: "inherit" });
  if (!res.ok) throw new Error(`stop failed (status=${res.status})`);
}

function disableSshOnly(targetCfg) {
  const { user, host } = sshUserHost(targetCfg);
  const unit = shQuote(`${targetCfg.serviceName}.service`);
  const res = sshExecTarget(targetCfg, { user, host, args: ["bash","-c", `sudo -n systemctl disable ${unit}`], stdio: "inherit" });
  if (!res.ok) throw new Error(`disable failed (status=${res.status})`);
}

function disableSsh(targetCfg) {
  const { user, host } = sshUserHost(targetCfg);
  const unit = shQuote(`${targetCfg.serviceName}.service`);
  const res = sshExecTarget(targetCfg, { user, host, args: ["bash","-c", `sudo -n systemctl disable --now ${unit}`], stdio: "inherit" });
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
    "  exec sudo -n bash -c \"$RUN\"",
    "fi",
    "exec \"$RUN\"",
  ].join("\n");

  const res = sshExecTarget(targetCfg, { user, host, args: ["bash","-c", script], stdio: "inherit", tty: true });
  if (!res.ok) throw new Error(`run failed (status=${res.status})`);
}

function ensureCurrentReleaseSsh(targetCfg) {
  const { user, host } = sshUserHost(targetCfg);
  const layout = remoteLayout(targetCfg);
  const cmd = ["bash", "-c", `
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

  const res = sshExecTarget(targetCfg, { user, host, args: cmd, stdio: "pipe" });
  if (!res.ok) {
    throw new Error(`ssh preflight failed (status=${res.status})${formatSshFailure(res)}`);
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
  const thinMode = resolveThinMode(targetCfg);
  const thinIntegrityFile = targetCfg && targetCfg._thinIntegrityFile ? targetCfg._thinIntegrityFile : "ih";
  const cmd = ["bash","-c", `
set -euo pipefail
ROOT=${shQuote(layout.installDir)}
APP=${shQuote(targetCfg.appName || targetCfg.serviceName || "app")}
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
    if [ -f "$PREV_DIR/r/c" ]; then
      cp "$PREV_DIR/r/c" "$ROOT/r/c.tmp" && mv "$ROOT/r/c.tmp" "$ROOT/r/c" && chmod 644 "$ROOT/r/c"
    else
      rm -f "$ROOT/r/c"
    fi
    if [ -f "$PREV_DIR/r/${THIN_RUNTIME_VERSION_FILE}" ]; then
      cp "$PREV_DIR/r/${THIN_RUNTIME_VERSION_FILE}" "$ROOT/r/${THIN_RUNTIME_VERSION_FILE}.tmp" && mv "$ROOT/r/${THIN_RUNTIME_VERSION_FILE}.tmp" "$ROOT/r/${THIN_RUNTIME_VERSION_FILE}" && chmod 644 "$ROOT/r/${THIN_RUNTIME_VERSION_FILE}"
    else
      rm -f "$ROOT/r/${THIN_RUNTIME_VERSION_FILE}"
    fi
    if [ -f "$PREV_DIR/r/${thinIntegrityFile}" ]; then
      cp "$PREV_DIR/r/${thinIntegrityFile}" "$ROOT/r/${thinIntegrityFile}.tmp" && mv "$ROOT/r/${thinIntegrityFile}.tmp" "$ROOT/r/${thinIntegrityFile}" && chmod 644 "$ROOT/r/${thinIntegrityFile}"
    else
      rm -f "$ROOT/r/${thinIntegrityFile}"
    fi
  else
    rm -f "$ROOT/b/a" "$ROOT/r/rt" "$ROOT/r/pl" "$ROOT/r/${thinIntegrityFile}" "$ROOT/r/${THIN_RUNTIME_VERSION_FILE}"
  fi
echo "$prev" > ${shQuote(layout.currentFile)}
sudo -n systemctl restart ${shQuote(`${targetCfg.serviceName}.service`)}
echo "Rolled back to $prev"
`];
  const res = sshExecTarget(targetCfg, { user, host, args: cmd, stdio: "inherit" });
  if (!res.ok) throw new Error(`rollback ssh failed (status=${res.status})${formatSshFailure(res)}`);
}

function uninstallSsh(targetCfg) {
  const { user, host } = sshUserHost(targetCfg);
  const layout = remoteLayout(targetCfg);
  assertSafeInstallDir(layout.installDir);
  const cmd = ["bash","-c", `
set -euo pipefail
sudo -n systemctl disable --now ${shQuote(`${targetCfg.serviceName}.service`)} || true
sudo -n rm -f ${shQuote(layout.serviceFile)}
sudo -n systemctl daemon-reload
sudo -n rm -rf ${shQuote(layout.installDir)}
echo "Uninstalled ${targetCfg.serviceName}"
`];
  const res = sshExecTarget(targetCfg, { user, host, args: cmd, stdio: "inherit" });
  if (!res.ok) throw new Error(`uninstall ssh failed (status=${res.status})${formatSshFailure(res)}`);
}

function downSsh(targetCfg) {
  const { user, host } = sshUserHost(targetCfg);
  const layout = remoteLayout(targetCfg);
  const unit = shQuote(`${targetCfg.serviceName}.service`);
  const cmd = ["bash","-c", `
set -euo pipefail
sudo -n systemctl disable --now ${unit} || true
sudo -n rm -f ${shQuote(layout.serviceFile)}
sudo -n systemctl daemon-reload
echo "Service removed ${targetCfg.serviceName}"
`];
  const res = sshExecTarget(targetCfg, { user, host, args: cmd, stdio: "inherit" });
  if (!res.ok) throw new Error(`down ssh failed (status=${res.status})${formatSshFailure(res)}`);
}

function checkConfigDriftSsh({ targetCfg, localConfigPath, showDiff = true }) {
  const { user, host } = sshUserHost(targetCfg);
  const layout = remoteLayout(targetCfg);
  const remoteCfg = `${layout.sharedDir}/config.json5`;
  const remoteCfgQ = shQuote(remoteCfg);

  const exists = sshExecTarget(targetCfg, {
    user,
    host,
    args: ["bash", "-c", `test -f ${remoteCfgQ}`],
    stdio: "pipe",
  });
  if (!exists.ok) {
    if (exists.status === 1) return { status: "missing", path: remoteCfg };
    const out = `${exists.stdout}\n${exists.stderr}`.trim();
    return {
      status: "error",
      message: `ssh config check failed (status=${exists.status})${formatSshFailure(exists) || (out ? `: ${out}` : "")}`,
    };
  }

  const tmpLocal = path.join(resolveTmpBase(), `${targetCfg.serviceName || targetCfg.appName || "app"}-remote-config.json5`);
  ensureDir(path.dirname(tmpLocal));
  const get = scpFromTarget(targetCfg, { user, host, remotePath: remoteCfg, localPath: tmpLocal });
  if (!get.ok) return { status: "error", message: `scp remote config failed${formatSshFailure(get)}` };

  const diffRes = spawnSyncSafe("diff", ["-u", localConfigPath, tmpLocal], {
    stdio: showDiff ? "inherit" : "pipe",
  });
  if (diffRes.status === 0) return { status: "same" };
  if (diffRes.status === 1) return { status: "diff" };
  const diffOut = `${diffRes.stdout}\n${diffRes.stderr}`.trim();
  const errMsg = diffRes.error || diffOut;
  return {
    status: "error",
    message: `diff failed (status=${diffRes.status ?? "?"})${errMsg ? `: ${errMsg}` : ""}`,
  };
}

function configDiffSsh({ targetCfg, localConfigPath }) {
  const { user, host } = sshUserHost(targetCfg);
  const layout = remoteLayout(targetCfg);
  const tmpLocal = path.join(resolveTmpBase(), `${targetCfg.serviceName}-remote-config.json5`);
  ensureDir(path.dirname(tmpLocal));
  // Download remote config (best effort)
  const remoteCfg = `${layout.sharedDir}/config.json5`;
  const get = scpFromTarget(targetCfg, { user, host, remotePath: remoteCfg, localPath: tmpLocal });
  if (!get.ok) throw new Error(`scp remote config failed${formatSshFailure(get)}`);

  // Run diff -u
  const { spawnSyncSafe } = require("./spawn");
  const diffRes = spawnSyncSafe("diff", ["-u", localConfigPath, tmpLocal], { stdio: "pipe" });
  if (diffRes.stdout) process.stdout.write(diffRes.stdout);
  if (diffRes.stderr) process.stderr.write(diffRes.stderr);
  if (diffRes.status && diffRes.status > 1) {
    const detail = diffRes.error || diffRes.stderr || diffRes.stdout;
    throw new Error(`diff failed (status=${diffRes.status})${detail ? `: ${detail}` : ""}`);
  }
}

function configPullSsh({ targetCfg, localConfigPath, apply }) {
  const { user, host } = sshUserHost(targetCfg);
  const layout = remoteLayout(targetCfg);
  const remoteCfg = `${layout.sharedDir}/config.json5`;

  const tmpLocal = apply ? localConfigPath : path.join(resolveTmpBase(), `${targetCfg.serviceName}-remote-config.json5`);
  ensureDir(path.dirname(tmpLocal));
  const get = scpFromTarget(targetCfg, { user, host, remotePath: remoteCfg, localPath: tmpLocal });
  if (!get.ok) throw new Error(`scp remote config failed${formatSshFailure(get)}`);

  ok(apply ? `Pulled and applied config -> ${localConfigPath}` : `Pulled config -> ${tmpLocal}`);
}

function configPushSsh({ targetCfg, localConfigPath }) {
  const { res: preflight, layout, user, host } = checkRemoteWritable(targetCfg, { requireService: false });
  const out = `${preflight.stdout}\n${preflight.stderr}`.trim();
  if (!preflight.ok) {
    throw new Error(`ssh preflight failed${formatSshFailure(preflight) || (out || preflight.error ? `: ${out || preflight.error}` : "")}`);
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
  const tmpDir = resolveTmpDir(targetCfg);
  const tmpDirQ = shQuote(tmpDir);
  const ensureTmp = sshExecTarget(targetCfg, { user, host, args: ["bash", "-c", `mkdir -p ${tmpDirQ}`], stdio: "pipe" });
  if (!ensureTmp.ok) {
    throw new Error(`ssh preflight failed: tmp dir missing on target (${tmpDir}). Set target.preflight.tmpDir or fix the path.`);
  }
  const tmpCfg = `${tmpDir}/${targetCfg.serviceName}-config.json5`;
  const up = scpToTarget(targetCfg, { user, host, localPath: localConfigPath, remotePath: tmpCfg });
  if (!up.ok) throw new Error(`scp config failed${formatSshFailure(up)}`);

  const tmpCfgQ = shQuote(tmpCfg);
  const sharedDirQ = shQuote(layout.sharedDir);
  const remoteCfgQ = shQuote(`${layout.sharedDir}/config.json5`);
  const cmd = ["bash","-c", `mkdir -p ${sharedDirQ} && cp ${tmpCfgQ} ${remoteCfgQ} && rm -f ${tmpCfgQ}`];
  const res = sshExecTarget(targetCfg, { user, host, args: cmd, stdio: "inherit" });
  if (!res.ok) throw new Error(`push config failed (status=${res.status})${formatSshFailure(res)}`);

  ok(`Config pushed to ${host}:${layout.sharedDir}/config.json5`);
}

module.exports = {
  bootstrapSsh,
  deploySsh,
  statusSsh,
  logsSsh,
  logsSnapshotSsh,
  enableSsh,
  startSsh,
  restartSsh,
  stopSsh,
  disableSshOnly,
  disableSsh,
  rollbackSsh,
  runSshForeground,
  ensureCurrentReleaseSsh,
  waitForReadySsh,
  uninstallSsh,
  downSsh,
  checkConfigDriftSsh,
  configDiffSsh,
  configPullSsh,
  configPushSsh,
  installServiceSsh,
};

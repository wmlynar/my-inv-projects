"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");

const { spawnSyncSafe } = require("./spawn");
const { sshExec, scpTo, scpFrom, normalizeStrictHostKeyChecking, normalizeSshPort } = require("./ssh");
const { ensureDir, fileExists } = require("./fsextra");
const { packBlobV1, unpackBlobV1 } = require("./sentinelCore");
const { buildFingerprintHash, resolveAutoLevel } = require("./sentinelConfig");

const FLAG_REQUIRE_XATTR = 0x0001;
const FLAG_L4_INCLUDE_PUID = 0x0002;

function shQuote(value) {
  const str = String(value);
  return "'" + str.replace(/'/g, "'\\''") + "'";
}

function sshUserHost(targetCfg) {
  const user = targetCfg.user || "root";
  const host = targetCfg.host;
  if (!host) throw new Error("target.host missing");
  if (/\s/.test(user)) {
    throw new Error(`Invalid user: ${user} (whitespace not allowed)`);
  }
  return { user, host };
}

function sshExecTarget(targetCfg, params) {
  return sshExec({
    ...params,
    strictHostKeyChecking: normalizeStrictHostKeyChecking(targetCfg.sshStrictHostKeyChecking),
    sshPort: normalizeSshPort(targetCfg.sshPort),
  });
}

function scpToTarget(targetCfg, params) {
  return scpTo({
    ...params,
    strictHostKeyChecking: normalizeStrictHostKeyChecking(targetCfg.sshStrictHostKeyChecking),
    sshPort: normalizeSshPort(targetCfg.sshPort),
  });
}

function scpFromTarget(targetCfg, params) {
  return scpFrom({
    ...params,
    strictHostKeyChecking: normalizeStrictHostKeyChecking(targetCfg.sshStrictHostKeyChecking),
    sshPort: normalizeSshPort(targetCfg.sshPort),
  });
}

function serviceUserGroup(targetCfg, fallbackUser) {
  const user = targetCfg.serviceUser || fallbackUser || "root";
  const group = targetCfg.serviceGroup || user;
  return { user, group };
}

function parseKeyValueOutput(text) {
  const out = {};
  String(text || "").split(/\r?\n/).forEach((line) => {
    const idx = line.indexOf("=");
    if (idx <= 0) return;
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim();
    if (key) out[key] = val;
  });
  return out;
}

function getHostInfoSsh(targetCfg) {
  const { user, host } = sshUserHost(targetCfg);
  const script = `
set -euo pipefail
MID="$(cat /etc/machine-id 2>/dev/null || true)"
PUID="$(cat /sys/class/dmi/id/product_uuid 2>/dev/null || true)"
LINE="$(awk '$5=="/" {print; exit}' /proc/self/mountinfo)"
MAJMIN=""
FSTYPE=""
if [ -n "$LINE" ]; then
  MAJMIN="$(echo "$LINE" | awk '{print $3}')"
  FSTYPE="$(echo "$LINE" | awk '{for (i=1;i<=NF;i++) if ($i=="-"){print $(i+1); exit}}')"
fi
RID=""
if [ -n "$MAJMIN" ]; then
  for f in /dev/disk/by-uuid/*; do
    [ -e "$f" ] || break
    mm_hex="$(stat -Lc '%t:%T' "$f" 2>/dev/null || true)"
    if [ -n "$mm_hex" ]; then
      maj=$((0x\${mm_hex%%:*}))
      min=$((0x\${mm_hex##*:}))
      if [ "$maj:$min" = "$MAJMIN" ]; then
        RID="uuid:$(basename "$f")"
        break
      fi
    fi
  done
  if [ -z "$RID" ]; then
    for f in /dev/disk/by-partuuid/*; do
      [ -e "$f" ] || break
      mm_hex="$(stat -Lc '%t:%T' "$f" 2>/dev/null || true)"
      if [ -n "$mm_hex" ]; then
        maj=$((0x\${mm_hex%%:*}))
        min=$((0x\${mm_hex##*:}))
        if [ "$maj:$min" = "$MAJMIN" ]; then
          RID="partuuid:$(basename "$f")"
          break
        fi
      fi
    done
  fi
  if [ -z "$RID" ]; then
    RID="dev:$MAJMIN"
  fi
fi
echo "MID=$MID"
echo "RID=$RID"
echo "FSTYPE=$FSTYPE"
echo "PUID=$PUID"
`;
  const res = sshExecTarget(targetCfg, { user, host, args: ["bash", "-lc", script], stdio: "pipe" });
  if (!res.ok) {
    const out = `${res.stdout}\n${res.stderr}`.trim();
    throw new Error(`sentinel host probe failed (status=${res.status})${out ? `: ${out}` : ""}`);
  }
  const kv = parseKeyValueOutput(res.stdout);
  return {
    mid: kv.MID || "",
    rid: kv.RID || "",
    fstype: kv.FSTYPE || "",
    puid: kv.PUID || "",
  };
}

function probeBaseDirSsh(targetCfg, sentinelCfg) {
  const { user, host } = sshUserHost(targetCfg);
  const { user: serviceUser, group: serviceGroup } = serviceUserGroup(targetCfg, user);
  const baseDir = sentinelCfg.storage.baseDir;
  const script = `
set -euo pipefail
BASE=${shQuote(baseDir)}
SVC_USER=${shQuote(serviceUser)}
SVC_GROUP=${shQuote(serviceGroup)}
  if [ ! -d "$BASE" ]; then
    echo "BASE_EXISTS=0"
    exit 0
  fi
if [ -L "$BASE" ]; then
  echo "BASE_SYMLINK=1"
else
  echo "BASE_SYMLINK=0"
fi
statline="$(stat -Lc '%u %g %a' "$BASE" 2>/dev/null || true)"
echo "BASE_STAT=$statline"
BASE_EXEC=1
if [ "$SVC_USER" != "root" ]; then
  if sudo -n -u "$SVC_USER" test -x "$BASE"; then
    BASE_EXEC=1
  else
    BASE_EXEC=0
  fi
fi
echo "BASE_EXEC=$BASE_EXEC"
`;
  const res = sshExecTarget(targetCfg, { user, host, args: ["bash", "-lc", script], stdio: "pipe" });
  if (!res.ok) {
    const out = `${res.stdout}\n${res.stderr}`.trim();
    throw new Error(`sentinel baseDir probe failed (status=${res.status})${out ? `: ${out}` : ""}`);
  }
  const kv = parseKeyValueOutput(res.stdout);
  const statParts = (kv.BASE_STAT || "").split(/\s+/);
  const uid = statParts[0] ? Number(statParts[0]) : null;
  const gid = statParts[1] ? Number(statParts[1]) : null;
  const mode = statParts[2] ? String(statParts[2]) : null;
  return {
    exists: kv.BASE_EXISTS !== "0",
    isSymlink: kv.BASE_SYMLINK === "1",
    uid,
    gid,
    mode,
    execOk: kv.BASE_EXEC !== "0",
    serviceUser,
    serviceGroup,
  };
}

function installSentinelSsh({ targetCfg, sentinelCfg, force, insecure }) {
  const { user, host } = sshUserHost(targetCfg);
  const hostInfo = getHostInfoSsh(targetCfg);
  const level = sentinelCfg.level === "auto" ? resolveAutoLevel(hostInfo) : Number(sentinelCfg.level);
  if (![0, 1, 2].includes(level)) {
    throw new Error(`sentinel level not supported in MVP: ${level}`);
  }
  if (level >= 1 && !hostInfo.mid) throw new Error("sentinel install failed: missing machine-id");
  if (level >= 2 && !hostInfo.rid) throw new Error("sentinel install failed: missing rid");

  const flags = 0;
  const installId = crypto.randomBytes(32);
  const fpHash = buildFingerprintHash(level, hostInfo, { includePuid: false });
  const blob = packBlobV1({ level, flags, installId, fpHash }, sentinelCfg.anchor);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "seal-sentinel-"));
  const tmpLocal = path.join(tmpDir, "blob");
  fs.writeFileSync(tmpLocal, blob, { mode: 0o600 });

  const remoteTag = String(targetCfg.serviceName || targetCfg.appName || "app").replace(/[^a-zA-Z0-9_.-]/g, "_");
  const tmpSuffix = crypto.randomBytes(4).toString("hex");
  const tmpRemote = `/tmp/.${remoteTag}-s-${Date.now()}-${tmpSuffix}`;
  const up = scpToTarget(targetCfg, { user, host, localPath: tmpLocal, remotePath: tmpRemote });
  fs.rmSync(tmpDir, { recursive: true, force: true });
  if (!up.ok) throw new Error(`sentinel scp failed (status=${up.status})`);

  const baseDir = sentinelCfg.storage.baseDir;
  const dir = path.posix.join(baseDir, sentinelCfg.opaqueDir);
  const file = path.posix.join(dir, sentinelCfg.opaqueFile);
  const { user: serviceUser, group: serviceGroup } = serviceUserGroup(targetCfg, user);
  const sudo = user === "root" ? "" : "sudo -n";

  const rootScript = `
set -euo pipefail
umask 077
BASE=${shQuote(baseDir)}
DIR=${shQuote(dir)}
FILE=${shQuote(file)}
TMP=${shQuote(tmpRemote)}
SVC_USER=${shQuote(serviceUser)}
SVC_GROUP=${shQuote(serviceGroup)}
INSECURE=${shQuote(insecure ? "1" : "0")}
FORCE=${shQuote(force ? "1" : "0")}

fsync_path() {
  path="$1"
  if command -v python3 >/dev/null 2>&1; then
    python3 - "$path" <<'PY'
import os, sys
p = sys.argv[1]
fd = os.open(p, os.O_RDONLY)
try:
    os.fsync(fd)
finally:
    os.close(fd)
PY
  elif command -v python >/dev/null 2>&1; then
    python - "$path" <<'PY'
import os, sys
p = sys.argv[1]
fd = os.open(p, os.O_RDONLY)
try:
    os.fsync(fd)
finally:
    os.close(fd)
PY
  else
    sync
  fi
}

check_exec() {
  user="$1"
  base="$2"
  if command -v runuser >/dev/null 2>&1; then
    runuser -u "$user" -- test -x "$base"
  elif command -v su >/dev/null 2>&1; then
    su -s /bin/sh -c "test -x \\"$base\\"" "$user"
  else
    return 1
  fi
}

if [ ! -d "$BASE" ]; then
  echo "__SEAL_BASE_MISSING__"
  exit 2
fi
if [ "$INSECURE" != "1" ]; then
  if [ -L "$BASE" ]; then
    echo "__SEAL_BASE_SYMLINK__"
    exit 2
  fi
  statline="$(stat -Lc '%u %g %a' "$BASE" 2>/dev/null || true)"
  uid="$(echo "$statline" | awk '{print $1}')"
  mode="$(echo "$statline" | awk '{print $3}')"
  if [ "$uid" != "0" ]; then
    echo "__SEAL_BASE_INSECURE__"
    exit 2
  fi
  if [ -n "$mode" ]; then
    mode_dec=$((8#$mode))
    if (( (mode_dec & 022) != 0 )); then
      echo "__SEAL_BASE_INSECURE__"
      exit 2
    fi
  fi
  if [ "$SVC_USER" != "root" ]; then
    if ! check_exec "$SVC_USER" "$BASE"; then
      echo "__SEAL_BASE_NOEXEC__"
      exit 2
    fi
  fi
fi

mkdir -p "$DIR"
chown root:"$SVC_GROUP" "$DIR"
chmod 0710 "$DIR"

LOCK="$DIR/.l"
exec 9>"$LOCK"
chmod 0600 "$LOCK" || true
if ! flock -w 10 9; then
  echo "__SEAL_LOCK_BUSY__"
  exit 4
fi

if [ -f "$FILE" ] && [ "$FORCE" != "1" ]; then
  if cmp -s "$FILE" "$TMP"; then
    rm -f "$TMP"
    echo "__SEAL_SENTINEL_OK__"
    exit 0
  fi
  rm -f "$TMP"
  echo "__SEAL_SENTINEL_MISMATCH__"
  exit 3
fi

cp "$TMP" "$FILE.tmp"
chown root:"$SVC_GROUP" "$FILE.tmp"
chmod 0640 "$FILE.tmp"
fsync_path "$FILE.tmp"
mv "$FILE.tmp" "$FILE"
fsync_path "$DIR"
rm -f "$TMP"
echo "__SEAL_SENTINEL_INSTALLED__"
`;
  const script = sudo ? `${sudo} bash -lc ${shQuote(rootScript)}` : rootScript;
  const res = sshExecTarget(targetCfg, { user, host, args: ["bash", "-lc", script], stdio: "pipe" });
  if (!res.ok) {
    const out = `${res.stdout}\n${res.stderr}`.trim();
    throw new Error(`sentinel install failed (status=${res.status})${out ? `: ${out}` : ""}`);
  }
  return { hostInfo, level, output: res.stdout };
}

function verifySentinelSsh({ targetCfg, sentinelCfg }) {
  const { user, host } = sshUserHost(targetCfg);
  const baseDir = sentinelCfg.storage.baseDir;
  const dir = path.posix.join(baseDir, sentinelCfg.opaqueDir);
  const file = path.posix.join(dir, sentinelCfg.opaqueFile);
  const { user: serviceUser, group: serviceGroup } = serviceUserGroup(targetCfg, user);
  const script = `
set -euo pipefail
FILE=${shQuote(file)}
if [ ! -f "$FILE" ]; then
  echo "__SEAL_SENTINEL_MISSING__"
  exit 2
fi
statline="$(stat -Lc '%u %g %a' "$FILE" 2>/dev/null || true)"
echo "FILE_STAT=$statline"
`;
  const res = sshExecTarget(targetCfg, { user, host, args: ["bash", "-lc", script], stdio: "pipe" });
  if (!res.ok) {
    const out = `${res.stdout}\n${res.stderr}`.trim();
    throw new Error(`sentinel verify failed (status=${res.status})${out ? `: ${out}` : ""}`);
  }
  if ((res.stdout || "").includes("__SEAL_SENTINEL_MISSING__")) {
    return { ok: false, reason: "missing" };
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "seal-sentinel-"));
  const tmpLocal = path.join(tmpDir, "blob");
  const get = scpFromTarget(targetCfg, { user, host, remotePath: file, localPath: tmpLocal });
  if (!get.ok) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    throw new Error(`sentinel scp failed (status=${get.status})`);
  }
  try {
    fs.chmodSync(tmpLocal, 0o600);
  } catch {
    // best-effort
  }
  const blob = fs.readFileSync(tmpLocal);
  fs.rmSync(tmpDir, { recursive: true, force: true });

  const parsed = unpackBlobV1(blob, sentinelCfg.anchor);
  if (parsed.version !== 1) {
    return { ok: false, reason: "version", parsed };
  }
  if (![0, 1, 2].includes(parsed.level)) {
    return { ok: false, reason: "level", parsed };
  }

  const hostInfo = getHostInfoSsh(targetCfg);
  const includePuid = !!(parsed.flags & FLAG_L4_INCLUDE_PUID);
  const fpHash = buildFingerprintHash(parsed.level, hostInfo, { includePuid });
  const match = crypto.timingSafeEqual(parsed.fpHash, fpHash);

  const kv = parseKeyValueOutput(res.stdout);
  const statParts = (kv.FILE_STAT || "").split(/\s+/);
  const fileUid = statParts[0] ? Number(statParts[0]) : null;
  const fileGid = statParts[1] ? Number(statParts[1]) : null;
  const fileMode = statParts[2] ? String(statParts[2]) : null;

  return {
    ok: match,
    reason: match ? null : "mismatch",
    parsed,
    hostInfo,
    file: { path: file, uid: fileUid, gid: fileGid, mode: fileMode, serviceUser, serviceGroup },
  };
}

function uninstallSentinelSsh({ targetCfg, sentinelCfg }) {
  const { user, host } = sshUserHost(targetCfg);
  const baseDir = sentinelCfg.storage.baseDir;
  const dir = path.posix.join(baseDir, sentinelCfg.opaqueDir);
  const file = path.posix.join(dir, sentinelCfg.opaqueFile);
  const sudo = user === "root" ? "" : "sudo -n";
  const rootScript = `
set -euo pipefail
umask 077
BASE=${shQuote(baseDir)}
DIR=${shQuote(dir)}
FILE=${shQuote(file)}

fsync_path() {
  path="$1"
  if command -v python3 >/dev/null 2>&1; then
    python3 - "$path" <<'PY'
import os, sys
p = sys.argv[1]
fd = os.open(p, os.O_RDONLY)
try:
    os.fsync(fd)
finally:
    os.close(fd)
PY
  elif command -v python >/dev/null 2>&1; then
    python - "$path" <<'PY'
import os, sys
p = sys.argv[1]
fd = os.open(p, os.O_RDONLY)
try:
    os.fsync(fd)
finally:
    os.close(fd)
PY
  else
    sync
  fi
}

if [ ! -d "$DIR" ]; then
  echo "__SEAL_SENTINEL_REMOVED__"
  exit 0
fi

LOCK="$DIR/.l"
exec 9>"$LOCK"
chmod 0600 "$LOCK" || true
if ! flock -w 10 9; then
  echo "__SEAL_LOCK_BUSY__"
  exit 4
fi

rm -f "$FILE" || true
fsync_path "$DIR"
rm -f "$LOCK" || true
if [ -d "$DIR" ]; then
  if [ -z "$(ls -A "$DIR" 2>/dev/null)" ]; then
    rmdir "$DIR" || true
  fi
fi
if [ -d "$BASE" ]; then
  fsync_path "$BASE"
fi
echo "__SEAL_SENTINEL_REMOVED__"
`;
  const script = sudo ? `${sudo} bash -lc ${shQuote(rootScript)}` : rootScript;
  const res = sshExecTarget(targetCfg, { user, host, args: ["bash", "-lc", script], stdio: "pipe" });
  if (!res.ok) {
    const out = `${res.stdout}\n${res.stderr}`.trim();
    throw new Error(`sentinel uninstall failed (status=${res.status})${out ? `: ${out}` : ""}`);
  }
  return { ok: true };
}

function probeSentinelSsh({ targetCfg, sentinelCfg }) {
  const hostInfo = getHostInfoSsh(targetCfg);
  const base = probeBaseDirSsh(targetCfg, sentinelCfg);
  return { hostInfo, base };
}

module.exports = {
  FLAG_REQUIRE_XATTR,
  FLAG_L4_INCLUDE_PUID,
  getHostInfoSsh,
  probeSentinelSsh,
  installSentinelSsh,
  verifySentinelSsh,
  uninstallSentinelSsh,
};

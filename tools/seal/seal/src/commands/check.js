"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

const { findProjectRoot } = require("../lib/paths");
const { getSealPaths, loadProjectConfig, loadTargetConfig, resolveTargetName, resolveConfigName, getConfigFile } = require("../lib/project");
const {
  normalizePackager,
  assertNoPackagerFallback,
  resolveThinConfig,
  resolveProtectionConfig,
  applyThinCompatibility,
  applyProtectionCompatibility,
} = require("../lib/packagerConfig");
const { info, warn, err, ok, hr } = require("../lib/ui");
const { spawnSyncSafe } = require("../lib/spawn");
const { fileExists } = require("../lib/fsextra");
const { resolvePostjectBin } = require("../lib/postject");
const { sshExec } = require("../lib/ssh");

function nodeMajor() {
  const m = /^v(\d+)\./.exec(process.version);
  return m ? parseInt(m[1], 10) : 0;
}

function shQuote(value) {
  const str = String(value);
  return "'" + str.replace(/'/g, "'\\''") + "'";
}

function hasCommand(cmd) {
  const r = spawnSyncSafe("bash", ["-lc", `command -v -- ${shQuote(cmd)} >/dev/null 2>&1`], { stdio: "pipe" });
  return !!r.ok;
}

function resolveCcOverride(opts) {
  const raw = opts.cc || process.env.SEAL_CHECK_CC || process.env.SEAL_THIN_CC;
  if (!raw) return null;
  const cc = String(raw).trim();
  return cc ? cc : null;
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

function resolvePreflightEnv(envKey, fallback) {
  const raw = process.env[envKey] !== undefined ? process.env[envKey] : fallback;
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) return fallback;
  return Math.floor(num);
}

function resolveTmpDir(targetCfg) {
  const cfg = targetCfg && targetCfg.preflight && typeof targetCfg.preflight === "object"
    ? targetCfg.preflight.tmpDir
    : null;
  const tmpDir = cfg !== undefined && cfg !== null ? String(cfg).trim() : "";
  return tmpDir || "/tmp";
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

function parseDfValue(output) {
  const line = String(output || "").trim().split(/\r?\n/)[1] || "";
  const parts = line.trim().split(/\s+/);
  if (parts.length < 4) return null;
  const value = Number(parts[3]);
  return Number.isFinite(value) ? value : null;
}

function checkLocalResources({ pathLabel, pathValue, minFreeMb, minFreeInodes, errors, warnings }) {
  const df = spawnSyncSafe("df", ["-Pk", pathValue], { stdio: "pipe" });
  if (!df.ok) {
    warnings.push(`Local preflight: cannot check disk space for ${pathLabel} (${pathValue})`);
  } else {
    const availKb = parseDfValue(`${df.stdout}\n${df.stderr}`);
    if (availKb === null) {
      warnings.push(`Local preflight: cannot parse disk space for ${pathLabel} (${pathValue})`);
    } else {
      const availMb = Math.floor(availKb / 1024);
      if (availMb < minFreeMb) {
        errors.push(`Low disk space on ${pathLabel}: ${availMb} MB < ${minFreeMb} MB (${pathValue})`);
      }
    }
  }

  const dfInodes = spawnSyncSafe("df", ["-Pi", pathValue], { stdio: "pipe" });
  if (!dfInodes.ok) {
    warnings.push(`Local preflight: cannot check inodes for ${pathLabel} (${pathValue})`);
  } else {
    const availInodes = parseDfValue(`${dfInodes.stdout}\n${dfInodes.stderr}`);
    if (availInodes === null) {
      warnings.push(`Local preflight: cannot parse inodes for ${pathLabel} (${pathValue})`);
    } else if (availInodes < minFreeInodes) {
      errors.push(`Low inode count on ${pathLabel}: ${availInodes} < ${minFreeInodes} (${pathValue})`);
    }
  }
}

function remoteLayout(targetCfg) {
  const installDir = targetCfg.installDir || `/home/admin/apps/${targetCfg.appName || "app"}`;
  return {
    installDir,
    releasesDir: `${installDir}/releases`,
    sharedDir: `${installDir}/shared`,
    runner: `${installDir}/run-current.sh`,
    serviceFile: `/etc/systemd/system/${targetCfg.serviceName}.service`,
  };
}

function checkRemoteWritable(targetCfg) {
  const user = targetCfg.user || "root";
  const host = targetCfg.host;
  const layout = remoteLayout(targetCfg);
  const minFreeMb = resolvePreflightThreshold(targetCfg, "minFreeMb", "SEAL_PREFLIGHT_MIN_FREE_MB", 100);
  const minFreeInodes = resolvePreflightThreshold(targetCfg, "minFreeInodes", "SEAL_PREFLIGHT_MIN_FREE_INODES", 1000);
  const minTmpFreeMb = resolvePreflightThreshold(targetCfg, "tmpMinFreeMb", "SEAL_PREFLIGHT_TMP_MIN_FREE_MB", 100);
  const minTmpFreeInodes = resolvePreflightThreshold(targetCfg, "tmpMinFreeInodes", "SEAL_PREFLIGHT_TMP_MIN_FREE_INODES", 1000);
  const tmpDir = resolveTmpDir(targetCfg);
  const requireTools = resolvePreflightTools(targetCfg);
  const allowNoexec = resolveNoexecPolicy(targetCfg) ? 1 : 0;
  const requireSudo = resolveSudoRequired(targetCfg) ? 1 : 0;
  const forceSudoFail = process.env.SEAL_PREFLIGHT_FORCE_SUDO_FAIL === "1" ? 1 : 0;
  const cmd = ["bash", "-lc", `
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

if [ ! -d "$ROOT" ]; then
  issues+=("__SEAL_MISSING_DIR__")
else
  if [ ! -w "$ROOT" ]; then issues+=("__SEAL_NOT_WRITABLE__"); fi
  if [ -d "$REL" ] && [ ! -w "$REL" ]; then issues+=("__SEAL_NOT_WRITABLE_RELEASES__"); fi
  if [ -d "$SHARED" ] && [ ! -w "$SHARED" ]; then issues+=("__SEAL_NOT_WRITABLE_SHARED__"); fi
  if [ ! -f "$RUNNER" ]; then issues+=("__SEAL_MISSING_RUNNER__"); fi
  if [ ! -f "$UNIT" ]; then issues+=("__SEAL_MISSING_UNIT__"); fi
  if command -v df >/dev/null 2>&1; then
    AVAIL_KB="$(df -Pk "$ROOT" 2>/dev/null | awk 'NR==2 {print $4}')"
    if [ -n "$AVAIL_KB" ]; then
      AVAIL_MB=$((AVAIL_KB / 1024))
      if [ "$AVAIL_MB" -lt "$MIN_MB" ]; then
        issues+=("__SEAL_DISK_LOW__:${AVAIL_MB}:${MIN_MB}")
      fi
    else
      issues+=("__SEAL_DISK_CHECK_FAILED__")
    fi
    AVAIL_INODES="$(df -Pi "$ROOT" 2>/dev/null | awk 'NR==2 {print $4}')"
    if [ -n "$AVAIL_INODES" ]; then
      if [ "$AVAIL_INODES" -lt "$MIN_INODES" ]; then
        issues+=("__SEAL_INODES_LOW__:${AVAIL_INODES}:${MIN_INODES}")
      fi
    else
      issues+=("__SEAL_INODES_CHECK_FAILED__")
    fi
    if [ -d "$TMP_DIR" ]; then
      TMP_AVAIL_KB="$(df -Pk "$TMP_DIR" 2>/dev/null | awk 'NR==2 {print $4}')"
      if [ -n "$TMP_AVAIL_KB" ]; then
        TMP_AVAIL_MB=$((TMP_AVAIL_KB / 1024))
        if [ "$TMP_AVAIL_MB" -lt "$TMP_MIN_MB" ]; then
          issues+=("__SEAL_TMP_DISK_LOW__:${TMP_AVAIL_MB}:${TMP_MIN_MB}")
        fi
      else
        issues+=("__SEAL_TMP_DISK_CHECK_FAILED__")
      fi
      TMP_AVAIL_INODES="$(df -Pi "$TMP_DIR" 2>/dev/null | awk 'NR==2 {print $4}')"
      if [ -n "$TMP_AVAIL_INODES" ]; then
        if [ "$TMP_AVAIL_INODES" -lt "$TMP_MIN_INODES" ]; then
          issues+=("__SEAL_TMP_INODES_LOW__:${TMP_AVAIL_INODES}:${TMP_MIN_INODES}")
        fi
      else
        issues+=("__SEAL_TMP_INODES_CHECK_FAILED__")
      fi
    else
      issues+=("__SEAL_TMP_MISSING__")
    fi
    if command -v findmnt >/dev/null 2>&1; then
      if [ "$ALLOW_NOEXEC" -ne 1 ]; then
        OPTS="$(findmnt -no OPTIONS --target "$ROOT" 2>/dev/null || true)"
        if echo "$OPTS" | grep -q "noexec"; then
          issues+=("__SEAL_NOEXEC__")
        fi
      fi
    fi
  else
    issues+=("__SEAL_DISK_CHECK_FAILED__")
    issues+=("__SEAL_INODES_CHECK_FAILED__")
    issues+=("__SEAL_TMP_DISK_CHECK_FAILED__")
    issues+=("__SEAL_TMP_INODES_CHECK_FAILED__")
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
fi

if [ "\${#issues[@]}" -eq 0 ]; then
  echo "__SEAL_OK__"
else
  printf "%s\\n" "\${issues[@]}"
fi
exit 0
`];
  const res = sshExec({ user, host, args: cmd, stdio: "pipe", strictHostKeyChecking: targetCfg.sshStrictHostKeyChecking, sshPort: targetCfg.sshPort });
  return { res, layout, user, host };
}

async function cmdCheck(cwd, targetArg, opts) {
  if (targetArg && typeof targetArg === "object" && !opts) {
    opts = targetArg;
    targetArg = null;
  }
  opts = opts || {};
  const payloadOnly = !!opts.payloadOnly;
  const projectRoot = findProjectRoot(cwd);
  const paths = getSealPaths(projectRoot);

  hr();
  info("SEAL check");
  hr();

  const errors = [];
  const warnings = [];

  const proj = loadProjectConfig(projectRoot, { profileOverlay: opts.profileOverlay });
  if (!proj) {
    errors.push("Missing seal.json5 (project). If this is a workspace root with projects, run the command from that root (it will execute for subprojects) or cd into a project.");
  }

  const finalize = () => {
    if (warnings.length) {
      console.log("");
      warn("Warnings:");
      for (const w of warnings) console.log(" - " + w);
    }

    if (errors.length) {
      console.log("");
      err("Errors:");
      for (const e of errors) console.log(" - " + e);
    }

    const hadNotes = warnings.length || errors.length;
    if (!errors.length && (!opts.strict || !warnings.length)) {
      if (hadNotes) console.log("");
      ok("Check OK");
    } else {
      const e = new Error("Check failed");
      e.sealCheck = { errors, warnings, strict: !!opts.strict };
      throw e;
    }
  };

  if (!proj) {
    finalize();
    return;
  }

  const localMinFreeMb = resolvePreflightEnv("SEAL_PREFLIGHT_LOCAL_MIN_FREE_MB", resolvePreflightEnv("SEAL_PREFLIGHT_MIN_FREE_MB", 100));
  const localMinFreeInodes = resolvePreflightEnv("SEAL_PREFLIGHT_LOCAL_MIN_FREE_INODES", resolvePreflightEnv("SEAL_PREFLIGHT_MIN_FREE_INODES", 1000));
  const localTmpMinFreeMb = resolvePreflightEnv("SEAL_PREFLIGHT_LOCAL_TMP_MIN_FREE_MB", resolvePreflightEnv("SEAL_PREFLIGHT_TMP_MIN_FREE_MB", 100));
  const localTmpMinFreeInodes = resolvePreflightEnv("SEAL_PREFLIGHT_LOCAL_TMP_MIN_FREE_INODES", resolvePreflightEnv("SEAL_PREFLIGHT_TMP_MIN_FREE_INODES", 1000));
  checkLocalResources({
    pathLabel: "project root",
    pathValue: projectRoot,
    minFreeMb: localMinFreeMb,
    minFreeInodes: localMinFreeInodes,
    errors,
    warnings,
  });
  checkLocalResources({
    pathLabel: "tmp",
    pathValue: os.tmpdir(),
    minFreeMb: localTmpMinFreeMb,
    minFreeInodes: localTmpMinFreeInodes,
    errors,
    warnings,
  });

  const targetName = resolveTargetName(projectRoot, targetArg || null);
  const t = loadTargetConfig(projectRoot, targetName);
  if (!t) warnings.push(`Missing target '${targetName}' in seal-config/targets`);
  const targetCfg = t ? t.cfg : { target: targetName, config: targetName, packager: "auto" };
  if (proj) {
    targetCfg.appName = targetCfg.appName || proj.appName;
    targetCfg.serviceName = targetCfg.serviceName || proj.appName;
  }

  const configName = resolveConfigName(targetCfg, null);
  const configFile = getConfigFile(projectRoot, configName);
  if (!fileExists(configFile)) warnings.push(`Missing runtime config: ${configFile}`);

  if (!fileExists(paths.runtimeConfigPath) && fileExists(configFile)) {
    try {
      fs.copyFileSync(configFile, paths.runtimeConfigPath);
      ok(`Created config.runtime.json5 (from ${configFile})`);
    } catch (e) {
      warnings.push(`Missing config.runtime.json5 (dev convenience). Failed to create: ${e.message || e}`);
    }
  }

  if (proj) {
    const entryAbs = path.join(projectRoot, proj.entry);
    if (!fileExists(entryAbs)) errors.push(`Entrypoint missing: ${proj.entry}`);
  }

  // Optional remote preflight (only when explicit target is provided)
  if (!opts.skipRemote && targetArg && t && (targetCfg.kind || "local").toLowerCase() === "ssh") {
    if (!hasCommand("ssh")) {
      warnings.push("ssh not found – skipping remote preflight");
    } else if (!targetCfg.host) {
      warnings.push("target.host missing – skipping remote preflight");
    } else {
      const { res, layout, user, host } = checkRemoteWritable(targetCfg);
      const out = `${res.stdout}\n${res.stderr}`.trim();
      if (!res.ok) {
        warnings.push(`SSH preflight failed for ${user}@${host}: ${out || res.error || "unknown"}`);
      } else {
        const resourceCheck = parsePreflightResources(out);
        const tmpDir = resolveTmpDir(targetCfg);
        if (resourceCheck.lowDisk) {
          const { availMb, minMb } = resourceCheck.lowDisk;
          errors.push(`Low disk space on ${host}: ${availMb} MB < ${minMb} MB (set target.preflight.minFreeMb or SEAL_PREFLIGHT_MIN_FREE_MB)`);
        }
        if (resourceCheck.lowInodes) {
          const { avail, min } = resourceCheck.lowInodes;
          errors.push(`Low inode count on ${host}: ${avail} < ${min} (set target.preflight.minFreeInodes or SEAL_PREFLIGHT_MIN_FREE_INODES)`);
        }
        if (resourceCheck.lowTmpDisk) {
          const { availMb, minMb } = resourceCheck.lowTmpDisk;
          errors.push(`Low disk space on ${host} (${tmpDir}): ${availMb} MB < ${minMb} MB (set target.preflight.tmpMinFreeMb or SEAL_PREFLIGHT_TMP_MIN_FREE_MB)`);
        }
        if (resourceCheck.lowTmpInodes) {
          const { avail, min } = resourceCheck.lowTmpInodes;
          errors.push(`Low inode count on ${host} (${tmpDir}): ${avail} < ${min} (set target.preflight.tmpMinFreeInodes or SEAL_PREFLIGHT_TMP_MIN_FREE_INODES)`);
        }
        if (resourceCheck.tmpMissing) {
          errors.push(`Tmp dir missing on ${host}: ${tmpDir} (set target.preflight.tmpDir)`);
        }
        if (resourceCheck.noexecInstall) {
          errors.push(`installDir mounted with noexec on ${host}: ${layout.installDir} (set target.preflight.allowNoexec=true or use a different path)`);
        }
        if (resourceCheck.missingTools && resourceCheck.missingTools.length) {
          errors.push(`Missing tools on ${host}: ${resourceCheck.missingTools.join(", ")} (set target.preflight.requireTools or install them)`);
        }
        if (resourceCheck.missingSudo) {
          errors.push(`Passwordless sudo missing on ${host} (configure NOPASSWD or set target.preflight.requireSudo=false)`);
        }
        if (resourceCheck.diskCheckFailed) {
          warnings.push(`Disk space check failed on ${host} (df unavailable or unreadable).`);
        }
        if (resourceCheck.inodeCheckFailed) {
          warnings.push(`Inode check failed on ${host} (df unavailable or unreadable).`);
        }
        if (resourceCheck.tmpDiskCheckFailed) {
          warnings.push(`Tmp disk space check failed on ${host} (${tmpDir}).`);
        }
        if (resourceCheck.tmpInodeCheckFailed) {
          warnings.push(`Tmp inode check failed on ${host} (${tmpDir}).`);
        }
        const hasOk = out.includes("__SEAL_OK__");
        const missingDir = out.includes("__SEAL_MISSING_DIR__");
        const notWritable = out.includes("__SEAL_NOT_WRITABLE__");
        const notWritableReleases = out.includes("__SEAL_NOT_WRITABLE_RELEASES__");
        const notWritableShared = out.includes("__SEAL_NOT_WRITABLE_SHARED__");
        const missingRunner = out.includes("__SEAL_MISSING_RUNNER__");
        const missingUnit = out.includes("__SEAL_MISSING_UNIT__");
        const hasIssues = missingDir || notWritable || notWritableReleases || notWritableShared || missingRunner || missingUnit;

        if (hasIssues) {
          if (missingDir) warnings.push(`Missing installDir: ${layout.installDir}`);
          if (missingRunner) warnings.push(`Missing runner: ${layout.runner}`);
          if (missingUnit) warnings.push(`Missing systemd unit: ${layout.serviceFile}`);
          if (notWritable) errors.push(`InstallDir not writable: ${layout.installDir}`);
          if (notWritableReleases) errors.push(`Releases dir not writable: ${layout.releasesDir}`);
          if (notWritableShared) errors.push(`Shared dir not writable: ${layout.sharedDir}`);

          const needsBootstrap = missingDir || missingRunner || missingUnit || notWritable || notWritableReleases || notWritableShared;
          if (needsBootstrap) {
            const line = `Run: seal deploy ${targetName} --bootstrap`;
            if (notWritable || notWritableReleases || notWritableShared) errors.push(line);
            else warnings.push(line);
          }

          if (missingDir || notWritable || notWritableReleases || notWritableShared) {
            const port = Number(targetCfg.sshPort);
            const portFlag = Number.isFinite(port) && port > 0 ? `-p ${Math.trunc(port)} ` : "";
            const line = `Manual: ssh -t ${portFlag}${user}@${host} "sudo mkdir -p ${shQuote(layout.releasesDir)} ${shQuote(layout.sharedDir)} && sudo chown -R ${shQuote(`${user}:${user}`)} ${shQuote(layout.installDir)}"`;
            if (notWritable || notWritableReleases || notWritableShared) errors.push(line);
            else warnings.push(line);
          } else if (missingRunner || missingUnit) {
            warnings.push("Service files missing; bootstrap installs runner + unit after the first deploy.");
          }

          const sudoCheck = sshExec({ user, host, args: ["bash", "-lc", "sudo -n true"], stdio: "pipe", strictHostKeyChecking: targetCfg.sshStrictHostKeyChecking, sshPort: targetCfg.sshPort });
          if (!sudoCheck.ok) {
            const sudoOut = `${sudoCheck.stdout}\n${sudoCheck.stderr}`.trim();
            const sudoLine = sudoOut.split(/\r?\n/).slice(0, 2).join(" | ");
            warnings.push(`Passwordless sudo not configured for ${user}@${host} (bootstrap needs it): ${sudoLine || "sudo -n true failed"}`);
          }
        } else if (hasOk) {
          ok(`SSH preflight OK: ${user}@${host} (${layout.installDir} writable)`);
          const sudoCheck = sshExec({ user, host, args: ["bash", "-lc", "sudo -n true"], stdio: "pipe", strictHostKeyChecking: targetCfg.sshStrictHostKeyChecking, sshPort: targetCfg.sshPort });
          if (!sudoCheck.ok) {
            const sudoOut = `${sudoCheck.stdout}\n${sudoCheck.stderr}`.trim();
            const sudoLine = sudoOut.split(/\r?\n/).slice(0, 2).join(" | ");
            warnings.push(`Passwordless sudo not configured for ${user}@${host} (status/logs/restart/stop need sudo): ${sudoLine || "sudo -n true failed"}`);
          }
        } else {
          warnings.push(`SSH preflight returned unexpected output for ${user}@${host}: ${out || "no output"}`);
        }
      }
    }
  }

  // Toolchain checks
  const thinCfgRaw = resolveThinConfig(targetCfg, proj);
  const packagerSpec = normalizePackager(opts.packager || targetCfg?.packager || proj?.build?.packager || "auto");
  assertNoPackagerFallback(targetCfg, proj);
  if (packagerSpec.kind === "unknown") {
    errors.push(`Unknown packager: ${packagerSpec.label}. Allowed: thin-split, sea, bundle, none, auto.`);
  }
  const seaNeeded = packagerSpec.kind === "sea";
  const thinNeeded = packagerSpec.kind === "thin";
  const thinCompat = applyThinCompatibility(packagerSpec.label, thinCfgRaw);
  const protectionRaw = resolveProtectionConfig(proj);
  const protectionCompat = applyProtectionCompatibility(packagerSpec.label, protectionRaw);
  const protectionCfg = protectionCompat.protectionCfg;
  const hardEnabled = protectionCfg.enabled !== false;
  for (const note of [...thinCompat.notes, ...protectionCompat.notes]) {
    warnings.push(note);
  }
  const verbose = !!opts.verbose || process.env.SEAL_CHECK_VERBOSE === "1";
  let thinToolchainIssue = false;
  const major = nodeMajor();
  if (major < 18) errors.push(`Node too old: ${process.version} (need >= 18; SEA needs >= 20)`);
  if (seaNeeded && major < 20) {
    errors.push(`Node < 20: SEA requires >= 20. Node=${process.version}`);
  }

  // Dependencies present?
  try {
    require("esbuild");
    ok("esbuild: OK");
  } catch {
    errors.push("esbuild not installed (npm install in monorepo root)");
  }

  try {
    require("javascript-obfuscator");
    ok("javascript-obfuscator: OK");
  } catch {
    errors.push("javascript-obfuscator not installed");
  }

  // SEA tools
  if (seaNeeded) {
    const postjectBin = resolvePostjectBin();
    if (postjectBin) {
      ok("postject: OK (SEA injection)");
    } else {
      try {
        require("postject");
        errors.push("postject module installed but CLI not found in node_modules/.bin or PATH – SEA will fail.");
      } catch {
        errors.push("postject not installed – SEA will fail.");
      }
    }
  }

  // THIN tools
  if (thinNeeded) {
    const pkgEnv = process.env.SEAL_CHECK_PKGCONFIG_TIMEOUT_MS || process.env.SEAL_THIN_PKGCONFIG_TIMEOUT_MS;
    const ccEnv = process.env.SEAL_CHECK_CC_TIMEOUT_MS || process.env.SEAL_THIN_CC_TIMEOUT_MS;
    const pkgConfigTimeoutMs = Number.isFinite(Number(pkgEnv)) && Number(pkgEnv) > 0 ? Number(pkgEnv) : 5000;
    const compileTimeoutMs = Number.isFinite(Number(ccEnv)) && Number(ccEnv) > 0 ? Number(ccEnv) : 30000;

    if (!hasCommand("zstd")) {
      errors.push("zstd not found in PATH (thin). Install: sudo apt-get install -y zstd");
      thinToolchainIssue = true;
    } else {
      ok("zstd: OK");
    }

    if (payloadOnly) {
      info("Thin: payload-only build; skipping compiler checks.");
    } else {
      const ccOverride = resolveCcOverride(opts);
      let cc = null;
      if (ccOverride) {
        const hasPath = /[\\/]/.test(ccOverride);
        if (hasPath ? fileExists(ccOverride) : hasCommand(ccOverride)) {
          cc = ccOverride;
          info(`Thin: using compiler override: ${cc}`);
        } else {
          errors.push(`C compiler not found: ${ccOverride}`);
          thinToolchainIssue = true;
        }
      } else {
        cc = hasCommand("cc") ? "cc" : (hasCommand("gcc") ? "gcc" : null);
      }
      if (!cc) {
        errors.push("C compiler not found (thin). Install: sudo apt-get install -y build-essential");
        thinToolchainIssue = true;
      }

      let zstdFlags = [];
      const hasPkgConfig = hasCommand("pkg-config");
      if (!hasPkgConfig) {
        warnings.push("pkg-config not found – cannot verify libzstd headers (thin launcher build may fail). Install: sudo apt-get install -y pkg-config");
        thinToolchainIssue = true;
      } else {
        info("Thin: checking libzstd via pkg-config...");
        const zstdPc = spawnSyncSafe(
          "pkg-config",
          ["--cflags", "--libs", "libzstd"],
          { stdio: "pipe", timeoutMs: pkgConfigTimeoutMs }
        );
        if (zstdPc.timedOut) {
          warnings.push("pkg-config timed out (libzstd flags). Check pkg-config/libzstd-dev or increase timeout.");
          thinToolchainIssue = true;
        } else if (!zstdPc.ok) {
          warnings.push("libzstd not found by pkg-config. Install: sudo apt-get install -y libzstd-dev");
          thinToolchainIssue = true;
        } else {
          const out = `${zstdPc.stdout} ${zstdPc.stderr}`.trim();
          if (out) zstdFlags = out.split(/\s+/).filter(Boolean);
          if (verbose && out) info(`Thin: pkg-config flags: ${out}`);
        }
      }

      if (cc) {
        const testSrc = "#include <zstd.h>\nint main(void){return 0;}\n";
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "seal-check-"));
        const srcPath = path.join(tmpDir, "zstd-check.c");
        fs.writeFileSync(srcPath, testSrc, "utf-8");
        const args = ["-x", "c", srcPath, "-o", "/dev/null"];
        const hasLzstd = zstdFlags.includes("-lzstd");
        const compileArgs = hasLzstd ? [...args, ...zstdFlags] : [...args, ...zstdFlags, "-lzstd"];
        info(`Thin: compiling libzstd test (${cc})...`);
        if (verbose) info(`Thin: cc command: ${cc} ${compileArgs.join(" ")}`);
        const compileStdio = verbose ? "inherit" : "pipe";
        const compile = spawnSyncSafe(
          cc,
          compileArgs,
          { stdio: compileStdio, timeoutMs: compileTimeoutMs }
        );
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
        if (compile.timedOut) {
          errors.push("libzstd-dev compile test timed out (cc). Check toolchain or increase timeout.");
          thinToolchainIssue = true;
        } else if (!compile.ok) {
          const msg = `${compile.stderr}\n${compile.stdout}`.trim();
          const short = msg.split(/\r?\n/)[0] || "zstd compile/link failed";
          errors.push(`libzstd-dev not usable (compile test failed): ${short}. Install: sudo apt-get install -y libzstd-dev`);
          thinToolchainIssue = true;
        }
      }
    }
  }

  if (thinNeeded && thinToolchainIssue) {
    const hint = payloadOnly
      ? "Install zstd (Ubuntu): sudo apt-get install -y zstd"
      : "Install thin toolchain (Ubuntu): sudo apt-get install -y build-essential pkg-config zstd libzstd-dev";
    if (!warnings.includes(hint)) warnings.push(hint);
  }

  // Protection tools (ELF packer is default for thin-split)
  if (hardEnabled && payloadOnly) {
    info("Protection checks: payload-only reuse (tools required only for bootstrap).");
  } else if (hardEnabled) {
    if (protectionCfg.stripSymbols) {
      if (hasCommand('strip')) ok('strip: OK (symbol stripping)');
      else warnings.push('strip not installed – binaries will be easier to inspect (install binutils)');
    }

    if (protectionCfg.elfPacker) {
      const packerCmd = protectionCfg.elfPackerCmd || protectionCfg.elfPacker;
      if (hasCommand(packerCmd)) {
        ok(`${packerCmd}: OK (ELF packer)`);
      } else {
        errors.push(`ELF packer not found (${packerCmd}) – protection.elfPacker will fail`);
      }
    }
  }

  finalize();
}

module.exports = { cmdCheck };

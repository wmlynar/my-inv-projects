"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");

const { findProjectRoot } = require("../lib/paths");
const { getSealPaths, loadProjectConfig, loadTargetConfig, resolveTargetName, resolveConfigName, getConfigFile } = require("../lib/project");
const { normalizePackager, resolveBundleFallback, resolveThinConfig, resolveProtectionConfig } = require("../lib/packagerConfig");
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
  const r = spawnSyncSafe("bash", ["-lc", `command -v ${cmd} >/dev/null 2>&1`], { stdio: "pipe" });
  return !!r.ok;
}

function resolveCcOverride(opts) {
  const raw = opts.cc || process.env.SEAL_CHECK_CC || process.env.SEAL_THIN_CC;
  if (!raw) return null;
  const cc = String(raw).trim();
  return cc ? cc : null;
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
  if [ ! -f "$RUNNER" ]; then issues+=("__SEAL_MISSING_RUNNER__"); fi
  if [ ! -f "$UNIT" ]; then issues+=("__SEAL_MISSING_UNIT__"); fi
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
  const projectRoot = findProjectRoot(cwd);
  const paths = getSealPaths(projectRoot);

  hr();
  info("SEAL check");
  hr();

  const errors = [];
  const warnings = [];

  const proj = loadProjectConfig(projectRoot);
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
  const thinCfg = resolveThinConfig(targetCfg, proj);
  const packagerSpec = normalizePackager(opts.packager || targetCfg?.packager || proj?.build?.packager || "auto", thinCfg.mode);
  const allowBundleFallback = resolveBundleFallback(targetCfg, proj);
  if (packagerSpec.kind === "unknown") {
    errors.push(`Unknown packager: ${packagerSpec.label}. Allowed: thin-split, thin-single, thin (legacy), sea, bundle, none, auto.`);
  }
  const seaNeeded = packagerSpec.kind === "sea";
  const thinNeeded = packagerSpec.kind === "thin";
  const verbose = !!opts.verbose || process.env.SEAL_CHECK_VERBOSE === "1";
  let thinToolchainIssue = false;
  const major = nodeMajor();
  if (major < 18) errors.push(`Node too old: ${process.version} (need >= 18; SEA needs >= 20)`);
  if (seaNeeded && major < 20) {
    warnings.push(`Node < 20: SEA may not work. ${allowBundleFallback ? "Bundle fallback is enabled." : "Build will fail unless bundle fallback is explicitly enabled (build.bundleFallback=true or packager=bundle)."} Node=${process.version}`);
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
        const msg = "postject module installed but CLI not found in node_modules/.bin or PATH – SEA may fail.";
        if (allowBundleFallback) {
          warnings.push(`${msg} Bundle fallback is enabled.`);
        } else {
          errors.push(`${msg} Build will fail unless bundle fallback is explicitly enabled (build.bundleFallback=true or packager=bundle).`);
        }
      } catch {
        const msg = "postject not installed – SEA may fail.";
        if (allowBundleFallback) {
          warnings.push(`${msg} Bundle fallback is enabled.`);
        } else {
          errors.push(`${msg} Build will fail unless bundle fallback is explicitly enabled (build.bundleFallback=true or packager=bundle).`);
        }
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

  if (thinNeeded && thinToolchainIssue) {
    const hint = "Install thin toolchain (Ubuntu): sudo apt-get install -y build-essential pkg-config zstd libzstd-dev";
    if (!warnings.includes(hint)) warnings.push(hint);
  }

  // Optional protection tools (recommended; SEAL will still work without them)
  const protectionCfg = resolveProtectionConfig(proj);
  const hardEnabled = protectionCfg.enabled !== false;
  if (hardEnabled) {
    if (hasCommand('strip')) ok('strip: OK (symbol stripping)');
    else warnings.push('strip not installed – binaries will be easier to inspect (install binutils)');

    if (hasCommand('upx')) ok('upx: OK (binary packing)');
    else warnings.push('upx not installed – binaries will not be packed (optional but recommended)');
  }

  finalize();
}

module.exports = { cmdCheck };

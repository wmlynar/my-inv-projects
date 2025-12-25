"use strict";

const fs = require("fs");
const path = require("path");

const { findProjectRoot } = require("../lib/paths");
const { getSealPaths, loadProjectConfig, loadTargetConfig, resolveTargetName, resolveConfigName, getConfigFile } = require("../lib/project");
const { info, warn, err, ok, hr } = require("../lib/ui");
const { spawnSyncSafe } = require("../lib/spawn");
const { fileExists } = require("../lib/fsextra");
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

function resolvePostjectBin() {
  const localPostject = path.join(__dirname, "..", "..", "node_modules", ".bin", "postject");
  const parentPostject = path.join(__dirname, "..", "..", "..", "node_modules", ".bin", "postject");
  if (fileExists(localPostject)) return localPostject;
  if (fileExists(parentPostject)) return parentPostject;
  if (hasCommand("postject")) return "postject";
  return null;
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
    errors.push("Missing seal-config/project.json5 (run: seal init)");
  }

  const targetName = resolveTargetName(projectRoot, targetArg || null);
  const t = loadTargetConfig(projectRoot, targetName);
  if (!t) warnings.push(`Missing target '${targetName}' (seal-config/targets/${targetName}.json5)`);
  const targetCfg = t ? t.cfg : { target: targetName, config: targetName, packager: "auto" };
  if (proj) {
    targetCfg.appName = targetCfg.appName || proj.appName;
    targetCfg.serviceName = targetCfg.serviceName || proj.appName;
  }

  const configName = resolveConfigName(targetCfg, null);
  const configFile = getConfigFile(projectRoot, configName);
  if (!fileExists(configFile)) warnings.push(`Missing runtime config: seal-config/configs/${configName}.json5`);

  if (!fileExists(paths.runtimeConfigPath)) warnings.push(`Missing config.runtime.json5 (dev convenience). Tip: copy seal-config/configs/${configName}.json5 -> config.runtime.json5`);

  if (proj) {
    const entryAbs = path.join(projectRoot, proj.entry);
    if (!fileExists(entryAbs)) errors.push(`Entrypoint missing: ${proj.entry}`);
  }

  // Optional remote preflight (only when explicit target is provided)
  if (targetArg && t && (targetCfg.kind || "local").toLowerCase() === "ssh") {
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
  const allowFallback = !!(targetCfg?.allowFallback ?? proj?.build?.allowFallback ?? false);
  const packagerRequested = String(targetCfg?.packager || proj?.build?.packager || "auto").toLowerCase();
  const seaNeeded = packagerRequested === "sea" || packagerRequested === "auto";
  const thinNeeded = packagerRequested === "thin";
  let thinToolchainIssue = false;
  const major = nodeMajor();
  if (major < 18) errors.push(`Node too old: ${process.version} (need >= 18; SEA needs >= 20)`);
  if (seaNeeded && major < 20) {
    warnings.push(`Node < 20: SEA may not work. ${allowFallback ? "Fallback is enabled." : "Build will fail unless fallback is explicitly enabled (build.allowFallback=true or packager=fallback)."} Node=${process.version}`);
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
    try {
      require("postject");
      const postjectBin = resolvePostjectBin();
      if (postjectBin) ok("postject: OK (SEA injection)");
      else warnings.push(`postject module installed but CLI not found in node_modules/.bin or PATH – SEA may fail. ${allowFallback ? "Fallback is enabled." : "Build will fail unless fallback is explicitly enabled (build.allowFallback=true or packager=fallback)."}`);
    } catch {
      warnings.push(`postject not installed – SEA may fail. ${allowFallback ? "Fallback is enabled." : "Build will fail unless fallback is explicitly enabled (build.allowFallback=true or packager=fallback)."}`);
    }
  }

  // THIN tools
  if (thinNeeded) {
    if (!hasCommand("zstd")) {
      errors.push("zstd not found in PATH (thin). Install: sudo apt-get install -y zstd");
      thinToolchainIssue = true;
    } else {
      ok("zstd: OK");
    }

    const cc = hasCommand("cc") ? "cc" : (hasCommand("gcc") ? "gcc" : null);
    if (!cc) {
      errors.push("C compiler not found (thin). Install: sudo apt-get install -y build-essential");
      thinToolchainIssue = true;
    }

    if (!hasCommand("pkg-config")) {
      warnings.push("pkg-config not found – cannot verify libzstd headers (thin launcher build may fail). Install: sudo apt-get install -y pkg-config");
      thinToolchainIssue = true;
    } else {
      const zstdPc = spawnSyncSafe("pkg-config", ["--cflags", "--libs", "libzstd"], { stdio: "pipe" });
      if (!zstdPc.ok) {
        warnings.push("libzstd not found by pkg-config. Install: sudo apt-get install -y libzstd-dev");
        thinToolchainIssue = true;
      }
    }

    if (cc) {
      const testSrc = "#include <zstd.h>\nint main(void){return 0;}\n";
      let zstdFlags = [];
      if (hasCommand("pkg-config")) {
        const pc = spawnSyncSafe("pkg-config", ["--cflags", "--libs", "libzstd"], { stdio: "pipe" });
        if (pc.ok) {
          const out = `${pc.stdout} ${pc.stderr}`.trim();
          if (out) zstdFlags = out.split(/\s+/).filter(Boolean);
        }
      }
      const args = ["-x", "c", "-", "-o", "/dev/null"];
      const hasLzstd = zstdFlags.includes("-lzstd");
      const compileArgs = hasLzstd ? [...args, ...zstdFlags] : [...args, ...zstdFlags, "-lzstd"];
      const compile = spawnSyncSafe(cc, compileArgs, { stdio: "pipe", input: testSrc });
      if (!compile.ok) {
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

  // Optional hardening tools (recommended; SEAL will still work without them)
  const hardCfg = proj?.build?.hardening;
  const hardEnabled = hardCfg === false ? false : !(typeof hardCfg === 'object' && hardCfg && hardCfg.enabled === false);
  if (hardEnabled) {
    if (hasCommand('strip')) ok('strip: OK (symbol stripping)');
    else warnings.push('strip not installed – binaries will be easier to inspect (install binutils)');

    if (hasCommand('upx')) ok('upx: OK (binary packing)');
    else warnings.push('upx not installed – binaries will not be packed (optional but recommended)');
  }

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
}

module.exports = { cmdCheck };

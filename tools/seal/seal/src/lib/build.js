"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const esbuild = require("esbuild");
const JavaScriptObfuscator = require("javascript-obfuscator");
const tar = require("tar");
const zlib = require("zlib");

const { ensureDir, copyDir, copyFile, rmrf, fileExists } = require("./fsextra");
const { info, warn, err, ok } = require("./ui");
const { getSealPaths } = require("./project");
const { spawnSyncSafe } = require("./spawn");
const { packSea } = require("./packagers/sea");
const { packFallback } = require("./packagers/fallback");

function makeBuildId() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const id = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const rnd = crypto.randomBytes(2).toString("hex");
  return `${id}-${rnd}`;
}


function readAppVersion(projectRoot) {
  try {
    const pkgPath = path.join(projectRoot, "package.json");
    if (!fs.existsSync(pkgPath)) return null;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    if (pkg && typeof pkg.version === "string" && pkg.version.trim()) return pkg.version.trim();
  } catch {
    // ignore
  }
  return null;
}

function obfuscationOptions(profile) {
  // Keep logs readable: do NOT hide string literals.
  const base = {
    compact: true,
    controlFlowFlattening: false,
    deadCodeInjection: false,
    stringArray: false,
    splitStrings: false,
    sourceMap: false,
    renameGlobals: false,
  };

  if (profile === "aggressive") {
    return {
      ...base,
      controlFlowFlattening: true,
      controlFlowFlatteningThreshold: 0.7,
      deadCodeInjection: true,
      deadCodeInjectionThreshold: 0.25,
      numbersToExpressions: true,
      simplify: true,
    };
  }

  if (profile === "minimal") return base;

  // balanced
  return {
    ...base,
    simplify: true,
    numbersToExpressions: true,
  };
}

async function buildBundle({ projectRoot, entryRel, stageDir, buildId, appName }) {
  const entryAbs = path.join(projectRoot, entryRel);
  const outFile = path.join(stageDir, "bundle.cjs");

  await esbuild.build({
    entryPoints: [entryAbs],
    bundle: true,
    platform: "node",
    target: "node20",
    format: "cjs",
    sourcemap: false,
    minify: false,
    outfile: outFile,
    define: {
      "__SEAL_BUILD_ID__": JSON.stringify(buildId),
      "__SEAL_APP_NAME__": JSON.stringify(appName),
    },
    logLevel: "silent",
  });

  return outFile;
}

function obfuscateBundle(bundlePath, stageDir, profile) {
  const src = fs.readFileSync(bundlePath, "utf-8");
  const result = JavaScriptObfuscator.obfuscate(src, obfuscationOptions(profile));
  const out = path.join(stageDir, "bundle.obf.cjs");
  fs.writeFileSync(out, result.getObfuscatedCode(), "utf-8");
  return out;
}


function frontendObfuscationOptions(profile) {
  // Browser-safe defaults. We still avoid heavy transformations to keep it stable.
  const opts = obfuscationOptions(profile);
  return {
    ...opts,
    target: "browser",
    // Browser JS often relies on property names and DOM APIs.
    renameGlobals: false,
    identifierNamesGenerator: "hexadecimal",
  };
}

function walkFiles(rootDir) {
  const out = [];
  const stack = [rootDir];
  while (stack.length) {
    const dir = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) stack.push(full);
      else if (ent.isFile()) out.push(full);
    }
  }
  return out;
}

function obfuscateFrontendAssets(releaseDir, profile, enabled) {
  if (!enabled) return { enabled: false, profile, files: 0, reason: "disabled" };

  const publicDir = path.join(releaseDir, "public");
  if (!fileExists(publicDir)) {
    return { enabled: true, profile, files: 0, reason: "no_public_dir" };
  }

  const jsFiles = walkFiles(publicDir)
    .filter((p) => p.endsWith('.js'))
    .filter((p) => !p.endsWith('.min.js'));

  // Reserved tool marker (older builds wrote it into release). Keep release clean.
  try {
    fs.rmSync(path.join(publicDir, '.seal_frontend_obfuscated'), { force: true });
  } catch {}


  let count = 0;
  for (const filePath of jsFiles) {
    const src = fs.readFileSync(filePath, 'utf-8');
    try {
      const result = JavaScriptObfuscator.obfuscate(src, frontendObfuscationOptions(profile));
      fs.writeFileSync(filePath, result.getObfuscatedCode(), 'utf-8');
      count += 1;
    } catch (e) {
      throw new Error(`Frontend obfuscation failed for ${path.relative(releaseDir, filePath)}: ${e.message}`);
    }
  }

  return { enabled: true, profile, files: count };
}

function findTagEnd(html, start) {
  let quote = null;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (quote) {
      if (ch === "\\" && i + 1 < html.length) {
        i += 1;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === "\"" || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === ">") return i;
  }
  return -1;
}

function minifyHtmlSafe(src, opts) {
  const stripComments = !(opts && opts.stripComments === false);
  const collapseWhitespace = !(opts && opts.collapseWhitespace === false);
  const len = src.length;
  const lower = src.toLowerCase();
  let out = "";
  let i = 0;

  while (i < len) {
    const ch = src[i];

    if (ch === "<") {
      // HTML comments (keep non-empty comments to avoid breaking comment-based templates)
      if (src.startsWith("<!--", i)) {
        const end = src.indexOf("-->", i + 4);
        if (end === -1) {
          out += src.slice(i);
          break;
        }
        if (!stripComments) {
          out += src.slice(i, end + 3);
        } else {
          const body = src.slice(i + 4, end);
          if (body.trim().length) {
            out += src.slice(i, end + 3);
          }
        }
        i = end + 3;
        continue;
      }

      // Raw blocks: keep contents as-is (script/style/pre/textarea)
      const rawMatch = /^<\s*(script|style|pre|textarea)\b/i.exec(src.slice(i));
      if (rawMatch) {
        const tag = rawMatch[1].toLowerCase();
        const startTagEnd = findTagEnd(src, i);
        if (startTagEnd === -1) {
          out += src.slice(i);
          break;
        }
        const closeIdx = lower.indexOf(`</${tag}`, startTagEnd + 1);
        if (closeIdx === -1) {
          out += src.slice(i);
          break;
        }
        const closeTagEnd = findTagEnd(src, closeIdx);
        if (closeTagEnd === -1) {
          out += src.slice(i);
          break;
        }
        out += src.slice(i, closeTagEnd + 1);
        i = closeTagEnd + 1;
        continue;
      }

      out += ch;
      i += 1;
      continue;
    }

    if (/\s/.test(ch)) {
      let j = i + 1;
      while (j < len && /\s/.test(src[j])) j += 1;
      const prev = out.length ? out[out.length - 1] : "";
      const next = j < len ? src[j] : "";
      if (collapseWhitespace && prev === ">" && next === "<") {
        out += " ";
      } else {
        out += src.slice(i, j);
      }
      i = j;
      continue;
    }

    out += ch;
    i += 1;
  }

  return out;
}

function minifyCssSafe(src, opts) {
  const stripComments = !(opts && opts.stripComments === false);
  const collapseWhitespace = !(opts && opts.collapseWhitespace === false);
  if (!stripComments && !collapseWhitespace) return src;

  const noSpaceBefore = new Set(["{", "}", ";", ":", ",", ">", "(", ")"]);
  const noSpaceAfter = new Set(["{", "}", ";", ":", ",", ">", "(", ")"]);

  let out = "";
  let i = 0;
  let quote = null;
  let pendingSpace = false;

  while (i < src.length) {
    const ch = src[i];

    if (quote) {
      out += ch;
      if (ch === "\\" && i + 1 < src.length) {
        out += src[i + 1];
        i += 2;
        continue;
      }
      if (ch === quote) quote = null;
      i += 1;
      continue;
    }

    if (ch === "\"" || ch === "'") {
      quote = ch;
      out += ch;
      i += 1;
      continue;
    }

    // Comments
    if (ch === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      if (end === -1) break;
      if (!stripComments) {
        out += src.slice(i, end + 2);
      }
      i = end + 2;
      continue;
    }

    if (/\s/.test(ch)) {
      if (!collapseWhitespace) {
        let j = i + 1;
        while (j < src.length && /\s/.test(src[j])) j += 1;
        out += src.slice(i, j);
        i = j;
        continue;
      }
      pendingSpace = true;
      i += 1;
      continue;
    }

    if (pendingSpace) {
      const last = out[out.length - 1];
      if (!(last && noSpaceAfter.has(last)) && !noSpaceBefore.has(ch)) {
        out += " ";
      }
      pendingSpace = false;
    }

    out += ch;
    i += 1;
  }

  return collapseWhitespace ? out.trim() : out;
}

function normalizeMinifySection(section, defaults) {
  const cfg = { ...defaults };
  if (section === undefined) return cfg;
  if (section === false) return { ...cfg, enabled: false };
  if (section === true) return cfg;
  if (typeof section === "object" && section) {
    if (section.enabled === false) cfg.enabled = false;
    if (section.enabled === true) cfg.enabled = true;
    if (typeof section.stripComments === "boolean") cfg.stripComments = section.stripComments;
    if (typeof section.collapseWhitespace === "boolean") cfg.collapseWhitespace = section.collapseWhitespace;
  }
  return cfg;
}

function minifyFrontendAssets(releaseDir, opts) {
  const enabled = !(opts === false);
  if (!enabled) return { enabled: false };

  const publicDir = path.join(releaseDir, "public");
  if (!fileExists(publicDir)) {
    return { enabled: true, html: { files: 0 }, css: { files: 0 }, reason: "no_public_dir" };
  }

  const files = walkFiles(publicDir);
  const htmlCfg = normalizeMinifySection(opts && opts.html, {
    enabled: true,
    stripComments: true,
    collapseWhitespace: true,
  });
  const cssCfg = normalizeMinifySection(opts && opts.css, {
    enabled: true,
    stripComments: true,
    collapseWhitespace: true,
  });

  const htmlFiles = (!htmlCfg.enabled)
    ? []
    : files.filter((p) => (p.endsWith(".html") || p.endsWith(".htm")) && !p.endsWith(".min.html") && !p.endsWith(".min.htm"));
  const cssFiles = (!cssCfg.enabled)
    ? []
    : files.filter((p) => p.endsWith(".css") && !p.endsWith(".min.css"));

  let htmlIn = 0;
  let htmlOut = 0;
  let htmlCount = 0;
  for (const filePath of htmlFiles) {
    const src = fs.readFileSync(filePath, "utf-8");
    const min = minifyHtmlSafe(src, htmlCfg);
    const minFinal = min.length <= src.length ? min : src;
    fs.writeFileSync(filePath, minFinal, "utf-8");
    htmlIn += src.length;
    htmlOut += minFinal.length;
    htmlCount += 1;
  }

  let cssIn = 0;
  let cssOut = 0;
  let cssCount = 0;
  for (const filePath of cssFiles) {
    const src = fs.readFileSync(filePath, "utf-8");
    const min = minifyCssSafe(src, cssCfg);
    const minFinal = min.length <= src.length ? min : src;
    fs.writeFileSync(filePath, minFinal, "utf-8");
    cssIn += src.length;
    cssOut += minFinal.length;
    cssCount += 1;
  }

  return {
    enabled: true,
    html: { files: htmlCount, bytesIn: htmlIn, bytesOut: htmlOut },
    css: { files: cssCount, bytesIn: cssIn, bytesOut: cssOut },
  };
}


function isShebangScript(filePath) {
  try {
    const buf = fs.readFileSync(filePath);
    return buf.slice(0, 2).toString('utf-8') === '#!';
  } catch {
    return false;
  }
}

function hasCommand(cmd) {
  const r = spawnSyncSafe('bash', ['-lc', `command -v ${cmd} >/dev/null 2>&1`], { stdio: 'pipe' });
  return !!r.ok;
}

function tryStripBinary(binPath) {
  if (!hasCommand('strip')) {
    return { ok: false, skipped: true, reason: 'strip_not_installed' };
  }
  const r = spawnSyncSafe('strip', ['--strip-all', binPath], { stdio: 'pipe' });
  return { ok: r.ok, skipped: false, reason: r.ok ? 'ok' : (r.stderr || r.error || 'strip_failed') };
}

function tryUpxPack(binPath) {
  if (!hasCommand('upx')) {
    return { ok: false, skipped: true, reason: 'upx_not_installed' };
  }
  // --best is a good default; --lzma increases compression but may be slower.
  const r = spawnSyncSafe('upx', ['--best', '--lzma', binPath], { stdio: 'pipe' });
  return { ok: r.ok, skipped: false, reason: r.ok ? 'ok' : (r.stderr || r.error || 'upx_failed') };
}



function packStageMainToLoader(stageDir, inFileName, outFileName, method, chunkSize) {
  const inPath = path.join(stageDir, inFileName);
  if (!fileExists(inPath)) return { ok: false, skipped: true, reason: 'input_missing' };

  const srcBuf = fs.readFileSync(inPath);
  const m = (method || 'brotli').toLowerCase();

  let packed;
  try {
    if (m === 'gzip') packed = zlib.gzipSync(srcBuf, { level: 9 });
    else packed = zlib.brotliCompressSync(srcBuf, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } });
  } catch (e) {
    return { ok: false, skipped: false, reason: e && e.message ? e.message : String(e) };
  }

  const b64 = packed.toString('base64');
  const cs = Math.max(1024, Number(chunkSize || 8000));
  const parts = [];
  for (let i = 0; i < b64.length; i += cs) parts.push(b64.slice(i, i + cs));

  const outPath = path.join(stageDir, outFileName);
  const decompressFn = (m === 'gzip') ? 'gunzipSync' : 'brotliDecompressSync';

  const loader = `"use strict";

const zlib = require("zlib");
const Module = require("module");
const path = require("path");

const PARTS = ${JSON.stringify(parts)};
const b64 = PARTS.join("");
const buf = Buffer.from(b64, "base64");
const code = zlib.${decompressFn}(buf).toString("utf-8");

// Compile as a CommonJS module in current working directory.
const filename = path.join(process.cwd(), "app.bundle.cjs");
const m = new Module(filename, module);
m.filename = filename;
m.paths = Module._nodeModulePaths(process.cwd());
require.main = m;
process.mainModule = m; // best effort (legacy), helps some libs
m._compile(code, filename);
`;

  fs.writeFileSync(outPath, loader, 'utf-8');

  return {
    ok: true,
    skipped: false,
    method: m,
    chunkSize: cs,
    bytesIn: srcBuf.length,
    bytesPacked: packed.length,
    parts: parts.length,
    outFile: outFileName,
  };
}
function packFallbackBundleGzip(releaseDir, appName) {
  const bundlePath = path.join(releaseDir, 'app.bundle.cjs');
  if (!fileExists(bundlePath)) return { ok: false, skipped: true, reason: 'bundle_missing' };

  const gzPath = path.join(releaseDir, 'app.bundle.cjs.gz');
  const loaderPath = path.join(releaseDir, 'seal.loader.cjs');

  try {
    const src = fs.readFileSync(bundlePath);
    const gz = zlib.gzipSync(src, { level: 9 });
    fs.writeFileSync(gzPath, gz);
    fs.rmSync(bundlePath, { force: true });

    // Tiny loader that inflates + executes the bundled app without leaving plain-text JS on disk.
    fs.writeFileSync(loaderPath, `"use strict";

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const Module = require("module");

const gzPath = path.join(__dirname, "app.bundle.cjs.gz");
const code = zlib.gunzipSync(fs.readFileSync(gzPath)).toString("utf-8");

const filename = path.join(__dirname, "app.bundle.cjs");
const m = new Module(filename, module);
m.filename = filename;
m.paths = Module._nodeModulePaths(__dirname);
m._compile(code, filename);
`, 'utf-8');

    // Replace launcher script to call the loader.
    const runPath = path.join(releaseDir, appName);
    if (fileExists(runPath) && isShebangScript(runPath)) {
      const script = `#!/usr/bin/env bash
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"
exec node "$DIR/seal.loader.cjs" "$@"
`;
      fs.writeFileSync(runPath, script, 'utf-8');
      fs.chmodSync(runPath, 0o755);
    }

    return { ok: true, skipped: false, reason: 'ok' };
  } catch (e) {
    return { ok: false, skipped: false, reason: e && e.message ? e.message : String(e) };
  }
}


function applyHardeningPost(releaseDir, appName, packagerUsed, hardCfg) {
  // Default: enabled.
  const enabled = hardCfg === false ? false : !(typeof hardCfg === 'object' && hardCfg && hardCfg.enabled === false);
  if (!enabled) return { enabled: false, reason: 'disabled', steps: [] };

  const cfg = (typeof hardCfg === 'object' && hardCfg) ? hardCfg : {};
  const steps = [];

  // 1) Fallback packager: hide the backend bundle from casual inspection (gzip + loader).
  const bundlePacking = cfg.bundlePacking !== false; // default true
  if (packagerUsed === 'fallback') {
    const r = bundlePacking
      ? packFallbackBundleGzip(releaseDir, appName)
      : { ok: false, skipped: true, reason: 'bundle_packing_disabled' };
    steps.push({ step: 'bundle_pack_gzip', ...r });
  }

  // 2) SEA binary repacking (strip/upx) is EXPERIMENTAL.
  // There are real-world cases where postject-ed binaries break after strip/upx.
  // Therefore it is OFF by default and must be enabled explicitly.
  const exePath = path.join(releaseDir, appName);
  const isScript = isShebangScript(exePath);

  const stripEnabled = cfg.strip === true; // default false
  if (!isScript && stripEnabled) {
    steps.push({ step: 'strip', ...tryStripBinary(exePath) });
  } else if (!isScript) {
    steps.push({ step: 'strip', ok: false, skipped: true, reason: stripEnabled ? 'strip_failed' : 'disabled_by_default' });
  }

  const upxEnabled = cfg.upx === true; // default false
  if (!isScript && upxEnabled) {
    steps.push({ step: 'upx', ...tryUpxPack(exePath) });
  } else if (!isScript) {
    steps.push({ step: 'upx', ok: false, skipped: true, reason: upxEnabled ? 'upx_failed' : 'disabled_by_default' });
  }

  return { enabled: true, steps };
}


function copyIncludes(projectRoot, releaseDir, includeDirs) {
  for (const d of includeDirs || []) {
    const src = path.join(projectRoot, d);
    if (!fileExists(src)) continue;
    const dst = path.join(releaseDir, d);
    copyDir(src, dst);
  }
}

async function createArtifact({ projectRoot, appName, buildId, releaseDir }) {
  const { outDir } = getSealPaths(projectRoot);
  ensureDir(outDir);

  const folderName = `${appName}-${buildId}`;
  const tempRoot = path.join(outDir, "artifact-tmp");
  const tempFolder = path.join(tempRoot, folderName);

  rmrf(tempRoot);
  ensureDir(tempRoot);
  copyDir(releaseDir, tempFolder);

  const artifactPath = path.join(outDir, `${folderName}.tgz`);
  await tar.c({
    gzip: true,
    file: artifactPath,
    cwd: tempRoot,
    portable: true,
  }, [folderName]);

  rmrf(tempRoot);
  return artifactPath;
}

function writeJson(filePath, obj) {
  fs.writeFileSync(filePath, JSON.stringify(obj, null, 2) + "\n", "utf-8");
}

function writeVersion(releaseDir, versionObj) {
  writeJson(path.join(releaseDir, "version.json"), versionObj);
}

function writeMeta(outDir, meta) {
  ensureDir(outDir);
  const metaPath = path.join(outDir, "meta.json");
  writeJson(metaPath, meta);
}

async function buildRelease({ projectRoot, projectCfg, targetCfg, configName, packagerOverride }) {
  const appName = projectCfg.appName;
  const buildId = makeBuildId();

  const { outDir } = getSealPaths(projectRoot);
  const stageDir = path.join(outDir, "stage");
  const releaseDir = path.join(outDir, "release");

  // Always keep only the latest local release artifacts.
  rmrf(outDir);
  ensureDir(stageDir);
  ensureDir(releaseDir);

  info(`Build: appName=${appName} buildId=${buildId}`);
  info(`Entry: ${projectCfg.entry}`);
  info(`Target: ${targetCfg.target} (packager=${packagerOverride || targetCfg.packager || projectCfg.build.packager}) config=${configName}`);

  const bundlePath = await buildBundle({ projectRoot, entryRel: projectCfg.entry, stageDir, buildId, appName });
  ok("Bundle OK (esbuild)");

  const obfProfile = projectCfg.build.obfuscationProfile || "balanced";
  const obfPath = obfuscateBundle(bundlePath, stageDir, obfProfile);
  ok(`Obfuscation OK (${obfProfile})`);

  
const packagerRequested = (packagerOverride || targetCfg.packager || projectCfg.build.packager || "auto").toLowerCase();

// Normalize hardening config early (used for SEA main packing)
const hardCfgRaw = projectCfg.build.hardening;
const hardEnabled = hardCfgRaw === false ? false : !(typeof hardCfgRaw === 'object' && hardCfgRaw && hardCfgRaw.enabled === false);
const hardCfg = (typeof hardCfgRaw === 'object' && hardCfgRaw) ? hardCfgRaw : {};

// Default hardening: pack the SEA main script into a compressed loader.
// This avoids having plain-text JS inside the executable, while staying compatible.
let seaMainRel = "./bundle.obf.cjs";
let seaMainPacking = { ok: false, skipped: true, reason: "not_enabled" };

const seaMainPackingEnabled = hardEnabled
  && (packagerRequested === "sea" || packagerRequested === "auto")
  && (hardCfg.seaMainPacking !== false);

if (seaMainPackingEnabled) {
  const method = (hardCfg.seaMainPackingMethod || "brotli");
  const chunkSize = (hardCfg.seaMainPackingChunkSize || 8000);
  seaMainPacking = packStageMainToLoader(stageDir, "bundle.obf.cjs", "bundle.packed.cjs", method, chunkSize);
  if (seaMainPacking.ok) {
    seaMainRel = "./bundle.packed.cjs";
    ok(`SEA main packed (${seaMainPacking.method})`);
  } else if (!seaMainPacking.skipped) {
    warn(`SEA main packing failed, continuing without it: ${seaMainPacking.reason}`);
  }
}

  let packagerUsed = packagerRequested;

  let packOk = false;
  let packError = null;

  if (packagerRequested === "sea" || packagerRequested === "auto") {
    const res = packSea({ stageDir, releaseDir, appName, mainRel: seaMainRel });
    if (res.ok) {
      packOk = true;
      packagerUsed = "sea";
      ok("Packager SEA OK");
    } else {
      packError = res.error;
      warn(`SEA packager failed: ${res.errorShort}`);
    }
  }

  if (!packOk) {
    const res = packFallback({ stageDir, releaseDir, appName, obfPath });
    if (!res.ok) {
      throw new Error(`Fallback packager failed: ${res.errorShort}`);
    }
    packOk = true;
    packagerUsed = "fallback";
    ok("Packager fallback OK (node + obfuscated bundle)");
  }


  

// Hardening (post-pack): make it harder to recover code by casually viewing files.
// Default: enabled (can be disabled in seal-config/project.json5 -> build.hardening.enabled=false)
const hardPost = applyHardeningPost(releaseDir, appName, packagerUsed, hardCfgRaw);
const hardening = { enabled: hardEnabled, seaMainPacking, post: hardPost };

if (!hardEnabled) {
  info('Hardening disabled');
} else {
  const stepsOk = (hardPost.steps || []).filter(s => s.ok).map(s => s.step);
  const stepsSkip = (hardPost.steps || []).filter(s => s.skipped).map(s => s.step + ':' + s.reason);

  if (stepsSkip.length) {
    warn(`Hardening partial: ${stepsSkip.join(', ')}`);
  }

  const bits = [];
  if (seaMainPacking && seaMainPacking.ok) bits.push(`seaMainPack:${seaMainPacking.method}`);
  bits.push(...stepsOk);
  ok(`Hardening OK (${bits.length ? bits.join(' + ') : 'no_steps'})`);
}


  // Includes: public/, data/ etc
  copyIncludes(projectRoot, releaseDir, projectCfg.build.includeDirs);

// Frontend obfuscation (public/*.js) – enabled by default
  const frontendCfg = projectCfg.build.frontendObfuscation;
  const frontendEnabled = frontendCfg === false ? false : !(typeof frontendCfg === 'object' && frontendCfg && frontendCfg.enabled === false);
  const frontendProfile = (typeof frontendCfg === 'object' && frontendCfg && frontendCfg.profile)
    ? frontendCfg.profile
    : (projectCfg.build.frontendObfuscationProfile || obfProfile);

  const frontendResult = obfuscateFrontendAssets(releaseDir, frontendProfile, frontendEnabled);
  if (!frontendResult.enabled) {
    info('Frontend obfuscation disabled');
  } else if (frontendResult.files > 0) {
    ok(`Frontend obfuscation OK (${frontendResult.profile}) – ${frontendResult.files} file(s)`);
  } else {
    ok(`Frontend obfuscation OK (${frontendResult.profile}) – no JS files found`);
  }

  // Frontend minification (HTML/CSS) – safe by default
  const minifyCfg = projectCfg.build.frontendMinify;
  const minifyEnabled = minifyCfg === false ? false : !(typeof minifyCfg === "object" && minifyCfg && minifyCfg.enabled === false);
  let minifyLevel = "safe";
  if (typeof minifyCfg === "object" && minifyCfg && typeof minifyCfg.level === "string") {
    const cand = String(minifyCfg.level).toLowerCase();
    if (cand === "minimal" || cand === "safe") minifyLevel = cand;
    else warn(`Unknown frontendMinify.level "${minifyCfg.level}", using "safe"`);
  }

  const htmlDefaults = {
    enabled: true,
    stripComments: minifyLevel !== "minimal",
    collapseWhitespace: minifyLevel !== "minimal",
  };
  const cssDefaults = {
    enabled: true,
    stripComments: minifyLevel !== "minimal",
    collapseWhitespace: true,
  };
  const htmlCfg = normalizeMinifySection(minifyCfg && minifyCfg.html, htmlDefaults);
  const cssCfg = normalizeMinifySection(minifyCfg && minifyCfg.css, cssDefaults);
  const anyMinifyEnabled = minifyEnabled && (htmlCfg.enabled || cssCfg.enabled);

  const minifyResult = anyMinifyEnabled
    ? minifyFrontendAssets(releaseDir, { html: htmlCfg, css: cssCfg })
    : { enabled: false, reason: "disabled" };
  if (minifyResult.enabled) minifyResult.level = minifyLevel;

  if (!minifyResult.enabled) {
    info("Frontend minify disabled");
  } else {
    const htmlFiles = minifyResult.html.files || 0;
    const cssFiles = minifyResult.css.files || 0;
    const bytesIn = (minifyResult.html.bytesIn || 0) + (minifyResult.css.bytesIn || 0);
    const bytesOut = (minifyResult.html.bytesOut || 0) + (minifyResult.css.bytesOut || 0);
    const saved = bytesIn - bytesOut;
    if (htmlFiles || cssFiles) {
      ok(`Frontend minify OK (level:${minifyLevel}, html:${htmlFiles}, css:${cssFiles}, saved:${saved} bytes)`);
    } else {
      ok(`Frontend minify OK (level:${minifyLevel}) – no HTML/CSS files found`);
    }
  }

  // Convenience appctl script (shipped to server)
  const appctlPath = path.join(releaseDir, "appctl");
  fs.writeFileSync(appctlPath, `#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

APP_NAME="${appName}"
APP_BIN="${appName}"

# Best-effort install root detection.
# Expected layout:
#   <ROOT>/releases/<appName>-<buildId>/appctl
ROOT=""
PARENT="$(dirname "$DIR")"
if [ "$(basename "$PARENT")" = "releases" ]; then
  ROOT="$(dirname "$PARENT")"
elif [ -d "$DIR/releases" ]; then
  ROOT="$DIR"
fi

SERVICE_NAME="$APP_NAME"
SERVICE_SCOPE=""  # auto: user (home) / system (else)

_trim() { tr -d '\r\n'; }

_auto_scope() {
  if [ -n "$SERVICE_SCOPE" ]; then
    echo "$SERVICE_SCOPE"; return 0
  fi
if [ -n "$ROOT" ] && [ "\${HOME:-}" != "" ] && echo "$ROOT" | grep -q "^$HOME"; then
    echo "user"; return 0
  fi
  echo "system"
}

_detect_existing_service() {
  # If a unit already exists for this ROOT (created by SEAL bootstrap), detect it
  # and persist service.name/scope for later convenience.
  [ -z "$ROOT" ] && return 0
  local runner="$ROOT/run-current.sh"

  local user_matches=""
  local system_matches=""

  local udir="$HOME/.config/systemd/user"
  if [ -d "$udir" ]; then
    user_matches="$(grep -rl "ExecStart=$runner" "$udir" 2>/dev/null || true)"
  fi
  if [ -d "/etc/systemd/system" ]; then
    system_matches="$(grep -rl "ExecStart=$runner" /etc/systemd/system 2>/dev/null || true)"
  fi

  local ucount="0"
  local scount="0"
  ucount="$(echo "$user_matches" | grep -c . || true)"
  scount="$(echo "$system_matches" | grep -c . || true)"

  if [ "$ucount" -gt 0 ] && [ "$scount" -gt 0 ]; then
    echo "[appctl] Ambiguous service: matching units exist in BOTH user and system scopes for $runner" 1>&2
    echo "$user_matches" | sed 's/^/  user: /' 1>&2 || true
    echo "$system_matches" | sed 's/^/  system: /' 1>&2 || true
    exit 2
  fi

  local found=""
  local scope=""
  if [ "$ucount" -eq 1 ]; then
    found="$user_matches"; scope="user"
  elif [ "$ucount" -gt 1 ]; then
    echo "[appctl] Ambiguous service: multiple user units match $runner" 1>&2
    echo "$user_matches" | sed 's/^/  - /' 1>&2 || true
    exit 2
  elif [ "$scount" -eq 1 ]; then
    found="$system_matches"; scope="system"
  elif [ "$scount" -gt 1 ]; then
    echo "[appctl] Ambiguous service: multiple system units match $runner" 1>&2
    echo "$system_matches" | sed 's/^/  - /' 1>&2 || true
    exit 2
  else
    return 0
  fi

  local name="$(basename "$found" | sed 's/\.service$//')"
  SERVICE_NAME="$name"
  SERVICE_SCOPE="$scope"

  mkdir -p "$ROOT" 2>/dev/null || true
  if [ "$(id -u)" -ne 0 ] && [ "$SERVICE_SCOPE" = "system" ]; then
    echo "$SERVICE_NAME" | sudo tee "$ROOT/service.name" >/dev/null
    echo "$SERVICE_SCOPE" | sudo tee "$ROOT/service.scope" >/dev/null
  else
    echo "$SERVICE_NAME" > "$ROOT/service.name"
    echo "$SERVICE_SCOPE" > "$ROOT/service.scope"
  fi
}

_load_service_settings() {
  if [ -n "$ROOT" ]; then
    if [ -f "$ROOT/service.name" ]; then SERVICE_NAME="$(cat "$ROOT/service.name" | _trim)"; fi
    if [ -f "$ROOT/service.scope" ]; then SERVICE_SCOPE="$(cat "$ROOT/service.scope" | _trim)"; fi
  fi

  _detect_existing_service

  if [ -z "$SERVICE_SCOPE" ]; then SERVICE_SCOPE="$(_auto_scope)"; fi
}

_as_root() {
  if [ "$SERVICE_SCOPE" = "system" ] && [ "$(id -u)" -ne 0 ]; then
    sudo "$@"
  else
    "$@"
  fi
}

_sysctl() {
  if [ "$SERVICE_SCOPE" = "user" ]; then
    systemctl --user "$@"
  else
    _as_root systemctl "$@"
  fi
}

_jctl() {
  if [ "$SERVICE_SCOPE" = "user" ]; then
    journalctl --user-unit "$SERVICE_NAME.service" "$@"
  else
    _as_root journalctl -u "$SERVICE_NAME.service" "$@"
  fi
}

_svc_file() {
  if [ "$SERVICE_SCOPE" = "user" ]; then
    echo "$HOME/.config/systemd/user/$SERVICE_NAME.service"
  else
    echo "/etc/systemd/system/$SERVICE_NAME.service"
  fi
}

_write_file() {
  local path="$1"; shift
  local content="$1"
  if [ "$SERVICE_SCOPE" = "system" ] && [ "$(id -u)" -ne 0 ]; then
    echo "$content" | sudo tee "$path" >/dev/null
  else
    echo "$content" > "$path"
  fi
}

_tee_file() {
  local path="$1"
  if [ "$SERVICE_SCOPE" = "system" ] && [ "$(id -u)" -ne 0 ]; then
    sudo tee "$path" >/dev/null
  else
    tee "$path" >/dev/null
  fi
}

usage() {
  cat 1>&2 <<EOF
Usage: ./appctl <command>

App runtime:
  run                 Run the app in foreground (requires config.runtime.json5)
  version             Print version.json

Service management (systemd):
  up [--name N] [--user|--system]
                      Install service (if needed) and start it
  down                Stop and remove service
  restart             Restart service
  status              Show service status
  logs                Follow logs (tail -f)

Notes:
  - Appctl auto-detects install ROOT from the standard layout:
      <ROOT>/releases/<app>-<buildId>/appctl
  - If service already exists (installed by SEAL bootstrap), appctl will detect its name.
EOF
}

cmd="\${1:-run}"
shift || true

case "$cmd" in
  run)
    if [ ! -f "$DIR/config.runtime.json5" ]; then
      echo "[appctl] Missing config.runtime.json5 in $DIR" 1>&2
      echo "[appctl] Tip: copy config/<config>.json5 here as config.runtime.json5" 1>&2
      exit 2
    fi
    exec "$DIR/$APP_BIN" "$@"
    ;;
  version)
    if [ -f "$DIR/version.json" ]; then
      cat "$DIR/version.json"
    else
      echo "{\"version\":null}"
      exit 1
    fi
    ;;
  up)
    _load_service_settings

    # Parse options
    while [ "\${1:-}" != "" ]; do
      case "$1" in
        --name)
          SERVICE_NAME="\${2:-}"; shift 2 || true
          ;;
        --user)
          SERVICE_SCOPE="user"; shift || true
          ;;
        --system)
          SERVICE_SCOPE="system"; shift || true
          ;;
        -h|--help)
          usage; exit 0
          ;;
        *)
          echo "[appctl] Unknown option: $1" 1>&2
          usage; exit 2
          ;;
      esac
    done

    if [ -z "$ROOT" ]; then
      echo "[appctl] Cannot detect install ROOT. Run from <ROOT>/releases/<app>-<buildId>/ or use SEAL deploy." 1>&2
      exit 2
    fi

    # Persist service settings for convenience
    echo "$SERVICE_NAME" | _tee_file "$ROOT/service.name"
    echo "$SERVICE_SCOPE" | _tee_file "$ROOT/service.scope"

    # Ensure layout
    _as_root mkdir -p "$ROOT/releases" "$ROOT/shared"

    # Ensure current.buildId (if missing)
    if [ ! -f "$ROOT/current.buildId" ]; then
      if [ "$(basename "$PARENT")" = "releases" ]; then
        echo "$(basename "$DIR")" | _tee_file "$ROOT/current.buildId"
      else
        echo "[appctl] Missing $ROOT/current.buildId (and cannot infer). Deploy first." 1>&2
        exit 2
      fi
    fi

    # Runner script (create if missing)
    if [ ! -f "$ROOT/run-current.sh" ]; then
      cat <<'EOF' | _tee_file "$ROOT/run-current.sh"
#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
BUILD_ID="$(cat "$ROOT/current.buildId")"
REL="$ROOT/releases/$BUILD_ID"
if [ ! -d "$REL" ]; then
  echo "[appctl] release dir not found: $REL" 1>&2
  exit 2
fi

# runtime config: shared -> release
if [ -f "$ROOT/shared/config.json5" ]; then
  cp "$ROOT/shared/config.json5" "$REL/config.runtime.json5"
fi

cd "$REL"
exec "$REL/appctl" run
EOF
      _as_root chmod +x "$ROOT/run-current.sh"
    fi

    # Unit file
    svc_path="$(_svc_file)"
    if [ ! -f "$svc_path" ]; then
      if [ "$SERVICE_SCOPE" = "user" ]; then
        mkdir -p "$(dirname "$svc_path")"
      fi

      if [ "$SERVICE_SCOPE" = "user" ]; then
        cat <<EOF | _tee_file "$svc_path"
[Unit]
Description=SEAL app $SERVICE_NAME
After=network.target

[Service]
Type=simple
WorkingDirectory=$ROOT
ExecStart=$ROOT/run-current.sh
Restart=always
RestartSec=1
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=default.target
EOF
      else
        cat <<EOF | _tee_file "$svc_path"
[Unit]
Description=SEAL app $SERVICE_NAME
After=network.target

[Service]
Type=simple
WorkingDirectory=$ROOT
ExecStart=$ROOT/run-current.sh
Restart=always
RestartSec=1
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
      fi
    fi

    _sysctl daemon-reload
    _sysctl enable --now "$SERVICE_NAME.service"
    echo "[appctl] Service is up: $SERVICE_NAME ($SERVICE_SCOPE)"
    ;;
  down)
    _load_service_settings
    svc_path="$(_svc_file)"
    _sysctl disable --now "$SERVICE_NAME.service" || true
    if [ -f "$svc_path" ]; then
      _as_root rm -f "$svc_path" || true
    fi
    _sysctl daemon-reload || true
    echo "[appctl] Service removed: $SERVICE_NAME ($SERVICE_SCOPE)"
    ;;
  restart)
    _load_service_settings
    _sysctl restart "$SERVICE_NAME.service"
    ;;
  status)
    _load_service_settings
    _sysctl status "$SERVICE_NAME.service" --no-pager
    ;;
  logs)
    _load_service_settings
    _jctl -n 200 -f
    ;;
  help|-h|--help)
    usage
    ;;
  *)
    echo "[appctl] Unknown command: $cmd" 1>&2
    usage
    exit 2
    ;;
esac
`, "utf-8");
  fs.chmodSync(appctlPath, 0o755);


  const createdAt = new Date().toISOString();
  const appVersion = readAppVersion(projectRoot) || "0.0.0";
  writeVersion(releaseDir, { version: appVersion, appName, buildId, createdAt });

  const meta = {
    appName,
    buildId,
    createdAt,
    target: targetCfg.target,
    config: configName,
    packager: packagerUsed,
    obfuscationProfile: obfProfile,
    frontendObfuscation: frontendResult,
    frontendMinify: minifyResult,
    hardening,
  };
  writeMeta(outDir, meta);

  const artifactPath = await createArtifact({ projectRoot, appName, buildId, releaseDir });
  ok(`Artifact: ${artifactPath}`);

  return { appName, buildId, outDir, releaseDir, artifactPath, meta, packagerUsed, packError };
}

module.exports = { buildRelease, makeBuildId };

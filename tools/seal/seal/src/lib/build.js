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
const { renderAppctl } = require("./appctl");
const { applyDecoy } = require("./decoy");
const { packSea } = require("./packagers/sea");
const { packFallback } = require("./packagers/fallback");
const { packThin, applyLauncherSelfHash } = require("./packagers/thin");
const { THIN_NATIVE_BOOTSTRAP_FILE } = require("./thinPaths");
const {
  normalizePackager,
  resolveBundleFallback,
  resolveThinConfig,
  resolveProtectionConfig,
  applyThinCompatibility,
  applyProtectionCompatibility,
  packagerSupportsHardening,
} = require("./packagerConfig");
const { resolveSentinelConfig } = require("./sentinelConfig");

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

function cleanOutDir(outDir, keepNames = []) {
  if (!fileExists(outDir)) return;
  const keep = new Set(keepNames);
  for (const entry of fs.readdirSync(outDir)) {
    if (keep.has(entry)) continue;
    rmrf(path.join(outDir, entry));
  }
}

function normalizeObfuscationProfile(raw) {
  if (raw === undefined || raw === null) {
    return { profile: "balanced", warning: null };
  }
  const profile = String(raw).toLowerCase();
  const aliases = new Map([
    ["off", "none"],
    ["disabled", "none"],
  ]);
  const normalized = aliases.get(profile) || profile;
  const known = new Set(["none", "minimal", "balanced", "strict", "max"]);
  if (!known.has(normalized)) {
    throw new Error(`Invalid build.obfuscationProfile: ${raw} (expected: none|minimal|balanced|strict|max)`);
  }
  return { profile: normalized, warning: null };
}

function resolveConsoleMode(raw) {
  if (raw === undefined || raw === null) {
    return { mode: "full", warning: null };
  }
  if (typeof raw === "boolean") {
    return { mode: raw ? "errors-only" : "full", warning: null };
  }
  const val = String(raw).toLowerCase();
  if (val === "1" || val === "true" || val === "yes" || val === "on") {
    return { mode: "errors-only", warning: null };
  }
  if (val === "0" || val === "false" || val === "no" || val === "off") {
    return { mode: "full", warning: null };
  }
  if (val === "full" || val === "all" || val === "debug") {
    return { mode: "full", warning: null };
  }
  if (val === "errors-only" || val === "errors" || val === "error" || val === "error-only") {
    return { mode: "errors-only", warning: null };
  }
  return { mode: "full", warning: `Unknown build.consoleMode "${raw}", using "full"` };
}

function obfuscationOptions(profile) {
  const normalized = normalizeObfuscationProfile(profile).profile;
  // Keep logs readable: do NOT hide string literals.
  const base = {
    compact: true,
    // CFF breaks some let-closure semantics; keep off and rely on Terser inline + DCI.
    controlFlowFlattening: false,
    deadCodeInjection: false,
    stringArray: false,
    splitStrings: false,
    sourceMap: false,
    renameGlobals: false,
    target: "node",
  };

  if (normalized === "none") {
    throw new Error("Obfuscation profile 'none' has no options (obfuscation disabled).");
  }

  if (normalized === "strict") {
    return {
      ...base,
      simplify: false,
      numbersToExpressions: true,
      controlFlowFlatteningThreshold: 0.75,
      deadCodeInjection: true,
      deadCodeInjectionThreshold: 0.3,
      identifierNamesGenerator: "mangled-shuffled",
      renameGlobals: true,
      renameProperties: false,
      transformObjectKeys: false,
      unicodeEscapeSequence: false,
      debugProtection: false,
      selfDefending: false,
    };
  }

  if (normalized === "max") {
    return {
      ...base,
      simplify: false,
      numbersToExpressions: true,
      controlFlowFlatteningThreshold: 0.75,
      deadCodeInjection: true,
      deadCodeInjectionThreshold: 0.4,
      identifierNamesGenerator: "mangled-shuffled",
      renameGlobals: true,
      renameProperties: false,
      transformObjectKeys: false,
      unicodeEscapeSequence: false,
      debugProtection: false,
      selfDefending: false,
    };
  }

  if (normalized === "minimal") return base;

  // balanced
  return {
    ...base,
    simplify: true,
    numbersToExpressions: true,
  };
}

function resolveBackendTerser(raw, profile) {
  const isStrong = profile === "strict" || profile === "max";
  const defaultPasses = profile === "max" ? 4 : (isStrong ? 3 : 2);
  const defaultToplevel = isStrong;
  const defaultCompress = isStrong
    ? { passes: defaultPasses, inline: 3 }
    : { passes: defaultPasses, inline: 1 };
  const defaultMangle = isStrong ? { toplevel: true } : false;
  const defaults = {
    passes: defaultPasses,
    toplevel: defaultToplevel,
    compress: defaultCompress,
    mangle: defaultMangle,
    format: { comments: false },
  };
  if (raw === undefined || raw === null) {
    return { enabled: true, ...defaults };
  }
  if (typeof raw === "boolean") {
    return raw ? { enabled: true, ...defaults } : { enabled: false };
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`Invalid build.backendTerser: expected boolean or object`);
  }
  const enabled = raw.enabled !== undefined ? !!raw.enabled : true;
  const passes = raw.passes !== undefined ? Number(raw.passes) : defaultPasses;
  if (!Number.isFinite(passes) || passes < 1 || passes > 10) {
    throw new Error(`Invalid build.backendTerser.passes: ${raw.passes}`);
  }
  const toplevel = raw.toplevel !== undefined ? !!raw.toplevel : defaults.toplevel;
  const compress = raw.compress !== undefined ? raw.compress : { passes, inline: 3 };
  const mangle = raw.mangle !== undefined ? raw.mangle : defaults.mangle;
  const format = raw.format !== undefined ? raw.format : defaults.format;
  return {
    enabled,
    passes,
    toplevel,
    compress,
    mangle,
    format,
  };
}

function loadTerser() {
  try {
    return require("terser");
  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    throw new Error(`terser not installed (npm i --workspace tools/seal/seal terser). ${msg}`);
  }
}

async function applyTerser(bundlePath, stageDir, terserCfg) {
  const terser = loadTerser();
  const src = fs.readFileSync(bundlePath, "utf-8");
  const opts = {
    compress: terserCfg.compress,
    mangle: terserCfg.mangle,
    toplevel: terserCfg.toplevel,
    format: terserCfg.format,
    sourceMap: false,
  };
  const result = await terser.minify(src, opts);
  if (!result || result.error || !result.code) {
    const errMsg = result && result.error ? String(result.error) : "terser failed";
    throw new Error(`Terser failed: ${errMsg}`);
  }
  const outPath = path.join(stageDir, "bundle.terser.cjs");
  fs.writeFileSync(outPath, result.code, "utf-8");
  return {
    enabled: true,
    ok: true,
    outPath,
    passes: terserCfg.passes,
    bytesIn: src.length,
    bytesOut: result.code.length,
  };
}

async function buildBundle({ projectRoot, entryRel, stageDir, buildId, appName, minify, stripConsole }) {
  const entryAbs = path.join(projectRoot, entryRel);
  const outFile = path.join(stageDir, "bundle.cjs");
  const doMinify = !!minify;
  // Strip non-error console calls (and their args) to reduce semantic cues.
  const pureConsole = stripConsole ? ["console.log", "console.info", "console.debug", "console.warn"] : undefined;

  await esbuild.build({
    entryPoints: [entryAbs],
    bundle: true,
    platform: "node",
    target: "node20",
    format: "cjs",
    sourcemap: false,
    minify: doMinify,
    pure: pureConsole,
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

function resolveStripArgs(args, binPath) {
  const raw = Array.isArray(args) ? args.slice() : [];
  const hasIn = raw.some((arg) => String(arg).includes("{in}"));
  const out = raw.map((arg) => String(arg).replaceAll("{in}", binPath));
  if (!hasIn) out.push(binPath);
  return out;
}

function tryStripBinary(binPath, opts = {}) {
  const cmd = opts.cmd || "strip";
  const args = Array.isArray(opts.args)
    ? opts.args
    : ["--strip-all", "--strip-debug", "--strip-dwo", "--remove-section=.comment"];
  if (!hasCommand(cmd)) {
    return { ok: false, skipped: true, reason: "strip_not_installed", tool: cmd };
  }
  const r = spawnSyncSafe(cmd, resolveStripArgs(args, binPath), { stdio: "pipe" });
  return { ok: r.ok, skipped: false, reason: r.ok ? "ok" : (r.stderr || r.error || "strip_failed"), tool: cmd };
}

function tryUpxPack(binPath, cmdOverride) {
  const cmd = cmdOverride || "upx";
  if (!hasCommand(cmd) && !fileExists(cmd)) {
    return { ok: false, skipped: true, reason: "upx_not_installed", tool: cmd };
  }
  // --best is a good default; --lzma increases compression but may be slower.
  const r = spawnSyncSafe(cmd, ["--best", "--lzma", binPath], { stdio: "pipe" });
  return { ok: r.ok, skipped: false, reason: r.ok ? "ok" : (r.stderr || r.error || "upx_failed"), tool: cmd };
}

function tryElfPacker(binPath, cfg) {
  const tool = (cfg && cfg.elfPacker) ? String(cfg.elfPacker) : "";
  if (!tool) return { ok: false, skipped: true, reason: "disabled_by_default" };
  if (tool === "upx") {
    const cmd = (cfg && cfg.elfPackerCmd) ? String(cfg.elfPackerCmd) : "upx";
    return { ...tryUpxPack(binPath, cmd), tool: cmd };
  }

  const cmd = (cfg && cfg.elfPackerCmd) ? String(cfg.elfPackerCmd) : tool;
  if (!cmd) return { ok: false, skipped: false, reason: "missing_cmd" };
  if (!hasCommand(cmd)) {
    return { ok: false, skipped: false, reason: "packer_not_installed", tool: cmd };
  }

  const argsCfg = Array.isArray(cfg.elfPackerArgs) ? cfg.elfPackerArgs : [];
  if (!argsCfg.length) {
    return { ok: false, skipped: false, reason: "missing_args", tool: cmd };
  }

  const outPath = `${binPath}.packed`;
  const usesOut = argsCfg.some((arg) => String(arg).includes("{out}"));
  const usesIn = argsCfg.some((arg) => String(arg).includes("{in}"));
  const args = argsCfg.map((arg) => String(arg).replaceAll("{in}", binPath).replaceAll("{out}", outPath));
  if (!usesIn) args.push(binPath);

  const r = spawnSyncSafe(cmd, args, { stdio: "pipe" });
  if (!r.ok) {
    return { ok: false, skipped: false, reason: r.stderr || r.error || "packer_failed", tool: cmd };
  }

  if (usesOut) {
    if (!fileExists(outPath)) {
      return { ok: false, skipped: false, reason: "packer_output_missing", tool: cmd };
    }
    fs.renameSync(outPath, binPath);
  }

  return { ok: true, skipped: false, reason: "ok", tool: cmd };
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
  const enabled = hardCfg && typeof hardCfg === "object" ? hardCfg.enabled !== false : hardCfg !== false;
  if (!enabled) return { enabled: false, reason: 'disabled', steps: [] };

  const cfg = (typeof hardCfg === 'object' && hardCfg) ? hardCfg : {};
  const steps = [];

  // 1) Bundle packager: hide the backend bundle from casual inspection (gzip + loader).
  const bundlePacking = cfg.packBundle !== false; // default true
  if (packagerUsed === 'bundle') {
    const r = bundlePacking
      ? packFallbackBundleGzip(releaseDir, appName)
      : { ok: false, skipped: true, reason: 'bundle_packing_disabled' };
    steps.push({ step: 'bundle_pack_gzip', ...r });
  }

  // 2) Binary hardening (strip/ELF packer) is EXPERIMENTAL.
  // SEA/thin-single ignore strip/ELF packer because repacking can break embedded payloads.
  // Therefore it is OFF by default and must be enabled explicitly.
  const exePath = path.join(releaseDir, appName);
  const thinSplitLauncher = packagerUsed === "thin-split"
    ? path.join(releaseDir, "b", "a")
    : null;
  const nativeBootstrapPath = packagerUsed === "thin-split"
    ? path.join(releaseDir, "r", THIN_NATIVE_BOOTSTRAP_FILE)
    : null;
  const nativeBootstrapPresent = nativeBootstrapPath ? fileExists(nativeBootstrapPath) : false;
  const hardTargetPath = (thinSplitLauncher && fileExists(thinSplitLauncher))
    ? thinSplitLauncher
    : exePath;
  const hardTargetLabel = hardTargetPath === exePath ? "app" : "launcher";
  const isScript = isShebangScript(hardTargetPath);
  const isThin = typeof packagerUsed === "string" && packagerUsed.startsWith("thin");
  const hardeningSupported = packagerSupportsHardening(packagerUsed);

  let stripEnabled = cfg.stripSymbols === true; // default false
  const stripTool = cfg.stripTool || "strip";
  const stripArgs = cfg.stripArgs || null;
  let packerEnabled = !!cfg.elfPacker;

  if (!hardeningSupported) {
    stripEnabled = false;
    packerEnabled = false;
  }

  if (!isScript && stripEnabled) {
    steps.push({ step: "strip", target: hardTargetLabel, ...tryStripBinary(hardTargetPath, { cmd: stripTool, args: stripArgs }) });
    if (nativeBootstrapPresent) {
      steps.push({
        step: "strip_native_bootstrap",
        target: "native_bootstrap",
        file: `r/${THIN_NATIVE_BOOTSTRAP_FILE}`,
        ...tryStripBinary(nativeBootstrapPath, { cmd: stripTool, args: stripArgs }),
      });
    }
  } else if (!isScript && !isThin && hardeningSupported) {
    steps.push({ step: "strip", ok: false, skipped: true, reason: stripEnabled ? "strip_failed" : "disabled_by_default", target: hardTargetLabel });
  }
  if (packerEnabled && isScript) {
    steps.push({ step: "elf_packer", ok: false, skipped: true, reason: "script_not_supported", target: hardTargetLabel });
  } else if (packerEnabled) {
    const r = tryElfPacker(hardTargetPath, cfg);
    if (!r.ok) {
      const reason = r.reason || "elf_packer_failed";
      const tool = r.tool ? ` (${r.tool})` : "";
      throw new Error(`ELF packer failed${tool}: ${reason}`);
    }
    steps.push({ step: "elf_packer", target: hardTargetLabel, ...r });
    if (nativeBootstrapPresent) {
      const nr = tryElfPacker(nativeBootstrapPath, cfg);
      if (!nr.ok) {
        const reason = nr.reason || "elf_packer_failed";
        const tool = nr.tool ? ` (${nr.tool})` : "";
        throw new Error(`ELF packer failed for native bootstrap${tool}: ${reason}`);
      }
      steps.push({
        step: "elf_packer_native_bootstrap",
        target: "native_bootstrap",
        file: `r/${THIN_NATIVE_BOOTSTRAP_FILE}`,
        ...nr,
      });
    }
  } else if (!isScript && !isThin && hardeningSupported) {
    steps.push({ step: "elf_packer", ok: false, skipped: true, reason: "disabled_by_default" });
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

async function createArtifact({ projectRoot, appName, buildId, releaseDir, outDir }) {
  const outDirFinal = outDir || getSealPaths(projectRoot).outDir;
  ensureDir(outDirFinal);

  const folderName = `${appName}-${buildId}`;
  const tempRoot = path.join(outDirFinal, "artifact-tmp");
  const tempFolder = path.join(tempRoot, folderName);

  rmrf(tempRoot);
  ensureDir(tempRoot);
  copyDir(releaseDir, tempFolder);

  const artifactPath = path.join(outDirFinal, `${folderName}.tgz`);
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

function writeRuntimeVersion(releaseDir) {
  const rDir = path.join(releaseDir, "r");
  if (!fileExists(rDir)) return;
  const digest = crypto.createHash("sha256").update(process.version).digest();
  fs.writeFileSync(path.join(rDir, "nv"), digest);
}

function writeMeta(outDir, meta) {
  ensureDir(outDir);
  const metaPath = path.join(outDir, "meta.json");
  writeJson(metaPath, meta);
}

async function buildRelease({ projectRoot, projectCfg, targetCfg, configName, packagerOverride, outDirOverride, skipArtifact, payloadOnly, timing }) {
  const appName = projectCfg.appName;
  const buildId = makeBuildId();
  const payloadOnlyEnabled = !!payloadOnly;
  const timeSync = timing && timing.timeSync ? timing.timeSync : (label, fn) => fn();
  const timeAsync = timing && timing.timeAsync ? timing.timeAsync : async (label, fn) => await fn();

  const canonicalOutDir = getSealPaths(projectRoot).outDir;
  const baseOutDir = outDirOverride || canonicalOutDir;
  const stageDir = path.join(baseOutDir, "stage");
  const releaseDir = path.join(baseOutDir, "release");

  // Always keep only the latest local release artifacts.
  const keepNames = baseOutDir === canonicalOutDir ? ["cache"] : [];
  cleanOutDir(baseOutDir, keepNames);
  ensureDir(stageDir);
  ensureDir(releaseDir);

  info(`Build: appName=${appName} buildId=${buildId}`);
  info(`Entry: ${projectCfg.entry}`);
  let thinCfg = resolveThinConfig(targetCfg, projectCfg);
  const packagerSpec = normalizePackager(packagerOverride || targetCfg.packager || projectCfg.build.packager || "auto");
  const compatNotes = new Set();
  if (packagerSpec.kind === "thin") {
    const thinCompat = applyThinCompatibility(packagerSpec.label, thinCfg);
    thinCfg = thinCompat.thinCfg;
    for (const note of thinCompat.notes) compatNotes.add(note);
  }

  info(`Target: ${targetCfg.target} (packager=${packagerSpec.label}) config=${configName}`);

  const sentinelCfg = resolveSentinelConfig({
    projectRoot,
    projectCfg,
    targetCfg,
    targetName: targetCfg.target || targetCfg.config || "default",
    packagerSpec,
  });
  if (sentinelCfg && sentinelCfg.compat && Array.isArray(sentinelCfg.compat.notes)) {
    for (const note of sentinelCfg.compat.notes) compatNotes.add(note);
  }

  const obfNorm = normalizeObfuscationProfile(projectCfg.build.obfuscationProfile);
  if (obfNorm.warning) warn(obfNorm.warning);
  const obfProfile = obfNorm.profile;
  const isStrictObf = obfProfile === "strict" || obfProfile === "max";
  const consoleEnv = process.env.SEAL_CONSOLE_MODE;
  const consoleRaw = consoleEnv !== undefined
    ? consoleEnv
    : (projectCfg.build.consoleMode !== undefined ? projectCfg.build.consoleMode : projectCfg.build.stripConsole);
  if (consoleEnv !== undefined) info(`Console mode override: ${consoleEnv}`);
  if (projectCfg.build.stripConsole !== undefined && projectCfg.build.consoleMode === undefined) {
    warn('build.stripConsole is deprecated; use build.consoleMode');
  }
  const consoleRes = resolveConsoleMode(consoleRaw);
  if (consoleRes.warning) warn(consoleRes.warning);
  const consoleMode = consoleRes.mode;
  const backendMinify = projectCfg.build.backendMinify !== undefined
    ? !!projectCfg.build.backendMinify
    : true;
  const stripConsole = consoleMode === "errors-only";
  const backendTerserCfg = resolveBackendTerser(projectCfg.build.backendTerser, obfProfile);
  info("Bundling (esbuild)...");
  let bundlePath = await timeAsync("build.bundle", async () => buildBundle({
    projectRoot,
    entryRel: projectCfg.entry,
    stageDir,
    buildId,
    appName,
    minify: backendMinify,
    stripConsole,
  }));
  ok(`Bundle OK (esbuild${backendMinify ? ", minify" : ""})`);
  let backendTerser = { enabled: !!backendTerserCfg.enabled, ok: false, skipped: true, reason: "disabled" };
  if (backendTerserCfg.enabled) {
    info("Backend terser...");
    const terserResult = await timeAsync("build.terser", async () => applyTerser(bundlePath, stageDir, backendTerserCfg));
    backendTerser = { ...terserResult, skipped: false };
    bundlePath = terserResult.outPath;
    ok(`Backend terser OK (passes:${backendTerserCfg.passes}, saved:${terserResult.bytesIn - terserResult.bytesOut} bytes)`);
  }
  let obfPath = null;
  if (obfProfile === "none") {
    info("Obfuscation disabled (profile=none)");
    obfPath = timeSync("build.obfuscate", () => {
      const out = path.join(stageDir, "bundle.obf.cjs");
      fs.copyFileSync(bundlePath, out);
      return out;
    });
  } else {
    info("Obfuscating bundle...");
    obfPath = timeSync("build.obfuscate", () => obfuscateBundle(bundlePath, stageDir, obfProfile));
    ok(`Obfuscation OK (${obfProfile})`);
  }

  const packagerRequested = packagerSpec.kind;
  const allowBundleFallback = resolveBundleFallback(targetCfg, projectCfg);
  const thinMode = (packagerSpec.kind === "thin" && packagerSpec.thinMode) ? packagerSpec.thinMode : thinCfg.mode;
  const thinLevel = thinCfg.level;
  const thinChunkSize = thinCfg.chunkSizeBytes;
  const thinZstdLevel = thinCfg.zstdLevel;
  const thinZstdTimeoutMs = thinCfg.zstdTimeoutMs;
  if (payloadOnlyEnabled && !(packagerRequested === "thin" && thinMode === "bootstrap")) {
    throw new Error("payload-only build requires thin-split (bootstrap) packager");
  }
  if (payloadOnlyEnabled && packagerRequested === "thin" && thinMode === "bootstrap") {
    warn("Payload-only build reuses launcher/runtime; launcher-level changes require a full build.");
  }
  // Normalize protection config early (used for SEA main packing)
  let protectionCfg = resolveProtectionConfig(projectCfg);
  const hardEnabled = protectionCfg.enabled !== false;
  const hardCfg = protectionCfg;

  // Default protection: pack the SEA main script into a compressed loader.
  // This avoids having plain-text JS inside the executable, while staying compatible.
  let seaMainRel = "./bundle.obf.cjs";
  let seaMainPacking = { ok: false, skipped: true, reason: "not_enabled" };

  const seaMainPackingEnabled = hardEnabled
    && packagerRequested === "sea"
    && (hardCfg.packSeaMain !== false);

  if (seaMainPackingEnabled) {
    const method = (hardCfg.packSeaMainMethod || "brotli");
    const chunkSize = (hardCfg.packSeaMainChunkSize || 8000);
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
  let packErrorShort = null;

  if (!["sea", "bundle", "none", "thin"].includes(packagerRequested)) {
    throw new Error(`Unknown packager: ${packagerSpec.label}`);
  }
  if (packagerRequested === "thin" && !["aio", "bootstrap"].includes(thinMode)) {
    throw new Error(`Unknown thin mode: ${thinMode}`);
  }

  if (packagerRequested === "thin") {
    info(`Packaging (${packagerSpec.label}, level=${thinLevel})...`);
    const launcherObfuscation = thinCfg.launcherObfuscation !== false;
    if (launcherObfuscation && !protectionCfg.cObfuscator) {
      throw new Error(`thin.launcherObfuscation enabled but no protection.cObfuscator configured (${packagerSpec.label})`);
    }
    if (protectionCfg.nativeBootstrapObfuscatorCmd && !thinCfg.nativeBootstrap.enabled) {
      warn("nativeBootstrapObfuscator configured but thin.nativeBootstrap is disabled; ignoring.");
    }
    const launcherHardening = thinCfg.launcherHardening !== false;
    const launcherHardeningCET = thinCfg.launcherHardeningCET !== false;
    const nativeBootstrapObfuscator = protectionCfg.nativeBootstrapObfuscatorCmd
      ? {
        cmd: protectionCfg.nativeBootstrapObfuscatorCmd,
        args: protectionCfg.nativeBootstrapObfuscatorArgs,
      }
      : null;
    const res = await timeAsync(`build.packager.${packagerSpec.label}`, async () => packThin({
      stageDir,
      releaseDir,
      appName,
      entryRel: projectCfg.entry,
      obfPath,
      mode: thinMode,
      level: thinLevel,
      chunkSizeBytes: thinChunkSize,
      zstdLevelOverride: thinZstdLevel,
      zstdTimeoutMs: thinZstdTimeoutMs,
      envMode: thinCfg.envMode,
      runtimeStore: thinCfg.runtimeStore,
      launcherHardening,
      launcherHardeningCET,
      launcherObfuscation,
      antiDebug: thinCfg.antiDebug,
      integrity: thinCfg.integrity,
      appBind: thinCfg.appBind,
      snapshotGuard: thinCfg.snapshotGuard,
      nativeBootstrap: thinCfg.nativeBootstrap,
      nativeBootstrapObfuscator,
      projectRoot,
      targetName: targetCfg.target || targetCfg.config || "default",
      sentinel: sentinelCfg,
      payloadOnly: payloadOnlyEnabled,
      timing,
      cObfuscator: launcherObfuscation && protectionCfg.cObfuscator ? {
        kind: protectionCfg.cObfuscator,
        cmd: protectionCfg.cObfuscatorCmd,
        args: protectionCfg.cObfuscatorArgs,
      } : null,
    }));
    if (!res.ok) {
      throw new Error(`Thin packager failed: ${res.errorShort}`);
    }
    packOk = true;
    packagerUsed = packagerSpec.label;
    ok(`Packager ${packagerSpec.label} OK`);
  } else if (packagerRequested === "bundle") {
    info("Packaging (bundle)...");
    const res = timeSync("build.packager.bundle", () => packFallback({ stageDir, releaseDir, appName, obfPath }));
    if (!res.ok) throw new Error(`Bundle packager failed: ${res.errorShort}`);
    packOk = true;
    packagerUsed = "bundle";
    ok("Packager bundle OK (node + obfuscated bundle)");
  } else if (packagerRequested === "none") {
    info("Packaging (none: raw bundle + wrapper, no protection)...");
    const res = timeSync("build.packager.none", () => packFallback({ stageDir, releaseDir, appName, obfPath }));
    if (!res.ok) throw new Error(`None packager failed: ${res.errorShort}`);
    packOk = true;
    packagerUsed = "none";
    ok("Packager none OK (raw bundle + wrapper; protection disabled)");
  } else if (packagerRequested === "sea") {
    info("Packaging (SEA)...");
    const res = timeSync("build.packager.sea", () => packSea({ stageDir, releaseDir, appName, mainRel: seaMainRel }));
    if (res.ok) {
      packOk = true;
      packagerUsed = "sea";
      ok("Packager SEA OK");
    } else {
      packError = res.error;
      packErrorShort = res.errorShort;
      warn(`SEA packager failed: ${res.errorShort}`);
    }
  }

  if (!packOk) {
    const fallbackAllowed = allowBundleFallback;
    if (!fallbackAllowed) {
      const hint = "Set build.packagerFallback=true in seal.json5 or use --packager bundle.";
      const reason = packErrorShort ? `Reason: ${packErrorShort}.` : "Reason: SEA packager failed.";
      throw new Error(`SEA packager failed and bundle fallback is disabled. ${reason} ${hint}`);
    }
    const res = timeSync("build.packager.fallback", () => packFallback({ stageDir, releaseDir, appName, obfPath }));
    if (!res.ok) {
      throw new Error(`Bundle packager failed: ${res.errorShort}`);
    }
    packOk = true;
    packagerUsed = "bundle";
    ok("Packager bundle OK (node + obfuscated bundle)");
  }

  if (packagerSpec.kind !== "thin") {
    const thinCompat = applyThinCompatibility(packagerUsed, thinCfg);
    thinCfg = thinCompat.thinCfg;
    for (const note of thinCompat.notes) compatNotes.add(note);
  }
  const protectionCompat = applyProtectionCompatibility(packagerUsed, protectionCfg);
  protectionCfg = protectionCompat.protectionCfg;
  for (const note of protectionCompat.notes) compatNotes.add(note);
  if (compatNotes.size) {
    for (const note of compatNotes) warn(`Compatibility: ${note}`);
  }

  const thinIntegrityCfg = thinCfg.integrity || {};
  const thinIntegrityEnabled = !!thinIntegrityCfg.enabled;
  const thinIntegrityMode = thinIntegrityCfg.mode || "inline";
  const thinIntegrityFile = thinIntegrityCfg.file || "ih";
  if (!payloadOnlyEnabled && thinIntegrityEnabled && packagerUsed === "thin-split" && protectionCfg.elfPacker && thinIntegrityMode === "inline") {
    throw new Error("thin.integrity (inline) is not compatible with protection.elfPacker; set thin.integrity.mode=sidecar or disable the packer");
  }

  // Protection (post-pack): make it harder to recover code by casually viewing files.
  // Default: enabled (can be disabled in seal.json5 -> build.protection.enabled=false)
  const reuseProtectionPost = payloadOnlyEnabled && packagerUsed === "thin-split" && hardEnabled;
  const hardPost = reuseProtectionPost
    ? { enabled: true, reused: true, reason: "payload_only", steps: [] }
    : timeSync("build.protection", () => applyHardeningPost(releaseDir, appName, packagerUsed, protectionCfg));
  const protectionEnabled = hardEnabled;
  const protection = {
    enabled: protectionEnabled,
    seaMainPacking,
    post: hardPost,
    stringObfuscation: protectionCfg.stringObfuscation || null,
    cObfuscator: protectionCfg.cObfuscator || null,
  };

  if (reuseProtectionPost) {
    info("Protection reused (payload-only build).");
  } else if (!hardEnabled) {
    info('Protection disabled');
  } else {
    const stepsOk = (hardPost.steps || []).filter(s => s.ok).map(s => s.step);
    const stepsSkip = (hardPost.steps || []).filter(s => s.skipped).map(s => s.step + ':' + s.reason);

    if (stepsSkip.length) {
      warn(`Protection partial: ${stepsSkip.join(', ')}`);
    }

    const bits = [];
    if (seaMainPacking && seaMainPacking.ok) bits.push(`seaMainPack:${seaMainPacking.method}`);
    bits.push(...stepsOk);
    ok(`Protection OK (${bits.length ? bits.join(' + ') : 'no_steps'})`);
  }

  let thinIntegrity = { enabled: false };
  if (thinIntegrityEnabled && packagerUsed === "thin-split" && !payloadOnlyEnabled) {
    const launcherPath = path.join(releaseDir, "b", "a");
    const sidecarPath = thinIntegrityMode === "sidecar"
      ? path.join(releaseDir, "r", thinIntegrityFile)
      : null;
    const res = timeSync("build.integrity", () => applyLauncherSelfHash(
      launcherPath,
      sidecarPath ? { mode: "sidecar", sidecarPath } : { mode: "inline" }
    ));
    if (!res.ok) {
      throw new Error(`Thin integrity failed: ${res.errorShort}`);
    }
    thinIntegrity = { enabled: true, ok: true, target: "launcher", mode: thinIntegrityMode, file: thinIntegrityFile };
    ok(`Thin integrity OK (${thinIntegrityMode === "sidecar" ? "sidecar" : "inline"})`);
  } else if (thinIntegrityEnabled && packagerUsed === "thin-split" && payloadOnlyEnabled) {
    thinIntegrity = { enabled: true, reused: true, target: "launcher", mode: thinIntegrityMode, file: thinIntegrityFile };
    info("Thin integrity reused (payload-only build).");
  }
  protection.integrity = thinIntegrity;

  // Includes: public/, data/ etc
  timeSync("build.includes", () => copyIncludes(projectRoot, releaseDir, projectCfg.build.includeDirs));

  // Optional decoy (joker) files to make the release look like a regular Node project.
  let decoyResult = { enabled: false, mode: "none" };
  if (projectCfg.build.decoy !== undefined) {
    decoyResult = timeSync("build.decoy", () => applyDecoy({
      projectRoot,
      outDir: baseOutDir,
      releaseDir,
      appName,
      buildId,
      decoy: projectCfg.build.decoy,
    }));
    if (decoyResult.enabled) {
      ok(`Decoy OK (${decoyResult.mode}, scope=${decoyResult.scope})`);
    }
  }

// Frontend obfuscation (public/*.js) – enabled by default
  const frontendCfg = projectCfg.build.frontendObfuscation;
  const frontendEnabled = frontendCfg === false ? false : !(typeof frontendCfg === "object" && frontendCfg && frontendCfg.enabled === false);
  const frontendProfileRaw = (typeof frontendCfg === 'object' && frontendCfg && frontendCfg.profile)
    ? frontendCfg.profile
    : (projectCfg.build.frontendObfuscationProfile || "balanced");
  const frontendNorm = normalizeObfuscationProfile(frontendProfileRaw);
  if (frontendNorm.warning && frontendProfileRaw !== obfProfile) warn(frontendNorm.warning);
  const frontendProfile = frontendNorm.profile;

  const frontendObfuscateEnabled = frontendEnabled && frontendProfile !== "none";
  const frontendResult = timeSync("build.frontend.obfuscate", () => obfuscateFrontendAssets(releaseDir, frontendProfile, frontendObfuscateEnabled));
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
    ? timeSync("build.frontend.minify", () => minifyFrontendAssets(releaseDir, { html: htmlCfg, css: cssCfg }))
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
  fs.writeFileSync(appctlPath, renderAppctl({ appName }), "utf-8");
  fs.chmodSync(appctlPath, 0o755);


  const createdAt = new Date().toISOString();
  const appVersion = readAppVersion(projectRoot) || "0.0.0";
  writeVersion(releaseDir, { version: appVersion, appName, buildId, createdAt });
  writeRuntimeVersion(releaseDir);

  const meta = {
    appName,
    buildId,
    createdAt,
    target: targetCfg.target,
    config: configName,
    packager: packagerUsed,
    payloadOnly: payloadOnlyEnabled,
    obfuscationProfile: obfProfile,
    backendMinify,
    backendTerser,
    consoleMode,
    frontendObfuscation: frontendResult,
    frontendMinify: minifyResult,
    decoy: decoyResult,
    protection,
  };
  writeMeta(baseOutDir, meta);

  const skipArtifactFinal = !!skipArtifact || payloadOnlyEnabled;
  let artifactPath = null;
  if (!skipArtifactFinal) {
    artifactPath = await timeAsync("build.artifact", async () => createArtifact({ projectRoot, appName, buildId, releaseDir, outDir: baseOutDir }));
    ok(`Artifact: ${artifactPath}`);
  } else {
    info(`Artifact skipped (${payloadOnlyEnabled ? "payload-only build" : "fast mode"})`);
  }

  return { appName, buildId, outDir: baseOutDir, releaseDir, artifactPath, meta, packagerUsed, packError, payloadOnly: payloadOnlyEnabled };
}

module.exports = {
  buildRelease,
  makeBuildId,
  obfuscationOptions,
  obfuscateFrontendAssets,
  minifyFrontendAssets,
  normalizeMinifySection,
};

"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const tar = require("tar");
const { spawnSync } = require("child_process");
const { ensureDir } = require("./fsextra");

function looksLikeLeak(filePath) {
  const p = filePath.replace(/\\/g, "/");
  const lower = p.toLowerCase();

  if (lower.includes("node_modules/")) return { leak: true, reason: "node_modules present" };
  if (lower.includes("/src/")) return { leak: true, reason: "src/ directory present" };
  if (lower.endsWith(".map")) return { leak: true, reason: "source map (.map) present" };
  if (lower.endsWith(".ts") || lower.endsWith(".tsx")) return { leak: true, reason: "TypeScript source present" };
  if (lower.endsWith(".jsx")) return { leak: true, reason: "JSX source present" };

  return { leak: false };
}

function normalizeList(raw) {
  if (raw === undefined || raw === null || raw === false) return [];
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item || "").trim()).filter(Boolean);
  }
  return [String(raw).trim()].filter(Boolean);
}

function globToRegExp(pattern) {
  const escaped = String(pattern || "").replace(/[.+^${}()|[\]\\]/g, "\\$&");
  const re = escaped
    .replace(/\*\*/g, "___GLOBSTAR___")
    .replace(/\*/g, "[^/]*")
    .replace(/___GLOBSTAR___/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(`^${re}$`);
}

function matchGlobs(filePath, patterns) {
  if (!patterns || !patterns.length) return null;
  const p = filePath.replace(/\\/g, "/");
  for (const pattern of patterns) {
    const re = globToRegExp(pattern);
    if (re.test(p)) return pattern;
  }
  return null;
}

function hasCommand(cmd) {
  const res = spawnSync("bash", ["-c", `command -v ${cmd} >/dev/null 2>&1`], { stdio: "ignore" });
  return res.status === 0;
}

function shQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function stringsContains(filePath, token, timeoutMs = 15000) {
  const finder = hasCommand("rg") ? "rg -F --quiet" : (hasCommand("grep") ? "grep -Fq" : null);
  if (!finder) {
    throw new Error("Missing rg/grep (required for strings scan)");
  }
  const cmd = `strings -a -n 6 ${shQuote(filePath)} | ${finder} ${shQuote(token)}`;
  const res = spawnSync("bash", ["-c", cmd], { stdio: "pipe", timeout: timeoutMs, maxBuffer: 1024 * 1024 });
  if (res.error) {
    const msg = res.error.message || String(res.error);
    throw new Error(`strings scan failed: ${msg}`);
  }
  if (res.status === 0) return true;
  if (res.status === 1) return false;
  const out = `${res.stdout || ""}\n${res.stderr || ""}`.trim();
  throw new Error(`strings scan failed (status=${res.status})${out ? `: ${out}` : ""}`);
}

async function listTarEntries(artifactPath) {
  const entries = [];
  await tar.t({
    file: artifactPath,
    onentry: (e) => entries.push(e.path),
  });
  return entries;
}

async function readJsonFromTar(artifactPath, fileName) {
  let jsonText = null;
  await tar.t({
    file: artifactPath,
    onentry: (entry) => {
      const p = entry.path || "";
      if (p === fileName || p.endsWith(`/${fileName}`)) {
        const chunks = [];
        entry.on("data", (c) => chunks.push(c));
        entry.on("end", () => {
          jsonText = Buffer.concat(chunks).toString("utf-8");
        });
      } else {
        entry.resume();
      }
    },
  });
  if (!jsonText) return null;
  try {
    return JSON.parse(jsonText);
  } catch {
    return null;
  }
}

function detectPackager(entries, manifest) {
  if (manifest && typeof manifest.packager === "string") {
    return String(manifest.packager).toLowerCase();
  }
  const hasThin = entries.some((e) => /\/b\/a$/.test(e) || /\/r\/pl$/.test(e));
  if (hasThin) return "thin";
  const hasBundleGz = entries.some((e) => /app\.bundle\.cjs\.gz$/.test(e));
  const hasLoader = entries.some((e) => /seal\.loader\.cjs$/.test(e));
  if (hasBundleGz || hasLoader) return "bundle";
  const hasBundle = entries.some((e) => /app\.bundle\.cjs$/.test(e));
  if (hasBundle) return "none";
  return "sea";
}

async function verifyArtifact(artifactPath, opts = {}) {
  if (!fs.existsSync(artifactPath)) {
    return { ok: false, errors: [`Artifact not found: ${artifactPath}`], entries: [] };
  }

  const entries = await listTarEntries(artifactPath);
  const forbidGlobs = normalizeList(opts.forbidGlobs);
  const forbidStrings = normalizeList(opts.forbidStrings);
  const manifest = await readJsonFromTar(artifactPath, "manifest.json");
  const version = await readJsonFromTar(artifactPath, "version.json");

  const leaks = [];
  for (const e of entries) {
    const res = looksLikeLeak(e);
    if (res.leak) leaks.push({ path: e, reason: res.reason });
    const globMatch = matchGlobs(e, forbidGlobs);
    if (globMatch) leaks.push({ path: e, reason: `forbidden glob: ${globMatch}` });
  }

  const hasManifest = entries.some(e => e.endsWith("/manifest.json") || e === "manifest.json");
  if (!hasManifest) leaks.push({ path: "<missing manifest.json>", reason: "manifest.json missing (artifact not SEAL-like)" });
  if (hasManifest && !manifest) leaks.push({ path: "manifest.json", reason: "manifest.json invalid or unreadable" });

  // Additional: version.json must exist (minimal, non-revealing metadata)
  const hasVersion = entries.some(e => e.endsWith("/version.json") || e === "version.json");
  if (!hasVersion) leaks.push({ path: "<missing version.json>", reason: "version.json missing (artifact not SEAL-like)" });

  // meta.json must NOT be shipped (it can reveal build/obfuscation details)
  const metaEntries = entries.filter(e => e.endsWith("/meta.json") || e === "meta.json");
  for (const me of metaEntries) {
    leaks.push({ path: me, reason: "meta.json present (leaks build details)" });
  }

  if (forbidStrings.length) {
    if (!hasCommand("strings")) {
      leaks.push({ path: "<missing strings>", reason: "strings not available for forbidden-strings scan" });
    } else if (!hasCommand("rg") && !hasCommand("grep")) {
      leaks.push({ path: "<missing rg/grep>", reason: "rg/grep not available for forbidden-strings scan" });
    } else {
      const packager = detectPackager(entries, manifest);
      const isThin = typeof packager === "string" && packager.startsWith("thin");
      if (["sea", "bundle", "none"].includes(packager) || isThin) {
        const root = entries[0] ? String(entries[0]).split("/")[0] : "";
        const appName = (manifest && (manifest.appName || manifest.app)) || (version && (version.appName || version.app)) || "";
        const scanTargets = [];
        if (packager === "sea" && appName) {
          scanTargets.push(`${root}/${appName}`);
        } else if (packager === "bundle") {
          scanTargets.push(`${root}/seal.loader.cjs`, `${root}/app.bundle.cjs.gz`);
        } else if (packager === "none") {
          scanTargets.push(`${root}/app.bundle.cjs`);
        } else if (isThin) {
          scanTargets.push(`${root}/b/a`, `${root}/r/pl`);
        }
        if (scanTargets.length) {
          const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "seal-verify-"));
          try {
            await tar.x({ file: artifactPath, cwd: tmpDir });
            for (const rel of scanTargets) {
              const fullPath = path.join(tmpDir, rel);
              if (!fs.existsSync(fullPath)) {
                leaks.push({ path: rel, reason: "forbidden-strings scan target missing" });
                continue;
              }
              for (const token of forbidStrings) {
                const hit = stringsContains(fullPath, token);
                if (hit) leaks.push({ path: rel, reason: `forbidden string: ${token}` });
              }
            }
          } finally {
            fs.rmSync(tmpDir, { recursive: true, force: true });
          }
        } else {
          leaks.push({ path: "<scan targets>", reason: "forbidden-strings scan targets unavailable" });
        }
      }
    }
  }

  return {
    ok: leaks.length === 0,
    entries,
    leaks,
    manifest,
    version,
  };
}

function explainChecklist(result) {
  const lines = [];
  lines.push("SEAL verify checklist:");
  lines.push(`- artifact exists: ${result.entries.length ? "OK" : "FAIL"}`);
  lines.push(`- manifest.json present: ${result.leaks.some(l => l.reason.includes("manifest.json")) ? "FAIL" : "OK"}`);
  lines.push(`- version.json present: ${result.leaks.some(l => l.reason.includes("version.json")) ? "FAIL" : "OK"}`);
  lines.push(`- no meta.json: ${result.leaks.some(l => l.reason.includes("meta.json present")) ? "FAIL" : "OK"}`);
  lines.push(`- no src/ directory: ${result.leaks.some(l => l.reason.includes("src/")) ? "FAIL" : "OK"}`);
  lines.push(`- no .map files: ${result.leaks.some(l => l.reason.includes(".map")) ? "FAIL" : "OK"}`);
  lines.push(`- no node_modules/: ${result.leaks.some(l => l.reason.includes("node_modules")) ? "FAIL" : "OK"}`);
  lines.push(`- no TS/JSX sources: ${result.leaks.some(l => l.reason.includes("TypeScript") || l.reason.includes("JSX")) ? "FAIL" : "OK"}`);
  lines.push(`- forbidden globs/strings: ${result.leaks.some(l => l.reason.startsWith("forbidden ")) ? "FAIL" : "OK"}`);
  return lines.join("\n");
}

async function extractWatermark(artifactPath) {
  const manifest = await readJsonFromTar(artifactPath, "manifest.json");
  const watermark = manifest && manifest.watermark ? manifest.watermark : null;
  return { manifest, watermark };
}

function buildVerifyReport({ artifactPath, result, options, checklist, source, includeEntries }) {
  const report = {
    ok: !!(result && result.ok),
    artifact: artifactPath,
    checkedAt: new Date().toISOString(),
    source: source || "verify",
    entriesCount: Array.isArray(result && result.entries) ? result.entries.length : 0,
    leaks: (result && result.leaks) ? result.leaks : [],
    manifest: result && result.manifest ? result.manifest : null,
    version: result && result.version ? result.version : null,
    forbidGlobs: normalizeList(options && options.forbidGlobs),
    forbidStrings: normalizeList(options && options.forbidStrings),
  };
  if (includeEntries) report.entries = (result && result.entries) ? result.entries : [];
  if (checklist) report.checklist = checklist;
  if (report.manifest && report.manifest.watermark) report.watermark = report.manifest.watermark;
  return report;
}

function writeVerifyReport(projectRoot, report) {
  if (!projectRoot) return null;
  const outDir = path.join(projectRoot, "seal-out", "run");
  ensureDir(outDir);
  const outPath = path.join(outDir, "verify-report.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n", "utf-8");
  return outPath;
}

module.exports = { verifyArtifact, explainChecklist, extractWatermark, buildVerifyReport, writeVerifyReport };

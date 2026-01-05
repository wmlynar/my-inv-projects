#!/usr/bin/env node
"use strict";

/*
 * Alternative JavaScript scraper for comparison only.
 * The primary supported scraper is scraped/scripts/scrape_robokit_wiki.py.
 * Requires: npm install playwright
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { chromium, request: playwrightRequest } = require("playwright");

const DEFAULT_START_URL = "https://seer-group.feishu.cn/wiki/EvOMwPyJZiQIbmkLvCTct64Qnrb";

function usage() {
  console.log(`Usage: ${path.basename(process.argv[1])} [options]

Options:
  --start-url URL        Start URL (default: ${DEFAULT_START_URL})
  --out-dir DIR          Output directory (default: ./scraped/wiki_all)
  --output-format FMT    html | md | both (html only in JS version)
  --workers N            Parallel workers (default: 3)
  --max-pages N          Max pages, 0 = unlimited (default: 0)
  --max-depth N          Max depth from start (default: 6)
  --timeout-ms N         Page timeout (default: 45000)
  --content-wait-ms N    Wait for content load (default: 8000)
  --link-wait-ms N       Wait for links load (default: 8000)
  --min-text-len N       Minimum text length (default: 400)
  --wait-until MODE      domcontentloaded | load | networkidle (default: domcontentloaded)
  --sleep S              Sleep after load (seconds, default: 0.5)
  --max-retries N        Retry count (default: 2)
  --retry-sleep S        Retry sleep seconds (default: 1.0)
  --connect-cdp URL      Connect over CDP (recommended)
  --chromium-path PATH   Custom Chromium path
  --storage-state PATH   Storage state JSON (non-CDP only)
  --headless             Headless mode (non-CDP only)
  --resume               Resume from existing output (default)
  --no-resume            Disable resume
  --force                Delete output before scraping
  --rewrite-assets       Rewrite assets in existing HTML, no scraping
  -h, --help             Show help
`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    parsed.search = "";
    return parsed.toString();
  } catch (err) {
    return null;
  }
}

function isWikiUrl(url, baseHost) {
  try {
    const parsed = new URL(url);
    return parsed.protocol.startsWith("http") &&
      parsed.host === baseHost &&
      parsed.pathname.startsWith("/wiki/");
  } catch (err) {
    return false;
  }
}

function tokenFromUrl(url) {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/^\/wiki\/([^/]+)/);
    return match ? match[1] : "";
  } catch (err) {
    return "";
  }
}

function slugify(text) {
  const slug = (text || "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return slug || "page";
}

function ensureOutDirs(outDir, force, resume) {
  const pagesDir = path.join(outDir, "pages");
  if (resume && force) {
    throw new Error("Use either --resume or --force, not both.");
  }
  if (fs.existsSync(outDir)) {
    if (resume) {
      fs.mkdirSync(pagesDir, { recursive: true });
      return { outDir, pagesDir };
    }
    if (!force) {
      const items = fs.readdirSync(outDir);
      if (items.length > 0) {
        throw new Error(`Out dir not empty: ${outDir} (use --force to overwrite)`);
      }
    }
    if (force) {
      fs.rmSync(outDir, { recursive: true, force: true });
    }
  }
  fs.mkdirSync(pagesDir, { recursive: true });
  return { outDir, pagesDir };
}

async function extractHtml(page) {
  const selectors = [
    "main",
    "article",
    "[data-testid='editor-content']",
    "[data-testid='docx-editor']",
    "div[class*='docx']",
    "div[class*='Docx']",
    "div[class*='wiki']",
  ];
  for (const selector of selectors) {
    const el = await page.$(selector).catch(() => null);
    if (!el) continue;
    let textLen = 0;
    try {
      const text = await el.innerText();
      textLen = (text || "").trim().length;
    } catch (err) {
      textLen = 0;
    }
    if (textLen < 200) continue;
    try {
      return await el.innerHTML();
    } catch (err) {
      continue;
    }
  }
  try {
    return await page.$eval("body", (el) => el.innerHTML);
  } catch (err) {
    return await page.content();
  }
}

async function extractTitle(page) {
  const selectors = ["h1", "header h1", "[data-testid='doc-title']", "[data-testid='docx-title']"];
  for (const selector of selectors) {
    const el = await page.$(selector).catch(() => null);
    if (!el) continue;
    try {
      const text = (await el.innerText()) || "";
      const trimmed = text.trim();
      if (trimmed) return trimmed;
    } catch (err) {
      continue;
    }
  }
  try {
    return (await page.title()) || "";
  } catch (err) {
    return "";
  }
}

async function collectLinksFromPage(page, baseUrl, baseHost) {
  let hrefs = [];
  try {
    hrefs = await page.$$eval("a[href]", (els) => els.map((el) => el.getAttribute("href")));
  } catch (err) {
    hrefs = [];
  }
  const links = [];
  for (const href of hrefs) {
    if (!href) continue;
    let absolute;
    try {
      absolute = new URL(href, baseUrl).toString();
    } catch (err) {
      continue;
    }
    const normalized = normalizeUrl(absolute);
    if (normalized && isWikiUrl(normalized, baseHost)) {
      links.push(normalized);
    }
  }
  return links;
}

function collectLinksFromHtml(html, baseHost, baseUrl) {
  if (!html) return [];
  const absPattern = new RegExp(`https?://${escapeRegex(baseHost)}/wiki/[A-Za-z0-9]+`, "g");
  const relPattern = /href=["'](\/wiki\/[A-Za-z0-9]+)["']/gi;
  const links = new Set();
  const absMatches = html.match(absPattern) || [];
  for (const match of absMatches) {
    const normalized = normalizeUrl(match);
    if (normalized) links.add(normalized);
  }
  let relMatch;
  while ((relMatch = relPattern.exec(html))) {
    try {
      const absolute = new URL(relMatch[1], baseUrl).toString();
      const normalized = normalizeUrl(absolute);
      if (normalized) links.add(normalized);
    } catch (err) {
      continue;
    }
  }
  return Array.from(links);
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function unescapeHtml(text) {
  return (text || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
}

function parseTagAttrs(tag) {
  const attrs = {};
  const regex = /([A-Za-z0-9_-]+)\s*=\s*(["'])(.*?)\2/g;
  let match;
  while ((match = regex.exec(tag))) {
    attrs[match[1].toLowerCase()] = unescapeHtml(match[3]);
  }
  return attrs;
}

function replaceAttrValue(tag, attr, value) {
  const regex = new RegExp(`(${attr}\\s*=\\s*)(["'])(.*?)\\2`, "i");
  if (!regex.test(tag)) return tag;
  return tag.replace(regex, (_, prefix) => `${prefix}"${value}"`);
}

function injectSrc(tag, srcValue) {
  if (tag.endsWith("/>")) return tag.slice(0, -2) + ` src="${srcValue}"/>`;
  if (tag.endsWith(">")) return tag.slice(0, -1) + ` src="${srcValue}">`;
  return tag + ` src="${srcValue}"`;
}

function guessExtension(url, contentType) {
  try {
    const parsed = new URL(url);
    const ext = path.extname(parsed.pathname);
    if (ext && ext.length <= 8) return ext;
  } catch (err) {
    // ignore
  }
  if (contentType) {
    const type = contentType.split(";")[0].trim().toLowerCase();
    if (type === "image/jpeg") return ".jpg";
    if (type === "image/png") return ".png";
    if (type === "image/gif") return ".gif";
    if (type === "image/webp") return ".webp";
    if (type === "image/svg+xml") return ".svg";
  }
  return "";
}

async function downloadAsset(requestContext, url, assetsDir, assetsCache, referer, timeoutMs) {
  if (assetsCache.has(url)) return assetsCache.get(url);
  let response;
  try {
    response = await requestContext.get(url, {
      timeout: timeoutMs,
      headers: referer ? { referer } : undefined,
    });
  } catch (err) {
    return null;
  }
  if (!response || !response.ok()) return null;
  let body;
  try {
    body = await response.body();
  } catch (err) {
    return null;
  }
  const contentType = response.headers()["content-type"] || "";
  const ext = guessExtension(url, contentType);
  const filename = crypto.createHash("sha1").update(url).digest("hex").slice(0, 16) + ext;
  const filePath = path.join(assetsDir, filename);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, body);
  }
  assetsCache.set(url, filePath);
  return filePath;
}

async function rewriteHtmlAssets(html, pageUrl, assetsDir, htmlDir, requestContext, assetsCache, timeoutMs, pending) {
  const imgTagRegex = /<img\b[^>]*>/gi;
  return html.replace(imgTagRegex, (tag) => {
    const attrs = parseTagAttrs(tag);
    let src = null;
    let chosenAttr = null;
    for (const key of ["src", "data-src", "data-original", "data-url"]) {
      if (attrs[key] && !attrs[key].startsWith("data:")) {
        src = attrs[key];
        chosenAttr = key;
        break;
      }
    }
    if (!src && attrs.srcset) {
      const candidate = attrs.srcset.split(",")[0].trim();
      if (candidate) {
        src = candidate.split(" ")[0];
        chosenAttr = "srcset";
      }
    }
    if (!src) return tag;
    let absUrl;
    try {
      absUrl = new URL(src, pageUrl).toString();
    } catch (err) {
      return tag;
    }
    const assetPath = assetsCache.has(absUrl) ? assetsCache.get(absUrl) : null;
    const updatedTagPromise = (async () => {
      let finalPath = assetPath;
      if (!finalPath) {
        finalPath = await downloadAsset(requestContext, absUrl, assetsDir, assetsCache, pageUrl, timeoutMs);
      }
      if (!finalPath) return tag;
      const relPath = path.relative(htmlDir, finalPath);
      let updated = tag;
      if (chosenAttr === "srcset") {
        updated = updated.replace(/\s+srcset=(["']).*?\1/i, "");
      } else {
        updated = replaceAttrValue(updated, chosenAttr, relPath);
      }
      if (/\bsrc\s*=/.test(updated)) {
        updated = replaceAttrValue(updated, "src", relPath);
      } else {
        updated = injectSrc(updated, relPath);
      }
      return updated;
    })();
    // This replace runs in sync, so we mark unresolved tags and fix later.
    pending.push(updatedTagPromise);
    return tag;
  });
}

function wrapHtmlFragment(fragment, title) {
  const safeTitle = (title || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return [
    "<!doctype html>",
    "<html>",
    "<head>",
    "<meta charset=\"utf-8\">",
    `<title>${safeTitle}</title>`,
    "</head>",
    "<body>",
    fragment,
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

function entryFromFile(filePath, baseHost) {
  const name = path.basename(filePath);
  const match = name.match(/^(\d+)_([A-Za-z0-9]+)_/);
  const index = match ? parseInt(match[1], 10) : null;
  const token = match ? match[2] : "";
  let slugFromName = "";
  if (name.includes("_")) {
    slugFromName = name.split("_", 3).slice(-1)[0].replace(/\.[^.]+$/, "");
  }
  const url = token ? `https://${baseHost}/wiki/${token}` : "";
  return {
    index,
    url,
    token,
    title: slugFromName || "Untitled",
    slug: slugFromName || "page",
    file: filePath,
  };
}

function loadExistingState(outDir, pagesDir, baseHost, minFileBytes) {
  const manifestPath = path.join(outDir, "manifest.json");
  const entries = [];
  const savedUrls = new Set();
  const knownFiles = new Set();
  let maxIndex = -1;

  if (fs.existsSync(manifestPath)) {
    let data = [];
    try {
      data = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    } catch (err) {
      data = [];
    }
    for (const entry of Array.isArray(data) ? data : []) {
      let filePath = entry.file || "";
      if (filePath && !path.isAbsolute(filePath)) {
        filePath = path.join(outDir, filePath);
      }
      if (!filePath || !fs.existsSync(filePath)) continue;
      if (minFileBytes > 0 && fs.statSync(filePath).size < minFileBytes) continue;
      const url = normalizeUrl(entry.url) || "";
      const token = entry.token || tokenFromUrl(url) || "";
      const index = typeof entry.index === "number" ? entry.index : entryFromFile(filePath, baseHost).index;
      maxIndex = Math.max(maxIndex, index || -1);
      entries.push({
        index,
        url,
        title: entry.title || "Untitled",
        slug: entry.slug || slugify(entry.title || ""),
        token,
        file: filePath,
      });
      if (url) savedUrls.add(url);
      knownFiles.add(path.resolve(filePath));
    }
  }

  if (fs.existsSync(pagesDir)) {
    for (const name of fs.readdirSync(pagesDir)) {
      if (!name.endsWith(".html") && !name.endsWith(".htm")) continue;
      const filePath = path.resolve(pagesDir, name);
      if (knownFiles.has(filePath)) continue;
      if (minFileBytes > 0 && fs.statSync(filePath).size < minFileBytes) continue;
      const parsed = entryFromFile(filePath, baseHost);
      if (!parsed.url) continue;
      if (typeof parsed.index === "number") {
        maxIndex = Math.max(maxIndex, parsed.index);
      }
      entries.push(parsed);
      savedUrls.add(parsed.url);
    }
  }

  return { entries, savedUrls, startIndex: maxIndex + 1 };
}

async function main() {
  const args = {
    startUrl: DEFAULT_START_URL,
    outDir: path.resolve(process.cwd(), "scraped/wiki_all"),
    outputFormat: "html",
    workers: 3,
    maxPages: 0,
    maxDepth: 6,
    timeoutMs: 45000,
    contentWaitMs: 8000,
    linkWaitMs: 8000,
    minTextLen: 400,
    waitUntil: "domcontentloaded",
    sleepSeconds: 0.5,
    maxRetries: 2,
    retrySleep: 1.0,
    connectCdp: "",
    chromiumPath: "",
    storageState: "",
    headless: false,
    resume: true,
    force: false,
    rewriteAssets: false,
    minFileBytes: 200,
  };

  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--start-url":
        args.startUrl = argv[++i];
        break;
      case "--out-dir":
        args.outDir = path.resolve(argv[++i]);
        break;
      case "--output-format":
        args.outputFormat = argv[++i];
        break;
      case "--workers":
        args.workers = parseInt(argv[++i], 10);
        break;
      case "--max-pages":
        args.maxPages = parseInt(argv[++i], 10);
        break;
      case "--max-depth":
        args.maxDepth = parseInt(argv[++i], 10);
        break;
      case "--timeout-ms":
        args.timeoutMs = parseInt(argv[++i], 10);
        break;
      case "--content-wait-ms":
        args.contentWaitMs = parseInt(argv[++i], 10);
        break;
      case "--link-wait-ms":
        args.linkWaitMs = parseInt(argv[++i], 10);
        break;
      case "--min-text-len":
        args.minTextLen = parseInt(argv[++i], 10);
        break;
      case "--wait-until":
        args.waitUntil = argv[++i];
        break;
      case "--sleep":
        args.sleepSeconds = parseFloat(argv[++i]);
        break;
      case "--max-retries":
        args.maxRetries = parseInt(argv[++i], 10);
        break;
      case "--retry-sleep":
        args.retrySleep = parseFloat(argv[++i]);
        break;
      case "--connect-cdp":
        args.connectCdp = argv[++i];
        break;
      case "--chromium-path":
        args.chromiumPath = argv[++i];
        break;
      case "--storage-state":
        args.storageState = argv[++i];
        break;
      case "--headless":
        args.headless = true;
        break;
      case "--resume":
        args.resume = true;
        break;
      case "--no-resume":
        args.resume = false;
        break;
      case "--force":
        args.force = true;
        args.resume = false;
        break;
      case "--rewrite-assets":
        args.rewriteAssets = true;
        break;
      case "-h":
      case "--help":
        usage();
        return 0;
      default:
        console.error(`Unknown option: ${arg}`);
        usage();
        return 2;
    }
  }

  if (args.outputFormat !== "html") {
    console.error("JS version supports only --output-format html.");
    return 2;
  }

  const { outDir, pagesDir } = ensureOutDirs(args.outDir, args.force, args.resume || args.rewriteAssets);
  const assetsDir = path.join(outDir, "assets");
  fs.mkdirSync(assetsDir, { recursive: true });

  const startUrl = normalizeUrl(args.startUrl);
  if (!startUrl) {
    console.error("Invalid start URL.");
    return 2;
  }

  const baseHost = new URL(startUrl).host;

  const launchBrowser = async () => {
    if (args.connectCdp) {
      const browser = await chromium.connectOverCDP(args.connectCdp);
      const contexts = browser.contexts();
      const context = contexts.length > 0 ? contexts[0] : await browser.newContext();
      return { browser, context, connectedOverCdp: true, contextCreated: contexts.length === 0 };
    }
    const browser = await chromium.launch({
      headless: args.headless,
      executablePath: args.chromiumPath || undefined,
    });
    const storageState = args.storageState && fs.existsSync(args.storageState) ? args.storageState : undefined;
    const context = await browser.newContext(storageState ? { storageState } : {});
    return { browser, context, connectedOverCdp: false, contextCreated: true };
  };

  let requestContext = null;
  const assetsCache = new Map();

  if (args.rewriteAssets) {
    const htmlFiles = fs.readdirSync(pagesDir).filter((name) => name.endsWith(".html") || name.endsWith(".htm"));
    if (htmlFiles.length === 0) {
      console.error("No HTML files found to rewrite.");
      return 2;
    }
    const { browser, context } = await launchBrowser();
    requestContext = context.request ? context.request : await playwrightRequest.newContext();
    let updated = 0;
    for (const name of htmlFiles) {
      const filePath = path.join(pagesDir, name);
      const content = fs.readFileSync(filePath, "utf-8");
      const pageUrl = entryFromFile(filePath, baseHost).url;
      if (!pageUrl) continue;
      const pending = [];
      let rewritten = await rewriteHtmlAssets(
        content,
        pageUrl,
        assetsDir,
        pagesDir,
        requestContext,
        assetsCache,
        args.timeoutMs,
        pending
      );
      if (pending.length) {
        const resolved = await Promise.all(pending);
        let idx = 0;
        rewritten = rewritten.replace(/<img\b[^>]*>/gi, () => resolved[idx++]);
      }
      if (rewritten !== content) {
        fs.writeFileSync(filePath, rewritten);
        updated += 1;
      }
    }
    if (requestContext && requestContext !== context.request) {
      await requestContext.dispose();
    }
    await context.close();
    await browser.close();
    console.log(`Rewrote assets in ${updated} HTML files.`);
    return 0;
  }

  let manifestEntries = [];
  const manifestByUrl = new Map();
  let savedUrls = new Set();
  let startIndex = 0;

  if (args.resume) {
    const existing = loadExistingState(outDir, pagesDir, baseHost, args.minFileBytes);
    manifestEntries = existing.entries;
    savedUrls = existing.savedUrls;
    startIndex = existing.startIndex;
    for (const entry of manifestEntries) {
      if (entry.url) manifestByUrl.set(entry.url, entry);
    }
  }

  const seen = new Set(savedUrls);
  const queue = [];
  const counter = { value: startIndex };
  let fetchCount = 0;
  let stop = false;

  function enqueue(url, depth) {
    if (stop) return;
    const normalized = normalizeUrl(url);
    if (!normalized || depth > args.maxDepth) return;
    if (seen.has(normalized)) return;
    seen.add(normalized);
    queue.push({ url: normalized, depth });
  }

  enqueue(startUrl, 0);

  if (args.resume) {
    for (const entry of manifestEntries) {
      if (!entry.file || !fs.existsSync(entry.file)) continue;
      const html = fs.readFileSync(entry.file, "utf-8");
      for (const link of collectLinksFromHtml(html, baseHost, entry.url)) {
        enqueue(link, 1);
      }
    }
  }

  const workers = Math.max(1, args.workers);

  const { browser, context } = await launchBrowser();
  requestContext = context.request ? context.request : await playwrightRequest.newContext();
  const pages = [];
  for (let i = 0; i < workers; i++) {
    pages.push(await context.newPage());
  }

  async function processItem(page, item) {
    const { url, depth } = item;
    if (stop) return;
    if (depth > args.maxDepth) return;
    if (args.resume && savedUrls.has(url)) return;

    let success = false;
    for (let attempt = 0; attempt <= args.maxRetries; attempt++) {
      try {
        await page.goto(url, { waitUntil: args.waitUntil, timeout: args.timeoutMs });
      } catch (err) {
        if (attempt < args.maxRetries) {
          await sleep(args.retrySleep * 1000);
          continue;
        }
        return;
      }

      if (args.linkWaitMs > 0) {
        try {
          await page.waitForSelector("a[href*='/wiki/']", { timeout: args.linkWaitMs });
        } catch (err) {
          // ignore
        }
      }

      if (args.contentWaitMs > 0 && args.minTextLen > 0) {
        try {
          await page.waitForFunction(
            (minLen) => document.body && document.body.innerText && document.body.innerText.length >= minLen,
            args.minTextLen,
            { timeout: args.contentWaitMs }
          );
        } catch (err) {
          // ignore
        }
      }

      await sleep(args.sleepSeconds * 1000);
      success = true;
      break;
    }

    if (!success) return;

    const title = (await extractTitle(page)).trim();
    const htmlFragment = await extractHtml(page);

    const pending = [];
    let rewritten = await rewriteHtmlAssets(
      htmlFragment,
      url,
      assetsDir,
      pagesDir,
      requestContext,
      assetsCache,
      args.timeoutMs,
      pending
    );
    if (pending.length) {
      const resolved = await Promise.all(pending);
      let idx = 0;
      rewritten = rewritten.replace(/<img\b[^>]*>/gi, () => resolved[idx++]);
    }

    const htmlDoc = wrapHtmlFragment(rewritten, title);
    const token = tokenFromUrl(url);
    const slug = slugify(title);
    const index = counter.value++;
    const filename = `${String(index).padStart(3, "0")}_${token || "page"}_${slug}.html`;
    const filePath = path.join(pagesDir, filename);
    fs.writeFileSync(filePath, htmlDoc);

    const entry = {
      index,
      url,
      title,
      slug,
      token,
      file: filePath,
    };
    if (!manifestByUrl.has(url)) {
      manifestByUrl.set(url, entry);
      manifestEntries.push(entry);
    }

    fetchCount += 1;
    if (args.maxPages > 0 && fetchCount >= args.maxPages) {
      stop = true;
    }

    const pageLinks = await collectLinksFromPage(page, url, baseHost);
    for (const link of pageLinks) enqueue(link, depth + 1);
    for (const link of collectLinksFromHtml(htmlFragment, baseHost, url)) enqueue(link, depth + 1);
  }

  let active = 0;
  async function workerLoop(page) {
    while (true) {
      if (stop) break;
      const item = queue.shift();
      if (!item) {
        if (active === 0) break;
        await sleep(200);
        continue;
      }
      active += 1;
      try {
        await processItem(page, item);
      } catch (err) {
        // ignore worker errors to keep crawl going
      } finally {
        active -= 1;
      }
    }
  }

  await Promise.all(pages.map((page) => workerLoop(page)));

  for (const page of pages) {
    await page.close();
  }
  if (requestContext && requestContext !== context.request) {
    await requestContext.dispose();
  }
  await context.close();
  await browser.close();

  const manifestPath = path.join(outDir, "manifest.json");
  const deduped = [];
  const seenUrls = new Set();
  for (const entry of manifestEntries) {
    if (!entry.url || seenUrls.has(entry.url)) continue;
    seenUrls.add(entry.url);
    deduped.push(entry);
  }
  deduped.sort((a, b) => (a.index === null) - (b.index === null) || (a.index || 0) - (b.index || 0));
  fs.writeFileSync(manifestPath, JSON.stringify(deduped, null, 2));
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

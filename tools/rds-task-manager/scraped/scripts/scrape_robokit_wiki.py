#!/usr/bin/env python3
import argparse
import itertools
import json
import hashlib
import html as html_module
import mimetypes
import os
import re
import shutil
import sys
import threading
import time
from queue import Empty, Queue
from urllib.parse import urldefrag, urljoin, urlparse

from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright


def normalize_url(url):
    if not url:
        return None
    url = urldefrag(url)[0]
    parsed = urlparse(url)
    if not parsed.scheme or not parsed.netloc:
        return None
    parsed = parsed._replace(query="", fragment="")
    return parsed.geturl()


def is_wiki_url(url, base_host):
    parsed = urlparse(url)
    return parsed.scheme in ("http", "https") and parsed.netloc == base_host and parsed.path.startswith("/wiki/")


def token_from_url(url):
    match = re.match(r"^/wiki/([^/]+)", urlparse(url).path)
    return match.group(1) if match else ""


def slugify(text):
    slug = re.sub(r"[^A-Za-z0-9]+", "-", text or "").strip("-").lower()
    return slug or "page"


def get_converter():
    try:
        from markdownify import markdownify as md

        return lambda html: md(html, heading_style="ATX")
    except Exception:
        pass

    try:
        import html2text

        def convert(html):
            h = html2text.HTML2Text()
            h.body_width = 0
            return h.handle(html)

        return convert
    except Exception:
        return None


def find_system_chromium():
    candidates = [
        os.environ.get("CHROMIUM_PATH"),
        shutil.which("chromium"),
        shutil.which("chromium-browser"),
        shutil.which("google-chrome"),
        shutil.which("google-chrome-stable"),
        "/snap/bin/chromium",
    ]
    for path in candidates:
        if path and os.path.exists(path):
            return path
    return None


def extract_html(page):
    selectors = [
        "main",
        "article",
        "[data-testid='editor-content']",
        "[data-testid='docx-editor']",
        "div[class*='docx']",
        "div[class*='Docx']",
        "div[class*='wiki']",
    ]
    for selector in selectors:
        try:
            el = page.query_selector(selector)
        except Exception:
            el = None
        if not el:
            continue
        try:
            text_len = len((el.inner_text() or "").strip())
        except Exception:
            text_len = 0
        if text_len < 200:
            continue
        try:
            return el.inner_html()
        except Exception:
            continue

    try:
        return page.eval_on_selector("body", "el => el.innerHTML") or ""
    except Exception:
        return page.content()


def extract_title(page):
    selectors = ["h1", "header h1", "[data-testid='doc-title']", "[data-testid='docx-title']"]
    for selector in selectors:
        try:
            el = page.query_selector(selector)
        except Exception:
            el = None
        if not el:
            continue
        try:
            text = (el.inner_text() or "").strip()
        except Exception:
            text = ""
        if text:
            return text
    try:
        return (page.title() or "").strip()
    except Exception:
        return ""


def collect_links(page, base_url, base_host):
    links = []
    try:
        raw = page.eval_on_selector_all("a[href]", "els => els.map(e => e.getAttribute('href'))")
    except Exception:
        raw = []
    for href in raw:
        if not href:
            continue
        absolute = urljoin(base_url, href)
        normalized = normalize_url(absolute)
        if normalized and is_wiki_url(normalized, base_host):
            links.append(normalized)
    return links


def collect_links_from_markdown(markdown, base_host):
    if not markdown:
        return []
    pattern = re.compile(rf"https://{re.escape(base_host)}/wiki/[A-Za-z0-9]+")
    return sorted({normalize_url(link) for link in pattern.findall(markdown) if normalize_url(link)})


def collect_links_from_html(html, base_host, base_url=""):
    if not html:
        return []
    links = set()
    abs_pattern = re.compile(rf"https?://{re.escape(base_host)}/wiki/[A-Za-z0-9]+")
    rel_pattern = re.compile(r'href=["\\\'](/wiki/[A-Za-z0-9]+)["\\\']', re.IGNORECASE)
    for match in abs_pattern.findall(html):
        normalized = normalize_url(match)
        if normalized:
            links.add(normalized)
    for match in rel_pattern.findall(html):
        normalized = normalize_url(urljoin(base_url or f"https://{base_host}", match))
        if normalized:
            links.add(normalized)
    return sorted(links)


def normalize_title(text):
    text = re.sub(r"[#*_`]", "", text or "")
    text = re.sub(r"\s+", " ", text)
    return text.strip().lower()


def clean_markdown(markdown, base_host, title=None):
    if not markdown:
        return ""

    list_link = re.compile(r"^\s*(?:[*-]|\d+\.)\s+\[.*\]\(([^)]+)\)")
    wiki_link_prefix = f"https://{base_host}/wiki/"
    drop_exact = {
        "header-v2",
        "seer robotics",
        "log in or sign up",
        "comments (0)",
        "go to the first comment",
        "0 words",
        "help center",
        "keyboard shortcuts",
    }
    drop_contains = (
        "wiki table of contents",
        "help center",
        "keyboard shortcuts",
        "log in or sign up",
        "seer robotics",
        "feishu user",
        "comments (",
    )
    drop_prefix = (
        "last updated:",
        "last updated",
        "modified",
        "created on",
    )

    cleaned = []
    for line in markdown.splitlines():
        raw = line.strip()
        if not raw or raw in {"\u200b", "\ufeff"}:
            cleaned.append("")
            continue

        lower = raw.lower()
        if lower in drop_exact:
            continue
        if any(fragment in lower for fragment in drop_contains):
            continue
        if any(lower.startswith(prefix) for prefix in drop_prefix):
            continue

        match = list_link.match(raw)
        if match:
            target = match.group(1)
            if target.startswith("#") or wiki_link_prefix in target:
                continue

        cleaned.append(line.rstrip())

    if title:
        normalized_title = normalize_title(title)
        for idx, line in enumerate(cleaned):
            if line.strip():
                if normalize_title(line) == normalized_title:
                    cleaned[idx] = ""
                break

    compacted = []
    blank_run = 0
    for line in cleaned:
        if not line.strip():
            blank_run += 1
            if blank_run > 2:
                continue
            compacted.append("")
        else:
            blank_run = 0
            compacted.append(line)

    while compacted and not compacted[0].strip():
        compacted.pop(0)
    while compacted and not compacted[-1].strip():
        compacted.pop()

    return "\n".join(compacted)


def infer_title_from_cleaned(markdown):
    for line in markdown.splitlines():
        if not line.strip():
            continue
        text = re.sub(r"^#+\s*", "", line.strip())
        if text:
            return text
    return ""


def strip_leading_title(markdown, title):
    if not markdown or not title:
        return markdown
    normalized_title = normalize_title(title)
    lines = markdown.splitlines()
    for idx, line in enumerate(lines):
        if line.strip():
            if normalize_title(line) == normalized_title:
                lines[idx] = ""
            break
    return "\n".join(lines)


def strip_html(text):
    text = re.sub(r"<[^>]+>", " ", text)
    text = html_module.unescape(text)
    return re.sub(r"\s+", " ", text).strip()


def infer_title_from_file(path):
    ext = os.path.splitext(path)[1].lower()
    if ext in {".html", ".htm"}:
        try:
            text = open(path, "r", encoding="utf-8", errors="ignore").read()
        except Exception:
            return ""
        match = re.search(r"<title[^>]*>(.*?)</title>", text, flags=re.IGNORECASE | re.DOTALL)
        if match:
            title = strip_html(match.group(1))
            if title:
                return title
        match = re.search(r"<h1[^>]*>(.*?)</h1>", text, flags=re.IGNORECASE | re.DOTALL)
        if match:
            title = strip_html(match.group(1))
            if title:
                return title
        return ""
    return infer_title_from_markdown(path)


def collect_links_from_file(path, base_host, base_url=""):
    ext = os.path.splitext(path)[1].lower()
    try:
        text = open(path, "r", encoding="utf-8", errors="ignore").read()
    except Exception:
        return []
    if ext in {".html", ".htm"}:
        return collect_links_from_html(text, base_host, base_url=base_url)
    return collect_links_from_markdown(text, base_host)


def wrap_html_fragment(fragment, title):
    safe_title = html_module.escape(title or "")
    return (
        "<!doctype html>\n"
        "<html>\n"
        "<head>\n"
        "<meta charset=\"utf-8\">\n"
        f"<title>{safe_title}</title>\n"
        "</head>\n"
        "<body>\n"
        f"{fragment}\n"
        "</body>\n"
        "</html>\n"
    )


def parse_tag_attrs(tag):
    attrs = {}
    for match in re.finditer(r'([A-Za-z0-9_-]+)\s*=\s*([\"\'])(.*?)\2', tag):
        attrs[match.group(1).lower()] = html_module.unescape(match.group(3))
    return attrs


def replace_attr_value(tag, attr, value):
    pattern = re.compile(rf'({attr}\s*=\s*)([\"\'])(.*?)\2', flags=re.IGNORECASE)
    if not pattern.search(tag):
        return tag
    return pattern.sub(lambda match: f'{match.group(1)}\"{value}\"', tag, count=1)


def guess_extension(url, content_type):
    path = urlparse(url).path
    ext = os.path.splitext(path)[1]
    if ext and len(ext) <= 8:
        return ext
    if content_type:
        ctype = content_type.split(";")[0].strip().lower()
        ext = mimetypes.guess_extension(ctype) or ""
        if ext == ".jpe":
            ext = ".jpg"
        return ext
    return ""


def download_asset(context, url, assets_dir, assets_cache, assets_lock, referer="", timeout_ms=30000):
    with assets_lock:
        cached = assets_cache.get(url)
        if cached and os.path.exists(cached):
            return cached

    headers = {"referer": referer} if referer else None
    try:
        response = context.request.get(url, headers=headers, timeout=timeout_ms)
    except Exception:
        return None
    if not response or not response.ok:
        return None
    try:
        body = response.body()
    except Exception:
        return None

    content_type = response.headers.get("content-type", "")
    ext = guess_extension(url, content_type)
    filename = hashlib.sha1(url.encode("utf-8")).hexdigest()[:16] + ext
    path = os.path.join(assets_dir, filename)

    try:
        if not os.path.exists(path):
            with open(path, "wb") as handle:
                handle.write(body)
    except Exception:
        return None

    with assets_lock:
        assets_cache[url] = path
    return path


def inject_src(tag, src_value):
    if tag.endswith("/>"):
        return tag[:-2] + f' src="{src_value}"/>'
    if tag.endswith(">"):
        return tag[:-1] + f' src="{src_value}">'
    return tag + f' src="{src_value}"'


def rewrite_html_assets(html, page_url, assets_dir, html_dir, context, assets_cache, assets_lock, timeout_ms=30000):
    def handle_tag(tag):
        attrs = parse_tag_attrs(tag)
        chosen_attr = None
        src = None
        for key in ("src", "data-src", "data-original", "data-url"):
            val = attrs.get(key)
            if val and not val.startswith("data:"):
                chosen_attr = key
                src = val
                break
        if not src and "srcset" in attrs:
            candidate = attrs.get("srcset", "").split(",")[0].strip()
            if candidate:
                src = candidate.split(" ")[0]
                chosen_attr = "srcset"
        if not src:
            return tag

        abs_url = urljoin(page_url, src)
        asset_path = download_asset(
            context,
            abs_url,
            assets_dir,
            assets_cache,
            assets_lock,
            referer=page_url,
            timeout_ms=timeout_ms,
        )
        if not asset_path:
            return tag

        rel_path = os.path.relpath(asset_path, start=html_dir)
        updated = tag
        if chosen_attr == "srcset":
            updated = re.sub(r'\s+srcset=([\"\']).*?\1', "", updated, flags=re.IGNORECASE)
        else:
            updated = replace_attr_value(updated, chosen_attr, rel_path)

        if re.search(r"\bsrc\s*=", updated, flags=re.IGNORECASE):
            updated = replace_attr_value(updated, "src", rel_path)
        else:
            updated = inject_src(updated, rel_path)
        return updated

    return re.sub(r"<img\b[^>]*>", lambda match: handle_tag(match.group(0)), html, flags=re.IGNORECASE)


def infer_title_from_markdown(path):
    try:
        with open(path, "r", encoding="utf-8") as handle:
            for line in handle:
                text = line.strip().lstrip("#").strip()
                if text:
                    return text
    except Exception:
        pass
    return ""


def entry_from_file(path, base_host):
    name = os.path.basename(path)
    match = re.match(r"(\d+)_([A-Za-z0-9]+)_", name)
    index = int(match.group(1)) if match else None
    token = match.group(2) if match else ""
    slug_from_name = ""
    if "_" in name:
        slug_from_name = name.split("_", 2)[-1].rsplit(".", 1)[0]
    url = f"https://{base_host}/wiki/{token}" if token else ""
    title = infer_title_from_file(path) or slug_from_name or "Untitled"
    slug = slugify(title) if title else slugify(slug_from_name)
    return {
        "index": index,
        "url": url,
        "title": title,
        "slug": slug,
        "token": token,
        "file": path,
    }


def load_existing_state(out_dir, pages_dir, base_host, min_file_bytes, allowed_exts):
    manifest_path = os.path.join(out_dir, "manifest.json")
    entries = []
    saved_urls = set()
    saved_tokens = set()
    known_files = set()
    max_index = -1

    if os.path.exists(manifest_path):
        try:
            with open(manifest_path, "r", encoding="utf-8") as handle:
                data = json.load(handle)
        except Exception:
            data = []
        for entry in data if isinstance(data, list) else []:
            file_path = entry.get("file") or ""
            if file_path and not os.path.isabs(file_path):
                file_path = os.path.join(out_dir, file_path)
            if not file_path or not os.path.exists(file_path):
                continue
            if min_file_bytes > 0 and os.path.getsize(file_path) < min_file_bytes:
                continue
            url = normalize_url(entry.get("url")) or ""
            token = entry.get("token") or token_from_url(url) or ""
            if not url and token:
                url = f"https://{base_host}/wiki/{token}"
            title = entry.get("title") or infer_title_from_file(file_path)
            slug = entry.get("slug") or slugify(title)
            index = entry.get("index")
            if index is None:
                parsed = entry_from_file(file_path, base_host)
                index = parsed["index"]
            max_index = max(max_index, index if index is not None else -1)
            entries.append(
                {
                    "index": index,
                    "url": url,
                    "title": title or "Untitled",
                    "slug": slug,
                    "token": token,
                    "file": file_path,
                }
            )
            if url:
                saved_urls.add(url)
            if token:
                saved_tokens.add(token)
            known_files.add(os.path.abspath(file_path))

    if os.path.isdir(pages_dir):
        for name in os.listdir(pages_dir):
            if not any(name.endswith(ext) for ext in allowed_exts):
                continue
            file_path = os.path.abspath(os.path.join(pages_dir, name))
            if file_path in known_files:
                continue
            if min_file_bytes > 0 and os.path.getsize(file_path) < min_file_bytes:
                continue
            parsed = entry_from_file(file_path, base_host)
            if not parsed["url"]:
                continue
            if parsed["index"] is not None:
                max_index = max(max_index, parsed["index"])
            entries.append(parsed)
            saved_urls.add(parsed["url"])
            if parsed["token"]:
                saved_tokens.add(parsed["token"])

    return entries, saved_urls, saved_tokens, max_index + 1


def ensure_out_dirs(out_dir, force, resume):
    pages_dir = os.path.join(out_dir, "pages")
    if resume and force:
        raise RuntimeError("Use either --resume or --force, not both.")

    if os.path.exists(out_dir):
        if resume:
            os.makedirs(pages_dir, exist_ok=True)
            return out_dir, pages_dir
        if not force:
            if os.path.isdir(out_dir) and os.listdir(out_dir):
                raise RuntimeError(f"Out dir not empty: {out_dir} (use --force to overwrite)")
        if force and os.path.isdir(out_dir):
            for name in os.listdir(out_dir):
                path = os.path.join(out_dir, name)
                if os.path.isdir(path):
                    for root, dirs, files in os.walk(path, topdown=False):
                        for f in files:
                            os.remove(os.path.join(root, f))
                        for d in dirs:
                            os.rmdir(os.path.join(root, d))
                    os.rmdir(path)
                else:
                    os.remove(path)

    os.makedirs(pages_dir, exist_ok=True)
    return out_dir, pages_dir


def write_combined(manifest, out_dir, clean=False, base_host="", min_content_chars=120):
    combined_path = os.path.join(out_dir, "combined.md")
    ordered = sorted(
        (entry for entry in manifest if entry.get("file")),
        key=lambda entry: (entry.get("index") is None, entry.get("index") or 0),
    )
    with open(combined_path, "w", encoding="utf-8") as out:
        for entry in ordered:
            file_path = entry.get("file") or ""
            if not file_path or not os.path.exists(file_path):
                continue
            title = entry.get("title") or entry.get("slug") or "Untitled"
            with open(file_path, "r", encoding="utf-8") as page_file:
                content = page_file.read().rstrip()
            if clean:
                content = clean_markdown(content, base_host, title=title)
                if "table of contents" in normalize_title(title):
                    inferred = infer_title_from_cleaned(content)
                    if inferred and "table of contents" not in normalize_title(inferred):
                        title = inferred
                        content = strip_leading_title(content, title)
            if clean and min_content_chars > 0 and len(content.strip()) < min_content_chars:
                continue
            header = f"# {title}\n\n<!-- source: {entry.get('url','')} -->\n\n"
            out.write(header)
            out.write(content)
            out.write("\n\n---\n\n")


def main() -> int:
    parser = argparse.ArgumentParser(description="Scrape Feishu wiki into Markdown/HTML files.")
    parser.add_argument(
        "--start-url",
        default="https://seer-group.feishu.cn/wiki/EvOMwPyJZiQIbmkLvCTct64Qnrb",
    )
    parser.add_argument(
        "--out-dir",
        default="/home/inovatica/seal/rds/scraped/wiki_all",
    )
    parser.add_argument("--storage-state", default="feishu_storage.json")
    parser.add_argument("--chromium-path", default="")
    parser.add_argument(
        "--no-system-chromium",
        action="store_true",
        help="Do not fall back to system Chromium; use Playwright-managed browser.",
    )
    parser.add_argument(
        "--chromium-args",
        default="--disable-crash-reporter",
        help="Comma-separated list of extra Chromium flags.",
    )
    parser.add_argument(
        "--browser",
        choices=["chromium", "firefox"],
        default="chromium",
        help="Browser engine to use.",
    )
    parser.add_argument(
        "--connect-cdp",
        default="",
        help="Connect to an existing Chromium instance over CDP (e.g. http://127.0.0.1:9222).",
    )
    parser.add_argument("--headless", action="store_true", help="Run browser headless.")
    parser.add_argument(
        "--wait-until",
        choices=["domcontentloaded", "load", "networkidle"],
        default="domcontentloaded",
        help="Navigation wait strategy.",
    )
    parser.add_argument(
        "--link-wait-ms",
        type=int,
        default=8000,
        help="Wait for wiki links to appear after navigation (0 to disable).",
    )
    parser.add_argument(
        "--content-wait-ms",
        type=int,
        default=8000,
        help="Wait for page text content to load (0 to disable).",
    )
    parser.add_argument(
        "--min-text-len",
        type=int,
        default=400,
        help="Minimum document text length to consider content loaded.",
    )
    parser.add_argument(
        "--login-wait",
        type=int,
        default=120,
        help="Seconds to wait for manual login if no storage state exists.",
    )
    parser.add_argument("--max-pages", type=int, default=200)
    parser.add_argument("--max-depth", type=int, default=6)
    parser.add_argument("--timeout-ms", type=int, default=45000)
    parser.add_argument("--sleep", type=float, default=0.5)
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Reuse existing pages on disk and fetch only missing ones.",
    )
    parser.add_argument(
        "--min-md-bytes",
        type=int,
        default=200,
        help="Minimum output file size to treat as successfully saved when resuming.",
    )
    parser.add_argument("--workers", type=int, default=1)
    parser.add_argument("--max-retries", type=int, default=2)
    parser.add_argument("--retry-sleep", type=float, default=1.0)
    parser.add_argument(
        "--output-format",
        choices=["md", "html", "both"],
        default="md",
        help="Output format for saved pages.",
    )
    parser.add_argument(
        "--assets-dir",
        default="assets",
        help="Assets directory relative to out-dir when saving HTML.",
    )
    parser.add_argument(
        "--clean-combined",
        action="store_true",
        help="Clean table-of-contents and boilerplate when building combined.md.",
    )
    parser.add_argument(
        "--min-content-chars",
        type=int,
        default=120,
        help="Minimum content length to keep page in combined.md when cleaning.",
    )
    parser.add_argument(
        "--rebuild-combined",
        action="store_true",
        help="Skip scraping and rebuild combined.md from existing pages.",
    )
    parser.add_argument(
        "--rewrite-assets",
        action="store_true",
        help="Rewrite existing HTML files to use local assets without scraping.",
    )
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    save_md = args.output_format in ("md", "both")
    save_html = args.output_format in ("html", "both")

    converter = None
    if save_md:
        converter = get_converter()
        if not converter:
            print("Missing dependency: install markdownify or html2text.", file=sys.stderr)
            return 2

    if args.rebuild_combined and not save_md:
        print("rebuild-combined requires md output.", file=sys.stderr)
        return 2
    if args.rewrite_assets and not save_html:
        print("rewrite-assets requires html output.", file=sys.stderr)
        return 2

    try:
        out_dir, pages_dir = ensure_out_dirs(
            args.out_dir,
            args.force,
            args.resume or args.rebuild_combined or args.rewrite_assets,
        )
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        return 2

    html_dir = None
    if save_html:
        html_dir = pages_dir
        if save_md:
            html_dir = os.path.join(out_dir, "html")
            os.makedirs(html_dir, exist_ok=True)
        assets_dir = os.path.join(out_dir, args.assets_dir)
        os.makedirs(assets_dir, exist_ok=True)
    else:
        assets_dir = None
        html_dir = None
    assets_cache = {}
    assets_lock = threading.Lock()

    start_url = normalize_url(args.start_url)
    if not start_url:
        print("Invalid start URL.", file=sys.stderr)
        return 2

    base_host = urlparse(start_url).netloc
    primary_exts = [".md"]
    if save_html and not save_md:
        primary_exts = [".html", ".htm"]
    if args.rebuild_combined:
        manifest_entries, _saved_urls, _saved_tokens, _start_index = load_existing_state(
            out_dir,
            pages_dir,
            base_host,
            args.min_md_bytes,
            primary_exts,
        )
        if not manifest_entries:
            print("No pages found to combine.", file=sys.stderr)
            return 2
        write_combined(
            manifest_entries,
            out_dir,
            clean=args.clean_combined,
            base_host=base_host,
            min_content_chars=args.min_content_chars,
        )
        return 0

    if args.connect_cdp and args.browser != "chromium":
        print("CDP connection requires Chromium.", file=sys.stderr)
        return 2

    workers = max(1, args.workers)

    chromium_path = None
    extra_args = []
    if args.browser == "chromium" and not args.connect_cdp:
        if args.chromium_path:
            chromium_path = args.chromium_path
        elif args.no_system_chromium:
            chromium_path = None
        else:
            chromium_path = find_system_chromium()
        extra_args = [arg.strip() for arg in args.chromium_args.split(",") if arg.strip()]

    def launch_browser(p, use_storage_state):
        connected_over_cdp = False
        context_created = False
        if args.connect_cdp:
            browser = p.chromium.connect_over_cdp(args.connect_cdp)
            connected_over_cdp = True
            if browser.contexts:
                context = browser.contexts[0]
            else:
                context = browser.new_context()
                context_created = True
        elif args.browser == "firefox":
            browser = p.firefox.launch(headless=args.headless)
            storage_state = None
            if use_storage_state and args.storage_state and os.path.exists(args.storage_state):
                storage_state = args.storage_state
            context = browser.new_context(storage_state=storage_state)
            context_created = True
        else:
            if chromium_path:
                browser = p.chromium.launch(
                    headless=args.headless,
                    executable_path=chromium_path,
                    args=extra_args,
                )
            else:
                browser = p.chromium.launch(headless=args.headless, args=extra_args)
            storage_state = None
            if use_storage_state and args.storage_state and os.path.exists(args.storage_state):
                storage_state = args.storage_state
            context = browser.new_context(storage_state=storage_state)
            context_created = True
        return browser, context, context_created, connected_over_cdp

    if (
        not args.connect_cdp
        and args.storage_state
        and not os.path.exists(args.storage_state)
        and args.login_wait > 0
    ):
        with sync_playwright() as p:
            browser = None
            context = None
            page = None
            context_created = False
            connected_over_cdp = False
            try:
                browser, context, context_created, connected_over_cdp = launch_browser(p, use_storage_state=False)
                page = context.new_page()
                page.set_default_timeout(args.timeout_ms)
                page.goto(start_url, wait_until=args.wait_until)
                print(f"Log in if needed, waiting {args.login_wait}s before scraping...")
                time.sleep(args.login_wait)
                context.storage_state(path=args.storage_state)
            except Exception as exc:
                print(f"Failed to prepare storage state: {exc}", file=sys.stderr)
                return 2
            finally:
                if connected_over_cdp and not context_created and page:
                    try:
                        page.close()
                    except Exception:
                        pass
                if context_created and context:
                    context.close()
                if browser:
                    browser.close()

    if args.rewrite_assets:
        if not html_dir or not os.path.isdir(html_dir):
            print("No HTML pages directory found to rewrite.", file=sys.stderr)
            return 2
        html_files = [
            os.path.join(html_dir, name)
            for name in sorted(os.listdir(html_dir))
            if name.lower().endswith((".html", ".htm"))
        ]
        if not html_files:
            print("No HTML files found to rewrite.", file=sys.stderr)
            return 2
        updated_count = 0
        with sync_playwright() as p:
            browser, context, context_created, connected_over_cdp = launch_browser(p, use_storage_state=True)
            try:
                for path in html_files:
                    page_url = entry_from_file(path, base_host).get("url") or ""
                    if not page_url:
                        continue
                    try:
                        content = open(path, "r", encoding="utf-8", errors="ignore").read()
                    except Exception:
                        continue
                    rewritten = rewrite_html_assets(
                        content,
                        page_url,
                        assets_dir,
                        html_dir,
                        context,
                        assets_cache,
                        assets_lock,
                        timeout_ms=args.timeout_ms,
                    )
                    if rewritten != content:
                        try:
                            with open(path, "w", encoding="utf-8") as handle:
                                handle.write(rewritten)
                            updated_count += 1
                        except Exception:
                            pass
            finally:
                if context_created and context:
                    context.close()
                if browser:
                    browser.close()
        print(f"Rewrote assets in {updated_count} HTML files.")
        return 0

    manifest_entries = []
    saved_urls = set()
    start_index = 0
    if args.resume:
        manifest_entries, saved_urls, _saved_tokens, start_index = load_existing_state(
            out_dir,
            pages_dir,
            base_host,
            args.min_md_bytes,
            primary_exts,
        )
    saved_urls = {normalize_url(url) for url in saved_urls if normalize_url(url)}
    manifest_by_url = {entry["url"]: entry for entry in manifest_entries if entry.get("url")}

    task_queue = Queue()
    seen = set(saved_urls)
    seen_lock = threading.Lock()
    manifest_lock = threading.Lock()
    index_lock = threading.Lock()
    stop_event = threading.Event()
    fetch_lock = threading.Lock()
    counter = itertools.count(start_index)
    fetch_count = 0

    def record_fetch():
        nonlocal fetch_count
        if args.max_pages <= 0:
            return
        with fetch_lock:
            fetch_count += 1
            if fetch_count >= args.max_pages:
                stop_event.set()

    def enqueue(url, depth):
        if stop_event.is_set():
            return
        url = normalize_url(url)
        if not url or depth > args.max_depth:
            return
        with seen_lock:
            if url in seen:
                return
            seen.add(url)
        task_queue.put((url, depth))

    if args.resume:
        for entry in manifest_entries:
            file_path = entry.get("file")
            if not file_path or not os.path.exists(file_path):
                continue
            for link in collect_links_from_file(file_path, base_host, base_url=entry.get("url") or ""):
                enqueue(link, 1)

    enqueue(start_url, 0)

    def worker(worker_id):
        p = sync_playwright().start()
        browser = None
        context = None
        page = None
        connected_over_cdp = False
        context_created = False
        try:
            try:
                browser, context, context_created, connected_over_cdp = launch_browser(p, use_storage_state=True)
            except Exception as exc:
                install_hint = "python -m playwright install chromium"
                if args.browser == "firefox":
                    install_hint = "python -m playwright install firefox"
                print(f"Failed to launch browser: {exc}", file=sys.stderr)
                print(f"If Playwright browsers are missing, run: {install_hint}", file=sys.stderr)
                stop_event.set()
                while True:
                    try:
                        task_queue.get_nowait()
                    except Empty:
                        break
                    else:
                        task_queue.task_done()
                return
            page = context.new_page()
            page.set_default_timeout(args.timeout_ms)

            while True:
                try:
                    item = task_queue.get(timeout=1)
                except Empty:
                    if stop_event.is_set():
                        break
                    continue

                if item is None:
                    task_queue.task_done()
                    break

                url, depth = item
                try:
                    if stop_event.is_set():
                        continue
                    if depth > args.max_depth:
                        continue
                    if args.resume and url in saved_urls:
                        continue

                    success = False
                    for attempt in range(args.max_retries + 1):
                        try:
                            page.goto(url, wait_until=args.wait_until)
                        except PlaywrightTimeoutError:
                            fallback = "load" if args.wait_until != "load" else "domcontentloaded"
                            try:
                                page.goto(url, wait_until=fallback)
                            except PlaywrightTimeoutError:
                                if attempt < args.max_retries:
                                    time.sleep(args.retry_sleep)
                                    continue
                                print(f"Timeout loading {url}; skipping.", file=sys.stderr)
                                break
                        except Exception as exc:
                            if attempt < args.max_retries:
                                time.sleep(args.retry_sleep)
                                continue
                            print(f"Failed loading {url}: {exc}", file=sys.stderr)
                            break

                        if args.link_wait_ms > 0:
                            try:
                                page.wait_for_selector("a[href*='/wiki/']", timeout=args.link_wait_ms)
                            except Exception:
                                pass

                        if args.content_wait_ms > 0 and args.min_text_len > 0:
                            try:
                                page.wait_for_function(
                                    "minLen => document.body && document.body.innerText && document.body.innerText.length >= minLen",
                                    args.min_text_len,
                                    timeout=args.content_wait_ms,
                                )
                            except Exception:
                                pass

                        time.sleep(args.sleep)
                        success = True
                        break

                    if not success:
                        continue

                    title = extract_title(page)
                    html_fragment = extract_html(page)

                    markdown = ""
                    if save_md:
                        markdown = converter(html_fragment)

                    html_path = None
                    if save_html:
                        rewritten = rewrite_html_assets(
                            html_fragment,
                            url,
                            assets_dir,
                            html_dir,
                            context,
                            assets_cache,
                            assets_lock,
                            timeout_ms=args.timeout_ms,
                        )
                        html_doc = wrap_html_fragment(rewritten, title)

                    token = token_from_url(url)
                    slug = slugify(title)
                    with index_lock:
                        index = next(counter)
                    base_name = f"{index:03d}_{token or 'page'}_{slug}"
                    md_path = None
                    if save_md:
                        md_path = os.path.join(pages_dir, f"{base_name}.md")
                        with open(md_path, "w", encoding="utf-8") as f:
                            f.write(markdown.strip() + "\n")
                    if save_html:
                        html_path = os.path.join(html_dir, f"{base_name}.html")
                        with open(html_path, "w", encoding="utf-8") as f:
                            f.write(html_doc)

                    entry = {
                        "index": index,
                        "url": url,
                        "title": title,
                        "slug": slug,
                        "token": token,
                        "file": md_path or html_path,
                    }
                    if md_path and html_path:
                        entry["md_file"] = md_path
                        entry["html_file"] = html_path

                    with manifest_lock:
                        if url not in manifest_by_url:
                            manifest_by_url[url] = entry
                            manifest_entries.append(entry)

                    record_fetch()

                    for link in collect_links(page, url, base_host):
                        enqueue(link, depth + 1)

                    if save_html:
                        for link in collect_links_from_html(html_fragment, base_host, base_url=url):
                            enqueue(link, depth + 1)
                    elif save_md:
                        for link in collect_links_from_markdown(markdown, base_host):
                            enqueue(link, depth + 1)
                finally:
                    task_queue.task_done()
        except Exception as exc:
            print(f"Worker {worker_id} failed: {exc}", file=sys.stderr)
        finally:
            if connected_over_cdp and page and not context_created:
                try:
                    page.close()
                except Exception:
                    pass
            if context_created and context:
                context.close()
            if browser:
                browser.close()
            p.stop()

    threads = []
    for worker_id in range(workers):
        thread = threading.Thread(target=worker, args=(worker_id,), daemon=True)
        threads.append(thread)
        thread.start()

    task_queue.join()
    stop_event.set()
    for _ in range(workers):
        task_queue.put(None)
    for thread in threads:
        thread.join()

    manifest_path = os.path.join(out_dir, "manifest.json")
    with manifest_lock:
        deduped = {}
        for entry in manifest_entries:
            url = entry.get("url")
            if not url:
                continue
            if url not in deduped:
                deduped[url] = entry
        manifest_list = sorted(
            deduped.values(),
            key=lambda entry: (entry.get("index") is None, entry.get("index") or 0),
        )
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest_list, f, indent=2, ensure_ascii=False)

    if save_md:
        write_combined(
            manifest_list,
            out_dir,
            clean=args.clean_combined,
            base_host=base_host,
            min_content_chars=args.min_content_chars,
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

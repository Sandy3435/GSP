#!/usr/bin/env python3
"""
Eureka 3-in-1 Opportunity Scraper
=================================

Discovers, vets, and inserts opportunities (and their linked info sessions) into
the Eureka Supabase backend. It reads the vetting rules strictly from
`.opencode/skills/scholarship-vetter/SKILL.md` and enforces the exact
`opportunities` + `info_sessions` table schemas.

Three discovery sources:
  A. Google Search Discovery (queries.txt)  -> Gemini + Google Search grounding
  B. RSS feeds (feeds.txt)                  -> resolve aggregator post -> official URL
  C. Direct official pages (sources.txt)    -> monitored for updates/new info sessions

Deduplication happens BEFORE vetting (by normalized application_link and page
title) so we never waste Gemini calls. `sources.txt` pages that already exist are
still re-checked for newly posted info sessions.

Required environment variables:
  SUPABASE_URL               e.g. https://<project>.supabase.co
  SUPABASE_SERVICE_ROLE_KEY  service_role key (bypasses RLS so the scraper can write)
  GEMINI_API_KEY             Google AI Studio key (Search grounding enabled)

Optional:
  GEMINI_MODEL               default: gemini-3.8-flash

Usage:
  pip install -r requirements.txt
  playwright install chromium
  python main.py
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from urllib.parse import urlparse

import feedparser
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright
from supabase import create_client

from google import genai
from google.genai import types

# ------------------------------------------------------------------- paths/config
SCRAPER_DIR = os.path.dirname(os.path.abspath(__file__))
SKILL_PATH = os.path.join(SCRAPER_DIR, "..", ".opencode", "skills", "scholarship-vetter", "SKILL.md")
QUERIES_FILE = os.path.join(SCRAPER_DIR, "queries.txt")
FEEDS_FILE = os.path.join(SCRAPER_DIR, "feeds.txt")
SOURCES_FILE = os.path.join(SCRAPER_DIR, "sources.txt")

# Load env vars from the project root .env (SUPABASE_* / GEMINI_*), then allow a
# scraper-local .env to override. Also fall back to a .env in the current dir.
load_dotenv(os.path.join(SCRAPER_DIR, "..", ".env"))
load_dotenv(os.path.join(SCRAPER_DIR, ".env"), override=True)
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")

MAX_TEXT_CHARS = 30000       # cap page text sent to the model
MAX_QUERY_URLS = 5           # max official URLs kept per discovery query
MAX_FEED_ENTRIES = 5         # newest entries visited per RSS feed
UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)

# The exact 12-key camelCase `eligibility` jsonb shape the Eureka matcher reads.
ELIGIBILITY_DEFAULTS = {
    "minGpa": None,
    "majors": [],
    "firstGenOnly": False,
    "lowIncomeOnly": False,
    "urmOnly": False,
    "interests": [],
    "states": [],
    "graduationYears": [],
    "countries": ["Global"],
    "nationalities": ["Global"],
    "minActivities": None,
    "requiresLeadership": False,
}

# Domains we never treat as the "official" application host.
BLOCKED_DOMAINS = (
    "facebook.com", "twitter.com", "x.com", "instagram.com", "linkedin.com",
    "youtube.com", "youtu.be", "t.me", "wa.me", "whatsapp.com", "google.com",
    "drive.google.com", "docs.google.com",
)


# ------------------------------------------------------------------------ helpers
def log(msg: str) -> None:
    print(f"[eureka-scraper] {msg}", flush=True)


def read_lines(path: str) -> list[str]:
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as f:
        return [ln.strip() for ln in f if ln.strip() and not ln.lstrip().startswith("#")]


def load_skill() -> str:
    if not os.path.exists(SKILL_PATH):
        log(f"ERROR: skill file not found at {SKILL_PATH}")
        sys.exit(1)
    with open(SKILL_PATH, "r", encoding="utf-8") as f:
        return f.read()


def normalize_title(t: str) -> str:
    if not t:
        return ""
    t = t.lower()
    t = re.sub(r"[\s\|\-\u2022\u00b7]+", " ", t)  # collapse separators/whitespace
    t = re.sub(r"[^\w ]", "", t)                    # drop punctuation
    return re.sub(r"\s+", " ", t).strip()


def normalize_url(u: str) -> str:
    if not u:
        return ""
    u = u.strip().lower().rstrip("/")
    u = re.sub(r"^https?://(www\.)?", "", u)
    return u


def extract_json(text: str):
    if not text:
        return None
    text = re.sub(r"```(?:json)?", "", text).strip()
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end <= start:
        return None
    try:
        return json.loads(text[start : end + 1])
    except json.JSONDecodeError:
        return None


def extract_json_array(text: str):
    if not text:
        return None
    text = re.sub(r"```(?:json)?", "", text).strip()
    start, end = text.find("["), text.rfind("]")
    if start == -1 or end <= start:
        return None
    try:
        parsed = json.loads(text[start : end + 1])
        return parsed if isinstance(parsed, list) else None
    except json.JSONDecodeError:
        return None


# ------------------------------------------------------------------- Gemini client
class Vetter:
    """Thin wrapper around the google-genai SDK with Search grounding."""

    def __init__(self, api_key: str, model: str, skill: str):
        self.client = genai.Client(api_key=api_key)
        self.model = model
        self.skill = skill

    def call(self, prompt: str, system: str | None, grounding: bool = True):
        tools = [types.Tool(google_search=types.GoogleSearch())] if grounding else None
        return self.client.models.generate_content(
            model=self.model,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system,
                tools=tools,
                temperature=0.1,
            ),
        )

    def grounding_urls(self, resp) -> list[str]:
        urls: list[str] = []
        for cand in resp.candidates or []:
            gm = getattr(cand, "grounding_metadata", None)
            if not gm:
                continue
            for chunk in gm.grounding_chunks or []:
                web = getattr(chunk, "web", None)
                uri = getattr(web, "uri", None)
                if uri:
                    urls.append(uri)
        return list(dict.fromkeys(u for u in urls if u))

    def discover(self, query: str) -> list[str]:
        """Source A: use grounded Gemini to surface official URLs for a query."""
        prompt = (
            f'Search the web for: "{query}"\n\n'
            "Return ONLY a JSON array of strings: the official application URLs "
            "(the .edu/.gov/.org program host pages, not aggregator blogs) for new "
            "2027/2028 opportunities matching the query. If none, return []."
        )
        resp = self.call(prompt, system=None, grounding=True)
        parsed = extract_json_array(resp.text or "")
        urls = [u for u in (parsed or []) if isinstance(u, str) and u.startswith("http")]
        if not urls:
            urls = self.grounding_urls(resp)
        return urls

    def resolve_official(self, post_url: str, candidates: list[str]) -> str | None:
        """Source B: pick the single official application URL from candidate links."""
        if not candidates:
            return None
        if len(candidates) == 1:
            return candidates[0]
        prompt = (
            "The following are outbound links on an opportunity aggregator blog post. "
            "Identify the single official application/host URL (the program's own website).\n\n"
            f"Post URL: {post_url}\n"
            "Candidate links:\n" + "\n".join(candidates) + "\n\n"
            "Return ONLY the chosen URL, or the word NONE if none qualify."
        )
        resp = self.call(prompt, system=None, grounding=True)
        m = re.search(r"https?://[^\s\"'<>]+", resp.text or "")
        if m:
            return m.group(0).rstrip(".,)]}")
        return candidates[0]

    def vet(self, url: str, page_text: str):
        """Run the full 3-stage vet + extraction, returning APPROVED/REJECTED JSON."""
        prompt = (
            "Vet and extract the following scraped opportunity page according to the "
            "system instructions.\n\n"
            f"OFFICIAL PAGE URL: {url}\n\n"
            "PAGE TEXT:\n" + page_text[:MAX_TEXT_CHARS] + "\n\n"
            'Return ONLY valid JSON: either {"status":"REJECTED","stage":"...","reason":"..."} '
            'or the APPROVED object with "status", "opportunity", and "info_sessions" keys.'
        )
        resp = self.call(prompt, system=self.skill, grounding=True)
        return extract_json(resp.text or "")

    def extract_sessions(self, url: str, page_text: str) -> list[dict]:
        """Cheap extraction of only info sessions (used for existing sources.txt pages)."""
        prompt = (
            "Extract any upcoming live info sessions, webinars, AMA/Q&A, or office hours "
            "mentioned on this opportunity page.\n\n"
            f"OFFICIAL PAGE URL: {url}\n\nPAGE TEXT:\n" + page_text[:MAX_TEXT_CHARS] + "\n\n"
            "Return ONLY a JSON array of objects with keys: title, session_date (YYYY-MM-DD), "
            "session_time (with timezone), registration_link. If none, return []."
        )
        resp = self.call(prompt, system=None, grounding=True)
        parsed = extract_json_array(resp.text or "")
        return [s for s in (parsed or []) if isinstance(s, dict)]


# ----------------------------------------------------------------------- scraping
def scrape(url: str) -> dict:
    """Return {url,title,text,links,error} for a page rendered by Playwright."""
    out = {"url": url, "title": "", "text": "", "links": [], "error": None}
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            try:
                ctx = browser.new_context(user_agent=UA)
                page = ctx.new_page()
                page.goto(url, timeout=60000, wait_until="domcontentloaded")
                page.wait_for_timeout(1500)
                out["title"] = page.title() or ""
                out["text"] = page.inner_text("body") or ""
                out["links"] = page.eval_on_selector_all(
                    "a[href]", "els => els.map(e => e.href)"
                )
            finally:
                browser.close()
    except Exception as exc:  # noqa: BLE001 - report and continue
        out["error"] = str(exc)
    return out


def external_links(post_url: str, links: list[str]) -> list[str]:
    dom = urlparse(post_url).netloc.lower().replace("www.", "")
    out: list[str] = []
    for lnk in links:
        if not lnk or not lnk.startswith("http"):
            continue
        d = urlparse(lnk).netloc.lower().replace("www.", "")
        if not d or d == dom or any(b in d for b in BLOCKED_DOMAINS):
            continue
        out.append(lnk)
    return list(dict.fromkeys(out))


# ----------------------------------------------------------------------- supabase
def get_supabase():
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        log("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.")
        sys.exit(1)
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def load_existing(supabase) -> list[dict]:
    res = supabase.table("opportunities").select("id,title,application_link").execute()
    return res.data or []


def find_existing(existing: list[dict], title: str, app_link: str) -> dict | None:
    nt = normalize_title(title)
    nu = normalize_url(app_link)
    for row in existing:
        if nu and row.get("application_link") and normalize_url(row["application_link"]) == nu:
            return row
        if nt and row.get("title") and normalize_title(row["title"]) == nt:
            return row
    return None


def sanitize_eligibility(e) -> dict:
    if not isinstance(e, dict):
        e = {}
    out: dict = {}
    for key, default in ELIGIBILITY_DEFAULTS.items():
        val = e.get(key, default)
        if isinstance(default, list):
            out[key] = val if isinstance(val, list) else list(default)
        elif isinstance(default, bool):
            out[key] = bool(val)
        else:  # minGpa / minActivities
            out[key] = val if (val is None or isinstance(val, (int, float))) else None
    return out


def insert_opportunity(supabase, opp: dict) -> str:
    opp = dict(opp)
    opp["eligibility"] = sanitize_eligibility(opp.get("eligibility"))
    opp["published"] = False  # always insert as draft for admin review
    res = supabase.table("opportunities").insert(opp).execute()
    if not res.data:
        raise RuntimeError(f"insert returned no rows: {res}")
    return res.data[0]["id"]


def session_rows(opp_id: str, sessions) -> list[dict]:
    rows = []
    for s in sessions or []:
        if not isinstance(s, dict) or not s.get("title"):
            continue
        rows.append({
            "opportunity_id": opp_id,
            "title": str(s.get("title", "")).strip(),
            "session_date": str(s.get("session_date", "")).strip(),
            "session_time": str(s.get("session_time", "")).strip(),
            "registration_link": str(s.get("registration_link", "")).strip(),
        })
    return rows


def insert_info_sessions(supabase, opp_id: str, sessions) -> int:
    rows = session_rows(opp_id, sessions)
    if not rows:
        return 0
    supabase.table("info_sessions").insert(rows).execute()
    return len(rows)


def insert_new_sessions(supabase, opp_id: str, sessions) -> int:
    """Insert only info sessions not already present (dedup by title + date)."""
    res = (
        supabase.table("info_sessions")
        .select("title,session_date")
        .eq("opportunity_id", opp_id)
        .execute()
    )
    existing = {(r.get("title", "").strip().lower(), r.get("session_date", "")) for r in (res.data or [])}
    rows = [
        r for r in session_rows(opp_id, sessions)
        if (r["title"].lower(), r["session_date"]) not in existing
    ]
    if not rows:
        return 0
    supabase.table("info_sessions").insert(rows).execute()
    return len(rows)


# -------------------------------------------------------------------------- main
def main() -> None:
    parser = argparse.ArgumentParser(description="Eureka 3-in-1 opportunity scraper")
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Max candidate URLs to vet/insert (use a small number for quick test batches).",
    )
    args = parser.parse_args()
    limit = args.limit

    log("Eureka 3-in-1 scraper starting")
    if limit:
        log(f"Running with --limit {limit}")
    if not GEMINI_API_KEY:
        log("ERROR: GEMINI_API_KEY is not set.")
        sys.exit(1)

    skill = load_skill()
    vetter = Vetter(GEMINI_API_KEY, GEMINI_MODEL, skill)
    supabase = get_supabase()

    queries = read_lines(QUERIES_FILE)
    feeds = read_lines(FEEDS_FILE)
    sources = read_lines(SOURCES_FILE)

    existing = load_existing(supabase)
    log(f"Loaded {len(existing)} existing opportunities for dedup")

    # 1) Discover candidate URLs from all three sources.
    candidates: list[tuple[str, str]] = []

    for q in queries:
        if limit and len(candidates) >= limit:
            break
        log(f"Source A (search): {q}")
        try:
            urls = vetter.discover(q)
        except Exception as exc:  # noqa: BLE001
            log(f"  search error: {exc}")
            continue
        for u in urls[:MAX_QUERY_URLS]:
            if limit and len(candidates) >= limit:
                break
            candidates.append((u, "search"))

    for feed_url in feeds:
        if limit and len(candidates) >= limit:
            break
        log(f"Source B (rss): {feed_url}")
        try:
            parsed = feedparser.parse(feed_url)
            for entry in parsed.entries[:MAX_FEED_ENTRIES]:
                if limit and len(candidates) >= limit:
                    break
                link = entry.get("link")
                if not link:
                    continue
                post = scrape(link)
                if post.get("error"):
                    log(f"  post scrape error: {post['error']}")
                    continue
                official = vetter.resolve_official(link, external_links(link, post["links"]))
                if official:
                    candidates.append((official, "rss"))
        except Exception as exc:  # noqa: BLE001
            log(f"  feed error: {exc}")

    for u in sources:
        if limit and len(candidates) >= limit:
            break
        candidates.append((u, "official"))

    # 2) De-duplicate candidates within this run (by normalized URL).
    seen: set[str] = set()
    unique: list[tuple[str, str]] = []
    for url, source in candidates:
        nu = normalize_url(url)
        if not nu or nu in seen:
            continue
        seen.add(nu)
        unique.append((url, source))

    if limit:
        unique = unique[:limit]

    discovered = len(unique)
    rejected: list[dict] = []
    added_opps = 0
    added_sessions = 0

    # 3) Vet + insert.
    for url, source in unique:
        log(f"Processing [{source}] {url}")
        page = scrape(url)
        if page.get("error"):
            rejected.append({"url": url, "stage": "SCRAPE", "reason": page["error"]})
            continue

        # Pre-vet dedup: application_link (this URL) and normalized page title.
        match = find_existing(existing, page["title"], url)

        if match and source == "official":
            # sources.txt: already tracked -> only look for newly posted info sessions.
            try:
                sessions = vetter.extract_sessions(url, page["text"])
            except Exception as exc:  # noqa: BLE001
                log(f"  session extraction error: {exc}")
                continue
            n = insert_new_sessions(supabase, match["id"], sessions)
            if n:
                added_sessions += n
                log(f"  -> {n} new info session(s) for existing opportunity {match['id']}")
            else:
                log("  -> existing opportunity; no new info sessions")
            continue

        if match:
            log(f"  -> duplicate of existing opportunity {match['id']}; skipping")
            continue

        # Full vet.
        try:
            result = vetter.vet(url, page["text"])
        except Exception as exc:  # noqa: BLE001
            rejected.append({"url": url, "stage": "VET", "reason": str(exc)})
            continue

        if not result:
            rejected.append({"url": url, "stage": "PARSE", "reason": "no valid JSON from vetter"})
            continue

        if result.get("status") != "APPROVED":
            rejected.append({
                "url": url,
                "stage": result.get("stage") or "REJECTED",
                "reason": result.get("reason") or "unknown",
            })
            continue

        opp = result.get("opportunity") or {}
        if not opp.get("title"):
            rejected.append({"url": url, "stage": "EXTRACT", "reason": "missing title"})
            continue

        # Final dedup safety net on the vetted title/application_link.
        if find_existing(existing, opp.get("title"), opp.get("application_link") or url):
            log("  -> duplicate detected after vetting; skipping")
            continue

        try:
            opp_id = insert_opportunity(supabase, opp)
            n = insert_info_sessions(supabase, opp_id, result.get("info_sessions"))
            added_opps += 1
            added_sessions += n
            existing.append({
                "id": opp_id,
                "title": opp.get("title"),
                "application_link": opp.get("application_link") or url,
            })
            log(f"  -> ADDED opportunity {opp_id} (+{n} info session(s))")
        except Exception as exc:  # noqa: BLE001
            rejected.append({"url": url, "stage": "INSERT", "reason": str(exc)})

    # 4) Summary.
    log("=" * 64)
    log("RUN SUMMARY")
    log(f"  Discovered:              {discovered}")
    log(f"  Rejected:                {len(rejected)}")
    for r in rejected:
        log(f"    - [{r['stage']}] {str(r.get('reason',''))[:90]} :: {str(r.get('url',''))[:70]}")
    log(f"  New opportunities added: {added_opps}")
    log(f"  New info sessions added: {added_sessions}")
    log("Done.")


if __name__ == "__main__":
    main()

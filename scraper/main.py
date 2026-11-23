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

Dual-AI vetting: Gemini performs the initial extraction + 3-stage vet, then Groq
(llama-3.3-70b-versatile) independently re-audits every Gemini approval for hidden
fees / pay-to-play flags / wrong country names. If Gemini hits 429/503, Groq takes
over as primary so the pipeline never stops. Grounding is used ONLY for Source A.

Deduplication happens BEFORE vetting (by normalized application_link and page
title) so we never waste AI calls. `sources.txt` pages that already exist are still
re-checked for newly posted info sessions.

Required environment variables:
  SUPABASE_URL               e.g. https://<project>.supabase.co
  SUPABASE_SERVICE_ROLE_KEY  service_role key (bypasses RLS so the scraper can write)
  GEMINI_API_KEY             Google AI Studio key (Search grounding enabled)
  GROQ_API_KEY               Groq key (free second-brain verifier + Gemini fallback)

Optional:
  GEMINI_MODEL               default: gemini-3.8-flash
  GROQ_MODEL                 default: qwen/qwen3.8-27b (llama-3.3-70b-versatile is retired)

Usage:
  pip install -r requirements.txt
  playwright install chromium
  python main.py [--limit N]
"""

from __future__ import annotations

import argparse
import datetime
import json
import os
import re
import sys
import time
from urllib.parse import urlparse

import feedparser
from dotenv import load_dotenv
from groq import Groq
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
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
GROQ_MODEL = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")

MAX_TEXT_CHARS = 30000       # cap page text sent to the model
MAX_QUERY_URLS = 5           # max official URLs kept per discovery query
MAX_SEARCH_QUERIES = 2       # hard cap on grounded search queries per run (quota)
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

# Domains we never treat as the "official" application host (social, CMS/blogging
# platforms, and generic footers that show up in RSS aggregator posts).
BLOCKED_DOMAINS = (
    "facebook.com", "twitter.com", "x.com", "instagram.com", "linkedin.com",
    "youtube.com", "youtu.be", "t.me", "wa.me", "whatsapp.com", "google.com",
    "drive.google.com", "docs.google.com",
    "wordpress.org", "wordpress.com", "medium.com", "blogger.com", "wix.com",
    "squarespace.com", "weebly.com", "tumblr.com", "gravatar.com",
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
RETRYABLE_CODES = (429, 503)
BACKOFF_SECONDS = 30        # wait between retries on 429/503
THROTTLE_SECONDS = 6        # min gap between generate_content calls (free-tier RPM)
MAX_ATTEMPTS = 3            # attempts per model per mode

# Free-tier model fallback chain (tried in order after the configured model).
# gemini-2.5-* are deprecated for new accounts; the 3.x "lite" models share the
# free-tier quota pool and are the best fallbacks.
FALLBACK_MODELS = ["gemini-3.1-flash-lite", "gemini-3.5-flash-lite", "gemini-3.8-flash"]


def _build_model_chain(primary: str) -> list[str]:
    chain = [primary]
    for m in FALLBACK_MODELS:
        if m not in chain:
            chain.append(m)
    return chain


class Vetter:
    """Dual-AI pipeline: Gemini is the primary extractor/vetter (Search grounding
    used only for Source A discovery); Groq (llama-3.3-70b) is a free second-brain
    auditor and the fallback when Gemini hits 429/503. Retry/backoff + throttling
    keep everything inside free-tier limits."""

    def __init__(self, gemini_key: str, groq_key: str, model: str, skill: str):
        self.gemini = genai.Client(api_key=gemini_key) if gemini_key else None
        self.groq = Groq(api_key=groq_key) if groq_key else None
        self.groq_model = GROQ_MODEL
        self.skill = skill
        self.model_chain = _build_model_chain(model)
        self._last_call_ts = 0.0
        self._gemini_down = False

    # -- low-level helpers ------------------------------------------------------
    def _throttle(self, seconds: int = THROTTLE_SECONDS) -> None:
        elapsed = time.monotonic() - self._last_call_ts
        if elapsed < seconds:
            time.sleep(seconds - elapsed)
        self._last_call_ts = time.monotonic()

    def _gemini_call_once(self, model: str, prompt: str, system: str | None, grounding: bool):
        tools = [types.Tool(google_search=types.GoogleSearch())] if grounding else None
        return self.gemini.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system,
                tools=tools,
                temperature=0.1,
            ),
        )

    def _groq_call_once(self, prompt: str, system: str | None):
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        return self.groq.chat.completions.create(
            model=self.groq_model, messages=messages, temperature=0.1,
        )

    @staticmethod
    def _error_code(exc: Exception) -> int | None:
        code = getattr(exc, "code", None) or getattr(exc, "status_code", None)
        if code is not None:
            try:
                return int(code)
            except (TypeError, ValueError):
                pass
        m = re.search(r"\b(429|503)\b", str(exc))
        return int(m.group(1)) if m else None

    def gemini_generate(self, prompt: str, system: str | None, grounding: bool = True,
                        fallback_ungrounded: bool = True):
        """Gemini call with retries + model fallback (raises if all exhausted)."""
        if self._gemini_down:
            raise RuntimeError("Gemini disabled for this run (quota exhausted)")
        modes = [True, False] if (grounding and fallback_ungrounded) else ([True] if grounding else [False])
        last_err: Exception | None = None
        for mode in modes:
            for model in self.model_chain:
                for attempt in range(MAX_ATTEMPTS):
                    self._throttle()
                    try:
                        resp = self._gemini_call_once(model, prompt, system, mode)
                        if grounding and not mode:
                            log(f"  [gemini:{model}] grounding disabled (quota fallback)")
                        return resp
                    except Exception as exc:  # noqa: BLE001
                        last_err = exc
                        code = self._error_code(exc)
                        if code in RETRYABLE_CODES:
                            log(
                                f"  [gemini:{model}] {code} (attempt {attempt + 1}/{MAX_ATTEMPTS}); "
                                f"backing off {BACKOFF_SECONDS}s"
                            )
                            time.sleep(BACKOFF_SECONDS)
                        else:
                            log(f"  [gemini:{model}] error (code {code}): {str(exc)[:80]}")
                            break
        # All Gemini models/attempts exhausted -> mark Gemini down so the rest of
        # the run goes straight to the Groq fallback instead of re-retrying.
        self._gemini_down = True
        raise (last_err if last_err else RuntimeError("all Gemini attempts failed"))

    def groq_generate(self, prompt: str, system: str | None) -> str:
        """Groq chat completion with retry/backoff."""
        last_err: Exception | None = None
        for attempt in range(MAX_ATTEMPTS):
            self._throttle()
            try:
                resp = self._groq_call_once(prompt, system)
                return (resp.choices[0].message.content or "") if resp.choices else ""
            except Exception as exc:  # noqa: BLE001
                last_err = exc
                code = self._error_code(exc)
                log(f"  [groq] error (code {code}) attempt {attempt + 1}/{MAX_ATTEMPTS}: {str(exc)[:80]}")
                time.sleep(BACKOFF_SECONDS)
        raise (last_err if last_err else RuntimeError("Groq failed"))

    # -- higher-level calls -----------------------------------------------------
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
        """Source A: grounded Gemini search (the ONLY place grounding is used)."""
        prompt = (
            f'Search the web for: "{query}"\n\n'
            "Return ONLY a JSON array of strings: the official application URLs "
            "(the .edu/.gov/.org program host pages, not aggregator blogs) for new "
            "2027/2028 opportunities matching the query. If none, return []."
        )
        resp = self.gemini_generate(prompt, system=None, grounding=True, fallback_ungrounded=False)
        parsed = extract_json_array(resp.text or "")
        urls = [u for u in (parsed or []) if isinstance(u, str) and u.startswith("http")]
        if not urls:
            urls = self.grounding_urls(resp)
        return urls

    def resolve_official(self, post_url: str, candidates: list[str]) -> str | None:
        """Source B: pick the official URL from candidate links (no grounding)."""
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
        resp = self.gemini_generate(prompt, system=None, grounding=False)
        m = re.search(r"https?://[^\s\"'<>]+", resp.text or "")
        if m:
            return m.group(0).rstrip(".,)]}")
        return candidates[0]

    def vet(self, url: str, page_text: str):
        """Two-stage vet: Gemini extracts + 3-stage vets (no grounding), then Groq
        independently re-audits any Gemini approval before insert."""
        prompt = (
            "Vet and extract the following scraped opportunity page according to the "
            "system instructions.\n\n"
            f"OFFICIAL PAGE URL: {url}\n\n"
            "PAGE TEXT:\n" + page_text[:MAX_TEXT_CHARS] + "\n\n"
            'Return ONLY valid JSON: either {"status":"REJECTED","stage":"...","reason":"..."} '
            'or the APPROVED object with "status", "opportunity", and "info_sessions" keys.'
        )

        # Stage 1: Gemini (fall back to Groq if Gemini is quota-limited).
        result = None
        primary = "gemini"
        if self.gemini:
            try:
                resp = self.gemini_generate(prompt, system=self.skill, grounding=False)
                result = extract_json(resp.text or "")
                if not result:
                    raise ValueError("Gemini returned no parseable JSON")
            except Exception as exc:  # noqa: BLE001
                log(f"  Gemini vet failed (code {self._error_code(exc)}); falling back to Groq")
                result = None

        if result is None:
            if not self.groq:
                return None
            try:
                resp = self.groq_generate(prompt, system=self.skill)
                result = extract_json(resp)
                primary = "groq"
            except Exception as exc:  # noqa: BLE001
                log(f"  Groq fallback also failed: {exc}")
                return None

        if not result or result.get("status") != "APPROVED":
            return result

        # Stage 2: Groq second independent audit (only when Gemini was primary).
        if primary == "gemini" and self.groq:
            try:
                audit = self._groq_audit(url, page_text, result)
                if audit:
                    if audit.get("verdict") == "REJECTED":
                        return {
                            "status": "REJECTED",
                            "stage": "AUDIT",
                            "reason": audit.get("reason") or "Groq second audit rejected",
                        }
                    if isinstance(audit.get("corrections"), dict):
                        opp = result.get("opportunity") or {}
                        result["opportunity"] = {**opp, **audit["corrections"]}
            except Exception as exc:  # noqa: BLE001
                log(f"  Groq audit failed ({exc}); trusting Gemini output")
        return result

    def _groq_audit(self, url: str, page_text: str, gemini_json):
        """Second-brain check: hidden fees, pay-to-play flags, wrong country names."""
        prompt = (
            "You are a second independent auditor for an opportunity vetting pipeline. "
            "Re-check the opportunity below for hidden fees, pay-to-play red flags, and "
            "wrong or non-standard country/nationality names.\n\n"
            f"OFFICIAL PAGE URL: {url}\n\n"
            "PAGE TEXT:\n" + page_text[:MAX_TEXT_CHARS] + "\n\n"
            "GEMINI OUTPUT:\n" + json.dumps(gemini_json, ensure_ascii=False) + "\n\n"
            'Return ONLY JSON: {"verdict":"APPROVED"} or {"verdict":"REJECTED","reason":"..."}. '
            'Optionally include "corrections" as a flat object of opportunity fields to patch.'
        )
        resp = self.groq_generate(prompt, system=self.skill)
        return extract_json(resp)

    def extract_sessions(self, url: str, page_text: str) -> list[dict]:
        """Extract info sessions (no grounding) for existing sources.txt pages."""
        prompt = (
            "Extract any upcoming live info sessions, webinars, AMA/Q&A, or office hours "
            "mentioned on this opportunity page.\n\n"
            f"OFFICIAL PAGE URL: {url}\n\nPAGE TEXT:\n" + page_text[:MAX_TEXT_CHARS] + "\n\n"
            "Return ONLY a JSON array of objects with keys: title, session_date (YYYY-MM-DD), "
            "session_time (with timezone), registration_link. If none, return []."
        )
        try:
            resp = self.gemini_generate(prompt, system=None, grounding=False)
        except Exception as exc:  # noqa: BLE001
            log(f"  Gemini session extraction failed ({self._error_code(exc)}); using Groq")
            if not self.groq:
                return []
            try:
                resp_text = self.groq_generate(prompt, system=None)
                parsed = extract_json_array(resp_text)
                return [s for s in (parsed or []) if isinstance(s, dict)]
            except Exception:  # noqa: BLE001
                return []
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
    # Normalize deadline_date to YYYY-MM-DD or None (rolling = None).
    dd = opp.get("deadline_date")
    if dd is not None and not re.match(r"^\d{4}-\d{2}-\d{2}$", str(dd).strip()):
        dd = None
    opp["deadline_date"] = str(dd).strip() if dd else None
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


# ------------------------------------------------------------ expiration cleanup
def cleanup(supabase) -> None:
    """Delete past info sessions and auto-unpublish expired opportunities.

    Prints the one-line migration for the `deadline_date` column (which the user
    runs once in the Supabase SQL editor) and degrades gracefully if it is not
    present yet.
    """
    today = datetime.date.today().isoformat()  # YYYY-MM-DD
    log("Cleanup: removing past info sessions and expiring past opportunities")

    try:
        res = supabase.table("info_sessions").delete().lt("session_date", today).execute()
        n = len(res.data or [])
        if n:
            log(f"  deleted {n} past info session(s)")
    except Exception as exc:  # noqa: BLE001
        log(f"  info_sessions cleanup error: {exc}")

    log(
        "  If not run yet, add the deadline column in Supabase:\n"
        "    alter table public.opportunities add column if not exists deadline_date text;"
    )
    try:
        res = (
            supabase.table("opportunities")
            .update({"published": False})
            .lt("deadline_date", today)
            .execute()
        )
        n = len(res.data or [])
        if n:
            log(f"  unpublished {n} expired opportunity/opportunities")
    except Exception as exc:  # noqa: BLE001
        log(f"  opportunities expiration error (deadline_date column missing?): {exc}")


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
    if not GEMINI_API_KEY and not GROQ_API_KEY:
        log("ERROR: GEMINI_API_KEY or GROQ_API_KEY must be set.")
        sys.exit(1)

    skill = load_skill()
    vetter = Vetter(GEMINI_API_KEY, GROQ_API_KEY, GEMINI_MODEL, skill)
    supabase = get_supabase()

    # 0) Expiration cleanup before discovering anything new.
    cleanup(supabase)

    queries = read_lines(QUERIES_FILE)
    feeds = read_lines(FEEDS_FILE)
    sources = read_lines(SOURCES_FILE)

    existing = load_existing(supabase)
    log(f"Loaded {len(existing)} existing opportunities for dedup")

    # 1) Discover candidate URLs from all three sources.
    candidates: list[tuple[str, str]] = []

    # Cap grounded search queries: hard cap of MAX_SEARCH_QUERIES, plus the
    # --limit cap (each query yields up to MAX_QUERY_URLS URLs).
    max_queries = min(len(queries), MAX_SEARCH_QUERIES)
    if limit:
        max_queries = min(max_queries, max(1, (limit + MAX_QUERY_URLS - 1) // MAX_QUERY_URLS))
    log(f"Running up to {max_queries} search quer{'y' if max_queries == 1 else 'ies'}")

    for q in queries[:max_queries]:
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

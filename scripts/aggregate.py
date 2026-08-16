#!/usr/bin/env python3
"""
2A News Feed Aggregator
------------------------
Pulls together Second Amendment news, court case activity, and legislation
tracking from a curated set of sources into a single data/data.json file
that the static frontend reads.

Sources:
  - RSS feeds from 2A advocacy/legal orgs (GOA, NRA-ILA, SAF)
  - YouTube channel feeds (Guns & Gadgets, Armed Scholar, FPC)
  - CourtListener API (free, no key needed) for actual federal court filings
  - Congress.gov API (free key required) for federal bill tracking

Run locally with:  python scripts/aggregate.py
Runs automatically via .github/workflows/update-feed.yml on a schedule.
"""

import json
import os
import re
import sys
import time
import html
import hashlib
import urllib.request
import urllib.error
from datetime import datetime, timezone
from xml.etree import ElementTree as ET

# --------------------------------------------------------------------------
# Config
# --------------------------------------------------------------------------

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
DATA_FILE = os.path.join(DATA_DIR, "data.json")
MAX_ITEMS_PER_SOURCE = 15
REQUEST_TIMEOUT = 20
USER_AGENT = "Mozilla/5.0 (compatible; 2A-News-Feed-Bot/1.0; +personal-use)"

# Optional: set ANTHROPIC_API_KEY as a GitHub Actions secret to get real
# AI-written TL;DR summaries instead of truncated RSS descriptions.
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "").strip()
ANTHROPIC_MODEL = "claude-haiku-4-5-20251001"

# Optional: set CONGRESS_API_KEY (free from https://api.congress.gov/sign-up)
# to pull live federal bill tracking. Skipped entirely if not set.
CONGRESS_API_KEY = os.environ.get("CONGRESS_API_KEY", "").strip()

SOURCES = [
    {
        "id": "goa",
        "name": "Gun Owners of America",
        "kind": "rss",
        "url": "https://www.gunowners.org/feed/",
        "source_type": "org",
    },
    {
        "id": "nra-ila",
        "name": "NRA-ILA",
        "kind": "rss",
        "url": "https://www.nraila.org/feeds/ilarss",
        "source_type": "org",
    },
    {
        "id": "saf",
        "name": "Second Amendment Foundation",
        "kind": "rss",
        "url": "https://saf.org/feed/",
        "source_type": "org",
    },
    {
        "id": "the-reload",
        "name": "The Reload",
        "kind": "rss",
        # They moved off Substack to their own WordPress site — the old
        # thereload.substack.com/feed URL now 403s.
        "url": "https://thereload.com/feed/",
        "source_type": "journalism",
    },
    {
        "id": "the-reload-youtube",
        "name": "The Reload (YouTube)",
        "kind": "rss",
        "url": "https://www.youtube.com/feeds/videos.xml?channel_id=UCeELv8EXoLjf0721lEF4fcg",
        "source_type": "youtube",
    },
    {
        "id": "fpc-youtube",
        "name": "Firearms Policy Coalition (YouTube)",
        "kind": "rss",
        "url": "https://www.youtube.com/feeds/videos.xml?channel_id=UCQwal7KaCKPDWarooZ3p4Kw",
        "source_type": "youtube",
    },
    {
        "id": "guns-gadgets",
        "name": "Guns & Gadgets",
        "kind": "rss",
        "url": "https://www.youtube.com/feeds/videos.xml?channel_id=UC5fno9H5sK97fLg7RTdZpJg",
        "source_type": "youtube",
    },
    {
        "id": "armed-scholar",
        "name": "Armed Scholar",
        "kind": "rss",
        "url": "https://www.youtube.com/feeds/videos.xml?channel_id=UCNVX5X6vn0DzlqWNZnHFwKw",
        "source_type": "youtube",
    },
      {
      "id": "atty-tom-grieve",
        "name": "Atty Tom Grieve",
        "kind": "rss",
        "url": "https://www.youtube.com/feeds/videos.xml?channel_id=UC4M5RxIcp5H9lRiVC33TwFA",
        "source_type": "youtube",
    },
    {
        "id": "gun-guru",
        "name": "Gun Guru",
        "kind": "rss",
        "url": "https://www.youtube.com/feeds/videos.xml?channel_id=UCX8mPveReJ2A_95PGuaA0Dw",
        "source_type": "youtube",
    },
]

# Keyword buckets used to editorially categorize every item, regardless of
# which source it came from.
COURT_KEYWORDS = [
    "court", "judge", "circuit", "ruling", "rules", "lawsuit", "injunction",
    "appeal", "scotus", "supreme court", "plaintiff", "litigation", "stay",
    "writ", "cert", "docket", "district court", " v. ", "settlement",
    "verdict", "motion",
]
LEGISLATION_KEYWORDS = [
    "bill", "legislature", "senate", "house of representatives", "congress",
    "veto", "signs into law", "governor sign", "assembly", "committee",
    "statute", "reintroduce", "co-sponsor", "cosponsor", "hr ", "s.b.",
    "session", "ballot initiative",
]
REGULATORY_KEYWORDS = [
    "atf", "rulemaking", "regulation", "executive order", "department of justice",
    "doj", "final rule", "proposed rule",
]

CATEGORY_ORDER = ["Court Case", "Legislation", "Regulatory", "News", "Video"]


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------

def log(msg):
    print(f"[aggregate] {msg}", flush=True)


def http_get(url, headers=None):
    req_headers = {"User-Agent": USER_AGENT}
    if headers:
        req_headers.update(headers)
    req = urllib.request.Request(url, headers=req_headers)
    with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
        return resp.read()


def strip_html(raw):
    if not raw:
        return ""
    text = re.sub(r"<[^>]+>", " ", raw)
    text = html.unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def truncate(text, length=220):
    if len(text) <= length:
        return text
    cut = text[:length].rsplit(" ", 1)[0]
    return cut.rstrip(",.;:") + "…"


def make_id(link, title):
    key = (link or title or "").encode("utf-8")
    return hashlib.sha1(key).hexdigest()[:16]


def categorize(text):
    lowered = text.lower()
    for kw in COURT_KEYWORDS:
        if kw in lowered:
            return "Court Case"
    for kw in LEGISLATION_KEYWORDS:
        if kw in lowered:
            return "Legislation"
    for kw in REGULATORY_KEYWORDS:
        if kw in lowered:
            return "Regulatory"
    return "News"


def parse_rfc822_or_iso(date_str):
    if not date_str:
        return None
    fmts = [
        "%a, %d %b %Y %H:%M:%S %z",
        "%a, %d %b %Y %H:%M:%S %Z",
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%SZ",
    ]
    for fmt in fmts:
        try:
            dt = datetime.strptime(date_str.strip(), fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc)
        except ValueError:
            continue
    return None


# --------------------------------------------------------------------------
# RSS / Atom parsing (stdlib only, no feedparser dependency needed)
# --------------------------------------------------------------------------

ATOM_NS = "{http://www.w3.org/2005/Atom}"


def parse_feed(raw_bytes, source):
    """Handles both RSS 2.0 <item> and Atom <entry> feeds (YouTube uses Atom)."""
    items = []
    try:
        root = ET.fromstring(raw_bytes)
    except ET.ParseError as e:
        log(f"  ! failed to parse XML for {source['name']}: {e}")
        return items

    # RSS 2.0
    for item in root.findall(".//item"):
        title = strip_html(item.findtext("title", ""))
        link = (item.findtext("link", "") or "").strip()
        desc = strip_html(item.findtext("description", ""))
        pub = item.findtext("pubDate", "")
        dt = parse_rfc822_or_iso(pub)
        items.append(_build_raw_item(source, title, link, desc, dt))

    # Atom (YouTube feeds)
    for entry in root.findall(f".//{ATOM_NS}entry"):
        title = strip_html(entry.findtext(f"{ATOM_NS}title", ""))
        link_el = entry.find(f"{ATOM_NS}link")
        link = link_el.get("href") if link_el is not None else ""
        desc = strip_html(entry.findtext(f"{ATOM_NS}content", "") or
                           entry.findtext(f"{ATOM_NS}summary", ""))
        pub = entry.findtext(f"{ATOM_NS}published", "") or entry.findtext(f"{ATOM_NS}updated", "")
        dt = parse_rfc822_or_iso(pub)
        items.append(_build_raw_item(source, title, link, desc, dt))

    return items[:MAX_ITEMS_PER_SOURCE]


def _build_raw_item(source, title, link, desc, dt):
    text_for_category = f"{title} {desc}"
    category = "Video" if source["source_type"] == "youtube" else categorize(text_for_category)
    return {
        "id": make_id(link, title),
        "title": title.strip(),
        "link": link.strip(),
        "raw_summary": desc.strip(),
        "published": dt.isoformat() if dt else None,
        "source_id": source["id"],
        "source_name": source["name"],
        "source_type": source["source_type"],
        "category": category,
    }


def fetch_rss_sources():
    all_items = []
    for source in SOURCES:
        log(f"Fetching {source['name']} ...")
        try:
            raw = http_get(source["url"])
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as e:
            log(f"  ! skipped {source['name']}: {e}")
            continue
        items = parse_feed(raw, source)
        log(f"  -> {len(items)} items")
        all_items.extend(items)
        time.sleep(0.5)  # be polite
    return all_items


# --------------------------------------------------------------------------
# CourtListener — real federal court filings/opinions mentioning the 2A
# --------------------------------------------------------------------------

def fetch_courtlistener():
    log("Fetching CourtListener (federal court opinions) ...")
    url = (
        "https://www.courtlistener.com/api/rest/v4/search/"
        "?q=%22second%20amendment%22&type=o&order_by=dateFiled%20desc"
    )
    try:
        raw = http_get(url, headers={"Accept": "application/json"})
        data = json.loads(raw)
    except Exception as e:
        log(f"  ! skipped CourtListener: {e}")
        return []

    items = []
    for result in data.get("results", [])[:MAX_ITEMS_PER_SOURCE]:
        case_name = result.get("caseName") or result.get("case_name") or "Untitled case"
        court = result.get("court") or result.get("court_id") or ""
        date_filed = result.get("dateFiled") or result.get("date_filed")
        snippet = strip_html(result.get("snippet", ""))
        docket_id = result.get("docket_id") or result.get("cluster_id") or result.get("id")
        link = f"https://www.courtlistener.com{result.get('absolute_url', '')}" if result.get("absolute_url") else \
               f"https://www.courtlistener.com/?q={docket_id}"
        title = f"{case_name}" + (f" ({court})" if court else "")
        dt = None
        if date_filed:
            try:
                dt = datetime.strptime(date_filed, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            except ValueError:
                pass
        items.append({
            "id": make_id(link, title),
            "title": title.strip(),
            "link": link,
            "raw_summary": snippet or "Federal court opinion referencing the Second Amendment. Click through for the full filing on CourtListener.",
            "published": dt.isoformat() if dt else None,
            "source_id": "courtlistener",
            "source_name": "CourtListener (Free Law Project)",
            "source_type": "primary_legal",
            "category": "Court Case",
        })
    log(f"  -> {len(items)} items")
    return items


# --------------------------------------------------------------------------
# Congress.gov — federal bill tracking (optional, needs free API key)
# --------------------------------------------------------------------------

FIREARM_BILL_KEYWORDS = [
    "firearm", "gun", "second amendment", "nfa", "suppressor", "silencer",
    "magazine capacity", "assault weapon", "concealed carry", "atf",
    "background check",
]


def fetch_congress_bills():
    if not CONGRESS_API_KEY:
        log("Skipping Congress.gov (no CONGRESS_API_KEY set)")
        return []
    log("Fetching Congress.gov (recent bill activity) ...")
    url = (
        "https://api.congress.gov/v3/bill"
        f"?sort=updateDate+desc&limit=100&api_key={CONGRESS_API_KEY}&format=json"
    )
    try:
        raw = http_get(url, headers={"Accept": "application/json"})
        data = json.loads(raw)
    except Exception as e:
        log(f"  ! skipped Congress.gov: {e}")
        return []

    items = []
    for bill in data.get("bills", []):
        title = bill.get("title", "")
        if not any(kw in title.lower() for kw in FIREARM_BILL_KEYWORDS):
            continue
        bill_type = bill.get("type", "").lower()
        number = bill.get("number", "")
        congress = bill.get("congress", "")
        link = f"https://www.congress.gov/bill/{congress}th-congress/{bill_type}/{number}"
        update_date = bill.get("updateDate")
        dt = None
        if update_date:
            try:
                dt = datetime.strptime(update_date[:10], "%Y-%m-%d").replace(tzinfo=timezone.utc)
            except ValueError:
                pass
        latest_action = (bill.get("latestAction") or {}).get("text", "")
        items.append({
            "id": make_id(link, title),
            "title": title.strip(),
            "link": link,
            "raw_summary": f"Latest action: {latest_action}" if latest_action else "Federal bill tracked via Congress.gov.",
            "published": dt.isoformat() if dt else None,
            "source_id": "congress-gov",
            "source_name": "Congress.gov",
            "source_type": "primary_legal",
            "category": "Legislation",
        })
    log(f"  -> {len(items)} relevant bills")
    return items[:MAX_ITEMS_PER_SOURCE]


# --------------------------------------------------------------------------
# Optional AI summarization (Claude Haiku) — only for genuinely new items
# --------------------------------------------------------------------------

def ai_summarize(title, raw_text):
    if not ANTHROPIC_API_KEY or not raw_text:
        return None
    prompt = (
        "Write a single neutral, factual TL;DR sentence (under 30 words) summarizing "
        "this Second Amendment / gun rights news item for a reader who wants the "
        "bottom line fast. No editorializing, no hype words. Just the facts.\n\n"
        f"Title: {title}\n\nContent: {raw_text[:1500]}"
    )
    body = json.dumps({
        "model": ANTHROPIC_MODEL,
        "max_tokens": 100,
        "messages": [{"role": "user", "content": prompt}],
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=body,
        headers={
            "Content-Type": "application/json",
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
            result = json.loads(resp.read())
        for block in result.get("content", []):
            if block.get("type") == "text":
                return block["text"].strip()
    except Exception as e:
        log(f"  ! AI summarize failed: {e}")
    return None


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------

def load_existing():
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                existing = json.load(f)
            return {item["id"]: item for item in existing.get("items", [])}
        except Exception:
            return {}
    return {}


def main():
    os.makedirs(DATA_DIR, exist_ok=True)
    existing_by_id = load_existing()

    raw_items = []
    raw_items.extend(fetch_rss_sources())
    raw_items.extend(fetch_courtlistener())
    raw_items.extend(fetch_congress_bills())

    # Dedupe by id (link/title hash)
    seen = {}
    for item in raw_items:
        seen[item["id"]] = item

    final_items = []
    ai_calls_made = 0
    MAX_AI_CALLS = 40  # safety cap per run

    for item_id, item in seen.items():
        prior = existing_by_id.get(item_id)
        if prior and prior.get("tldr"):
            # Reuse previously computed summary, don't re-call the API
            item["tldr"] = prior["tldr"]
        else:
            tldr = None
            if ai_calls_made < MAX_AI_CALLS:
                tldr = ai_summarize(item["title"], item["raw_summary"])
                if tldr:
                    ai_calls_made += 1
            if not tldr:
                tldr = truncate(item["raw_summary"] or item["title"], 200)
            item["tldr"] = tldr
        del item["raw_summary"]
        final_items.append(item)

    # Sort newest first; items with no date sink to the bottom
    final_items.sort(
        key=lambda x: x["published"] or "0000-00-00T00:00:00+00:00",
        reverse=True,
    )

    output = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "item_count": len(final_items),
        "items": final_items,
    }

    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    log(f"Wrote {len(final_items)} items to {DATA_FILE} ({ai_calls_made} AI summaries generated)")


if __name__ == "__main__":
    sys.exit(main())

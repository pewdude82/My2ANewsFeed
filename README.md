# 2A Briefing

A personal, self-updating feed of Second Amendment news, federal court case
activity, and gun legislation — aggregated from a curated set of sources into
one TL;DR-style page.

## What it pulls from

| Source | Type | Feed |
|---|---|---|
| Gun Owners of America | Org news | RSS |
| NRA-ILA | Org news / legislative alerts | RSS |
| Second Amendment Foundation | Org news | RSS |
| The Reload (Stephen Gutowski) | Independent journalism | RSS |
| Firearms Policy Coalition | YouTube | RSS |
| Guns & Gadgets | YouTube | RSS |
| Armed Scholar | YouTube | RSS |
| CourtListener (Free Law Project) | Primary court filings | REST API, no key needed |
| Congress.gov | Federal bill tracking | REST API, **needs a free key** |

Every item is tagged into one of five categories (Court Case, Legislation,
Regulatory, News, Video) using keyword matching on the title/summary, and
links straight back to the original source.

## One-time setup

### 1. Turn on GitHub Pages
Repo → **Settings** → **Pages** → under "Build and deployment," set Source to
**Deploy from a branch**, branch `main`, folder `/ (root)`. Save. GitHub gives
you a URL like `https://yourname.github.io/My2ANewsFeed/`.

### 2. Turn on GitHub Actions
Repo → **Actions** tab → if prompted, click "I understand my workflows, go
ahead and enable them." The workflow in `.github/workflows/update-feed.yml`
will then run automatically every 4 hours, and you can also trigger it by
hand from that tab (click the workflow name → **Run workflow**).

### 3. (Optional but recommended) Add a Congress.gov API key
Federal bill tracking is skipped unless this is set.
1. Get a free key at https://api.congress.gov/sign-up/
2. In your repo: **Settings** → **Secrets and variables** → **Actions** →
   **New repository secret**
3. Name: `CONGRESS_API_KEY`, value: the key you got

### 4. (Optional) Add an Anthropic API key for better summaries
Without this, TL;DRs are just a trimmed version of each source's own
description. With it, each new item gets a real one-sentence neutral summary
written by Claude Haiku (cheap — a few cents per run, and already-summarized
items aren't re-summarized on later runs).
1. Get a key at https://console.anthropic.com
2. Same place as above: **Settings** → **Secrets and variables** → **Actions**
   → **New repository secret**
3. Name: `ANTHROPIC_API_KEY`, value: the key

### 5. Run it once by hand
Actions tab → "Update 2A News Feed" → **Run workflow**. After it finishes
(~30–60 seconds), `data/data.json` will have real items and your Pages site
will show them on next load.

## Running it locally (optional)

```bash
python scripts/aggregate.py
```

This writes `data/data.json` directly — open `index.html` in a browser
(or run `python -m http.server` in the repo root) to preview.

## Adding or removing sources

Edit the `SOURCES` list near the top of `scripts/aggregate.py`. Any RSS or
Atom feed works — for a new YouTube channel, the feed URL is always:

```
https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID
```

(Fetch the channel's "about" page source or ask Claude to look it up — the
channel ID is a `UC...` string, different from the `@handle`.)

## Notes

- CourtListener's search API is free and unauthenticated but rate-limited —
  if it fails on a given run, the script logs a warning and skips it rather
  than failing the whole job.
- The categorizer is keyword-based, not perfect — it'll occasionally tag a
  "News" item as "Regulatory" or vice versa. Adjust the keyword lists in
  `aggregate.py` if you notice consistent miscategorization.
- Every card's TL;DR expands via a native `<details>` element, and always
  links back to the original source — treat this as a fast-scan layer on top
  of the real reporting, not a replacement for it.

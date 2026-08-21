# The 2A Ledger — Build Progress

Last updated: August 20, 2026

## What's been built

### Site structure
Multi-page static site on GitHub Pages (plain HTML/CSS/JS, no framework):

| URL | Status |
|-----|--------|
| `/` | Landing page with hero, full news briefing (filters + feed), and explore tiles |
| `/news/` | Dedicated news briefing page (same feed, restyled) |
| `/states/` | State index — Connecticut tile only |
| `/states/connecticut/` | Connecticut law center — Phase 1 content |
| `/about/` | Sources, update cadence, disclaimer |

### Shared infrastructure
- **Nav/footer partials** — `partials/nav.html` and `partials/footer.html`, injected via `js/site.js`
- **Design system** — CSS tokens for colors, type scale (page title / section / body / meta), spacing (8–48px), and shared card styles in `css/tokens.css`, `base.css`, `components.css`
- **News feed** — `js/news.js` shared by home and `/news/`; reads `data/data.json` (GitHub Actions pipeline unchanged)

### Connecticut page (Phase 1)
Five sections with inline government source links:
1. Recently enacted — June 2026 convertible-pistols law (HB 5043)
2. Permits and purchasing
3. Safe storage (Conn. Gen. Stat. § 29-37i)
4. Magazine capacity
5. Assault weapons (Conn. Gen. Stat. § 53-202a et seq.)

### News briefing
- Category filters: All, Court Case, Legislation, Regulatory, News, Video
- Search, lead story, stat ticker, skeleton loading, two-column card grid
- Live on **home page** and **`/news/`**

---

## Design decisions

| Decision | Choice |
|----------|--------|
| **Site name** | **The 2A Ledger** (display only — repo/folder stays `My2ANewsFeed`) |
| **Nav structure** | Persistent top nav on every page: Home · News · States · About |
| **Nav/footer implementation** | JS partial injection (Option A) — no build step |
| **Accent color** | Single accent: `--brass` (extended from original theme) |
| **Theme** | Light theme; existing palette extended, not replaced |
| **Disclaimer placement** | Footer on every page (via partial) + repeated callout at top of Connecticut state page |
| **Connecticut content style** | Information-forward — plain language + inline citations. **No flowcharts, quiz, or decision tree** |
| **Landing page headlines strip** | Skipped for v1 |
| **Home page feed** | Full briefing with category tabs embedded on home (added after initial build) |

---

## Approved

- **File/folder structure** — approved before coding began
- **Connecticut page** — content and layout approved (ready to go live when Adam pushes)

---

## Build order — status

From `my2anewsfeed-redesign-plan.md`:

| Step | Task | Status |
|------|------|--------|
| 1 | Propose file structure, confirm with Adam | ✅ Done |
| 2 | Shared nav/footer + design tokens | ✅ Done |
| 3 | Landing page | ✅ Done (feed added post-build) |
| 4 | Move news feed to `/news/`, verify paths | ✅ Done |
| 5 | `/states/` index (CT tile) | ✅ Done |
| 6 | `/states/connecticut/` Phase 1 content | ✅ Done, approved |
| 7 | Site-wide disclaimer (footer partial) | ✅ Done |
| 8 | `/about/` page | ✅ Done |
| 9 | Cross-browser / mobile pass | ⬜ Not started |
| 10 | Phase 2 expansion (see plan) | ⬜ Future |

---

## What's next

1. **Cross-browser / mobile pass** — verify nav collapse, sticky filters, feed grid, and card layout on small screens and major browsers
2. **Push to GitHub Pages** — Connecticut content is approved; deploy when ready
3. **README update** — still references old single-page layout (`index.html` as news page)
4. **Phase 2 (later)** — CT "what's legal to own" table, "Other" firearm classification, transport law, reciprocity, pending-legislation tracker

### Open items (from plan)
- Pending-legislation tracking: scraper vs. manual updates — not decided
- CT "Other" firearm classification (2023 PA 23-53) — needs research pass for Phase 2

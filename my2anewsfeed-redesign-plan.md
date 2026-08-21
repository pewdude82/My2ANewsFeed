# My2ANewsFeed Redesign — Plan for Claude Code

## Context
Repo: github.com/pewdude82/My2ANewsFeed
Current state: single-page news feed on GitHub Pages (stat ticker, lead card, YouTube thumbnails, two-column grid, skeleton loading, light theme). Python scraping + GitHub Actions automate the news content.

Goal: turn this into a multi-page site that reads as a professional Second Amendment information hub — landing page, tabbed navigation, and a new state law reference section starting with Connecticut.

**Standing instruction for Claude Code: propose a plan (file structure, component breakdown) and wait for Adam's approval before writing code, same as the 3D printing "gameplan before execute" workflow.**

---

## 1. Site structure

```
/                     → Landing page
/news/                → Existing feed, moved here, same scraping pipeline
/states/               → State index (just CT tile for now, built to add more)
/states/connecticut/   → CT law center
/about/                → Sources, update cadence, disclaimer
```

Persistent top nav on every page: Home · News · States · About.
Keep it a static site (GitHub Pages) — no framework migration needed. Plain HTML/CSS/JS or a lightweight static site generator if Adam wants templating across pages (avoids repeating the nav/footer HTML everywhere).

## 2. Landing page

- Hero: one-line mission statement + subtext + two CTA buttons ("Browse news", "Connecticut law center")
- Three (soon to be four+) section tiles below the fold, each with an icon, title, 1-2 sentence description, and a link — News, State Law Center, About
- Optional: pull 3-4 latest headlines into a small "Latest" strip on the landing page so it doesn't feel empty on first load

## 3. Design system (for consistency across pages)

- One accent color (pick one, don't introduce a second)
- Type scale: page title ~28-32px, section heading ~20px, body ~15-16px, meta/caption ~13px — consistent across every page, not just the homepage
- Consistent spacing scale (e.g. 8/12/16/24/32/48px) instead of ad hoc margins
- Cards: consistent border-radius, consistent border/shadow treatment reused everywhere (news cards, state law cards, tile cards)
- Keep the existing light theme; extend the same tokens rather than inventing new colors per page

## 4. Connecticut state page — content approach

**Information-forward, not interactive/gamified.** No flowcharts, no quiz, no decision tree. Every claim is plain-language explanation backed by a citation and a link to the government source (portal.ct.gov, cga.ct.gov, or the CT General Statutes text). See `connecticut-page-content-draft.md` for the sourced Phase 1 content, ready to drop in.

**Site-wide disclaimer** (footer on every page, repeated at the top of the state section): this site is for general information only and does not constitute legal advice; verify against the official source linked, or consult a licensed CT attorney, before acting on anything here.

**Phase 1 scope** (build this first):
1. Permits and purchasing (pistol permit, long gun/handgun eligibility certificates, the two-step permit process)
2. Safe storage law (Conn. Gen. Stat. § 29-37i)
3. Magazine capacity law
4. Assault weapons law (Conn. Gen. Stat. § 53-202a et seq.)
5. A "recently enacted" callout — start with the June 2026 convertible-pistol law as the first entry

**Phase 2 (expand once Phase 1 is live and verified):**
- Full "what's legal to own" comparison table (handguns, rifles, shotguns, NFA items, magazines)
- Connecticut's "Other" firearm classification (from 2023 PA 23-53 / HB 6667) — needs its own research pass
- Transport law detail (vehicle carry, locked/unloaded requirements)
- Concealed carry reciprocity with other states
- Pending-legislation tracker, live for the next regular session (convenes February 2027)

Each section should cite its source inline (a small linked footnote or "source:" line under each claim) rather than burying sources in a single reference list at the bottom — keeps the page trustworthy at a glance.

## 6. Suggested build order for Claude Code

1. Propose file/folder structure and confirm with Adam
2. Build shared nav + footer partial, apply design tokens (colors, type scale, spacing) as CSS variables
3. Build landing page
4. Move existing news feed under `/news/`, verify scraping/Actions pipeline still points to the right output path
5. Build `/states/` index page (just the CT tile for now)
6. Build `/states/connecticut/` using the Phase 1 content in `connecticut-page-content-draft.md`, with inline source citations
7. Add the site-wide disclaimer component (footer partial, reused everywhere)
8. Add `/about/` page with sources + disclaimer language
9. Cross-browser/mobile pass — nav collapses to a menu on small screens
10. Once Phase 1 is live, revisit Phase 2 items above

## 7. Open items to confirm with Adam before content goes live

- Review `connecticut-page-content-draft.md` line by line before it's published
- Whether pending-legislation tracking gets its own scraper or is updated manually for now
- Research pass on CT's "Other" firearm classification for Phase 2

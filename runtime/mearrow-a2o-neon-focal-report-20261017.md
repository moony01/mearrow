# A2O NEON thumbnail focal-position verification

- Date: 2026-10-17
- Verifier: `/root/a2o_news_local_playwright_retry` (test-only)
- Environment: fresh tab, configured system Playwright harness `READY`, Windows Chrome over CDP; local server `http://localhost:3102`
- Result: **PASS WITH CONSOLE FINDINGS**

## Focal-position and navigation checks

| Surface | Computed `object-position` | Result |
|---|---|---|
| News listing card | `50% 10%` (`center 10%`) | PASS; central member’s face is clear in the crop |
| Article hero, desktop 1440×1000 | `50% 10%` | PASS; central face is clearly visible and unobstructed |
| Article hero, mobile 390×844 | `50% 10%` | PASS; central face remains clearly visible |
| Related A2O card on KATSEYE article | `50% 10%` | PASS; loaded 120×120 card uses the same crop |

From `/studio/news`, a real Playwright MCP click on the A2O card produced a DOM click and navigated to `/studio/news/a2o-lite-neon-melon-peak`. The destination H1 matches the article title.

## API, metadata and layout

- `/api/news.json`: HTTP 200, 201 records; matching article title, slug, date and category.
- `/api/news-content/en/a2o-lite-neon-melon-peak.json`: HTTP 200; `thumbnailPosition` is `center 10%`; title, slug, date, category and seven sources match the page.
- Both article images return HTTP 200 as `image/webp`; hero and inline image are loaded and have alt text.
- Canonical is `https://mearrow.com/studio/news/a2o-lite-neon-melon-peak`; description, Open Graph title, date, category, seven source links and image caption render.
- Horizontal overflow: none at desktop or mobile. Document/client widths are 1425/1425 on desktop and 375/375 on mobile.
- Accessibility snapshots were saved for listing, desktop article and mobile article.

## Console and network

The `increment_kcl_news_view` POST route was blocked before listing navigation. Three attempts were intercepted before reaching Supabase; no response was returned. Page errors: `0`; hydration errors/warnings: `0`. The only console errors were the expected blocked-RPC messages.

Fresh-session warning groups totaled 93 across the route checks:

- 72 repeated MetaMask extension warnings (orphaned streams and listener counts): browser-profile noise.
- 18 route asset preload warnings for two fonts and one CSS chunk: app/resource finding.
- 2 AdSense `data-nscript` warnings: app/framework finding.
- 1 LCP warning for an unrelated Jackson Yuqi listing thumbnail: app performance finding.

## Evidence

- Listing screenshot: `runtime/mearrow-a2o-neon-focal-listing-20261017.png`
- Desktop screenshot: `runtime/mearrow-a2o-neon-focal-desktop-20261017.png`
- Mobile screenshot: `runtime/mearrow-a2o-neon-focal-mobile-20261017.png`
- Listing accessibility snapshot: `runtime/mearrow-a2o-neon-focal-listing-a11y-20261017.md`
- Desktop accessibility snapshot: `runtime/mearrow-a2o-neon-focal-desktop-a11y-20261017.md`
- Mobile accessibility snapshot: `runtime/mearrow-a2o-neon-focal-mobile-a11y-20261017.md`
- Structured report: `runtime/mearrow-a2o-neon-focal-report-20261017.json`

No application files were changed by this verifier.

# A2O NEON final Playwright gate — 2026-10-17

**Result: PASS_WITH_CONSOLE_FINDINGS**

## UI and integration checks

- System Playwright harness: READY. Fresh tab, headed Windows Chrome over the configured MCP/CDP bridge; no Orca or computer-use browser.
- A real Playwright click from `/studio/news` reached `/studio/news/a2o-lite-neon-melon-peak`; the destination H1 matches the article title.
- Listing thumbnail and detail hero compute `object-position: 50% 10%` (`center 10%`). The central member’s face is visible in listing, desktop 1440×1000, and mobile 390×844 screenshots.
- `/api/news.json` returned 200 with 201 records. The article content API returned 200 with matching slug/title/date/category, seven sources and `thumbnailPosition: center 10%`.
- Optional-property regression check passed: unrelated KATSEYE article content returned 200 with `thumbnailPosition` omitted.
- Thumbnail and inline image both returned 200 as WebP (161,384 and 184,196 bytes) and loaded in the page. Canonical, description, OG title, visible date/category, caption, alt text and seven external source links were confirmed.
- Horizontal overflow: none. Desktop document/client widths are 1425/1425; mobile widths are 375/375. Listing and desktop/mobile accessibility snapshots are saved.
- `increment_kcl_news_view` POST was intercepted before listing navigation. Two attempted POSTs were aborted before network transmission; no Supabase write response occurred. Read-only view/comment GETs returned 200.

## Console

- Page errors: 0. Hydration errors or warnings: 0.
- Two console errors are the expected `ERR_BLOCKED_BY_CLIENT.Inspector` messages from the intentionally blocked view-count RPC.
- 64 warnings: 42 MetaMask extension messages (orphaned streams and listener counts); 21 unused preload warnings for fonts/CSS; 1 AdSense `data-nscript` warning. No LCP warning was observed in this run.

## Evidence files

- Listing: `runtime/mearrow-a2o-neon-final-gate-20261017-listing.png`
- Desktop: `runtime/mearrow-a2o-neon-final-gate-20261017-desktop.png`
- Mobile: `runtime/mearrow-a2o-neon-final-gate-20261017-mobile.png`
- Accessibility: `runtime/mearrow-a2o-neon-final-gate-20261017-{listing,desktop,mobile}-a11y.md`
- Network: `runtime/mearrow-a2o-neon-final-gate-20261017-network.md`
- Console warnings: `runtime/mearrow-a2o-neon-final-gate-20261017-console-warnings.txt`
- Structured report: `runtime/mearrow-a2o-neon-final-gate-20261017-report.json`

This verifier changed no application files and made no persistent writes.

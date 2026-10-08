# MEARROW T.O.P × Nana article browser verification

Date: 2026-10-08 (Asia/Seoul)
Harness: Playwright system-browser MCP, headed Windows Chrome via CDP; `/home/moon/.codex/bin/playwright-system-check` returned READY. Orca browser was not used.

## Gate results

- UI gate: PASS for the requested article/list interaction and responsive checks.
- Integration gate: PASS for the read-only `/api/news.json` assertion on `localhost:3002`.

## UI evidence

- Article route: `/en/news/top-nana-dating-studio54`; listing: `/en/news`.
- At 1440×1000, the headline and article body rendered, the blocking vote modal was closed, and both article images loaded. The article hero image was 1500×1875 natural pixels; the in-body T.O.P/Nana portrait was 1500×1875.
- At 390×844, the headline and body rendered; both images loaded after scrolling the lazy-loaded portrait into view. The portrait box measured 351×438.75 CSS px. No page-level horizontal overflow was detected: document scroll width 375 CSS px, client width 375 CSS px, viewport width 390 CSS px.
- Desktop page-level horizontal overflow: none; viewport 1440 CSS px, document scroll width 1425 CSS px, `overflowX=false`.
- The listing card appeared with the exact article title and destination. Desktop Back to News and card-click navigation were recorded; the mobile listing card was also clicked and returned to the article.
- The mobile category filter is an intentional horizontal scroller: `scrollWidth=1225`, `clientWidth=351`, `overflow-x:auto`; scrolling to the end brought the final Company News filter fully into view. No document-level horizontal overflow was detected.
- Dialog count after closing: 0.
- Console errors: 0 reported in the initial captured checks. The latest `localhost:3002` listing context reported 42 warnings. Page errors on the fresh context were not observed in that run; the fresh observation addendum below closes this gap.

## Integration evidence

From the `localhost:3002/en/news` listing page, a read-only `GET http://localhost:3002/api/news.json` returned HTTP 200. The entry was:

- slug: `top-nana-dating-studio54`
- title: `T.O.P and Nana Confirm They’re Dating — The “Studio54” Story Has a New Chapter`
- API URL: `https://mearrow.com/en/news/top-nana-dating-studio54`
- rendered card href: `/en/news/top-nana-dating-studio54`

The API URL path, slug, and title matched the rendered card. Playwright network log recorded request 125 as GET → 200 OK.

## View-counter side effect and limits

The initial direct article visit automatically sent a POST to Supabase RPC `increment_kcl_news_view`, which returned 204. The captured listing/article views show 2 then 3 views, and an earlier Orca article visit may also have incremented the counter; the exact test-caused increment count is uncertain. Later article re-entry RPC attempts were locally fulfilled with 204 to avoid further server writes. No rollback was attempted. No other write controls were used.

The mobile measurements use a 390×844 CSS viewport in desktop Chrome, not a physical device.

## Evidence files

Screenshots:

- `runtime/mearrow-top-nana-article-desktop.png`
- `runtime/mearrow-top-nana-article-image-desktop.png`
- `runtime/mearrow-top-nana-article-mobile.png`
- `runtime/mearrow-top-nana-article-image-mobile.png`
- `runtime/mearrow-top-nana-article-mobile-reentry-image.png`
- `runtime/mearrow-news-list-desktop.png`
- `runtime/mearrow-news-list-mobile.png`

Accessibility snapshots:

- `runtime/mearrow-top-nana-article-desktop-a11y.md`
- `runtime/mearrow-top-nana-article-mobile-a11y.md`
- `runtime/mearrow-top-nana-article-mobile-reentry-a11y.md`
- `runtime/mearrow-news-list-desktop-a11y.md`
- `runtime/mearrow-news-list-mobile-a11y.md`

## Fresh observation addendum (localhost:3002)

A second fresh run closed the page-error observation gap. In a new `about:blank` tab, before loading any article route, Playwright installed a route handler for the view-counter RPC plus pageerror and console-error observers. The handler fulfilled matching POSTs locally with HTTP 204 and `x-qa-local-intercept: true`; it did not continue them to the network. Three POST attempts were observed across the direct article load and listing-card return, and all three carried the local-intercept response marker. No counter write reached Supabase in this fresh run.

- Fresh article load: headline and body matched; hero and in-body portrait both loaded at natural width 1500 px. The initial vote modal was closed; dialog count became 0. The lazy-loaded portrait completed after scrolling into view.
- Navigation: Back to News returned to `/en/news`; the matching card was present. Clicking it returned to the article route while the RPC interceptor remained active.
- Fresh errors: pageerror observer count 0 and console-error observer count 0 across the fresh article, listing, and card return. Playwright console also reported 0 errors. Warnings accumulated to 65 by the final article observation.
- Fresh desktop layout: 958×910 CSS viewport; article and listing each had document scroll width 943 px and client width 943 px at the final measurement; `overflowX=false`.
- Fresh readback from the listing: request 155 was `GET http://localhost:3002/api/news.json` → 200. The entry slug and title matched the card; API URL path `/en/news/top-nana-dating-studio54` matched the card href.

Additional fresh evidence:

- `runtime/mearrow-top-nana-article-fresh.png`
- `runtime/mearrow-top-nana-article-fresh-reentry-image.png`
- `runtime/mearrow-top-nana-article-fresh-a11y.md`
- `runtime/mearrow-news-list-fresh.png`
- `runtime/mearrow-news-list-fresh-a11y.md`

The earlier run's view-counter side effect remains as recorded above; this addendum does not change or roll it back. With the fresh error observers and locally intercepted RPC in place, the requested UI and read-only integration checks are PASS. Physical-device testing was not performed.

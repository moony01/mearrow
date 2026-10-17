# A2O NEON article — Playwright verification

- Date: 2026-10-17
- Verifier: `/root/a2o_news_local_playwright_retry` (test-only)
- Browser: configured system Playwright harness, Windows Chrome over CDP; readiness `READY`
- Local target: `http://localhost:3102/studio/news/a2o-lite-neon-melon-peak`
- Orca embedded browser: not used for this formal Playwright gate

## Gate results

| Gate | Result | Evidence |
|---|---|---|
| Direct article route and rendered content | PASS | Route returned HTTP 200; H1, date, category, three H2 headings, body, source links, captions and canonical rendered |
| Desktop layout, 1440×1000 | PASS | No horizontal overflow; main width 860px, article width 760px, H1 width 822px |
| Mobile layout, 390×844 | PASS | No horizontal overflow; article width 375px with 16px side padding, H1 width 337px |
| API and image readback | PASS | List API, content API and both WebP images returned HTTP 200; list/content title, slug, date and category match |
| View-count mutation guard | PASS | POST to `/rest/v1/rpc/increment_kcl_news_view` was intercepted before reaching Supabase; no response; views GET returned `[]` |
| Listing-card pointer navigation | PASS | Fresh-tab `browser_click` generated a DOM click and navigated to the A2O article; simple internal and existing-article links also navigated |
| Overall | PASS WITH FINDINGS | Required route, responsive UI, integration readback and fresh-tab click passed; app/framework warnings are documented below |

## Article and integration evidence

- Title: **A2O LITE’s “NEON” Hit Melon No. 1 in 29 Hours. What Does the Rank Measure?**
- Date/category: `2026-10-16` / `Market Trend`
- Canonical: `https://mearrow.com/studio/news/a2o-lite-neon-melon-peak`
- Description matches the article excerpt; Open Graph title matches H1.
- Seven source links and the internal A2O background article link are present.
- Hero and inline image load with nonempty alt text. Both return `200 image/webp`.
- `/api/news.json`: HTTP 200, 201 records; matching slug/title/date/category found.
- `/api/news-content/en/a2o-lite-neon-melon-peak.json`: HTTP 200; slug/title/date/category match and seven source entries.
- Supabase comments/views calls observed in the browser were GET requests. The only attempted write was the protected view-count POST, which Playwright aborted. The page showed `1 views` after the aborted attempt, while the read-only view-count GET returned an empty array; no persistent view was created by this run.

## Errors and layout measurements

- Page errors: `0`.
- In the initial verification session, the sole console error was `ERR_BLOCKED_BY_CLIENT.Inspector` for the intentionally aborted view-count request.
- Fresh-session diagnostics recorded `0` page errors, `4` expected intercepted-RPC console errors, and `135` warnings across the navigation sequence. Warning groups are listed below; no hydration mismatch was observed.
- Desktop document scroll/client width: `1425 / 1425` at a `1440×1000` viewport.
- Mobile document scroll/client width: `375 / 375` at a `390×844` viewport. Neither viewport has horizontal overflow.
- The prior session’s listing click timeout did not reproduce in a clean tab. In the fresh session, exact-selector `browser_click` on the A2O card produced a DOM click (`target=IMG`, x=242, y=457) and navigated to the target route. The captured H1 matched the article title.

## Evidence files

- Desktop screenshot: `runtime/mearrow-a2o-neon-desktop-20261017.png`
- Mobile screenshot: `runtime/mearrow-a2o-neon-mobile-20261017.png`
- Fresh listing screenshot: `runtime/mearrow-a2o-neon-fresh-listing-20261017.png`
- Fresh A2O click result screenshot: `runtime/mearrow-a2o-neon-fresh-click-20261017.png`
- Desktop accessibility snapshot: `runtime/mearrow-a2o-neon-playwright-desktop-a11y-20261017.md`
- Mobile accessibility snapshot: `runtime/mearrow-a2o-neon-playwright-mobile-a11y-20261017.md`
- Structured evidence: `runtime/mearrow-a2o-neon-playwright-report-20261017.json`

## Limit

The article was checked at both viewport sizes and then reached through a real click on its listing card in a clean Playwright tab. The fresh-session click is `PASS`; no source files were changed by this verifier.


## Fresh-session interaction and warning diagnostic

- System-browser harness check: `READY`; old tab closed, clean tab created, RPC abort route installed before listing navigation.
- Internal `/studio` header link: real Playwright MCP click fired a DOM click event and navigated to `/studio`.
- Existing `/studio/news/kpop-group-survival-study` card: real click fired and navigated to that article. Its H1 rendered.
- A2O card `/studio/news/a2o-lite-neon-melon-peak`: real click fired (`target=IMG`, viewport coordinates 242,457), navigated to the article, and the rendered H1 matched the expected title.
- View RPC POSTs remained intercepted; network list showed failed `ERR_BLOCKED_BY_CLIENT.Inspector` requests without responses.
- Fresh-session warnings grouped across the navigation sequence (135 total): MetaMask extension warnings 108 (36 + 36 orphaned-stream warnings; 18 + 18 listener warnings); app/framework warnings 6 (AdSense script attribute 3; above-fold thumbnail LCP recommendation 3); route asset-preload warnings 21 (two fonts and one CSS chunk across route visits). No hydration mismatch was observed. The app/framework and preload warnings are findings; the extension warnings are browser-profile noise.
- Evidence captures: `runtime/mearrow-a2o-neon-fresh-listing-20261017.png` and `runtime/mearrow-a2o-neon-fresh-click-20261017.png`.

# Playwright QA: KATSEYE “Gabriela”

Date: 2026-10-20
Environment: local Next.js dev at `http://localhost:3102`; headed Windows Chrome through the Playwright system-browser harness (`playwright-system-check`: READY).
Role: test-only. No application files, fixtures, configuration, Git history, or deployment state were changed by QA.

## Results

- **UI: PASS.** `/studio#news` displayed the new card. Clicking it opened `/studio/news/katseye-gabriela-billion-streams`; “Back to News” returned to the listing; clicking the card again reopened the detail. The page showed the expected title, publication date (October 20, 2026), Oct. 16, 2026 milestone, June 20, 2025 release date, Billions Club entry, and both image credits. Detail canonical was exactly `https://mearrow.com/studio/news/katseye-gabriela-billion-streams`.
- **Integration: PASS.** Browser GETs returned HTTP 200 for `/api/news.json` and `/api/news-content/en/katseye-gabriela-billion-streams.json`. The public list contained 202 entries and the matching slug/title/date/canonical. The content readback matched the slug/title/date and contained the milestone and release date plus both expected image paths. Both WebP requests returned HTTP 200 and decoded at their source dimensions (3608×2030 and 3412×2275).
- **Responsive/layout: PASS.** No horizontal overflow or off-canvas interactive elements at 390×844 or 344×780. At 390×844, `innerWidth=390`, `documentElement.clientWidth=375`, and root/body `scrollWidth=375`; at 344×780, these were 344/329/329 respectively. The 15px difference is the browser’s vertical scrollbar gutter.
- **Accessibility snapshot basics: PASS.** One `main`, one `article`, one page `h1`, all images had alt text, and visible buttons had accessible names. This was a snapshot/basic-name check, not a full WCAG audit.
- **Console/page errors: PASS.** Zero errors. The session accumulated 52 warnings, primarily injected MetaMask extension warnings; page warnings also included an AdSense `data-nscript` warning and unused preload notices for fonts/CSS.

## Actions and network evidence

1. Loaded `/studio#news` and found the KATSEYE card as the first news item.
2. Clicked the card, checked the detail route/content/canonical/images, clicked “Back to News”, and clicked the card again.
3. Read both API endpoints from the browser and checked their response bodies against the rendered article.
4. Checked responsive dimensions at 390px and 344px. No comment or other form was submitted.

Browser network evidence: detail/list RSC requests returned HTTP 200; both article image requests returned HTTP 200; both API GETs returned HTTP 200; Supabase read requests returned HTTP 200. Opening the detail route also invoked `POST /rest/v1/rpc/increment_kcl_news_view` four times, each HTTP 204. These are automatic page-view side effects from the required route navigation; no attempt was made to decrement or otherwise alter view data. Google Analytics page-view requests returned HTTP 204.

## Screenshot

- Full-page detail screenshot: `runtime/mearrow-news-katseye-gabriela-billion-streams-playwright.png` (1433×4236 PNG, 2,348,558 bytes).

## Limits

This gate covers local rendered behavior and readback only. It does not assert production deployment state or production indexing status. The initial local detail request returned 404 while the generated runtime loader was in Workers mode; the root agent restored the local runtime and restarted `pnpm dev`, after which the detail route returned HTTP 200 and the formal checks above passed.

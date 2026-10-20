# Playwright QA recheck: encoded Commons links

Date: 2026-10-20
Environment: local Next.js dev at `http://localhost:3102`; headed Windows Chrome via the Playwright system-browser harness (`playwright-system-check`: READY).
Scope: test-only recheck after URL encoding in the two Commons markdown links. No application files, configuration, fixtures, Git history, or deployment state were changed by QA.

## Results

- **UI: PASS.** Loaded `/studio#news`, clicked the KATSEYE card to open the detail route, checked the rendered content and links, used “Back to News,” and clicked the card again. The page title and October 20, 2026 date were visible; the body showed the Oct. 16, 2026 milestone, June 20, 2025 release date, and Billions Club entry. Detail canonical exactly matched `https://mearrow.com/studio/news/katseye-gabriela-billion-streams`.
- **Encoded Commons links: PASS.** Rendered `href` attributes end in the complete `.jpg` filename and preserve encoded parentheses:
  - `https://commons.wikimedia.org/wiki/File:Katseye_in_Seattle_-_KATSEYE_%2854976227894%29.jpg`
  - `https://commons.wikimedia.org/wiki/File:Katseye_in_Seattle_-_KATSEYE_%2854975981191%29.jpg`
  Both URLs returned HTTP 200 after redirects when fetched read-only with `curl -L`.
- **Integration: PASS.** Browser GET `/api/news.json` returned 200 with 202 entries and the matching slug, title, date, summary, and canonical URL. Browser GET `/api/news-content/en/katseye-gabriela-billion-streams.json` returned 200 with the matching slug/title/date, milestone and release-date text, both WebP paths, and both encoded Commons source URLs. Network requests for both WebP images returned 200; both decoded at 3608×2030 and 3412×2275.
- **Responsive/layout: PASS.** No horizontal overflow or out-of-bounds interactive elements at 390×844 or 344×780. At 390×844, `innerWidth=390`, `clientWidth=375`, and root/body `scrollWidth=375`; at 344×780, these were 344/329/329. The 15px difference is the browser’s vertical scrollbar gutter.
- **Accessibility snapshot basics: PASS.** One `main`, one `article`, one H1, all images had alt text, and visible buttons had accessible names. This was a snapshot/basic-name check, not a full WCAG audit.
- **Console: PASS.** Zero errors. The session accumulated 61 warnings, primarily from the injected MetaMask extension; page warnings also included an AdSense `data-nscript` warning and unused font/CSS preload notices.

## Actions and side effects

No comments or other forms were submitted. The detail route automatically called `POST /rest/v1/rpc/increment_kcl_news_view` four times during the two card-to-detail visits; all four returned HTTP 204. These are expected page-view side effects. No attempt was made to decrement or otherwise alter view data. Detail/list RSC requests returned HTTP 200.

## Evidence

- Full-page detail screenshot: `runtime/mearrow-news-katseye-gabriela-billion-streams-playwright-recheck.png` (1433×4236 PNG, 2,348,691 bytes).
- This report records the fresh local browser/API checks only; production deployment and indexing status were not tested here.

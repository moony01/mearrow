# MEARROW News Autopilot Report

- Run: `mearrow-news-autopilot-20261006-top-nana-dating-confirmed`
- Topic: T.O.P and Nana relationship confirmed after the `Studio54` collaboration
- Slug: `top-nana-dating-confirmed`
- Date: 2026-10-06
- Category: Artist
- Mode: selected candidate / English source only

## Research Gate

- Status: PASS
- Search queries: 6 article-specific queries plus current-public-perception research
- Research result URLs recorded: 8
- Reliable/official sources recorded: Yonhap, SBS, CNA, Soompi, Maeil Business, GQ Hong Kong
- Core relationship and timeline claims were cross-checked against at least two independent reports.

## Content Gate

- Status: PASS
- Body: 1,482 words
- Structure: 5 H2 headings, 5 H3 headings
- SEO: 145-character excerpt, four-word slug, target keyword in title/excerpt/lead/H2
- Internal links: 1
- Images in article: 2
- Internal review markers and replacement characters: 0
- `active`: true after Research, Content, FactCheck, and Image Gates passed

## Factcheck Gate

- Status: PASS
- Claims reviewed: 10
- PASS: 10
- FIX: 0
- REMOVE: 0
- Verification rate: 100%
- Current public-perception section included because T.O.P has a documented controversy and long activity gap.

## Image Rights Evidence

- Status: PASS
- `sourceAttributionGate`: PASS
- Accepted assets: 2
- Rejected candidates: 3
- Source: SBS Star page with `Photo=TOPSPOT PICTURES` credit and direct original JPEG URLs
- Visual identity: both T.O.P and Nana are visibly identifiable in both accepted assets
- Source license: `not_verified_source_attributed`; no reuse permission is claimed
- AI generation: false
- Final dimensions: 1500×1875px for both; long edge 1875px
- Final format: WebP
- Evidence file: `runtime/mearrow-news-autopilot-20261006-top-nana-dating-confirmed-image-sources.json`

## Local Render Gate

- Status: PASS
- Dedicated local page: `http://127.0.0.1:3106/en/news/top-nana-dating-confirmed` → HTTP 200
- Original WebP assets: both HTTP 200
- Next Image optimizer assets: both `opt-800.WEBP` URLs HTTP 200
- Page markers, title, `Studio54`, and both article image paths were observed.
- Deploy environment preflight: PASS on the second attempt after exporting the approved local `.env.local` into the process; secret values were not printed or recorded.

## Browser Deploy Gate

- Status: PASS on the fresh gate after decoupling the audition-only smoke from the production gate.
- Browser smoke verified Supabase REST 200 responses, 4 profile-feed cards, 10 company cards, responsive shell geometry without horizontal overflow, and the English news detail route.
- News list rendered the new WebP thumbnail; the English detail route rendered successfully.
- Application console errors: 0. Page errors: 0.
- The standalone localized audition smoke remains available as `pnpm test:browser:workers-auditions`; it is no longer a production deploy blocker.

## Release Browser Verification

- Status: PASS from the dedicated test-only Playwright verifier (`ctx_8f37689ee830`).
- Verified `/en/news`, the new English detail URL, `/ko/news/top-nana-dating-confirmed` English fallback, and `/ko`.
- Both article WebP images decoded at 1500×1875 and returned HTTP 200; source captions were visible.
- Related-news navigation succeeded; Supabase `profile_posts` readback returned 200; console/page errors were 0.
- Responsive widths: 1,425px document at 1,440px viewport and 375px document at 390px viewport; no horizontal overflow.
- Screenshots: `/home/moon/workspace/mearrow-en-article-1440.png`, `/home/moon/workspace/mearrow-en-article-390.png`.
- Playwright snapshots/logs are recorded in the workspace `.playwright-mcp` directory. The initial screenshot path was rejected outside allowed roots and succeeded on retry; no application failure remained.

## Final Status

- Final status: `PASS`.
- PASS stages: Topic Selection, Research, Content, FactCheck, Image, Local Render, Browser Deploy Smoke, Release Browser Verification, commit, feature-branch push, Deploy, Production Browser Verification, GSC URL Inspection/Request.
- Attempt counts: research 0 retries, image 0 retries, browser 5 smoke attempts plus 1 release verification attempt, deploy 2 attempts (account selection failure, then success), GSC 1 request.
- Commit: `e3986fe` (`fix(mearrow): decouple audition smoke from production gate [deploy:mearrow]`) on `moony01/mearrow-news-20261006`; branch pushed to `origin`.
- Production deploy: Cloudflare Workers `mearrow-web`, version `278aadfa-6ec4-4762-b0cc-f2c55bebaabc`, deployed 2026-10-06 16:39 KST; worker endpoint `https://mearrow-web.mun01180.workers.dev`.
- Production verification: `https://mearrow.com/en/news/top-nana-dating-confirmed` returned HTTP 200; article title, canonical URL, both WebP images, and 8,491-character article text were observed in the headed system browser. Both article images decoded at 1500×1875; viewport/document widths were 958px with no overflow; no application console errors were observed (one third-party Google Ads unload policy violation was isolated).
- Search Console property: `sc-domain:mearrow.com`.
- Search Console result before request: `URL이 Google에 등록되어 있지 않음`.
- Search Console action: `색인 생성 요청` completed successfully; Google confirmed the URL was added to the priority crawl queue. This is a request, not an immediate guarantee that indexing has completed.

## Evidence Paths

- Runtime evidence: `runtime/mearrow-news-autopilot-20261006-top-nana-dating-confirmed-evidence.json`
- Image provenance: `runtime/mearrow-news-autopilot-20261006-top-nana-dating-confirmed-image-sources.json`
- State checkpoint: `runtime/mearrow-news-autopilot-20261006-top-nana-dating-confirmed.state.json`
- Browser screenshots: `/home/moon/workspace/mearrow-en-article-1440.png`, `/home/moon/workspace/mearrow-en-article-390.png`

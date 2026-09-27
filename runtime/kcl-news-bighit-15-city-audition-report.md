# BIGHIT 15-city audition official-image replacement report

- Final state: SUCCESS_PRODUCTION_READBACK
- Workflow: `kcl-news-autopilot`
- Slug: `bighit-15-city-audition`
- Locale: `en`
- Branch: `moony01/mearrow-bighit-official-images`
- Merged via: [PR #77](https://github.com/moony01/mearrow/pull/77), merge commit `2ef4ee84e0e1e660d484a00f291023d1fcdad43b`

## Change

The two Pexels images were replaced with direct original image binaries from the official BIGHIT MUSIC Audition site, at the user's request:

- Thumbnail: 2026 English desktop Global Audition poster, 1920×7600
- Body: 2024 official audition history poster, 2480×3508
- AI generation: 0; AI fallback: false

## Gates

- Research: PASS — official BIGHIT audition site/FAQ plus Music Business Worldwide, Music Ally, and Digital Music News remain recorded as the article's factual sources.
- Official source acquisition: PASS — direct binaries downloaded from `bighitaudition.com` and verified before WebP conversion.
- Image bytes/format: PASS — final assets are non-empty WebP files with the recorded SHA-256 hashes and expected dimensions.
- Rights evidence: USER-DIRECTED REVIEW REQUIRED — official source and source pages are confirmed, but a separate republication license for MEARROW was not found on the checked official pages. The article captions disclose the official source and unresolved permission status.
- Content: PASS — article claims and captions updated; confirmed BIGHIT facts remain separated from BTS-successor speculation.
- Content generation: PASS — `pnpm generate:content`; 202 English news records, 202 public, 0 explicitly inactive.
- Lint: PASS — 0 errors, 27 existing warnings.
- Unit tests: PASS — 44 test files, 174 tests.
- Workers build: PASS — `pnpm workers:build`; OpenNext bundle generated successfully.
- Local Worker preview: PASS — route HTTP 200, both image URLs HTTP 200 with `image/webp`, browser natural dimensions 1920×7600 and 2480×3508, official captions rendered.
- Deploy environment: UNAVAILABLE locally — WSL does not have the production Supabase variables; CI must validate them.
- CI browser gate: PASS on rerun — the first run had a transient news-image load failure; rerun `36307332902` passed all browser gates.
- Production deploy: PASS — workflow run `36307332902`, deployment `6690199428`, status `success`.
- Production readback: PASS — `https://mearrow.com/en/news/bighit-15-city-audition` returned 200; live image hashes match the final assets and both official captions render.

## Files

- `src/content/news/en/bighit-15-city-audition.md`
- `public/images/news/bighit-15-city-audition-thumbnail.webp`
- `public/images/news/bighit-15-city-audition-1.webp`
- `runtime/kcl-news-bighit-15-city-audition-image-sources.json`
- `runtime/kcl-news-bighit-15-city-audition-evidence.json`
- generated `public/api/news.json`
- generated `src/generated/news-meta.json`

## Rights note

The user explicitly requested official images like the Short. This run records the official source and does not represent the assets as separately licensed for republication. If permission is later denied, remove or replace these two assets rather than silently retaining them.

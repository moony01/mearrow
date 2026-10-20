# MEARROW News Automation — katseye-gabriela-billion-streams

- Run: 20261020T034306Z
- Started: 2026-10-20T03:45:02.019Z
- Updated: 2026-10-20T04:56:26Z
- Status: IN_PROGRESS — the current user request authorizes PR #101 merge and production deployment; GSC remains NOT_RUN.
- Topic: KATSEYE’s “Gabriela” reaches 1 billion Spotify streams and enters the group’s first Billions Club.
- Proposed title: KATSEYE’s ‘Gabriela’ Becomes Its First Spotify Billions Club Entry
- Category: Artist
- Authorization: current user request authorizes merge of PR #101 and production deployment for this article only. GSC indexing is outside this request and remains NOT_RUN.

## Gate log

| Gate | Status | Evidence |
|---|---|---|
| Full-content dedupe | PASS | 207 English markdown files (201 active, 6 drafts); live API HTTP 200 with 201 public items. No same-slug or semantic duplicate. |
| Research | PASS | 8 source URLs; 5 official/major trusted sources. Two independent media sources corroborate the milestone/date; official channels confirm release date; Spotify playlist readback lists “Gabriela” under KATSEYE. |
| Content | PASS | Four claim groups, all cross-checked (4/4, 100%); no unsupported interpretation; 186-word concise brief with 2 images and an internal link. |
| Image source/provenance | PASS | Two CC BY 4.0 originals, visual review, source/final hashes and public copies match. |
| Local render | PASS | Local page, content API, listing API, source images, and optimizer output returned expected 200 responses; canonical matched. |
| Browser QA | PASS | Fresh test-only Playwright recheck passed after URL encoding. Both rendered Commons hrefs preserve the complete `%28...%29.jpg` URLs and resolve HTTP 200; article/list APIs and canonical match. See the recheck report and screenshot. |
| Commit / push | PASS | Fix commit `60a2985d351579ee53fb1f74261df2d4f6eeaea4` pushed to the same feature branch and PR #101. |
| PR checks / merge | PASS / AUTHORIZED | Run [39368425778](https://github.com/moony01/mearrow/actions/runs/39368425778) passed on fix SHA `60a2985`. The current request now authorizes PR #101 merge; final evidence commit checks must pass before merging. |
| Production deploy | AUTHORIZED / NOT_RUN | The repository deploys from `main` after merge; exact production SHA and article URL must be verified. |
| GSC | NOT_RUN | Not authorized by the current request; no indexing request will be sent. |

## Research facts

| Claim | Result | Evidence |
|---|---|---|
| “Gabriela” crossed one billion Spotify streams on Oct. 16, 2026. | PASS | The Korea Times; Billboard Brasil. |
| First KATSEYE song to enter the Spotify Billions Club. | PASS | The Korea Times; Billboard Brasil; Spotify official playlist readback. |
| Released June 20, 2025. | PASS | KATSEYE Weverse notice; Universal Music Canada; Billboard Brasil. |

## Image provenance

- Thumbnail and body: David Lee, CC BY 4.0, Wikimedia Commons.
- Source dimensions: 3608×2030; 3412×2275.
- Original binaries and WebP staging outputs: .resource/originals and .resource.
- Full hashes and source pages: runtime/mearrow-news-katseye-gabriela-billion-streams-image-sources.json.
- Rejected image candidates: 1 (official image below resolution threshold).

## Artifacts

- State: runtime/mearrow-news-katseye-gabriela-billion-streams.state.json
- Evidence: runtime/mearrow-news-katseye-gabriela-billion-streams-evidence.json
- Dedupe: runtime/mearrow-news-topic-dedupe-20261020T034306Z.json
- Image sources: runtime/mearrow-news-katseye-gabriela-billion-streams-image-sources.json


## Content and fact-check

Title: KATSEYE’s ‘Gabriela’ Becomes Its First Spotify Billions Club Entry

All four factual claim groups passed cross-checks. The 186-word length is intentionally concise because the user restricted the story to three verified facts; no extra context was padded in.

- Fact-check: runtime/mearrow-news-katseye-gabriela-billion-streams-factcheck.md


## Static validation

- `pnpm lint`: PASS, 0 errors and 31 existing warnings.
- `pnpm test --run`: PASS, 49 files / 207 tests.
- `pnpm workers:build`: PASS, exit 0; existing Sass/punycode warnings and one non-fatal `ENVIRONMENT_FALLBACK` log.
- `pnpm check:deploy-env`: PASS after loading `.env.local` into the process using the verified Vault fix; no secret values recorded.
- Source URL fix regression: `pnpm test --run src/lib/news-quality.test.ts` PASS (1 file / 5 tests); its pretest regenerated metadata for 208 files / 202 public records. `git diff --cached --check` PASS.
- Worker build regenerated the Workers-only runtime loader and removed `.next` while the old dev server was active. The stale process produced Turbopack cache errors and a 404. Restarted via standard `pnpm dev` (predev restored the local loader); fresh route returned 200. Full retry detail is in the evidence JSON.

## Final image placement

- Public image copies match staged WebP SHA-256 and dimensions.
- active: true set only after content, rights, and source attribution gates passed.
- Local render: PASS. Orca and formal Playwright detail/list navigation, verified facts, both image credits, API readback, canonical, zero console errors, and responsive checks: PASS.
- Playwright: 390×844 and 344×780 had no overflow; accessibility snapshot basics passed. The 52 accumulated warnings were mostly MetaMask extension messages, plus AdSense/preload warnings. Four automatic view-count RPCs returned HTTP 204.
- Local evidence: runtime/mearrow-news-katseye-gabriela-billion-streams-evidence.json; screenshots: runtime/mearrow-news-katseye-gabriela-billion-streams-orca-detail.png and runtime/mearrow-news-katseye-gabriela-billion-streams-playwright.png; detailed QA: runtime/mearrow-news-katseye-gabriela-billion-streams-playwright-report.md.

## Git staging checks

- The first `git add` emitted the known `.gitignore` warning for tracked `src/generated/news-meta.json`; the matched Vault issue was followed and the cached-name list confirmed the metadata file and intended article files are staged.
- The first cached diff check caught two trailing spaces in the QA report. They were removed and the refreshed staged diff check passed.

## Commit and PR

- Original article commit: `f52ac546006cb8b2fa6b2d7d7a8bec7bb9bd62c5`
- URL fix commit: `60a2985d351579ee53fb1f74261df2d4f6eeaea4` (`fix(mearrow): preserve Wikimedia Commons source URLs`)
- Branch: `feat/katseye-gabriela-billion-streams-20261020` (pushed; remote head matches fix SHA)
- PR: https://github.com/moony01/mearrow/pull/101 (OPEN; not merged or closed)
- Read-only checks: run [39368425778](https://github.com/moony01/mearrow/actions/runs/39368425778) passed on the fix SHA. `Validate Workers build` passed all steps; `Deploy production Worker` was skipped.

## Wikimedia Commons source URL correction and fresh QA

- The Markdown source extractor uses `https?:\/\/[^\s)]+`; literal closing parentheses in Wikimedia file paths ended extraction before the image ID suffix and `.jpg` extension. The article links now encode those parentheses as `%28` and `%29`; the metadata generator remains unchanged. A regression test covers the encoded form.
- `pnpm generate:content` passed. `jq` exact-match assertions passed for both URLs in `src/generated/news-meta.json`, local `GET /api/news.json`, and local `GET /api/news-content/en/katseye-gabriela-billion-streams.json`. Both Commons pages returned HTTP 200 after redirects.
- Fresh test-only verifier `/root/playwright_news_verifier`: UI PASS and integration PASS. Rendered anchors, API readbacks, story title/date/facts, images and canonical matched. Responsive overflow and accessibility basics passed; console had 0 errors and 61 accumulated warnings. Four expected view-count RPCs returned HTTP 204; no other data mutations were performed.
- Exact links:
  - `https://commons.wikimedia.org/wiki/File:Katseye_in_Seattle_-_KATSEYE_%2854976227894%29.jpg`
  - `https://commons.wikimedia.org/wiki/File:Katseye_in_Seattle_-_KATSEYE_%2854975981191%29.jpg`
- Fresh browser evidence: `runtime/mearrow-news-katseye-gabriela-billion-streams-playwright-recheck-report.md` and `runtime/mearrow-news-katseye-gabriela-billion-streams-playwright-recheck.png` (1433×4236).
- Fix commit/push and fresh PR validation passed. PR #101 stays open. The run’s production deploy job was skipped; no production deployment or GSC request was made. Merge, production deployment, and GSC indexing remain NOT_RUN under the current instruction. The local state/evidence/report now pause at `PRE_MERGE_GATE`.

## Merge and deployment authorization

- Final PR head: `60a2985d351579ee53fb1f74261df2d4f6eeaea4`; remote branch and local HEAD matched when checked.
- PR #101 was `OPEN`; `mergedAt` and `closedAt` were null.
- `gh pr diff 101 --name-only` read back the expected article, generated metadata, API, regression test, and evidence files; the full file list is recorded under `prReadback.changedFiles` in the evidence JSON.
- Checks: `Validate Workers build` PASS; production deploy job SKIPPED.
- At the time of this report update, merge and production deployment are authorized but not yet executed; GSC remains NOT_RUN. Final PR checks must pass before merge, followed by production SHA and browser verification.

## Current request scope

- Explicitly authorized: merge PR #101 and deploy this one MEARROW article through the repository production workflow.
- GSC indexing remains `NOT_RUN` because the current request authorizes deployment only.

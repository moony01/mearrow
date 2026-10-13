# MEARROW News Run — kpop-group-survival-study

- Status: INCOMPLETE (feature branch pushed and remote validation passed; production deployment and GSC await PR/CI/main release)
- Topic: 2026 census of 1,182 K-pop groups; average activity period 4.12 years and 55.03% activity at year three.
- Selected headline: 45% of K-Pop Groups Aren't Active After Year Three — The 1,182-Group Reality Check
- Canonical target: https://mearrow.com/studio/news/kpop-group-survival-study
- Authorization: user requested this MEARROW automation, selected candidate 3, and directed that the skill automate publication and indexing for one post. Recorded scope is one post only.

## Gates

| Gate | Result | Evidence |
|---|---|---|
| Whole-corpus topic dedupe | PASS | 204 published + 1 draft compared; candidate 3 distinct from trainee/contract/training coverage. |
| Research | PASS | 8 research URLs, including KCI, Newsis, Asiae, Edaily, official law/ministry documents. Coverage is multiple reporting of one study, not independent replications. |
| Content | PASS | 1305 words; 6 H2; 6 H3; 9 external links; 2 internal news links; excerpt 133/150 characters. |
| Image rights and attribution | PASS | Two Commons originals with explicit CC BY-SA 4.0 and CC BY 2.0; captions identify authors, licenses, and transformations. Images are disclosed as illustrative. |
| Local render | PASS | Feature-branch article is active for preview; route, both APIs, and both public WebP assets return HTTP 200 in Next dev and Workers preview. |
| Browser UI/integration | PASS | Fresh-03 Playwright verification on the Workers preview passed both gates: exact route, metadata, both images, navigation/back, three viewport widths, public index and content readback; zero page errors, console errors, or first-party request failures. |
| Feature branch / remote CI | PASS | Commit `b6a0157` pushed to `origin/task/mearrow-news-survival-20261013`; GitHub validation run [38361820491](https://github.com/moony01/mearrow/actions/runs/38361820491) passed environment, lint, unit, browser smoke, Workers build, and SSR regression checks. |
| Production deploy / GSC | PENDING | Production article returned HTTP 404 at the prior check. The production job requires `main`; the `workers-production` required-reviewer rule was removed at 2026-10-13 08:07 UTC at the user's direction, with other protection rules and secrets untouched. Create the PR, pass required CI, merge through the standard path, then verify production SHA and canonical URL before GSC. |

## Image artifacts

- Thumbnail: public/images/news/kpop-group-survival-study-thumbnail.webp (2489×1400, 319150 bytes, SHA-256 7bcbeca72735b3cd372db25a2ddab1e210ea72f4664d87c40a2e02dff7a1698f)
- Body: public/images/news/kpop-group-survival-study-1.webp (6048×3402, 521696 bytes, SHA-256 cff0ecb6c9119b7baf7364245ee39049f4d387262ea9f6809406d23edca75b5e)
- Provenance: runtime/mearrow-news-kpop-group-survival-study-image-sources.json
- Rejected image: dance-rehearsal.jpg; unrelated outdoor practice with hand fans.

## Sources and limitation

Primary record: KCI article page. Cross-checks: Newsis, The Asia Business Daily, and Edaily. The Korean original linked from Seoul Economic Daily returned 403 Forbidden; that outlet was not needed for verification, and the error is recorded in the Vault issue note.

The separate development-server Playwright run recorded one Next HMR websocket error after history return (`Page entered Back-Forward Cache`); its pageerror count and first-party request failures were zero. Fresh-03 against the local Workers preview had zero page errors, console errors, and first-party request failures. Orca's embedded browser snapshot returned `browser_tab_not_found`, so that manual check remains unverified; the issue is recorded in the Vault. See [fresh-03 report](/tmp/mearrow-news-kpop-group-survival-study-browser-20261013/fresh-03/report.md), [structured evidence](/tmp/mearrow-news-kpop-group-survival-study-browser-20261013/fresh-03/evidence.json), and [screenshots](/tmp/mearrow-news-kpop-group-survival-study-browser-20261013/fresh-03/).

## Next

Open the standard PR, wait for required CI, merge through the repository release path, and wait for the production workflow. The `workers-production` reviewer rule is removed; no other protection or CI gate was bypassed. Then verify the production SHA and canonical URL and request GSC indexing. No PR has been opened yet; no production workflow or indexing request was bypassed or simulated.

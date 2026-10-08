# MEARROW Studio Unified Hub — Product and Implementation Plan

Date: 2026-10-08
Branch: `mearrow-studio-redesign` (based on `origin/main` at `8f5724d`)

## Goal

Make `/studio` the English-only, locale-less overview of MEARROW's core services. Visitors can scan each service and continue to the relevant page from one simple landing page.

## Problem

The current Studio concept presents only the social community. It does not let visitors see MEARROW's news, auditions, fan voting, AI services, and SNS/community in one place, while News and Audition pages still live under locale-prefixed routes.

## Users and success criteria

- Primary users: all MEARROW visitors, treated equally.
- Language: English only on Studio and its News/Audition subpages.
- Success: `/studio` presents all five selected sections in the agreed order; the landing page includes live ranking data and real latest News/Audition records; visitors can reach the complete list/detail and service pages; former locale-prefixed ranking, News, and Audition URLs permanently redirect to their new canonical URL.
- Keep the presentation simple, scannable, and consistent with MEARROW branding.

## Decisions

| Area | Decision |
| --- | --- |
| Studio purpose | One place to see MEARROW's core features and services |
| Section order | Fan Vote → News → Auditions → AI Hub → SNS |
| Fan Vote | Reuse the Kpopface voting embed at `/embed/vote-board/en?surface=kpopface&ads=off`; keep the link to `/studio/ranking` |
| News preview | 6 latest posts |
| Audition preview | 6 latest-published records; include open, ongoing, closing, and closed statuses |
| AI Hub | Visual Match and Kpopface service cards |
| SNS | Short introduction and CTA to the existing community; no post feed on this section |
| Studio shell | Locale-less, English-only; no global MEARROW navigation changes are included |
| News routes | `/studio/news` and `/studio/news/{slug}` |
| Audition routes | `/studio/auditions` and `/studio/auditions/{slug}` |
| Ranking route | `/studio/ranking`; one English page with the existing ranking and voting UI |
| Legacy routes | Permanently redirect each supported `/{locale}/ranking` to `/studio/ranking`, and `/{locale}/news[/slug]` and `/{locale}/auditions[/slug]` URLs to their `/studio/...` counterpart, retaining the slug |

## Screens and route map

| Screen | Route | Purpose |
| --- | --- | --- |
| Studio landing | `/studio` | Overview and previews for all five services |
| News list | `/studio/news` | Search/browse the English News archive |
| News detail | `/studio/news/{slug}` | Read the article and use existing detail actions |
| Auditions list | `/studio/auditions` | Browse English audition records, including closed records |
| Audition detail | `/studio/auditions/{slug}` | Read the opportunity and follow its official application link |
| Fan voting | `/studio/ranking` | View current company ranking and participate in voting |
| Visual Match | Existing service destination, linked from AI Hub | Open the Visual Match service |
| Kpopface | Existing external destination, linked from AI Hub | Open Kpopface |
| SNS/community | Existing English community route, linked from Studio | View and use the community |

## Main user flow

1. A visitor opens `/studio` directly.
2. The page shows the current top 10 company ranking, six newest News items, and six newest-published Auditions.
3. The visitor selects a row/card or a section CTA.
4. Ranking, News, and Audition pages open under `/studio`; legacy locale-prefixed URLs redirect to their canonical page.
5. Voting, AI Hub, and SNS CTAs open their existing service destinations.

Browsing the Studio, News, and Audition pages is public. Voting and community actions keep the authentication and interaction rules of their destination pages.

## Data, state, and edge cases

- News and Audition records continue to use their existing content sources; they are not replaced by placeholder copy.
- The fan-vote section embeds the existing Kpopface board, so it reuses the live ranking, vote controls, and Kpopface quota policy instead of creating a second voting mechanism.
- Match Kpopface iframe behavior: start at 340px, listen only to resize messages from the same-origin frame, and clamp the height to 280–900px with 8px of bottom padding.
- News previews are sorted by publication date descending.
- Audition landing and full-list pages use English records, sort by publication date descending, and retain closed records. Cards show the source status.
- Empty News or Audition results use a clear empty state and retain navigation to the service's full list.
- If ranking data cannot be read, show a non-fabricated unavailable state and keep the ranking CTA usable.
- Unknown News/Audition slugs return the existing not-found experience.
- The landing CTA is navigation only. Voting continues on the existing vote page, including its current login/quota rules.

## SEO and navigation

- Add canonical metadata for `/studio`, `/studio/ranking`, `/studio/news`, `/studio/news/{slug}`, `/studio/auditions`, and `/studio/auditions/{slug}`.
- Remove locale alternates from these English-only pages.
- Replace locale-prefixed News/Audition sitemap entries with their Studio canonical routes.
- Add permanent redirect rules for supported legacy locale URLs, including detail slugs, for both Next runtime and static Cloudflare Pages hosting.
- Update internal links, related-item links, metadata, JSON-LD URLs, and sitemap URLs together.
- Leave the global MEARROW navigation unchanged. The current request concerns the Studio hub and its child routes.

## Design direction

- Minimal, light, editorial layout with clear section labels and compact service previews.
- Use existing MEARROW brand colors and typography; reserve the accent color for primary actions and ranking emphasis.
- Put one section title, a concise description, and its useful preview/CTA in each section.
- Avoid ornamental hero panels, decorative metrics, and duplicate cards that do not help visitors choose a service.
- Keep semantic headings, keyboard-visible focus, descriptive link text, responsive cards, and no horizontal overflow.

## Implementation sequence

1. Replace the current SNS-only Studio landing with the five agreed service sections and real previews.
2. Move News and Audition list/detail implementations into the Studio route subtree; preserve their existing reading, filtering, source, and official-application behavior where applicable.
3. Add permanent redirects for all supported legacy locale-prefixed ranking, News, and Audition URLs.
4. Update metadata, internal links, JSON-LD, and sitemap entries to the new canonical URLs.
5. Save the Genesis artifacts in the Obsidian Vault and update the canonical MEARROW project note with the new 2026-10-08 decision.
6. Run required static checks and the fresh browser UI/integration verification gate for changed routes, ranking data, redirects, responsive layout, and console/network errors.

## Acceptance checklist

- [ ] `/studio` is English-only and locale-less.
- [ ] Section order is Fan Vote, News, Auditions, AI Hub, SNS.
- [x] Fan Vote embeds `/embed/vote-board/en?surface=kpopface&ads=off`, resizes to the board content, and links to `/studio/ranking`.
- [x] `/studio/ranking` renders the existing ranking and voting UI; all supported `/{locale}/ranking` URLs permanently redirect to it.
- [x] Sitemap exposes `/studio/ranking` once and no longer publishes locale-prefixed ranking duplicates.
- [ ] News preview shows six newest real posts.
- [ ] Audition preview shows six records sorted by publication date, including closed records.
- [ ] AI Hub links to Visual Match and Kpopface.
- [ ] SNS section is an introduction plus community CTA with no post cards.
- [ ] News/Audition list and detail pages live under `/studio/...` and retain expected page actions.
- [ ] Every supported old locale News/Audition list/detail URL returns a permanent redirect to the canonical Studio route.
- [ ] Metadata, internal links, JSON-LD, and sitemap have no old News/Audition canonical paths.
- [ ] Mobile and desktop layouts have no clipping, overlap, or horizontal overflow.

## Unconfirmed items

- The user did not answer the final “missing screens” confirmation prompt; the route map above is treated as complete based on all requested features and the user's earlier answers.
- The exact Visual Match destination should be sourced from the current MEARROW service configuration before finalizing the AI Hub card URL. Do not invent a destination.
- “Top menu” means the site-wide MEARROW navigation shared by the main app. It does not mean Studio’s compact local header or the landing page’s service sections. Keep the site-wide navigation unchanged; Studio’s local header uses the MEARROW wordmark and Studio label.
- On 2026-10-08 the user specified that Fan Vote must use the same Kpopface iframe embed; the initial static Top 10 preview requirement is superseded.

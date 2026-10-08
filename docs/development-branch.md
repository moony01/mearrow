# Consolidated MEARROW development

Continue development on `mearrow-integrated`. Merge this branch into `main` after
the remaining development and release verification. Consolidation is local;
no push, pull request, production deployment, or database migration was performed.

## Included work

| Original branch | Integration decision |
| --- | --- |
| `task-mearrow-app-menu` | Base for locale-free app routes, Korean default language, and the Home/Studio menu |
| `mearrow-studio-redesign` | English Studio hub, News, Auditions, ranking, metadata, and content links |
| `moony01/mearrow-ai-visual-match-pdf` | Visual Match screens, PDF report, Toss SDK, Edge Functions, migrations, messages, and paired auth/client fixes |
| `main` / `nana-top-relationship-news` | Preserve the local published-news commit alongside the current `origin/main` history |
| `task/mearrow-studio-landing` | Earlier prototype superseded by the Studio redesign |
| `task/remove-news-auditions-vote-nav` | Earlier navigation history superseded by the Home/Studio menu |
| `task/news-url-consolidation` | No independent changes beyond its base |

Older layout, profile, and navigation implementations from the Visual Match
worktree were resolved in favor of the newer app versions. Their original
content remains recoverable through the archive tags below.

## Canonical routes

| Surface | Route |
| --- | --- |
| Community app | `/` and locale-free account/profile routes |
| English Studio | `/studio` |
| News / Auditions / ranking | `/studio/news`, `/studio/auditions`, `/studio/ranking` |
| Visual Match | `/ai/visual-match` and its survey/payment/analysis/report routes |
| Vote embeds | `/embed/vote-board` and `/embed/kpopface-vote`; optional `lang` query |

Legacy locale URLs permanently redirect to these routes. Specific Studio
redirects precede the general locale removal. OAuth return destinations and
payment callback URLs use canonical Visual Match routes.

## Recovery

Pre-integration source snapshots are retained as local annotated tags under
`archive/20261008-integration/`. The complete snapshot including staged Studio
moves is `archive/20261008-complete/mearrow-studio-redesign`.

The common Git directory's `integration-backups/20261008-consolidation/` contains
the source manifest, original indexes, binary patches, and local screenshots
excluded from product commits. Source worktrees preserve their existing dirty
files and staging; they are recovery copies once their development branches are
retired. Existing stashes are preserved.

## Follow-up development before release

- Compare the Studio implementation with its full acceptance criteria.
- Verify the Visual Match payment flow in a sandbox before a production release;
  consolidation does not execute live payments or apply migrations.
- Resolve inherited Toss webhook retry/update handling and reconcile image
  retention/disclosure with the implemented analysis flow. These were identified
  during a read-only review of the original feature worktree.

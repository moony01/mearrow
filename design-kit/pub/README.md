# Pub

Raw publishing/artboard output.

This directory is for screen originals only. Keep final composites, sales images, and platform-specific export pages in deliverable routes.

Current routes:

- `/pub/app/`
- `/pub/app/?screen=screen-1`
- `/pub/app/?screen=screen-2`
- `/pub/app/?screen=screen-3`
- `/pub/app/?screen=screen-4`
- `/pub/app/styleguide/`
- `/pub/admin/`
- `/pub/admin/styleguide/`
- `/pub/admin/pages/dashboard.html`
- `/pub/admin/pages/members.html`
- `/pub/admin/pages/content-qr.html`
- `/pub/admin/pages/notice-push.html`
- `/pub/land/`
- `/pub/land/design.md`
- `/pub/land/styleguide/`
- `/pub/land/pages/home.html`
- `/pub/land/pages/services.html`
- `/pub/land/pages/portfolio.html`
- `/pub/land/pages/notices.html`
- `/pub/land/pages/inquiry.html`

`/pub/` is a redirect-only legacy route. The visible raw layouts live under `/pub/app/`, `/pub/admin/`, and `/pub/land/`.

Surface-local styleguides should live with the raw surface when the component rules are specific to that surface. The root `/styleguide/` route is intentionally absent; use `/sitemap.html` for route proof.

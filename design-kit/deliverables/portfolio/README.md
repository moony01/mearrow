# MEARROW Portfolio Exports

The responsive web portfolio contains separate cases for MEARROW SNS and MEARROW Studio. Native-style app concepts remain raw screens under `pub/app/` and are not included in portfolio exports.

## Export canvas sizes

- Main thumbnails: 1200 × 1200
- Detail boards: 1200 × 2100
- Web screen pages: 1200 × 867
- App screen pages: not exported

Generate/update the static web wrappers with `npm run generate:portfolio`, then export PNGs with `npm run export:portfolio`. The export writes to `screenshots/deliverables/portfolio/web/`.

Web boards show the same responsive source at desktop, tablet, and mobile sizes. App screens are concepts because the MEARROW repository has no native app implementation; they remain available as raw screens but are not portfolio deliverables.

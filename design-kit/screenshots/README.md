# MEARROW Screenshot Evidence and Portfolio Exports

## Responsive web portfolio exports

The export script writes deterministic PNG canvases under `screenshots/deliverables/portfolio/web/`:

- web/mearrow-sns-main-thumbnail.png and web/mearrow-sns-detail-page.png
- web/mearrow-studio-main-thumbnail.png and web/mearrow-studio-detail-page.png
- One 1200 × 867 web page PNG for every listed web screen.
- App concepts under `pub/app/` are not included in portfolio PNG exports.

Run `npm run generate:portfolio` to rebuild the responsive web wrappers and `npm run export:portfolio` to capture all web portfolio images. Use `npm run export:web` for the same web-only capture.

All screenshots are generated from local static HTML/CSS and local assets. They do not use product APIs or live account data.

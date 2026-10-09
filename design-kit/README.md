# MEARROW Design Kit

This product-local design kit records four separate MEARROW design tracks:

1. MEARROW SNS responsive web
2. MEARROW SNS native-style app concept
3. MEARROW Studio responsive web
4. MEARROW Studio native-style app concept

The app concepts remain available as raw screens under `pub/app/`. Portfolio wrappers and PNG exports are limited to the responsive web experiences.

## Start

Run the static kit server:

    npm run design

Open the root index, then follow the product and surface links. To rebuild the wrapper pages and export portfolio PNGs:

    npm run extract:product   # with MEARROW running at localhost:3000
    npm run generate:portfolio
    npm run export:portfolio

`extract:product` transfers server-rendered HTML and the matching compiled stylesheets from `/` and `/studio`, then copies referenced assets locally. It removes runtime scripts and replaces private SNS feed records with safe sample data while preserving the product markup and styling. Set `MEARROW_SOURCE_ORIGIN` to use a different local source server. The export command launches a local static server and captures fixed-size canvases through Chrome DevTools Protocol; Chrome or Chromium must be installed.

## Source map

- DESIGN.md: shared MEARROW tokens and surface rules
- projects/mearrow-sns/DESIGN.md: SNS-specific visual direction and source scope
- projects/mearrow-studio/DESIGN.md: Studio-specific visual direction and source scope
- pub/admin/mearrow-sns/: SNS responsive web raw screens
- pub/admin/mearrow-studio/: Studio responsive web raw screens
- pub/app/mearrow-sns/: SNS app concept screens
- pub/app/mearrow-studio/: Studio app concept screens
- deliverables/portfolio/web/: responsive-web thumbnail, detail, and screen-page wrappers
- screenshots/deliverables/portfolio/web/: final responsive-web PNG exports

## Source boundary

The web screens are static visual transfers derived from existing MEARROW product code, styles, and local public assets. This repository has no native app source, so the app screens are concepts based on the current product capabilities. They remain raw internal screens and are not exported as a portfolio package. They do not implement authentication, voting, comments, applications, APIs, analytics, or database access.

The kit lives at the repository root under design-kit/ and is excluded from website deployment output. Exporting images does not publish or register them on an external portfolio.

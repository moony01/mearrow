# MEARROW Design Source

This document is the source of truth for the four design-kit tracks: MEARROW SNS web, MEARROW SNS app, MEARROW Studio web, and MEARROW Studio app.

## Product scope

- MEARROW SNS helps K-pop fans discover community posts, follow creators, and participate in fan voting.
- MEARROW Studio brings editorial news, audition opportunities, fan voting, and MEARROW services together.
- The two web surfaces are responsive browser experiences. Mobile web remains part of web and is not the app surface.
- The two app surfaces are separate native-style concepts with their own navigation and screen flows. MEARROW currently has no native app implementation in this repository; app screens here are concept designs based on existing product capabilities.

## Shared brand system

- The existing web source uses primary blue #315CFF, hover blue #2549D8, signal lime #C7FF32, ink #10131C, light canvas #F5F7FF, and white surfaces.
- Shared page typography uses the locally bundled Inter and Montserrat fonts. Source stylesheets and fonts are copied into the raw web pages.
- Preserve each product component's own spacing, corner radii, color use, and breakpoints. The kit does not add a new global layout or spacing system over the transferred pages.

## Responsive web

- Keep one source-faithful web page per product, including its existing responsive CSS. Review at 1440, 1024, 768, 390, and 344px widths without replacing the source breakpoints.
- MEARROW SNS web is a media-first feed with the source navigation and social action rail.
- MEARROW Studio web is an editorial page with the source banner, fan-vote ranking, news, audition, and service sections.

## Native-style app surfaces

- Keep app navigation independent from responsive web. Use a 390 x 844 reference frame, safe-area-aware status/header/footer spacing, and a fixed bottom tab bar.
- Use 44px minimum touch targets and concise labels.
- SNS app flow: community feed, fan vote, member profile.
- Studio app flow: discovery, editorial story, audition opportunity, fan vote.
- On wider tablet previews, keep a centered app canvas or use a tablet-specific rail only when the screen composition changes.
- All app examples use stable sample data and have no authentication, network, vote, comment, or submission behavior.

## Portfolio output

- Raw designs live under pub/admin/mearrow-sns, pub/admin/mearrow-studio, pub/app/mearrow-sns, and pub/app/mearrow-studio.
- Product-specific rationale lives under projects/mearrow-sns and projects/mearrow-studio.
- Portfolio wrappers reference raw pages through iframes; they do not duplicate raw UI.
- Web portfolio thumbnails follow the Jeonbuk Youth Village device-frame style: a centered display headline above a physical desktop monitor with overlapping tablet and phone frames. Each iframe displays the actual raw product page at its responsive width.
- Web detail boards follow the same reference frame system: brand lockup, large two-line lead, three metadata rows, then one desktop monitor with overlapping tablet and phone device frames. Each device iframe displays the same raw web page at its corresponding responsive width. Keep the original device proportions, overlap, orbit line decoration, feature list, and footer rhythm while using MEARROW copy and blue accents.
- App boards show app-only screen flows.
- Export canvases are deterministic and fixed at 1200 x 1200 for thumbnails, 1200 x 2100 for detail boards, 1200 x 867 for web screen pages, and 1200 x 1580 for app screen pages.
- No portfolio page calls product APIs, reads private user content, or requires login.

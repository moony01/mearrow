# MEARROW Design Kit Direction

This installation records the MEARROW SNS and MEARROW Studio visual systems inside the product repository without changing product runtime behavior.

## Source strategy

- Existing web UI uses the server-rendered HTML and matching compiled stylesheets from the MEARROW source routes. Referenced product assets are copied locally; private feed records are replaced with safe sample values. No hand-redesigned layout is layered over the source.
- App screens are new design concepts because this repository has no native mobile application implementation. Their scope is limited to existing MEARROW capabilities and information architecture.
- Product features are presented as static visual samples. No backend, account, vote, comment, payment, tracking, or submission behavior is included.

## Product and surface tracks

| Product | Web | App |
| --- | --- | --- |
| MEARROW SNS | Responsive media-first community feed | Feed, fan vote, profile |
| MEARROW Studio | Responsive editorial landing and discovery | Discovery, news story, audition |

## Delivery boundary

- The kit lives in design-kit/ and is not part of the deployed website output.
- Raw screens remain separate from portfolio composites.
- Exported images are local review assets. Publishing or adding a case to a public portfolio requires a separate request.

# MEARROW — K-pop Talent Network

> Content becomes opportunity. A K-pop talent network with community voting, news, and multilingual support.

[![Live](https://img.shields.io/badge/Live-mearrow.com-blue)](https://mearrow.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Cloudflare Workers](https://img.shields.io/badge/Hosted%20on-Cloudflare%20Workers-F38020.svg?logo=cloudflare)](https://mearrow.com/)

🌐 **Live**: https://mearrow.com

---

## About

MEARROW is a K-pop talent network where content, community, and opportunity connect. Its initial community layer includes fan-driven company rankings: users vote each month to determine which companies lead the 1st and 2nd divisions of the league. At the end of each season, promotion and relegation are applied automatically, and a Hall of Fame records each month's champion.

## Features

- **Company Rankings** — Real-time league standings across 1st and 2nd divisions
- **Season League** — Monthly season cycle with promotion/relegation between divisions
- **Firepower Voting** — Community votes drive company rankings each season
- **Hall of Fame** — Monthly champions recorded permanently
- **Multilingual** — 7 languages: Korean, English, Japanese, Chinese, Spanish, French, German
- **PWA** — Installable as a Progressive Web App
- **SEO Optimized** — Static export with full sitemap, Open Graph, and structured data

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router, OpenNext) |
| **Database** | Supabase (PostgreSQL) |
| **Hosting** | Cloudflare Workers |
| **i18n** | next-intl (7 languages) |
| **Styling** | SCSS Modules |
| **Animation** | Framer Motion |
| **Charts** | Recharts |
| **Forms** | React Hook Form + Zod |
| **PWA** | Web Manifest |

## Local Development

### Prerequisites

- Node.js 20+
- pnpm 10+

### Setup

```bash
git clone https://github.com/moony01/mearrow.git
cd mearrow

pnpm install
```

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build

```bash
pnpm build
```

The production Worker bundle is generated in `.open-next/`.

## Project Structure

```
mearrow/
├── src/
│   ├── app/
│   │   ├── [locale]/        # Localized routes (7 languages)
│   │   │   ├── company/     # Company detail pages
│   │   │   ├── hall-of-fame/# Season champions
│   │   │   ├── news/        # K-Pop news
│   │   │   ├── community/   # Community board
│   │   │   └── ...
│   ├── components/          # Shared UI components
│   ├── config/              # Feature flags
│   ├── i18n/                # next-intl configuration
│   ├── messages/            # Translation files (ko, en, ja, zh, es, fr, de)
│   ├── lib/                 # Supabase client, utilities
│   └── types/               # TypeScript type definitions
├── public/                  # Static assets
├── supabase/                # DB migrations and functions
└── .github/workflows/       # Automated monthly season settlement
```

## Deployment

MEARROW is deployed as a Cloudflare Worker using OpenNext. Production deployment
is browser-gated and runs through GitHub Actions. Never deploy from a shell that
does not have the public Supabase variables loaded; the client would render the
site shell but could not load live data.

```bash
pnpm check:deploy-env
DEPLOY_BROWSER_PATH=/path/to/chrome pnpm test:browser:deploy
pnpm workers:build
```

`test:browser:deploy` starts the development server, checks that live Supabase
data renders company cards, verifies a news image is WebP-backed, checks an
English news detail through the locale fallback, and visits every localized
audition detail. A failed browser gate blocks the production deployment. The
GitHub Actions workflow
`.github/workflows/deploy-workers.yml` runs the same gate before a Workers
production deployment. A push or merge to `main` starts the production job
automatically after validation. The job uses the `workers-production`
Environment, so its required-reviewer approval gate can pause deployment
before the Worker is released. A manual production run remains available from
the `main` branch when needed.

The `.github/workflows/mearrow-league-promotion.yml` workflow runs on the 1st of every month (UTC 00:00) to:
1. Snapshot season rankings
2. Record the monthly champion
3. Execute league promotion + reset firepower

## License

[MIT](LICENSE) — Copyright (c) 2026 moony01

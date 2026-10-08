import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// OpenNext invokes the app's build script. The image optimizer and sitemap
// stylesheet injection are Pages-only post-processing steps and expect `out/`.
if (process.env.NEXT_RUNTIME_TARGET === 'workers') {
  process.exit(0);
}

const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

const optimize = spawnSync(pnpm, ['exec', 'next-image-export-optimizer'], {
  stdio: 'inherit',
});

if (optimize.status !== 0) {
  process.exit(optimize.status ?? 1);
}

const sitemap = spawnSync(pnpm, ['exec', 'node', 'scripts/inject-sitemap-style.js'], {
  stdio: 'inherit',
});

if (sitemap.status !== 0) {
  process.exit(sitemap.status ?? 1);
}

// Pages serves arbitrary public profiles through the concrete static shell.
// Keep these rules out of `public/_redirects` so the Workers asset resolver
// does not intercept requests before OpenNext can render the dynamic route.
const redirectsPath = resolve('out/_redirects');
const profileRedirects = [
  '/ko/profile/* /ko/profile/__profile.html 200',
  '/en/profile/* /en/profile/__profile.html 200',
  '/ja/profile/* /ja/profile/__profile.html 200',
  '/zh/profile/* /zh/profile/__profile.html 200',
  '/es/profile/* /es/profile/__profile.html 200',
  '/fr/profile/* /fr/profile/__profile.html 200',
  '/de/profile/* /de/profile/__profile.html 200',
].join('\n');

if (existsSync(redirectsPath)) {
  const currentRedirects = readFileSync(redirectsPath, 'utf8');
  if (!currentRedirects.includes('/ko/profile/*')) {
    appendFileSync(redirectsPath, `\n${profileRedirects}\n`);
  }
}

#!/usr/bin/env node

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

// Exercise the production bundle with configured anonymous reads. A dev server
// or a bundle without Supabase variables cannot expose static-to-dynamic errors.
assert.ok(process.env.NEXT_PUBLIC_SUPABASE_URL, 'Public Supabase URL is required at build/test time');
assert.ok(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'Public Supabase key is required at build/test time');
const require = createRequire(import.meta.url);
const { Miniflare, convertV4MiniflareOptions } = require(require.resolve('miniflare', {
  paths: [require.resolve('wrangler/package.json')],
}));
// Keep module names within the project root for workerd's virtual filesystem.
const directory = await mkdtemp(resolve('.open-next/profile-smoke-'));
const userId = '11111111-1111-4111-8111-111111111111';
const biography = 'Public SSR fixture biography';
const caption = 'Public SSR fixture performance';
const activityTitle = 'Public SSR fixture activity';
const canary = 'PRIVATE_CANARY_MUST_NOT_RENDER';
const reads = [];
const previewPort = process.env.PROFILE_WORKER_GATE_PORT;
let mf;

try {
  const bundle = spawnSync(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', [
    'exec', 'wrangler', 'deploy', '--dry-run', '--env', 'production', '--outdir', directory,
  ], { encoding: 'utf8', timeout: 180_000 });
  assert.equal(bundle.status, 0, 'Production Worker dry-run must succeed');

  mf = new Miniflare(convertV4MiniflareOptions({
    cf: false,
    ...(previewPort ? { host: '0.0.0.0', port: Number(previewPort) } : {}),
    workers: [{
      name: 'mearrow-profile-regression',
      modules: true,
      scriptPath: join(directory, 'worker.js'),
      compatibilityDate: '2026-08-21',
      compatibilityFlags: ['nodejs_compat'],
      assets: {
        directory: resolve('.open-next/assets'),
        binding: 'ASSETS',
        run_worker_first: true,
        routerConfig: { has_user_worker: true },
      },
      // Intercept every outbound request: CI uses public build variables, but
      // this test never calls production Supabase or any other external host.
      outboundService: async (request) => {
        const url = new URL(request.url);
        assert.equal(request.method, 'GET', 'SSR must only perform public GET reads');
        reads.push({ path: url.pathname, filters: Object.fromEntries(url.searchParams) });
        let body;
        if (url.pathname === '/rest/v1/user_profiles') {
          body = url.searchParams.get('username') === 'eq.ssr-fixture'
            ? { id: userId, username: 'ssr-fixture', avatar_url: null, bio: biography }
            : null;
        } else if (url.pathname === '/rest/v1/profile_posts') {
          const isPublic = url.searchParams.get('user_id') === `eq.${userId}` &&
            url.searchParams.get('status') === 'eq.published' &&
            url.searchParams.get('is_public') === 'eq.true';
          body = [{
            id: '22222222-2222-4222-8222-222222222222', user_id: userId,
            media_type: 'image', storage_path: 'fixture/public.svg',
            caption: isPublic ? caption : canary, created_at: '2026-10-01T12:00:00Z',
          }];
        } else if (url.pathname === '/rest/v1/profile_activities') {
          const isPublic = url.searchParams.get('user_id') === `eq.${userId}` &&
            url.searchParams.get('is_public') === 'eq.true';
          body = [{
            id: '33333333-3333-4333-8333-333333333333', user_id: userId,
            title: isPublic ? activityTitle : canary, organization: 'Fixture studio',
            start_date: '2026-10-01', end_date: null, is_current: true,
            category: 'other', description: 'Public activity detail', is_public: true,
            created_at: '2026-10-01T12:00:00Z', updated_at: '2026-10-01T12:00:00Z',
          }];
        } else {
          throw new Error('Unexpected outbound request in profile SSR regression test');
        }
        return Response.json(body);
      },
    }],
  }));

  for (const locale of ['en', 'ko']) {
    const response = await mf.dispatchFetch(`https://mearrow.com/${locale}/profile/ssr-fixture`);
    const html = await response.text();
    assert.equal(response.status, 200, `${locale} profile must not return a production 500`);
    for (const value of [biography, caption, activityTitle]) {
      assert.ok(html.includes(value), `${locale} first HTML must include public profile content`);
    }
    assert.ok(!html.includes(canary), 'Private fixture content must never be serialized');
    assert.ok(html.includes('noindex'), 'Existing public-profile indexing policy must remain');
    const missing = await mf.dispatchFetch(`https://mearrow.com/${locale}/profile/missing-fixture`);
    assert.equal(missing.status, 404, 'Confirmed missing profiles must return 404');
  }
  assert.ok(reads.some((r) => r.path === '/rest/v1/profile_posts' && r.filters.limit === '12'));
  assert.ok(reads.some((r) => r.path === '/rest/v1/profile_activities' && r.filters.limit === '20'));
  console.log('Production Worker public-profile regression PASS: EN/KO SSR, missing 404, public filters; external requests intercepted.');
  if (previewPort) {
    await mf.ready;
    console.log(`Verified production bundle available for browser gate on port ${previewPort}`);
    await new Promise((done) => {
      process.once('SIGINT', done);
      process.once('SIGTERM', done);
    });
  }
} finally {
  await mf?.dispose();
  await rm(directory, { recursive: true, force: true });
}

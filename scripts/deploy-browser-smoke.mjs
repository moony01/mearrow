#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright-core';
import { runAuditionBrowserSmoke } from './auditions-browser-smoke.mjs';

const DEFAULT_PORT = process.env.DEPLOY_BROWSER_PORT || '3119';
const DEFAULT_BASE_URL = `http://127.0.0.1:${DEFAULT_PORT}`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function getBrowserExecutablePath() {
  const candidates = [
    process.env.DEPLOY_BROWSER_PATH,
    process.env.CHROME_BIN,
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);

  return candidates.find((candidate) => existsSync(candidate)) || null;
}

function describeError(error) {
  return error instanceof Error ? error.message : String(error);
}

function isThirdPartySmokeRequest(url) {
  return /^(?:https?:)?\/\/(?:pagead2\.googlesyndication\.com|googleads\.g\.doubleclick\.net|www\.google-analytics\.com|www\.googletagmanager\.com|unpkg\.com\/react-grab\/)/i.test(
    url,
  );
}

function isReactGrabRequest(url) {
  return /^(?:https?:)?\/\/unpkg\.com\/react-grab\/dist\/index\.global\.js(?:\?|$)/i.test(url);
}

async function assertSeoEndpoints(baseUrl) {
  const canonicalSiteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://mearrow.com').replace(
    /\/+$/,
    '',
  );
  const [robotsResponse, sitemapResponse] = await Promise.all([
    fetch(`${baseUrl}/robots.txt`),
    fetch(`${baseUrl}/sitemap.xml`),
  ]);
  const robotsText = await robotsResponse.text();
  const sitemapText = await sitemapResponse.text();

  assert(robotsResponse.status < 500, `robots.txt returned HTTP ${robotsResponse.status}`);
  assert(sitemapResponse.status < 500, `sitemap.xml returned HTTP ${sitemapResponse.status}`);
  assert(
    robotsText.includes(`Sitemap: ${canonicalSiteUrl}/sitemap.xml`),
    `robots.txt does not point to ${canonicalSiteUrl}/sitemap.xml`,
  );
  assert(
    sitemapText.includes(`<loc>${canonicalSiteUrl}/`),
    `sitemap.xml does not contain ${canonicalSiteUrl} URLs`,
  );
  assert(!/https?:\/\/(?:www\.)?kclhq\.com/i.test(`${robotsText}\n${sitemapText}`),
    'robots.txt or sitemap.xml still contains the legacy kclhq.com host');

  return {
    canonicalSiteUrl,
    robotsStatus: robotsResponse.status,
    sitemapStatus: sitemapResponse.status,
  };
}

async function waitForServer(baseUrl, child) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Next dev server exited before readiness (code ${child.exitCode}).`);
    }

    try {
      const response = await fetch(`${baseUrl}/ko?deploy-browser-smoke=ready`);
      if (response.status < 500) return;
    } catch {
      // Keep polling until the dev server is ready.
    }

    await delay(250);
  }

  throw new Error('Next dev server was not ready after 120 seconds.');
}

function stopServer(child) {
  if (!child || child.exitCode !== null) return;
  try {
    if (process.platform !== 'win32' && child.pid) {
      process.kill(-child.pid, 'SIGTERM');
    } else {
      child.kill('SIGTERM');
    }
  } catch {
    // The process may exit between the check and the signal.
  }
}

async function startServer() {
  const configuredBaseUrl = process.env.DEPLOY_BROWSER_BASE_URL;
  if (configuredBaseUrl) {
    return { baseUrl: configuredBaseUrl.replace(/\/+$/, ''), child: null };
  }

  const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  const child = spawn(command, ['dev', '--hostname', '127.0.0.1', '--port', DEFAULT_PORT], {
    cwd: process.cwd(),
    env: process.env,
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (chunk) => process.stdout.write(`[dev] ${chunk}`));
  child.stderr.on('data', (chunk) => process.stderr.write(`[dev] ${chunk}`));

  const baseUrl = DEFAULT_BASE_URL;
  try {
    await waitForServer(baseUrl, child);
  } catch (error) {
    stopServer(child);
    throw error;
  }
  return { baseUrl, child };
}

function isIgnorableConsoleError(message) {
  const text = message.text();
  const sourceUrl = message.location().url;
  return (
    // External documents such as Google's consent/auth frames can publish a
    // report-only frame-ancestors policy. The browser logs that warning while
    // embedding the document, but it is not an application runtime failure.
    (text.includes('violates the following report-only Content Security Policy directive') &&
      text.includes('frame-ancestors')) ||
    text.includes('AdSense head tag') ||
    text.includes('googlesyndication.com') ||
    text.includes('google-analytics.com') ||
    // React Grab is dev-only; its unpkg script can emit a CORS error in CI.
    (text.includes('unpkg.com/react-grab/dist/index.global.js') &&
      text.includes('CORS policy')) ||
    text.includes('Failed to load resource:') ||
    isThirdPartySmokeRequest(sourceUrl)
  );
}

async function main() {
  const browserPath = getBrowserExecutablePath();
  if (!browserPath) {
    throw new Error(
      'No Chromium executable found. Set DEPLOY_BROWSER_PATH to a Chromium/Chrome executable.',
    );
  }

  const server = await startServer();
  let browser;
  try {
    browser = await chromium.launch({
      executablePath: browserPath,
      headless: process.env.DEPLOY_BROWSER_HEADLESS !== 'false',
      args: process.platform === 'linux' ? ['--no-sandbox'] : [],
    });

    const page = await browser.newPage({ locale: 'ko-KR', viewport: { width: 1440, height: 1000 } });
    const supabaseResponses = [];
    const appConsoleErrors = [];
    const appPageErrors = [];

    await page.addInitScript(() => {
      try {
        localStorage.setItem(
          'kcl-daily-vote-modal-dismissed-date',
          new Date().toISOString().slice(0, 10),
        );
      } catch {
        // The optional daily vote modal must not affect deployment smoke.
      }
    });

    // Next's dev bootstrap logs the raw onerror Event when this optional
    // React Grab script is unavailable. Fulfill it with an empty script so
    // that a third-party dev aid cannot fail the application smoke test.
    await page.route('**/*', (route) => {
      if (isReactGrabRequest(route.request().url())) {
        return route.fulfill({
          status: 200,
          contentType: 'application/javascript',
          body: '',
        });
      }
      return route.continue();
    });

    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('/rest/v1/')) {
        supabaseResponses.push({ status: response.status(), url });
      }
    });
    page.on('console', (message) => {
      if (message.type() === 'error' && !isIgnorableConsoleError(message)) {
        const sourceUrl = message.location().url;
        appConsoleErrors.push(`${message.text()} (${sourceUrl || 'unknown source'})`);
      }
    });
    page.on('pageerror', (error) => {
      appPageErrors.push(describeError(error));
    });

    const homeResponse = await page.goto(`${server.baseUrl}/ko?deploy-browser-smoke=home`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    assert(homeResponse && homeResponse.status() < 500, `home returned HTTP ${homeResponse?.status()}`);
    await page.locator('[data-testid="home-profile-feed"]').waitFor({ state: 'visible', timeout: 20_000 });
    await page.waitForFunction(
      () => {
        const root = document.querySelector('[data-testid="home-profile-feed"]');
        return Boolean(
          root?.querySelector(
            '[data-testid="profile-feed-card"], [data-testid="profile-feed-empty"], [role="alert"]',
          ),
        );
      },
      undefined,
      { timeout: 20_000 },
    );
    const profileFeedCount = await page.locator('[data-testid="profile-feed-card"]').count();
    const profileFeedResponses = supabaseResponses.filter(({ url }) => url.includes('/rest/v1/profile_posts'));
    assert(
      profileFeedResponses.some(({ status }) => status >= 200 && status < 300),
      `home did not successfully query the public profile feed (responses: ${profileFeedResponses
        .map(({ status }) => status)
        .join(', ') || 'none'})`,
    );
    assert(
      !(await page.locator('[data-testid="home-profile-feed"] [role="alert"]').count()),
      'home rendered public feed data-load failure',
    );

    const desktopSidebar = page.getByTestId('desktop-sidebar');
    const desktopBottomNav = page.getByTestId('mobile-bottom-nav');
    assert(await desktopSidebar.isVisible(), 'desktop sidebar is not visible at 1440px');
    assert(!(await desktopBottomNav.isVisible()), 'mobile bottom nav is visible at 1440px');
    assert(
      (await desktopSidebar.getByRole('link', { name: '홈', exact: true }).getAttribute('aria-current')) ===
        'page',
      'desktop home link is missing aria-current="page"',
    );

    const desktopShell = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
    }));
    assert(
      Math.max(desktopShell.documentWidth, desktopShell.bodyWidth) <= desktopShell.viewportWidth + 1,
      `desktop shell overflows horizontally (${JSON.stringify(desktopShell)})`,
    );

    await page.setViewportSize({ width: 390, height: 844 });
    const mobileHomeResponse = await page.goto(`${server.baseUrl}/ko?deploy-browser-smoke=mobile-home`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    assert(
      mobileHomeResponse && mobileHomeResponse.status() < 500,
      `mobile home returned HTTP ${mobileHomeResponse?.status()}`,
    );
    await page.getByTestId('home-profile-feed').waitFor({ state: 'visible', timeout: 20_000 });
    const mobileHeader = page.getByTestId('mobile-header');
    const mobileSidebar = page.getByTestId('desktop-sidebar');
    const mobileBottomNav = page.getByTestId('mobile-bottom-nav');
    assert(await mobileHeader.isVisible(), 'mobile header is not visible at 390px');
    assert(!(await mobileSidebar.isVisible()), 'desktop sidebar is visible at 390px');
    assert(await mobileBottomNav.isVisible(), 'mobile bottom nav is not visible at 390px');
    const mobileNavLabels = (await mobileBottomNav.getByRole('link').allTextContents()).map((label) =>
      label.trim(),
    );
    assert(
      JSON.stringify(mobileNavLabels) === JSON.stringify(['홈', '투표', '업로드', '뉴스', '프로필']),
      `mobile navigation labels are incorrect (${JSON.stringify(mobileNavLabels)})`,
    );
    assert(
      (await mobileBottomNav.getByRole('link', { name: '홈', exact: true }).getAttribute('aria-current')) ===
        'page',
      'mobile home link is missing aria-current="page"',
    );

    const mobileShell = await page.evaluate(() => {
      const header = document.querySelector('[data-testid="mobile-header"]');
      const bottomNav = document.querySelector('[data-testid="mobile-bottom-nav"]');
      const headerStyles = header ? getComputedStyle(header) : null;
      const bottomNavStyles = bottomNav ? getComputedStyle(bottomNav) : null;
      return {
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        headerWidth: header?.getBoundingClientRect().width || 0,
        headerHeight: header?.getBoundingClientRect().height || 0,
        headerDisplay: headerStyles?.display || null,
        bottomNavWidth: bottomNav?.getBoundingClientRect().width || 0,
        bottomNavHeight: bottomNav?.getBoundingClientRect().height || 0,
        bottomNavPosition: bottomNavStyles?.position || null,
        bottomNavBackground: bottomNavStyles?.backgroundColor || null,
      };
    });
    assert(
      Math.max(mobileShell.documentWidth, mobileShell.bodyWidth) <= mobileShell.viewportWidth + 1,
      `mobile shell overflows horizontally (${JSON.stringify(mobileShell)})`,
    );
    assert(
      mobileShell.headerWidth >= mobileShell.viewportWidth - 1 && mobileShell.headerHeight > 0,
      `mobile header geometry is invalid (${JSON.stringify(mobileShell)})`,
    );
    assert(
      mobileShell.bottomNavWidth >= mobileShell.viewportWidth - 1 && mobileShell.bottomNavHeight > 0,
      `mobile bottom nav geometry is invalid (${JSON.stringify(mobileShell)})`,
    );
    assert(
      mobileShell.bottomNavPosition === 'fixed',
      `mobile bottom nav is not fixed (${JSON.stringify(mobileShell)})`,
    );
    assert(
      mobileShell.bottomNavBackground &&
        !/transparent|rgba\([^)]*,\s*0\s*\)/i.test(mobileShell.bottomNavBackground),
      `mobile bottom nav background is transparent (${mobileShell.bottomNavBackground})`,
    );

    await page.setViewportSize({ width: 1440, height: 1000 });
    const rankingResponse = await page.goto(`${server.baseUrl}/ko/ranking?deploy-browser-smoke=ranking`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    assert(rankingResponse && rankingResponse.status() < 500, `ranking returned HTTP ${rankingResponse?.status()}`);
    await page.locator('[data-company-id]').first().waitFor({ state: 'visible', timeout: 20_000 });
    const companyCount = await page.locator('[data-company-id]').count();
    assert(companyCount > 0, 'ranking rendered no company cards');
    assert(!(await page.getByText('Failed to load data').count()), 'ranking rendered data-load failure');

    await page.setViewportSize({ width: 390, height: 844 });
    const mobileRankingResponse = await page.goto(
      `${server.baseUrl}/ko/ranking?deploy-browser-smoke=mobile-ranking`,
      { waitUntil: 'domcontentloaded', timeout: 30_000 },
    );
    assert(
      mobileRankingResponse && mobileRankingResponse.status() < 500,
      `mobile ranking returned HTTP ${mobileRankingResponse?.status()}`,
    );
    await page.waitForFunction(
      () => document.querySelectorAll('[data-company-id]').length >= 10,
      undefined,
      { timeout: 20_000 },
    );
    const mobileRanking = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('[data-company-id]'));
      const getRank = (element) =>
        element.dataset.rank || element.querySelector('[class*="rankNumber"]')?.textContent?.trim() || '';
      const tenth = items.find((element) => getRank(element) === '10');
      const listSection = tenth?.closest('[class*="leagueListSection"]');
      const tenthRect = tenth?.getBoundingClientRect();
      const sectionRect = listSection?.getBoundingClientRect();
      return {
        itemCount: items.length,
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        tenth: tenthRect
          ? {
              top: Number(tenthRect.top.toFixed(2)),
              bottom: Number(tenthRect.bottom.toFixed(2)),
              height: Number(tenthRect.height.toFixed(2)),
              display: getComputedStyle(tenth).display,
              visibility: getComputedStyle(tenth).visibility,
              withinListSection: Boolean(sectionRect && tenthRect.bottom <= sectionRect.bottom + 1),
            }
          : null,
        listSection: listSection
          ? {
              clientHeight: listSection.clientHeight,
              scrollHeight: listSection.scrollHeight,
              overflowY: getComputedStyle(listSection).overflowY,
            }
          : null,
      };
    });
    assert(mobileRanking.itemCount >= 10, 'mobile ranking rendered fewer than 10 company cards');
    assert(
      mobileRanking.tenth &&
        mobileRanking.tenth.height > 0 &&
        mobileRanking.tenth.display !== 'none' &&
        mobileRanking.tenth.visibility !== 'hidden' &&
        mobileRanking.tenth.withinListSection,
      `mobile ranking 10th card is clipped (${JSON.stringify(mobileRanking)})`,
    );
    assert(
      mobileRanking.documentWidth <= mobileRanking.viewportWidth + 1,
      `mobile ranking overflows horizontally (${JSON.stringify(mobileRanking)})`,
    );
    const seoEndpoints = await assertSeoEndpoints(server.baseUrl);
    const auditionSmoke = await runAuditionBrowserSmoke(page, server.baseUrl);

    const newsResponse = await page.goto(`${server.baseUrl}/en/news?deploy-browser-smoke=news`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    assert(newsResponse && newsResponse.status() < 500, `news list returned HTTP ${newsResponse?.status()}`);
    const newsImage = page.locator('img[src*="/images/news/"]').first();
    const imageSources = await page.locator('img').evaluateAll((images) =>
      images.map((image) => image.getAttribute('src') || '').filter((src) => src.includes('/images/news/')),
    );
    assert(imageSources.length > 0, 'news list rendered no news image');
    assert(
      imageSources.some((src) => /\.webp(?:$|\?)/i.test(src) || /nextImageExportOptimizer/i.test(src)),
      `news image is not WebP-backed: ${imageSources[0]}`,
    );
    await newsImage.waitFor({ state: 'visible', timeout: 15_000 });
    await page.waitForFunction(
      () => {
        const image = document.querySelector('img[src*="/images/news/"]');
        return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0;
      },
      undefined,
      { timeout: 15_000 },
    );
    const firstNewsImageLoaded = await newsImage.evaluate((image) => image.complete && image.naturalWidth > 0);
    assert(firstNewsImageLoaded, `news image failed to load: ${imageSources[0]}`);

    const newsArticleHref = await page.locator('a[href^="/en/news/"]').first().getAttribute('href');
    assert(
      newsArticleHref && /^\/en\/news\/[^/?#]+$/.test(newsArticleHref),
      `news list did not expose an active article link (${newsArticleHref || 'none'})`,
    );

    const detailResponse = await page.goto(
      `${server.baseUrl}${newsArticleHref}?deploy-browser-smoke=detail`,
      { waitUntil: 'domcontentloaded', timeout: 30_000 },
    );
    assert(detailResponse && detailResponse.status() < 500, `news detail returned HTTP ${detailResponse?.status()}`);
    const detailMain = page.getByRole('main').last();
    assert((await detailMain.innerText()).length > 300, 'news detail rendered insufficient content');

    const successfulSupabaseRequest = supabaseResponses.some(
      ({ status }) => status >= 200 && status < 300,
    );
    assert(successfulSupabaseRequest, 'no successful Supabase REST response was observed');
    assert(
      appConsoleErrors.length === 0,
      `browser console reported application errors: ${appConsoleErrors.slice(0, 3).join(' | ')}`,
    );
    assert(
      appPageErrors.length === 0,
      `browser page reported application errors: ${appPageErrors.slice(0, 3).join(' | ')}`,
    );

    console.log(
      JSON.stringify(
        {
          status: 'PASS',
          browser: browserPath,
          baseUrl: server.baseUrl,
          profileFeedCount,
          profileFeedStatuses: profileFeedResponses.map(({ status }) => status),
          desktopShell,
          mobileShell,
          companyCount,
          mobileRanking,
          ...seoEndpoints,
          auditionSmoke,
          supabaseResponses: supabaseResponses.map(({ status, url }) => ({ status, url })),
          newsImage: imageSources[0],
          pageErrors: appPageErrors,
        },
        null,
        2,
      ),
    );
  } finally {
    if (browser) await browser.close().catch(() => {});
    stopServer(server.child);
  }
}

try {
  await main();
} catch (error) {
  console.error(`DEPLOY BROWSER SMOKE FAILED: ${describeError(error)}`);
  process.exitCode = 1;
}

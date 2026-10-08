#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright-core';

const STORAGE_KEYS = {
  daily: 'kcl-daily-vote-modal-dismissed-date',
  session: 'kcl-daily-vote-modal-dismissed-session',
};
const MODAL_TITLE = '실시간 TOP 10 투표';
const DEFAULT_PORT = '3107';
const SCREENSHOT_DIR =
  process.env.STUDIO_MODAL_SCREENSHOT_DIR || '/tmp/studio-modal-browser-smoke';

class RuntimeUnavailableError extends Error {}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function describeError(error) {
  return error instanceof Error ? error.message : String(error);
}

function getBrowserExecutablePath() {
  const configuredPath = process.env.STUDIO_MODAL_BROWSER_PATH;
  const candidates = [
    configuredPath,
    process.env.CHROME_BIN,
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean);

  return candidates.find((candidate) => existsSync(candidate)) || null;
}

function appendServerOutput(buffer, chunk) {
  return `${buffer}${chunk}`.slice(-6000);
}

async function waitForServer(baseUrl, child, getOutput) {
  const deadline = Date.now() + 120_000;
  let lastStatus = 'connection refused';

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new RuntimeUnavailableError(
        `Next dev server exited before becoming ready (code ${child.exitCode}).\n${getOutput()}`,
      );
    }

    try {
      const response = await fetch(`${baseUrl}/studio/news?studio-modal-browser-smoke=1`, {
        redirect: 'manual',
      });
      lastStatus = `HTTP ${response.status}`;
      if (response.status < 500) return;
    } catch (error) {
      lastStatus = describeError(error);
    }

    await delay(250);
  }

  throw new RuntimeUnavailableError(
    `Next dev server was not ready after 120s (${lastStatus}).\n${getOutput()}`,
  );
}

async function startServer() {
  const configuredBaseUrl = process.env.STUDIO_MODAL_BASE_URL;
  if (configuredBaseUrl) {
    return {
      baseUrl: configuredBaseUrl.replace(/\/+$/, ''),
      async stop() {},
    };
  }

  const port = process.env.STUDIO_MODAL_PORT || DEFAULT_PORT;
  const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  const child = spawn(command, ['dev', '--hostname', '127.0.0.1', '--port', port], {
    cwd: process.cwd(),
    env: process.env,
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (chunk) => {
    output = appendServerOutput(output, chunk);
  });
  child.stderr.on('data', (chunk) => {
    output = appendServerOutput(output, chunk);
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    await waitForServer(baseUrl, child, () => output);
  } catch (error) {
    await stopProcessTree(child);
    throw error;
  }

  return {
    baseUrl,
    async stop() {
      await stopProcessTree(child);
    },
  };
}

async function stopProcessTree(child) {
  if (child.exitCode === null) {
    const exited = new Promise((resolve) => child.once('exit', resolve));
    terminateProcessTree(child, 'SIGTERM');
    await Promise.race([exited, delay(5_000)]);
  } else if (process.platform !== 'win32') {
    // The pnpm wrapper may have exited while its Next child is still alive.
    terminateProcessTree(child, 'SIGTERM');
  }

  if (child.exitCode === null) {
    terminateProcessTree(child, 'SIGKILL');
    await delay(250);
  }
}

function terminateProcessTree(child, signal) {
  try {
    if (process.platform !== 'win32' && child.pid) {
      process.kill(-child.pid, signal);
    } else if (child.exitCode === null) {
      child.kill(signal);
    }
  } catch {
    // The process can exit between the status check and signal delivery.
  }
}

async function closeContext(context) {
  try {
    await context.close();
  } catch (error) {
    console.warn(`[WARN] browser context cleanup: ${describeError(error)}`);
  }
}

async function takeScreenshot(page, name) {
  try {
    await mkdir(SCREENSHOT_DIR, { recursive: true });
    await page.screenshot({
      path: join(SCREENSHOT_DIR, `${name}.png`),
      fullPage: false,
    });
  } catch (error) {
    console.warn(`[WARN] screenshot ${name}: ${describeError(error)}`);
  }
}

async function createCleanPage(browser, baseUrl) {
  const context = await browser.newContext({
    locale: 'ko-KR',
    viewport: { width: 1440, height: 1000 },
  });

  try {
    const page = await context.newPage();
    // A fresh context is isolated by Playwright. The explicit removal below
    // also documents and enforces the two product keys this smoke test owns.
    await page.goto(`${baseUrl}/ko?studio-modal-browser-smoke=reset`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    await page.evaluate(({ daily, session }) => {
      window.localStorage.removeItem(daily);
      window.sessionStorage.removeItem(session);
    }, STORAGE_KEYS);

    const storageState = await page.evaluate(({ daily, session }) => ({
      daily: window.localStorage.getItem(daily),
      session: window.sessionStorage.getItem(session),
    }), STORAGE_KEYS);
    assert(
      storageState.daily === null && storageState.session === null,
      `dismiss state was not reset: ${JSON.stringify(storageState)}`,
    );

    return { context, page };
  } catch (error) {
    await closeContext(context);
    throw error;
  }
}

async function goto(page, baseUrl, pathname) {
  const response = await page.goto(`${baseUrl}${pathname}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });
  assert(response && response.status() < 500, `${pathname} returned HTTP ${response?.status()}`);
}

async function getDismissState(page) {
  return page.evaluate(({ daily, session }) => ({
    daily: window.localStorage.getItem(daily),
    session: window.sessionStorage.getItem(session),
  }), STORAGE_KEYS);
}

async function expectNoModal(page, reason) {
  await page.waitForTimeout(350);
  const count = await page.getByRole('dialog', { name: MODAL_TITLE }).count();
  assert(count === 0, `${reason}: expected no vote modal, found ${count}`);
  const state = await getDismissState(page);
  assert(
    state.daily === null && state.session === null,
    `${reason}: no-modal route wrote dismiss state: ${JSON.stringify(state)}`,
  );
}

async function runIsolatedTest(browser, baseUrl, name, body) {
  const { context, page } = await createCleanPage(browser, baseUrl);
  try {
    await body(page);
    console.log(`PASS ${name}`);
  } catch (error) {
    await takeScreenshot(page, `failure-${name.replaceAll(/[^a-z0-9-]+/gi, '-')}`);
    console.error(`FAIL ${name}: ${describeError(error)}`);
    return false;
  } finally {
    await closeContext(context);
  }

  return true;
}

async function main() {
  const executablePath = getBrowserExecutablePath();
  if (!executablePath) {
    console.error(
      'UNAVAILABLE browser runtime: set STUDIO_MODAL_BROWSER_PATH to a Chromium/Chrome executable.',
    );
    process.exitCode = 2;
    return;
  }

  let browser;
  let server;
  try {
    try {
      browser = await chromium.launch({
        executablePath,
        headless: process.env.STUDIO_MODAL_HEADLESS !== 'false',
        args: process.platform === 'linux' ? ['--no-sandbox'] : [],
      });
    } catch (error) {
      throw new RuntimeUnavailableError(
        `browser could not launch from ${executablePath}: ${describeError(error)}`,
      );
    }

    server = await startServer();
    console.log(`Browser: ${executablePath}`);
    console.log(`Base URL: ${server.baseUrl}`);

    const tests = [
      {
        name: 'studio-news-list-has-no-global-vote-modal',
        run: async (page) => {
          await goto(page, server.baseUrl, '/studio/news');
          assert(new URL(page.url()).pathname === '/studio/news', 'Studio news list URL changed');
          await expectNoModal(page, 'Studio news list');
          await takeScreenshot(page, 'studio-news-list-no-modal');
        },
      },
      {
        name: 'studio-news-detail-has-no-global-vote-modal',
        run: async (page) => {
          await goto(page, server.baseUrl, '/studio/news/top-nana-dating-studio54');
          assert(
            new URL(page.url()).pathname === '/studio/news/top-nana-dating-studio54',
            'Studio news detail URL changed',
          );
          await page.getByRole('heading', { level: 1, name: /T\.O\.P and Nana Confirm/ }).waitFor({
            state: 'visible',
            timeout: 15_000,
          });
          await expectNoModal(page, 'Studio news detail');
          await takeScreenshot(page, 'studio-news-detail-no-modal');
        },
      },
      {
        name: 'studio-auditions-has-no-global-vote-modal',
        run: async (page) => {
          await goto(page, server.baseUrl, '/studio/auditions');
          assert(new URL(page.url()).pathname === '/studio/auditions', 'Studio auditions URL changed');
          await expectNoModal(page, 'Studio auditions');
          await takeScreenshot(page, 'studio-auditions-no-modal');
        },
      },
      {
        name: 'legacy-news-route-lands-on-studio-without-modal',
        run: async (page) => {
          await goto(page, server.baseUrl, '/news');
          assert(new URL(page.url()).pathname === '/studio/news', 'legacy /news did not reach Studio news');
          await expectNoModal(page, 'legacy /news redirect');
        },
      },
      {
        name: 'legacy-news-detail-route-lands-on-studio-without-modal',
        run: async (page) => {
          await goto(page, server.baseUrl, '/news/top-nana-dating-studio54');
          assert(
            new URL(page.url()).pathname === '/studio/news/top-nana-dating-studio54',
            'legacy news detail did not reach Studio news detail',
          );
          await expectNoModal(page, 'legacy news detail redirect');
        },
      },
      {
        name: 'community-home-has-no-global-vote-modal',
        run: async (page) => {
          await goto(page, server.baseUrl, '/ko');
          await expectNoModal(page, 'community home');
          await takeScreenshot(page, 'home-no-modal');
        },
      },
    ];

    const results = [];
    for (const test of tests) {
      results.push(await runIsolatedTest(browser, server.baseUrl, test.name, test.run));
    }

    const failed = results.filter((passed) => !passed).length;
    if (failed > 0) {
      console.error(`FAIL Studio modal smoke: ${failed}/${results.length} scenario(s) failed`);
      process.exitCode = 1;
    } else {
      console.log(`PASS Studio modal smoke: ${results.length}/${results.length} scenarios`);
      process.exitCode = 0;
    }
  } catch (error) {
    if (error instanceof RuntimeUnavailableError) {
      console.error(`UNAVAILABLE ${error.message}`);
      process.exitCode = 2;
    } else {
      console.error(`FAIL Studio modal smoke: ${describeError(error)}`);
      process.exitCode = 1;
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (server) await server.stop().catch(() => {});
  }
}

await main();

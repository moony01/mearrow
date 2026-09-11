#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright-core';
import { runAuditionBrowserSmoke } from './auditions-browser-smoke.mjs';

const port = process.env.AUDITIONS_WORKERS_PORT || '8799';
const baseUrl = `http://127.0.0.1:${port}`;
const screenshotPath =
  process.env.AUDITIONS_WORKERS_SCREENSHOT_PATH || '/tmp/mearrow-auditions-workers-smoke.png';

function describeError(error) {
  return error instanceof Error ? error.message : String(error);
}

function getBrowserExecutablePath() {
  const candidates = [
    process.env.AUDITIONS_WORKERS_BROWSER_PATH,
    process.env.DEPLOY_BROWSER_PATH,
    process.env.CHROME_BIN,
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);

  return candidates.find((candidate) => existsSync(candidate)) || null;
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

async function waitForServer(child, workerOutput) {
  const deadline = Date.now() + 120_000;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      const diagnostics = workerOutput.slice(-20).join('').trim();
      throw new Error(
        `Workers preview exited before readiness (code ${child.exitCode}).${diagnostics ? `\n${diagnostics}` : ''}`,
      );
    }

    try {
      const response = await fetch(`${baseUrl}/ko/auditions?workers-audition-smoke=ready`);
      if (response.status < 500) return;
    } catch {
      // Keep polling until Wrangler is ready.
    }

    await delay(250);
  }

  const diagnostics = workerOutput.slice(-20).join('').trim();
  throw new Error(
    `Workers preview was not ready after 120 seconds.${diagnostics ? `\n${diagnostics}` : ''}`,
  );
}

function isIgnorableConsoleError(message) {
  const text = message.text();
  return text.includes('Failed to load resource:') || text.includes('googlesyndication.com');
}

async function main() {
  if (!existsSync('.open-next/worker.js') || !existsSync('.open-next/assets')) {
    throw new Error('Workers build output is missing; run pnpm workers:build first.');
  }

  const browserPath = getBrowserExecutablePath();
  if (!browserPath) {
    throw new Error(
      'No Chromium executable found. Set AUDITIONS_WORKERS_BROWSER_PATH or DEPLOY_BROWSER_PATH.',
    );
  }

  const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  const worker = spawn(
    command,
    ['exec', 'wrangler', 'dev', '--local', '--config', 'wrangler.jsonc', '--port', port],
    {
      cwd: process.cwd(),
      env: process.env,
      detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  const workerOutput = [];
  const captureWorkerOutput = (chunk) => {
    workerOutput.push(String(chunk));
    if (workerOutput.length > 200) workerOutput.shift();
  };
  worker.stdout.on('data', captureWorkerOutput);
  worker.stderr.on('data', captureWorkerOutput);

  let browser;
  try {
    await waitForServer(worker, workerOutput);
    browser = await chromium.launch({
      executablePath: browserPath,
      headless: process.env.AUDITIONS_WORKERS_BROWSER_HEADLESS !== 'false',
      args: process.platform === 'linux' ? ['--no-sandbox'] : [],
    });

    const page = await browser.newPage({ locale: 'ko-KR', viewport: { width: 1440, height: 1000 } });
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error' && !isIgnorableConsoleError(message)) {
        consoleErrors.push(message.text());
      }
    });
    page.on('pageerror', (error) => pageErrors.push(describeError(error)));

    const auditionSmoke = await runAuditionBrowserSmoke(page, baseUrl);
    const missingDetailResponse = await fetch(
      `${baseUrl}/ko/auditions/does-not-exist?workers-audition-smoke=missing`,
    );
    if (missingDetailResponse.status !== 404) {
      throw new Error(`missing audition detail returned HTTP ${missingDetailResponse.status}`);
    }

    const voteDialog = page.getByRole('dialog');
    if (await voteDialog.count()) {
      await voteDialog.getByRole('button').first().click();
      await voteDialog.waitFor({ state: 'hidden', timeout: 5_000 });
    }
    await page.screenshot({ path: screenshotPath, fullPage: true });

    if (consoleErrors.length > 0) {
      throw new Error(`Workers audition smoke console errors: ${consoleErrors.slice(0, 3).join(' | ')}`);
    }
    if (pageErrors.length > 0) {
      throw new Error(`Workers audition smoke page errors: ${pageErrors.slice(0, 3).join(' | ')}`);
    }

    console.log(
      JSON.stringify(
        {
          status: 'PASS',
          baseUrl,
          browser: browserPath,
          screenshotPath,
          auditionSmoke,
          missingDetailStatus: missingDetailResponse.status,
          consoleErrors,
          pageErrors,
        },
        null,
        2,
      ),
    );
  } finally {
    if (browser) await browser.close().catch(() => {});
    stopServer(worker);
  }
}

try {
  await main();
} catch (error) {
  console.error(`WORKERS AUDITION BROWSER SMOKE FAILED: ${describeError(error)}`);
  process.exitCode = 1;
}

export const AUDITION_SMOKE_LOCALES = ['ko', 'en'];

export const EXPECTED_AUDITION_SLUGS = [
  '2026-yg-global-audition-bangkok',
  '2026-yg-global-audition-hong-kong',
  '2026-yg-global-audition-osaka',
  '2026-yg-global-audition-taipei',
  'jyp-online-audition',
  'source-music-summer-audition-2026',
  'wakeone-next-wave-audition',
  'yg-online-audition',
];

const PAGINATION_READY_TIMEOUT_MS = 20_000;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/**
 * Visit every localized audition detail exposed by the list pages.
 *
 * The caller owns the browser/server lifecycle so this check can run against
 * Next dev, a Pages preview, or a locally bundled Workers runtime.
 */
export async function runAuditionBrowserSmoke(page, baseUrl) {
  // The app-wide vote modal embeds a separate data surface on news/audition
  // routes. Keep that optional iframe out of this content-route smoke so a
  // missing remote Supabase network cannot mask audition rendering failures.
  await page.addInitScript(() => {
    try {
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      window.localStorage.setItem(
        'kcl-daily-vote-modal-dismissed-date',
        `${now.getFullYear()}-${month}-${day}`,
      );
    } catch {
      // Storage can be unavailable in restricted browser contexts.
    }
  });

  const details = [];

  for (const locale of AUDITION_SMOKE_LOCALES) {
    const listResponse = await page.goto(
      `${baseUrl}/${locale}/auditions?deploy-browser-smoke=auditions-${locale}`,
      { waitUntil: 'domcontentloaded', timeout: 30_000 },
    );
    assert(
      listResponse && listResponse.status() === 200,
      `${locale} auditions list returned HTTP ${listResponse?.status()}`,
    );

    const detailPathSet = new Set();
    const collectDetailPaths = async () => {
      const paths = await page.locator(`a[href^="/${locale}/auditions/"]`).evaluateAll(
        (links, localeValue) =>
          links
            .map((link) => link.getAttribute('href'))
            .filter(
              (href) =>
                href && new RegExp(`^/${localeValue}/auditions/[^/?#]+$`).test(href),
            ),
        locale,
      );
      paths.forEach((path) => detailPathSet.add(path));
    };

    await collectDetailPaths();
    const totalPages = Math.max(
      1,
      ...(await page.locator('button').evaluateAll((buttons) =>
        buttons
          .map((button) => button.textContent?.trim() || '')
          .filter((text) => /^\d+$/.test(text))
          .map(Number),
      )),
    );
    for (let pageNumber = 2; pageNumber <= totalPages; pageNumber += 1) {
      const pageButton = page.locator('button').filter({ hasText: new RegExp(`^${pageNumber}$`) }).first();
      await pageButton.click();
      await page.waitForFunction(
        (expectedPage) =>
          Array.from(document.querySelectorAll('button[aria-current="page"]')).some(
            (button) => button.textContent?.trim() === String(expectedPage),
          ),
        pageNumber,
        { timeout: PAGINATION_READY_TIMEOUT_MS },
      );
      await collectDetailPaths();
    }
    const detailPaths = [...detailPathSet];
    assert(
      detailPaths.length === EXPECTED_AUDITION_SLUGS.length,
      `${locale} auditions list exposed ${detailPaths.length} detail paths; expected ${EXPECTED_AUDITION_SLUGS.length}`,
    );

    for (const slug of EXPECTED_AUDITION_SLUGS) {
      const detailPath = `/${locale}/auditions/${slug}`;
      assert(
        detailPaths.includes(detailPath),
        `${locale} auditions list is missing ${detailPath}`,
      );

      const detailResponse = await page.goto(
        `${baseUrl}${detailPath}?deploy-browser-smoke=audition-detail`,
        { waitUntil: 'domcontentloaded', timeout: 30_000 },
      );
      assert(
        detailResponse && detailResponse.status() === 200,
        `${detailPath} returned HTTP ${detailResponse?.status()}`,
      );

      const detailMain = page.getByRole('main').last();
      await detailMain
        .getByRole('heading', { level: 1 })
        .waitFor({ state: 'visible', timeout: 15_000 });
      const contentLength = (await detailMain.innerText()).length;
      const externalLinkCount = await detailMain
        .locator('a[target="_blank"][href^="http"]')
        .count();
      assert(contentLength > 300, `${detailPath} rendered insufficient content (${contentLength} chars)`);
      assert(
        externalLinkCount >= 2,
        `${detailPath} did not render both source and official links (${externalLinkCount})`,
      );

      details.push({ locale, slug, status: detailResponse.status(), contentLength, externalLinkCount });
    }
  }

  return {
    listCount: AUDITION_SMOKE_LOCALES.length,
    detailCount: details.length,
    details,
  };
}

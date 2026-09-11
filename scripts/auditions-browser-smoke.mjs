export const AUDITION_SMOKE_LOCALES = ['ko', 'en'];

export const EXPECTED_AUDITION_SLUGS = [
  '2026-yg-global-audition-osaka',
  'jyp-online-audition',
  'source-music-summer-audition-2026',
  'wakeone-next-wave-audition',
  'yg-online-audition',
];

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

    const detailPaths = [
      ...new Set(
        await page.locator(`a[href^="/${locale}/auditions/"]`).evaluateAll(
          (links, localeValue) =>
            links
              .map((link) => link.getAttribute('href'))
              .filter(
                (href) =>
                  href && new RegExp(`^/${localeValue}/auditions/[^/?#]+$`).test(href),
              ),
          locale,
        ),
      ),
    ];
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

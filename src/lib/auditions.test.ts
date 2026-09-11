import { describe, expect, it } from 'vitest';
import {
  getAllAuditionParams,
  getAllAuditions,
  getAuditionBySlug,
  getAuditionLocales,
} from './auditions';

describe('audition content routing', () => {
  it('generates detail routes only for translations that exist', () => {
    const params = getAllAuditionParams();

    expect(params).toHaveLength(10);

    expect(params).toEqual(
      expect.arrayContaining([
        { locale: 'ko', slug: '2026-yg-global-audition-osaka' },
        { locale: 'en', slug: '2026-yg-global-audition-osaka' },
        { locale: 'ko', slug: 'yg-online-audition' },
        { locale: 'en', slug: 'yg-online-audition' },
      ]),
    );
    expect(params.some(({ locale }) => locale === 'ja')).toBe(false);
  });

  it('loads every localized detail record', async () => {
    const params = getAllAuditionParams();
    const posts = await Promise.all(
      params.map(({ locale, slug }) => getAuditionBySlug(slug, locale)),
    );

    expect(posts).toHaveLength(10);
    expect(posts.every((post) => post?.content.trim())).toBe(true);
  });

  it('reports only actual hreflang translations', () => {
    expect(getAuditionLocales('2026-yg-global-audition-osaka')).toEqual(['ko', 'en']);
  });

  it('uses English cards on untranslated list pages without changing their locale', () => {
    const japaneseList = getAllAuditions('ja');

    expect(japaneseList).toHaveLength(5);
    expect(japaneseList.every((post) => post.locale === 'en')).toBe(true);
  });

  it('puts closing auditions before ongoing listings and closed auditions last', () => {
    const koreanList = getAllAuditions('ko');

    expect(koreanList.map((post) => post.slug)).toEqual([
      '2026-yg-global-audition-osaka',
      'jyp-online-audition',
      'wakeone-next-wave-audition',
      'yg-online-audition',
      'source-music-summer-audition-2026',
    ]);
  });
});

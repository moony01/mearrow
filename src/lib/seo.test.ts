import { describe, expect, it } from 'vitest';
import {
  generateAlternateLanguages,
  generatePageMetadata,
  truncateSeoText,
  truncateSeoTitle,
} from './seo';
import { FULL_URL, SUPPORTED_LOCALES } from './constants';
import { getAllNewsParams } from './news';

describe('SEO metadata helpers', () => {
  it('creates locale-free canonical, hreflang, OG, and Twitter metadata', () => {
    const metadata = generatePageMetadata({
      locale: 'ko',
      pathname: '/news/example',
      title: '한국어 뉴스 | MEARROW',
      description: '한국어 뉴스 설명',
      imagePath: '/news/example.jpg',
      type: 'article',
    });

    expect(metadata.alternates?.canonical).toBe(`${FULL_URL}/news/example`);
    expect(metadata.alternates?.languages).toEqual(
      generateAlternateLanguages('/news/example'),
    );
    expect(metadata.openGraph).toMatchObject({
      title: '한국어 뉴스 | MEARROW',
      description: '한국어 뉴스 설명',
      url: `${FULL_URL}/news/example`,
      type: 'article',
      images: [{ url: `${FULL_URL}/news/example.jpg` }],
    });
    expect(metadata.twitter).toMatchObject({
      card: 'summary_large_image',
      title: '한국어 뉴스 | MEARROW',
      description: '한국어 뉴스 설명',
    });
  });

  it('uses the default language on one locale-free URL', () => {
    const languages = generateAlternateLanguages();

    expect(languages).toEqual({
      ko: `${FULL_URL}/`,
      'x-default': `${FULL_URL}/`,
    });
  });

  it('supports pages whose only translated source is English', () => {
    const metadata = generatePageMetadata({
      locale: 'en',
      pathname: '/news/source-only',
      title: 'Source article | MEARROW News',
      description: 'Source article description',
      availableLocales: ['en'],
      defaultLocale: 'en',
    });

    expect(metadata.alternates?.canonical).toBe(`${FULL_URL}/news/source-only`);
    expect(metadata.alternates?.languages).toEqual({
      en: `${FULL_URL}/news/source-only`,
      'x-default': `${FULL_URL}/news/source-only`,
    });
    expect(metadata.openGraph).not.toHaveProperty('alternateLocale');
  });

  it('normalizes and truncates metadata safely while preserving a brand suffix', () => {
    const metadata = generatePageMetadata({
      locale: 'ja',
      title: `  ${'見'.repeat(70)}  |  MEARROW News\n`,
      description: `  ${'説明'.repeat(100)}\n\t`,
    });
    const finalTitle = typeof metadata.title === 'object' && metadata.title !== null && 'absolute' in metadata.title
      ? metadata.title.absolute
      : '';
    const finalDescription = metadata.description || '';

    expect(Array.from(finalTitle).length).toBeLessThanOrEqual(60);
    expect(finalTitle.endsWith(' | MEARROW News')).toBe(true);
    expect(finalTitle).not.toContain('\uFFFD');
    expect(Array.from(finalDescription).length).toBeLessThanOrEqual(150);
    expect(finalDescription).not.toMatch(/^\s|\s$/);
    expect(metadata.openGraph).toMatchObject({
      title: finalTitle,
      description: finalDescription,
    });
    expect(metadata.twitter).toMatchObject({
      title: finalTitle,
      description: finalDescription,
    });
  });

  it('keeps values at the title and description boundaries unchanged', () => {
    const title = '가'.repeat(60);
    const description = '説'.repeat(150);

    expect(truncateSeoTitle(title)).toBe(title);
    expect(truncateSeoText(description, 150)).toBe(description);
  });

  it('loads localized news sources while keeping the public route locale-free', () => {
    const params = getAllNewsParams(SUPPORTED_LOCALES as unknown as string[]);

    expect(params.length).toBeGreaterThan(0);
    expect(new Set(params.map(({ locale }) => locale))).toEqual(new Set(SUPPORTED_LOCALES));
  });
});

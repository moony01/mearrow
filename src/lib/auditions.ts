/**
 * Audition content access layer.
 *
 * Markdown is converted to JSON before the build. Pages/tests load generated
 * JSON directly, while the Workers runtime resolves the same records through
 * the bundled ASSETS endpoint without using filesystem APIs at request time.
 */

import auditionsMeta from '@/generated/auditions-meta.json';
import { loadAuditionPost } from '@/generated/auditions-runtime';
import { SUPPORTED_LOCALES } from '@/lib/constants';

export type AuditionMode = 'online' | 'offline' | 'hybrid';
export type AuditionStatus = 'open' | 'closing' | 'ongoing' | 'closed';

export interface AuditionMeta {
  slug: string;
  locale: string;
  title: string;
  excerpt: string;
  agency: string;
  publishedAt: string;
  updatedAt: string;
  applicationStart?: string;
  applicationDeadline?: string;
  auditionDate?: string;
  timezone?: string;
  mode: AuditionMode;
  country?: string;
  city?: string;
  venueName?: string;
  venueAddress?: string;
  virtualLocationUrl?: string;
  categories: string[];
  eligibility: string;
  status: AuditionStatus;
  officialUrl: string;
  sourceUrl: string;
  verifiedAt: string;
  poster: string;
  posterAlt: string;
  posterWidth: number;
  posterHeight: number;
  active?: boolean;
}

export interface AuditionPost extends AuditionMeta {
  content: string;
}

const statusOrder: Record<AuditionStatus, number> = {
  closing: 0,
  open: 1,
  ongoing: 2,
  closed: 3,
};

function sortAuditions(posts: AuditionMeta[]): AuditionMeta[] {
  return [...posts].sort((a, b) => {
    const statusDifference = statusOrder[a.status] - statusOrder[b.status];
    if (statusDifference !== 0) return statusDifference;

    const aDeadline = a.applicationDeadline ? Date.parse(a.applicationDeadline) : Infinity;
    const bDeadline = b.applicationDeadline ? Date.parse(b.applicationDeadline) : Infinity;
    if (aDeadline !== bDeadline) return aDeadline - bDeadline;

    return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
  });
}

function getActiveMeta(): AuditionMeta[] {
  return (auditionsMeta as AuditionMeta[]).filter((post) => post.active !== false);
}

/** Return every real localized record without list-page fallback expansion. */
export function getAllActualAuditions(): AuditionMeta[] {
  return sortAuditions(getActiveMeta());
}

/**
 * Return cards for a locale. Missing translations fall back to English cards,
 * while retaining `post.locale` so links point to the real English URL rather
 * than creating duplicate translated detail pages.
 */
export function getAllAuditions(locale: string = 'ko'): AuditionMeta[] {
  const activePosts = getActiveMeta();
  const localePosts = activePosts.filter((post) => post.locale === locale);

  if (locale === 'en') return sortAuditions(localePosts);

  const translatedSlugs = new Set(localePosts.map((post) => post.slug));
  const englishFallbacks = activePosts.filter(
    (post) => post.locale === 'en' && !translatedSlugs.has(post.slug),
  );

  return sortAuditions([...localePosts, ...englishFallbacks]);
}

/** Load only a real translation. Detail routes intentionally do not fallback. */
export async function getAuditionBySlug(
  slug: string,
  locale: string,
): Promise<AuditionPost | null> {
  const post = await loadAuditionPost(slug, locale);
  return post && post.active !== false ? (post as AuditionPost) : null;
}

/** Generate detail routes only for translations that physically exist. */
export function getAllAuditionParams(): { locale: string; slug: string }[] {
  return getActiveMeta().map(({ locale, slug }) => ({ locale, slug }));
}

/** Return the real translated locales for one slug in site locale order. */
export function getAuditionLocales(slug: string): string[] {
  const locales = new Set(
    getActiveMeta().filter((post) => post.slug === slug).map((post) => post.locale),
  );
  return SUPPORTED_LOCALES.filter((locale) => locales.has(locale));
}

export function getRelatedAuditions(
  currentSlug: string,
  locale: string,
  limit: number = 3,
): AuditionMeta[] {
  return getAllAuditions(locale)
    .filter((post) => post.slug !== currentSlug)
    .slice(0, limit);
}

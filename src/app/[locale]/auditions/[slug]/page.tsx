import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  MapPin,
  Radio,
  Tags,
  UserRoundCheck,
} from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { JsonLd } from '@/components/common/JsonLd';
import {
  getAllAuditionParams,
  getAuditionBySlug,
  getAuditionLocales,
  getRelatedAuditions,
  type AuditionPost,
} from '@/lib/auditions';
import { DEFAULT_LOCALE, FULL_URL } from '@/lib/constants';
import { BRAND_NAME } from '@/lib/brand';
import { generatePageMetadata } from '@/lib/seo';
import PageFrame from '@/components/layout/PageFrame';
import styles from './page.module.scss';

interface AuditionDetailPageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export function generateStaticParams() {
  // Workers loads detail content from ASSETS at request time, matching the
  // dynamic news route. Pages still receives every real localized path for
  // static export.
  if (process.env.NEXT_RUNTIME_TARGET === 'workers') return [];

  return getAllAuditionParams();
}

function absoluteUrl(value: string) {
  return value.startsWith('http://') || value.startsWith('https://')
    ? value
    : `${FULL_URL}${value}`;
}

function detailAlternates(locale: string, slug: string): Metadata['alternates'] {
  const actualLocales = getAuditionLocales(slug);
  const languages: Record<string, string> = {};

  for (const translatedLocale of actualLocales) {
    languages[translatedLocale] = `${FULL_URL}/${translatedLocale}/auditions/${slug}`;
  }

  const defaultLocale = actualLocales.includes(DEFAULT_LOCALE) ? DEFAULT_LOCALE : actualLocales[0];
  if (defaultLocale) languages['x-default'] = `${FULL_URL}/${defaultLocale}/auditions/${slug}`;

  return {
    canonical: `${FULL_URL}/${locale}/auditions/${slug}`,
    languages,
  };
}

export async function generateMetadata({ params }: AuditionDetailPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = await getAuditionBySlug(slug, locale);

  if (!post) return { title: 'Audition not found' };

  const poster = absoluteUrl(post.poster);
  const actualLocales = getAuditionLocales(slug);
  const defaultLocale = actualLocales.includes(DEFAULT_LOCALE) ? DEFAULT_LOCALE : actualLocales[0];
  return {
    ...generatePageMetadata({
      locale,
      pathname: `/auditions/${slug}`,
      title: post.title,
      description: post.excerpt,
      type: 'article',
      imagePath: poster,
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      availableLocales: actualLocales,
      ...(defaultLocale ? { defaultLocale } : {}),
    }),
    alternates: detailAlternates(locale, slug),
  };
}

function formatDate(value: string, locale: string, timezone?: string, includeTime = false) {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(dateOnly ? `${value}T12:00:00Z` : value);

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    ...(includeTime && !dateOnly ? { timeStyle: 'short' as const } : {}),
    timeZone: dateOnly ? 'UTC' : timezone,
  }).format(date);
}

function buildEventJsonLd(post: AuditionPost, canonical: string) {
  if (!post.auditionDate) return null;

  const physicalLocation = post.venueName && post.venueAddress
    ? {
        '@type': 'Place',
        name: post.venueName,
        address: {
          '@type': 'PostalAddress',
          streetAddress: post.venueAddress,
          addressLocality: post.city,
          addressCountry: post.country,
        },
      }
    : null;
  const virtualLocation = post.virtualLocationUrl
    ? { '@type': 'VirtualLocation', url: post.virtualLocationUrl }
    : null;

  if (!physicalLocation && !virtualLocation) return null;

  const location = physicalLocation && virtualLocation
    ? [physicalLocation, virtualLocation]
    : physicalLocation || virtualLocation;
  const attendanceMode = post.mode === 'online'
    ? 'https://schema.org/OnlineEventAttendanceMode'
    : post.mode === 'hybrid'
      ? 'https://schema.org/MixedEventAttendanceMode'
      : 'https://schema.org/OfflineEventAttendanceMode';

  return {
    '@type': 'Event',
    '@id': `${canonical}#event`,
    name: post.title,
    description: post.excerpt,
    startDate: post.auditionDate,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: attendanceMode,
    location,
    image: [absoluteUrl(post.poster)],
    url: canonical,
    organizer: {
      '@type': 'Organization',
      name: post.agency,
      url: post.officialUrl,
    },
  };
}

export default async function AuditionDetailPage({ params }: AuditionDetailPageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const post = await getAuditionBySlug(slug, locale);
  if (!post) notFound();

  const t = await getTranslations({ locale, namespace: 'Auditions' });
  const canonical = `${FULL_URL}/${locale}/auditions/${slug}`;
  const location = [post.venueName, post.city, post.country].filter(Boolean).join(', ');
  const relatedPosts = getRelatedAuditions(slug, locale, 3);
  const eventJsonLd = buildEventJsonLd(post, canonical);
  const pageJsonLd: Record<string, unknown> = {
    '@type': 'WebPage',
    '@id': `${canonical}#webpage`,
    url: canonical,
    name: post.title,
    description: post.excerpt,
    inLanguage: locale,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    image: absoluteUrl(post.poster),
    isBasedOn: post.sourceUrl,
    about: {
      '@type': 'Organization',
      name: post.agency,
    },
    publisher: {
      '@type': 'Organization',
      name: BRAND_NAME,
      url: FULL_URL,
    },
  };
  if (eventJsonLd) pageJsonLd.mainEntity = { '@id': `${canonical}#event` };

  return (
    <PageFrame size="narrow">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': eventJsonLd ? [pageJsonLd, eventJsonLd] : [pageJsonLd],
        }}
      />

      <Link className={styles.backLink} href={`/${locale}/auditions`}>
        <ArrowLeft aria-hidden="true" /> {t('backToList')}
      </Link>

      <figure className={styles.poster}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={post.poster}
          alt={post.posterAlt}
          width={post.posterWidth}
          height={post.posterHeight}
          loading="eager"
          fetchPriority="high"
        />
        <figcaption>
          {t('officialPoster')} ·{' '}
          <a href={post.sourceUrl} target="_blank" rel="noopener noreferrer">
            {t('viewSource')} <ExternalLink aria-hidden="true" />
          </a>
        </figcaption>
      </figure>

      <article>
        <header className={styles.header}>
          <div className={styles.badges}>
            <span className={`${styles.status} ${styles[post.status]}`}>
              {t(`status_${post.status}`)}
            </span>
            <span className={styles.agency}>{post.agency}</span>
          </div>
          <h1>{post.title}</h1>
          <p className={styles.lead}>{post.excerpt}</p>
          <a
            className={styles.applyButton}
            href={post.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('officialApply')} <ExternalLink aria-hidden="true" />
          </a>
        </header>

        <section className={styles.summary} aria-labelledby="audition-summary-title">
          <h2 id="audition-summary-title">{t('summaryTitle')}</h2>
          <dl>
            <div>
              <dt><Building2 aria-hidden="true" />{t('agency')}</dt>
              <dd>{post.agency}</dd>
            </div>
            <div>
              <dt><CheckCircle2 aria-hidden="true" />{t('status')}</dt>
              <dd>{t(`status_${post.status}`)}</dd>
            </div>
            <div>
              <dt><Radio aria-hidden="true" />{t('mode')}</dt>
              <dd>{t(`mode_${post.mode}`)}</dd>
            </div>
            {post.applicationStart && post.applicationDeadline ? (
              <div>
                <dt><Clock3 aria-hidden="true" />{t('applicationPeriod')}</dt>
                <dd>
                  <time dateTime={post.applicationStart}>
                    {formatDate(post.applicationStart, locale, post.timezone, true)}
                  </time>
                  {' – '}
                  <time dateTime={post.applicationDeadline}>
                    {formatDate(post.applicationDeadline, locale, post.timezone, true)}
                  </time>
                </dd>
              </div>
            ) : (
              <div>
                <dt><Clock3 aria-hidden="true" />{t('applicationDeadline')}</dt>
                <dd>
                  {post.applicationDeadline ? (
                    <time dateTime={post.applicationDeadline}>
                      {formatDate(post.applicationDeadline, locale, post.timezone, true)}
                    </time>
                  ) : t('noFixedDeadline')}
                </dd>
              </div>
            )}
            {post.auditionDate && (
              <div>
                <dt><CalendarDays aria-hidden="true" />{t('auditionDate')}</dt>
                <dd>
                  <time dateTime={post.auditionDate}>
                    {formatDate(post.auditionDate, locale, post.timezone)}
                  </time>
                </dd>
              </div>
            )}
            {location && (
              <div>
                <dt><MapPin aria-hidden="true" />{t('location')}</dt>
                <dd>{location}</dd>
              </div>
            )}
            <div>
              <dt><Tags aria-hidden="true" />{t('categories')}</dt>
              <dd>{post.categories.join(' · ')}</dd>
            </div>
            <div>
              <dt><UserRoundCheck aria-hidden="true" />{t('eligibility')}</dt>
              <dd>{post.eligibility}</dd>
            </div>
          </dl>
        </section>

        <section className={styles.content} aria-label={t('detailsLabel')}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
        </section>

        <section className={styles.sourcePanel} aria-labelledby="source-title">
          <h2 id="source-title">{t('sourceTitle')}</h2>
          <p>{t('sourceBody')}</p>
          <dl>
            <div>
              <dt>{t('officialSource')}</dt>
              <dd>
                <a href={post.sourceUrl} target="_blank" rel="noopener noreferrer">
                  {post.agency} <ExternalLink aria-hidden="true" />
                </a>
              </dd>
            </div>
            <div>
              <dt>{t('verifiedAt')}</dt>
              <dd><time dateTime={post.verifiedAt}>{formatDate(post.verifiedAt, locale)}</time></dd>
            </div>
            <div>
              <dt>{t('updatedAt')}</dt>
              <dd><time dateTime={post.updatedAt}>{formatDate(post.updatedAt, locale)}</time></dd>
            </div>
          </dl>
        </section>
      </article>

      {relatedPosts.length > 0 && (
        <section className={styles.related} aria-labelledby="related-title">
          <h2 id="related-title">{t('relatedAuditions')}</h2>
          <div>
            {relatedPosts.map((related) => (
              <Link
                key={`${related.locale}:${related.slug}`}
                href={`/${related.locale}/auditions/${related.slug}`}
                lang={related.locale}
              >
                <span>{related.agency}</span>
                <strong>{related.title}</strong>
                <small>{t(`status_${related.status}`)}</small>
              </Link>
            ))}
          </div>
        </section>
      )}
    </PageFrame>
  );
}

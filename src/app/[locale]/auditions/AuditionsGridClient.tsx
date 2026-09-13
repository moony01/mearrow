'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CalendarDays, MapPin, Radio } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Pagination from '@/components/common/Pagination';
import type { AuditionMeta } from '@/lib/auditions';
import styles from './page.module.scss';

const PAGE_SIZE = 6;

interface AuditionsGridClientProps {
  posts: AuditionMeta[];
  locale: string;
}

function formatDate(value: string, locale: string, timezone?: string, includeTime = false) {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(dateOnly ? `${value}T12:00:00Z` : value);

  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    // Keep server and browser output identical across ICU implementations.
    ...(includeTime && !dateOnly
      ? { timeStyle: 'short' as const, hourCycle: 'h23' as const }
      : {}),
    timeZone: dateOnly ? 'UTC' : timezone,
  }).format(date);
}

function auditionPath(post: AuditionMeta) {
  return `/${post.locale}/auditions/${post.slug}`;
}

export default function AuditionsGridClient({ posts, locale }: AuditionsGridClientProps) {
  const t = useTranslations('Auditions');
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(posts.length / PAGE_SIZE);
  const activePage = Math.min(currentPage, Math.max(totalPages, 1));
  const displayedPosts = posts.slice((activePage - 1) * PAGE_SIZE, activePage * PAGE_SIZE);

  return (
    <section className={styles.grid} aria-label={t('listLabel')}>
      {displayedPosts.map((post) => {
        const isFallback = post.locale !== locale;
        const location = [post.city, post.country].filter(Boolean).join(', ');

        return (
          <article className={styles.card} key={`${post.locale}:${post.slug}`} lang={post.locale}>
            <Link className={styles.posterLink} href={auditionPath(post)}>
              {/* Official posters are remote assets and remain source-attributed. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.poster}
                alt={post.posterAlt}
                width={post.posterWidth}
                height={post.posterHeight}
                loading="lazy"
              />
              <span className={`${styles.status} ${styles[post.status]}`}>
                {t(`status_${post.status}`)}
              </span>
            </Link>

            <div className={styles.cardBody}>
              <div className={styles.agencyRow}>
                <span className={styles.agency}>{post.agency}</span>
                {isFallback && <span className={styles.languageNotice}>{t('englishOnly')}</span>}
              </div>

              <h2>
                <Link href={auditionPath(post)}>{post.title}</Link>
              </h2>
              <p className={styles.excerpt}>{post.excerpt}</p>

              <dl className={styles.facts}>
                <div>
                  <dt><Radio aria-hidden="true" />{t('mode')}</dt>
                  <dd>{t(`mode_${post.mode}`)}</dd>
                </div>
                {post.applicationDeadline ? (
                  <div>
                    <dt><CalendarDays aria-hidden="true" />{t('applicationDeadline')}</dt>
                    <dd>
                      <time dateTime={post.applicationDeadline}>
                        {formatDate(post.applicationDeadline, locale, post.timezone, true)}
                      </time>
                    </dd>
                  </div>
                ) : (
                  <div>
                    <dt><CalendarDays aria-hidden="true" />{t('applicationDeadline')}</dt>
                    <dd>{t('noFixedDeadline')}</dd>
                  </div>
                )}
                {location && (
                  <div>
                    <dt><MapPin aria-hidden="true" />{t('location')}</dt>
                    <dd>{location}</dd>
                  </div>
                )}
              </dl>

              <Link className={styles.readMore} href={auditionPath(post)}>
                {t('viewDetails')} <span aria-hidden="true">→</span>
              </Link>
            </div>
          </article>
        );
      })}

      <Pagination
        currentPage={activePage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        ariaLabel={t('paginationLabel')}
        previousGroupLabel={t('previousGroup')}
        previousLabel={t('previousPage')}
        nextLabel={t('nextPage')}
        nextGroupLabel={t('nextGroup')}
        pageLabel={(page) => t('pageLabel', { page })}
      />
    </section>
  );
}

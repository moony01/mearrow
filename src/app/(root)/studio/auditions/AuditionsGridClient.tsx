'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Calendar } from 'lucide-react';
import Pagination from '@/components/common/Pagination';
import AuditionViewCounter from '@/components/auditions/AuditionViewCounter';
import type { AuditionMeta } from '@/lib/auditions';
import styles from './page.module.scss';

const PAGE_SIZE = 6;

interface AuditionsGridClientProps {
  posts: AuditionMeta[];
  locale: string;
  basePath?: string;
  headingLevel?: 2 | 3;
}

function auditionPath(post: AuditionMeta, basePath?: string) {
  return `${basePath ?? `/${post.locale}/auditions`}/${post.slug}`;
}

export default function AuditionsGridClient({ posts, locale, basePath, headingLevel = 2 }: AuditionsGridClientProps) {
  const t = useTranslations('Auditions');
  const CardHeading = headingLevel === 3 ? 'h3' : 'h2';
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(posts.length / PAGE_SIZE);
  const activePage = Math.min(currentPage, Math.max(totalPages, 1));
  const displayedPosts = posts.slice((activePage - 1) * PAGE_SIZE, activePage * PAGE_SIZE);

  return (
    <section className={styles.grid} aria-label={t('listLabel')}>
      {displayedPosts.map((post) => {
        const isFallback = post.locale !== locale;

        return (
          <article className={styles.card} key={`${post.locale}:${post.slug}`}>
            <Link
              className={styles.cardLink}
              href={auditionPath(post, basePath)}
              aria-label={post.title}
              lang={post.locale}
            >
              <div className={styles.poster}>
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
              </div>

              <div className={styles.cardBody}>
                <div className={styles.agencyRow}>
                  <span className={styles.agency}>{post.agency}</span>
                  {isFallback && <span className={styles.languageNotice}>{t('englishOnly')}</span>}
                </div>

                <CardHeading>{post.title}</CardHeading>
                <p className={styles.excerpt}>{post.excerpt}</p>
                <div className={styles.metaRow}>
                  <time className={styles.date} dateTime={post.publishedAt}>
                    <Calendar size={14} aria-hidden="true" />
                    <span>
                      {new Intl.DateTimeFormat(locale, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        timeZone: 'UTC',
                      }).format(new Date(`${post.publishedAt.slice(0, 10)}T12:00:00Z`))}
                    </span>
                  </time>
                  <AuditionViewCounter slug={post.slug} />
                </div>
              </div>
            </Link>
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

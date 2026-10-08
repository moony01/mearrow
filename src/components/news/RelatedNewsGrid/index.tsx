'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ExportedImage from 'next-image-export-optimizer';
import { Eye, MessageCircle } from 'lucide-react';
import { getNewsCommentCounts } from '@/lib/api/news-comments';
import { getNewsViewCounts } from '@/lib/api/news-views';
import styles from './RelatedNewsGrid.module.scss';

interface RelatedPost {
  slug: string;
  title: string;
  date: string;
  category?: string;
  thumbnail?: string;
}

interface RelatedNewsGridProps {
  posts: RelatedPost[];
  locale: string;
}

/**
 * 관련 뉴스 그리드 클라이언트 컴포넌트
 * 조회수와 댓글 수를 배치 조회하여 각 카드에 표시
 */
export default function RelatedNewsGrid({ posts, locale }: RelatedNewsGridProps) {
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (posts.length === 0) return;

    const controller = new AbortController();
    const slugs = posts.map((p) => p.slug);

    // 댓글 수 + 조회수 배치 조회
    getNewsCommentCounts(slugs, controller.signal).then((counts) => {
      if (!controller.signal.aborted) {
        setCommentCounts(counts);
      }
    });
    getNewsViewCounts(slugs).then(setViewCounts);

    const abortOnPageHide = () => controller.abort();
    window.addEventListener('pagehide', abortOnPageHide);

    return () => {
      window.removeEventListener('pagehide', abortOnPageHide);
      controller.abort();
    };
  }, [posts]);

  return (
    <div className={styles.relatedGrid}>
      {posts.map((related) => (
        <Link
          key={related.slug}
          href={`/news/${related.slug}`}
          className={styles.relatedCard}
        >
          <div className={styles.relatedImage}>
            {related.thumbnail ? (
              <ExportedImage
                src={related.thumbnail}
                alt={related.title}
                width={400}
                height={210}
                sizes="(max-width: 768px) 100vw, 250px"
                unoptimized={
                  process.env.NODE_ENV === 'development' ||
                  process.env.NEXT_PUBLIC_RUNTIME_TARGET === 'workers'
                }
              />
            ) : (
              <div className={styles.relatedPlaceholder}>
                <span>📰</span>
              </div>
            )}
          </div>
          <div className={styles.relatedInfo}>
            {related.category && (
              <span className={styles.relatedCategory}>{related.category}</span>
            )}
            <h4 className={styles.relatedCardTitle}>{related.title}</h4>
            <div className={styles.relatedMeta}>
              <time className={styles.relatedDate}>
                {new Date(related.date).toLocaleDateString(locale, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </time>
              <div className={styles.relatedStats}>
                {(viewCounts[related.slug] ?? 0) > 0 && (
                  <span className={styles.relatedStat}>
                    <Eye size={11} />
                    {viewCounts[related.slug]}
                  </span>
                )}
                {(commentCounts[related.slug] ?? 0) > 0 && (
                  <span className={styles.relatedStat}>
                    <MessageCircle size={11} />
                    {commentCounts[related.slug]}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

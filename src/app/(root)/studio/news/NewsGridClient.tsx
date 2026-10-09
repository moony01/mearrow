'use client';

/**
 * 뉴스 그리드 클라이언트 컴포넌트
 *
 * 배치 댓글 수 조회와 페이지 이동
 */

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { getNewsCommentCounts } from '@/lib/api/news-comments';
import NewsCard from '@/components/news/NewsCard';
import Pagination from '@/components/common/Pagination';

interface NewsPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  category?: string;
  thumbnail?: string;
  sourceCount?: number;
}

interface NewsGridClientProps {
  posts: NewsPost[];
  locale: string;
  basePath?: string;
}

const PAGE_SIZE = 6;

export default function NewsGridClient({ posts, locale, basePath = '/studio/news' }: NewsGridClientProps) {
  const t = useTranslations('News');
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(posts.length / PAGE_SIZE);
  const activePage = Math.min(currentPage, Math.max(totalPages, 1));
  const displayedPosts = useMemo(
    () => posts.slice((activePage - 1) * PAGE_SIZE, activePage * PAGE_SIZE),
    [activePage, posts],
  );
  const displayedSlugs = useMemo(
    () => displayedPosts.map((post) => post.slug),
    [displayedPosts],
  );

  // 현재 페이지에 표시되는 뉴스의 댓글 수만 배치 조회
  useEffect(() => {
    if (displayedSlugs.length === 0) return;

    const controller = new AbortController();

    getNewsCommentCounts(displayedSlugs, controller.signal).then((counts) => {
      if (!controller.signal.aborted) {
        setCommentCounts((previous) => ({ ...previous, ...counts }));
      }
    });

    const abortOnPageHide = () => controller.abort();
    window.addEventListener('pagehide', abortOnPageHide);

    return () => {
      window.removeEventListener('pagehide', abortOnPageHide);
      controller.abort();
    };
  }, [displayedSlugs]);

  return (
    <>
      {displayedPosts.map((post) => (
        <NewsCard
          key={post.slug}
          slug={post.slug}
          title={post.title}
          excerpt={post.excerpt}
          date={post.date}
          category={post.category}
          thumbnail={post.thumbnail}
          sourceCount={post.sourceCount}
          sourceCountLabel={t('sourcesLabel', { count: post.sourceCount ?? 0 })}
          locale={locale}
          basePath={basePath}
          commentCount={commentCounts[post.slug] ?? 0}
        />
      ))}

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

    </>
  );
}

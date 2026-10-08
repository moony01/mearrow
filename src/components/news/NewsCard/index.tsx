'use client';

import Link from 'next/link';
import ExportedImage from 'next-image-export-optimizer';
import { BookOpen, Calendar, Tag, MessageCircle } from 'lucide-react';
import NewsViewCounter from '@/components/news/NewsViewCounter';
import styles from './NewsCard.module.scss';

/**
 * NewsCard 컴포넌트 Props
 */
interface NewsCardProps {
  /** URL용 식별자 */
  slug: string;
  /** 기사 제목 */
  title: string;
  /** 기사 요약문 */
  excerpt: string;
  /** 작성일 (YYYY-MM-DD) */
  date: string;
  /** 카테고리 */
  category?: string;
  /** 썸네일 이미지 경로 */
  thumbnail?: string;
  /** 언어 코드 */
  locale: string;
  /** Override the article route for the locale-less Studio archive. */
  basePath?: string;
  /** 댓글 수 (목록에서 배치 조회) */
  commentCount?: number;
  /** 본문에 연결된 외부 출처 수 */
  sourceCount?: number;
  /** 출처 수를 설명하는 현재 로케일 문자열 */
  sourceCountLabel?: string;
}

/**
 * 뉴스 카드 컴포넌트
 * 뉴스 목록 페이지에서 각 기사를 카드 형태로 표시
 */
export default function NewsCard({
  slug,
  title,
  excerpt,
  date,
  category = 'General',
  thumbnail,
  locale,
  basePath = '/studio/news',
  commentCount,
  sourceCount = 0,
  sourceCountLabel,
}: NewsCardProps) {
  // 날짜 포맷팅 (YYYY-MM-DD → 로케일에 맞게)
  const formattedDate = new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Link href={`${basePath}/${slug}`} className={styles.card}>
      {/* 썸네일 영역 */}
      <div className={styles.thumbnailWrapper}>
        {thumbnail ? (
          <ExportedImage
            src={thumbnail}
            alt={title}
            width={400}
            height={225}
            sizes="(max-width: 768px) 100vw, 400px"
            unoptimized={
              process.env.NODE_ENV === 'development' ||
              process.env.NEXT_PUBLIC_RUNTIME_TARGET === 'workers'
            }
            className={styles.thumbnail}
          />
        ) : (
          <div className={styles.placeholderThumbnail}>
            <span>📰</span>
          </div>
        )}
      </div>

      {/* 콘텐츠 영역 */}
      <div className={styles.content}>
        {/* 카테고리 뱃지 */}
        <div className={styles.category}>
          <Tag size={12} />
          <span>{category}</span>
        </div>

        {/* 제목 */}
        <h3 className={styles.title}>{title}</h3>

        {/* 요약문 */}
        <p className={styles.excerpt}>{excerpt}</p>

        {/* 날짜 + 조회수 */}
        <div className={styles.metaRow}>
          <div className={styles.date}>
            <Calendar size={14} />
            <span>{formattedDate}</span>
          </div>
          <div className={styles.metaRight}>
            {sourceCount > 0 && (
              <span className={styles.sourceCount} aria-label={sourceCountLabel}>
                <BookOpen size={12} />
                <span>{sourceCountLabel || sourceCount}</span>
              </span>
            )}
            {(commentCount ?? 0) > 0 && (
              <span className={styles.commentCount}>
                <MessageCircle size={12} />
                <span>{commentCount}</span>
              </span>
            )}
            <NewsViewCounter slug={slug} iconSize={12} />
          </div>
        </div>
      </div>
    </Link>
  );
}

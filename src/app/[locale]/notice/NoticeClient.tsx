'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { getAnnouncements } from '@/lib/api/announcements';
import { getNoticeCommentCounts } from '@/lib/api/notice-comments';
import type { AnnouncementCategory, AnnouncementListItem } from '@/types/announcement';
import NoticeList from '@/components/features/notice/NoticeList';
import CategoryFilter from '@/components/features/notice/CategoryFilter';
import styles from './page.module.scss';

interface NoticeClientProps {
  locale: string;
  initialNotices?: AnnouncementListItem[];
}

/**
 * 공지사항 목록 클라이언트 컴포넌트
 * 목록 조회 + 카테고리 필터링
 * 상세보기는 /notice/[id] 페이지로 이동
 */
export default function NoticeClient({ locale, initialNotices }: NoticeClientProps) {
  const t = useTranslations('Notice');

  const [notices, setNotices] = useState<AnnouncementListItem[]>(initialNotices ?? []);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [selectedCategory, setSelectedCategory] = useState<AnnouncementCategory | undefined>(undefined);
  const [loading, setLoading] = useState(initialNotices === undefined);
  const [error, setError] = useState(false);

  /** 공지사항 목록 조회 + 댓글 수 배치 조회 */
  const fetchNotices = useCallback(async (preserveVisibleContent = false) => {
    try {
      if (!preserveVisibleContent) {
        setLoading(true);
      }
      setError(false);
      const data = await getAnnouncements(selectedCategory, locale);
      setNotices(data);

      // 댓글 수 배치 조회
      if (data.length > 0) {
        const ids = data.map((n) => n.id);
        const counts = await getNoticeCommentCounts(ids);
        setCommentCounts(counts);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, locale]);

  useEffect(() => {
    void fetchNotices(initialNotices !== undefined && selectedCategory === undefined);
  }, [fetchNotices, initialNotices, selectedCategory]);

  /** 카테고리 필터 변경 */
  const handleCategoryChange = (category?: AnnouncementCategory) => {
    setSelectedCategory(category);
  };

  return (
    <div className={styles.noticePage}>
      <div className={styles.container}>
        {/* 카테고리 필터 */}
        <CategoryFilter
          selected={selectedCategory}
          onChange={handleCategoryChange}
        />

        {/* 로딩 상태 */}
        {loading && notices.length === 0 && (
          <div className={styles.statusMessage}>
            <p>{t('loading')}</p>
          </div>
        )}

        {/* 에러 상태 */}
        {error && !loading && (
          <div className={styles.statusMessage}>
            <p>{t('error')}</p>
            <button type="button" className={styles.retryButton} onClick={() => void fetchNotices()}>
              {t('retry')}
            </button>
          </div>
        )}

        {/* 공지사항 목록 */}
        {!error && (
          <>
            {notices.length === 0 ? (
              <div className={styles.statusMessage}>
                <p>{t('no_notices')}</p>
              </div>
            ) : (
              <NoticeList
                notices={notices}
                locale={locale}
                commentCounts={commentCounts}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

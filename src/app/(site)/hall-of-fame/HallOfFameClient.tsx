/**
 * HallOfFameClient (클라이언트 컴포넌트)
 *
 * 명예의 전당 페이지의 클라이언트 사이드 로직
 * SSG 정적 셸에서 렌더링되고, SWR로 클라이언트에서 데이터 로드
 *
 * @updated Phase 5 - SSG/CSR 마이그레이션
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useHallOfFame } from '@/hooks/useHallOfFame';
import type { HallOfFameData } from '@/types/hall-of-fame';

// Feature Components
import GrandChampionCard from '@/components/features/hall-of-fame/GrandChampionCard';
import CurrentRaceChart from '@/components/features/hall-of-fame/CurrentRaceChart';
import MonthlyTimeline from '@/components/features/hall-of-fame/MonthlyTimeline';

import styles from './page.module.scss';

/**
 * 로딩 스켈레톤 컴포넌트
 * 기록표의 행 구조를 유지하는 최소 스켈레톤
 */
function LoadingSkeleton() {
  const t = useTranslations('HallOfFame');

  return (
    <div className={styles.skeletonContainer} role="status" aria-label={t('loading')}>
      <div className={styles.skeletonTitle} />
      <div className={styles.skeletonSummary} />
      <div className={styles.skeletonTitle} />
      <div className={styles.skeletonRows}>
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className={styles.skeletonRow} />
        ))}
      </div>
    </div>
  );
}

/**
 * 에러 상태 컴포넌트
 * 재시도 버튼과 에러 메시지 표시
 */
interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

function ErrorState({ message, onRetry }: ErrorStateProps) {
  const t = useTranslations('HallOfFame');
  const tCommon = useTranslations('Common');

  return (
    <div className={styles.errorContainer}>
      <div className={styles.errorContent}>
        <h2 className={styles.errorTitle}>{tCommon('error')}</h2>
        <p className={styles.errorMessage}>{message}</p>
        <button className={styles.retryButton} onClick={onRetry}>
          {t('retry')}
        </button>
      </div>
    </div>
  );
}

/**
 * 빈 상태 컴포넌트
 * 데이터가 없을 때 안내 메시지 표시
 */
function EmptyState() {
  const t = useTranslations('HallOfFame');

  return (
    <div className={styles.emptyContainer}>
      <div className={styles.emptyContent}>
        <h2 className={styles.emptyTitle}>{t('no_champion_yet')}</h2>
        <p className={styles.emptyMessage}>{t('empty_description')}</p>
      </div>
    </div>
  );
}

/**
 * 명예의 전당 클라이언트 컴포넌트
 */
export default function HallOfFameClient({
  initialData,
}: {
  initialData?: HallOfFameData | null;
}) {
  const { data, isLoading, error, getMonthlyChampions, getYearlyRace, refresh } = useHallOfFame(initialData);

  // null이면 데이터가 제공하는 현재 연도를 그대로 사용한다.
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  // 로딩 상태 - 스켈레톤 UI 표시
  if (isLoading && !data) {
    return (
      <div className={styles.container}>
        <LoadingSkeleton />
      </div>
    );
  }

  // 에러 상태 - 재시도 버튼 포함
  if (error) {
    return (
      <div className={styles.container}>
        <ErrorState message={error} onRetry={refresh} />
      </div>
    );
  }

  // 데이터가 없는 경우
  if (!data) {
    return (
      <div className={styles.container}>
        <EmptyState />
      </div>
    );
  }

  const activeYear = selectedYear ?? data.currentYear;
  const firstArchiveYear = Math.min(2023, data.currentYear);
  const availableYears = Array.from(
    { length: data.currentYear - firstArchiveYear + 1 },
    (_, index) => data.currentYear - index,
  );
  const monthlyChampions = getMonthlyChampions(activeYear);
  const yearlyRace = getYearlyRace(data.currentYear);

  return (
    <div className={styles.container}>
      {data.latestGrandChampion ? (
        <GrandChampionCard champion={data.latestGrandChampion} />
      ) : (
        <EmptyState />
      )}

      <CurrentRaceChart year={data.currentYear} data={yearlyRace} />

      <MonthlyTimeline
        year={activeYear}
        currentYear={data.currentYear}
        champions={monthlyChampions}
        availableYears={availableYears}
        onYearChange={setSelectedYear}
      />
    </div>
  );
}

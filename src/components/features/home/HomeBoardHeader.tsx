'use client';

import { Loader2, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { SeasonInfo } from '@/types/league';
import styles from '@/app/(site)/page.module.scss';

export const HOME_VOTE_HELPER_ID = 'home-vote-helper';

export function formatHomeSeasonLabel(year: number, month: number): string {
  return `${year}년 ${String(month).padStart(2, '0')}시즌`;
}

export function formatHomeDdayLabel(daysRemaining: number): string {
  const days = Number.isFinite(daysRemaining)
    ? Math.max(0, Math.floor(daysRemaining))
    : 0;
  return `D-${days}`;
}

export interface HomeBoardHeaderProps {
  season: Pick<SeasonInfo, 'year' | 'month' | 'daysRemaining'>;
  quotaRemaining: number;
  countdown: number;
  isRefreshing: boolean;
  /** Show the home-only card voting guidance below the season label. */
  showVoteHelper?: boolean;
  voteHelperMax?: number;
}

/** The small context row shared by the home board and every board embed. */
export default function HomeBoardHeader({
  season,
  quotaRemaining,
  countdown,
  isRefreshing,
  showVoteHelper = false,
  voteHelperMax = 100,
}: HomeBoardHeaderProps) {
  const t = useTranslations('Vote');

  return (
    <header className={styles.homeHeader} aria-label="현재 시즌">
      <div className={styles.seasonContext}>
        <span className={styles.seasonLabel} data-testid="home-season-label">
          {formatHomeSeasonLabel(season.year, season.month)}
        </span>
        {showVoteHelper && (
          <span
            id={HOME_VOTE_HELPER_ID}
            className={styles.homeVoteHelper}
            data-testid={HOME_VOTE_HELPER_ID}
            style={{ pointerEvents: 'none' }}
          >
            {t('card_power_hint', {
              max: voteHelperMax,
              defaultValue: `* Long-press the card to vote ${voteHelperMax} times`,
            })}
          </span>
        )}
      </div>

      <div className={styles.homeHeaderMeta}>
        <span
          className={styles.todayVotes}
          data-testid="home-today-votes"
          aria-label={`오늘 남은 투표권 ${quotaRemaining.toLocaleString()}표`}
        >
          오늘 {quotaRemaining.toLocaleString()}표 남음
        </span>

        <span
          className={styles.refreshIndicator}
          data-testid="home-refresh-indicator"
          data-refreshing={isRefreshing}
          aria-label={isRefreshing ? '데이터 갱신 중' : `다음 갱신까지 ${countdown}초`}
        >
          {isRefreshing ? (
            <Loader2
              className={styles.refreshIcon}
              data-testid="home-refresh-spinner"
              size={13}
              aria-hidden="true"
            />
          ) : (
            <RefreshCw
              className={styles.refreshIcon}
              data-testid="home-refresh-icon"
              size={13}
              aria-hidden="true"
            />
          )}
          <span>{isRefreshing ? '갱신 중…' : `${countdown}초`}</span>
        </span>

        <span
          className={styles.seasonDday}
          data-testid="home-season-dday"
          data-urgent={season.daysRemaining <= 1}
        >
          {formatHomeDdayLabel(season.daysRemaining)}
        </span>
      </div>
    </header>
  );
}

/**
 * MEARROW home client surface.
 *
 * The home keeps the current brand/header shell, while the vote surface uses
 * the legacy ranking cards with the vote action attached directly to each card.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import type { CompaniesResponse } from '@/types/api';
import { useLeagueData } from '@/hooks/useLeagueData';
import { useAuth } from '@/hooks/useAuth';
import { useVoteQuota } from '@/hooks/useVoteQuota';
import { useRefreshCountdown } from '@/hooks/useRefreshCountdown';
import HomeBoardHeader, {
  HOME_VOTE_HELPER_ID,
} from '@/components/features/home/HomeBoardHeader';
import VoteBoard from '@/components/features/vote/VoteBoard';
import styles from './page.module.scss';

const BottomSheet = dynamic(() => import('@/components/ui/BottomSheet'), { ssr: false });
const VoteController = dynamic(() => import('@/components/features/VoteController'), {
  ssr: false,
});
const Modal = dynamic(() => import('@/components/common/Modal'), { ssr: false });

export {
  formatHomeDdayLabel,
  formatHomeSeasonLabel,
} from '@/components/features/home/HomeBoardHeader';
export { HOME_DIRECT_VOTE_UNIT, getDirectVoteAmount as getHomeDirectVoteAmount } from '@/lib/home-vote';

interface HomeClientProps {
  initialData?: CompaniesResponse | null;
  embedded?: boolean;
  progressiveRanking?: boolean;
}

interface EventModalCopy {
  title: string;
  guestLabel: string;
  guestVotes: string;
  memberLabel: string;
  memberVotes: string;
  dailyLabel: string;
  note: string;
  primaryCta: string;
  closeCta: string;
}

const EVENT_MODAL_COPY: Record<string, EventModalCopy> = {
  ko: {
    title: '비로그인 투표권을 모두 사용했어요',
    guestLabel: '비로그인',
    guestVotes: '100표',
    memberLabel: '로그인',
    memberVotes: '300표',
    dailyLabel: '매일',
    note: '비로그인 투표권은 UTC 자정에 다시 충전됩니다.',
    primaryCta: '로그인 / 회원가입하기',
    closeCta: '닫기',
  },
  en: {
    title: 'You used all guest votes',
    guestLabel: 'Guest',
    guestVotes: '100 votes',
    memberLabel: 'Logged in',
    memberVotes: '300 votes',
    dailyLabel: 'daily',
    note: 'Guest votes refresh at midnight UTC.',
    primaryCta: 'Log in / Sign up',
    closeCta: 'Close',
  },
};

function normalizeVoteDockCompany(value?: string | null) {
  return (value ?? '')
    .toLocaleLowerCase()
    .replace(/entertainment|records|label/g, '')
    .replace(/[^a-z0-9가-힣]/g, '');
}

/** Keep the legacy home shell while making each ranking card the vote surface. */
export function HomeClient({ initialData, embedded = false, progressiveRanking = false }: HomeClientProps = {}) {
  const locale = useLocale();
  const { user, isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const {
    premierLeague,
    allCompanies,
    season,
    isLoading,
    error,
    refresh,
  } = useLeagueData({
    refreshInterval: 20000,
    fallbackData: initialData ?? undefined,
  });
  const {
    quota,
    useVote: consumeVote,
    refetchStats,
    isLoading: isQuotaLoading,
  } = useVoteQuota(user?.id);
  const { countdown, isRefreshing } = useRefreshCountdown({
    intervalMs: 20000,
    refreshingDurationMs: 1500,
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const [visibleRankLimit, setVisibleRankLimit] = useState(5);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  const eventModalCopy = EVENT_MODAL_COPY[locale] ?? EVENT_MODAL_COPY.en;
  const handleVote = useCallback(() => undefined, []);

  useEffect(() => {
    if (allCompanies.length === 0) return;

    const requestedCompany = new URLSearchParams(window.location.search).get('voteCompany');
    if (!requestedCompany) return;

    const normalizedRequest = normalizeVoteDockCompany(requestedCompany);
    const matchedCompany = allCompanies.find((company) =>
      [company.companyId, company.companyName, company.nameEn, company.nameKo].some(
        (candidate) => normalizeVoteDockCompany(candidate) === normalizedRequest,
      ),
    );
    if (!matchedCompany) return;

    window.requestAnimationFrame(() => {
      const target = Array.from(
        document.querySelectorAll<HTMLElement>('[data-company-id]'),
      ).find((element) => element.dataset.companyId === matchedCompany.companyId);
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, [allCompanies]);

  const handleVoteSuccess = useCallback(() => {
    void refetchStats();
    void refresh();
  }, [refetchStats, refresh]);

  const handleGuestQuotaExhausted = useCallback(() => {
    if (isAuthLoading || isAuthenticated) return;
    setIsEventModalOpen(true);
  }, [isAuthLoading, isAuthenticated]);

  const handleRankLimitToggle = useCallback(() => {
    setVisibleRankLimit((current) => {
      if (current < 10) return 10;
      if (current < 20 && allCompanies.length > 10) return 20;
      return 5;
    });
  }, [allCompanies.length]);

  if (isLoading && allCompanies.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Loading league data...</p>
      </div>
    );
  }

  if (error && allCompanies.length === 0) {
    return (
      <div className={styles.errorContainer}>
        <p>Failed to load data</p>
        <button type="button" onClick={() => void refresh()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      className={`${styles.dashboardContainer} ${embedded ? styles.embeddedDashboard : ''}`}
      data-visible-rank-limit={progressiveRanking ? visibleRankLimit : undefined}
    >
      <HomeBoardHeader
        locale={locale}
        season={season}
        quotaRemaining={quota.remaining}
        countdown={countdown}
        isRefreshing={isRefreshing}
        showVoteHelper
        voteHelperMax={100}
      />

      <VoteBoard
        premierLeague={premierLeague}
        allCompanies={allCompanies}
        selectedCompanyId={null}
        selectedCompany={null}
        selectedSubLabelId={null}
        selectedArtistName={null}
        isExpanded={progressiveRanking ? visibleRankLimit > 5 : isExpanded}
        isSheetOpen={false}
        isMobile={false}
        onVote={handleVote}
        onVoteSuccess={handleVoteSuccess}
        onGuestQuotaExhausted={handleGuestQuotaExhausted}
        onToggleExpand={progressiveRanking
          ? handleRankLimitToggle
          : () => setIsExpanded((current) => !current)}
        onSheetClose={() => undefined}
        voteControllerComponent={VoteController}
        bottomSheetComponent={BottomSheet}
        panelId="vote-station"
        layoutClassName=""
        showLeagueHeader={false}
        showSearchBar={false}
        interactionMode="direct"
        voteSurfaceDescriptionId={HOME_VOTE_HELPER_ID}
        quotaController={{ quota, useVote: consumeVote, isLoading: isQuotaLoading }}
        rankDisplayLimit={progressiveRanking ? visibleRankLimit : undefined}
        toggleLabel={progressiveRanking
          ? (visibleRankLimit > 5 && (visibleRankLimit >= 20 || allCompanies.length <= visibleRankLimit)
            ? 'Show less'
            : 'Show more')
          : undefined}
        collapseLabel={progressiveRanking ? 'Show less' : undefined}
      />

      <Modal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        title={eventModalCopy.title}
      >
        <div className={styles.eventModalContent}>
          <div className={styles.eventVoteComparison} aria-label={eventModalCopy.title}>
            <div className={styles.eventVoteOption}>
              <span className={styles.eventVoteLabel}>{eventModalCopy.guestLabel}</span>
              <strong className={styles.eventVoteAmount}>{eventModalCopy.guestVotes}</strong>
            </div>
            <div className={`${styles.eventVoteOption} ${styles.eventVoteOptionFeatured}`}>
              <span className={styles.eventVoteLabel}>{eventModalCopy.memberLabel}</span>
              <strong className={styles.eventVoteAmount}>
                {eventModalCopy.memberVotes}
                <small>{eventModalCopy.dailyLabel}</small>
              </strong>
            </div>
          </div>
          <p className={styles.eventModalNote}>{eventModalCopy.note}</p>
          <div className={styles.eventModalActions}>
            <Link href={`/signup`} className={styles.eventPrimaryBtn}>
              {eventModalCopy.primaryCta}
            </Link>
            <button
              type="button"
              onClick={() => setIsEventModalOpen(false)}
              className={styles.eventDismissBtn}
            >
              {eventModalCopy.closeCta}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default HomeClient;

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLeagueData } from '@/hooks/useLeagueData';
import { useAuth } from '@/hooks/useAuth';
import { useVoteQuota } from '@/hooks/useVoteQuota';
import { useRefreshCountdown } from '@/hooks/useRefreshCountdown';
import type { CompaniesResponse } from '@/types/api';
import BottomSheet from '@/components/ui/BottomSheet';
import VoteController from '@/components/features/VoteController';
import {
  KPOPFACE_EMBED_VOTE_POLICY,
  WEB_VOTE_POLICY,
} from '@/components/features/VoteController/votePolicy';
import HomeBoardHeader from '@/components/features/home/HomeBoardHeader';
import VoteBoard from '@/components/features/vote/VoteBoard';
import { BRAND_NAME } from '@/lib/brand';
import { SITE_URL } from '@/lib/constants';
import styles from '@/app/(site)/page.module.scss';
import embedStyles from './VoteBoardEmbedClient.module.scss';

export type VoteBoardSurface = 'kcl-modal' | 'kpopface' | 'partner';

export interface VoteBoardEmbedOptions {
  surface: VoteBoardSurface;
  showAds: boolean;
}

const EMBED_MESSAGE_SOURCE = 'kcl-kpopface-embed';
const EMBED_PARENT_ORIGINS = new Set([
  'https://moony01.com',
  'https://www.moony01.com',
  'http://localhost:4000',
  'http://127.0.0.1:4000',
]);

const TOP_TEN_COPY: Record<string, { expand: string; collapse: string }> = {
  ko: { expand: '10위까지 보기', collapse: '접기' },
  en: { expand: 'Show top 10', collapse: 'Collapse' },
  ja: { expand: '10位まで見る', collapse: '閉じる' },
  zh: { expand: '查看前10名', collapse: '收起' },
  es: { expand: 'Ver top 10', collapse: 'Cerrar' },
  fr: { expand: 'Voir le top 10', collapse: 'Réduire' },
  de: { expand: 'Top 10 anzeigen', collapse: 'Einklappen' },
};

const KPOPFACE_SIGNUP_COPY: Record<string, string> = {
  ko: `${BRAND_NAME} 가입하고 매일 300표 받기`,
  en: `Join ${BRAND_NAME} for 300 votes every day`,
  ja: `${BRAND_NAME}に登録して毎日300票を使う`,
  zh: `注册 ${BRAND_NAME}，每天获得 300 票`,
  es: `Regístrate en ${BRAND_NAME} y consigue 300 votos diarios`,
  fr: `Inscris-toi sur ${BRAND_NAME} pour 300 votes par jour`,
  de: `Bei ${BRAND_NAME} registrieren und täglich 300 Stimmen erhalten`,
};

const ALLOWED_SURFACES = new Set<VoteBoardSurface>(['kcl-modal', 'kpopface', 'partner']);

export function parseVoteBoardEmbedOptions(search: string): VoteBoardEmbedOptions {
  const params = new URLSearchParams(search);
  const requestedSurface = params.get('surface') as VoteBoardSurface | null;

  return {
    surface:
      requestedSurface && ALLOWED_SURFACES.has(requestedSurface) ? requestedSurface : 'partner',
    showAds: params.get('ads') === 'on',
  };
}

function getParentReturnUrl(): string {
  if (typeof document === 'undefined') return `${SITE_URL}/`;

  try {
    const referrer = document.referrer ? new URL(document.referrer) : null;
    if (referrer && EMBED_PARENT_ORIGINS.has(referrer.origin)) {
      return `${referrer.origin}/kpopface/`;
    }
  } catch {
    // Invalid referrer falls back to the MEARROW page.
  }

  return `${SITE_URL}/`;
}

function postEmbedMessage(message: Record<string, unknown>) {
  if (typeof window === 'undefined' || window.parent === window) return;
  window.parent.postMessage({ source: EMBED_MESSAGE_SOURCE, ...message }, '*');
}

export default function VoteBoardEmbedClient({
  locale,
  surfaceOverride,
  initialData,
}: {
  locale: string;
  surfaceOverride?: VoteBoardSurface;
  initialData?: CompaniesResponse | null;
}) {
  const {
    premierLeague,
    allCompanies,
    season,
    isLoading,
    error,
    refresh,
  } = useLeagueData({ refreshInterval: 20000, fallbackData: initialData });
  const { user } = useAuth();
  const [options, setOptions] = useState<VoteBoardEmbedOptions>({
    surface: 'partner',
    showAds: false,
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { countdown, isRefreshing } = useRefreshCountdown({
    intervalMs: 20000,
    refreshingDurationMs: 1500,
  });
  const isKpopfaceSurface = options.surface === 'kpopface';
  const {
    quota,
    useVote: consumeVote,
    refetchStats,
    isLoading: isQuotaLoading,
  } = useVoteQuota(user?.id, {
    guestDailyLimit: isKpopfaceSurface ? KPOPFACE_EMBED_VOTE_POLICY.guestDailyLimit : undefined,
    storageKey: isKpopfaceSurface ? KPOPFACE_EMBED_VOTE_POLICY.storageKey : undefined,
  });

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const parsed = parseVoteBoardEmbedOptions(window.location.search);
      const hasExplicitSurface = new URLSearchParams(window.location.search).has('surface');
      setOptions({
        ...parsed,
        surface: surfaceOverride && !hasExplicitSurface ? surfaceOverride : parsed.surface,
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [surfaceOverride]);

  const handleVote = useCallback(() => undefined, []);

  const handleSearchSelect = useCallback(
    (companyId: string) => {
      const target = Array.from(
        document.querySelectorAll<HTMLElement>('[data-company-id]'),
      ).find((element) => element.dataset.companyId === companyId);
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
    [],
  );

  const handleVoteSuccess = useCallback(() => {
    postEmbedMessage({ type: 'vote_success' });
    void refetchStats();
    void refresh();
  }, [refetchStats, refresh]);

  const handleKpopfaceQuotaExhausted = useCallback(() => {
    if (options.surface === 'kpopface') {
      setShowLoginPrompt(true);
      postEmbedMessage({ type: 'quota_exhausted' });
    }
  }, [options.surface]);

  const handleKpopfaceLogin = useCallback(() => {
    const returnTo = getParentReturnUrl();
    postEmbedMessage({ type: 'auth_required', returnTo });
    window.top?.location.assign(
      `${SITE_URL}/login?returnTo=${encodeURIComponent(returnTo)}`,
    );
  }, []);

  const topTenCopy = TOP_TEN_COPY[locale] ?? TOP_TEN_COPY.en;
  const signupLocale = KPOPFACE_SIGNUP_COPY[locale] ? locale : 'en';
  const signupCopy = KPOPFACE_SIGNUP_COPY[signupLocale];
  const votePolicy = isKpopfaceSurface ? KPOPFACE_EMBED_VOTE_POLICY : WEB_VOTE_POLICY;

  const notifyResize = useCallback(() => {
    if (typeof window === 'undefined' || window.parent === window) return;

    const height = Math.ceil(
      containerRef.current?.getBoundingClientRect().height
      || document.documentElement.scrollHeight,
    );

    postEmbedMessage({ type: 'resize', height });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const observer = container && typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(notifyResize)
      : null;

    if (container && observer) observer.observe(container);
    const frame = window.requestAnimationFrame(notifyResize);

    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [
    allCompanies.length,
    isExpanded,
    isRefreshing,
    notifyResize,
    options.showAds,
    options.surface,
    showLoginPrompt,
  ]);

  if (isLoading && allCompanies.length === 0) {
    return (
      <main className={styles.loadingContainer} data-testid="vote-board-embed-loading">
        <div className={styles.spinner} />
        <p>Loading league data...</p>
      </main>
    );
  }

  if (error && allCompanies.length === 0) {
    return (
      <main className={styles.errorContainer} data-testid="vote-board-embed-error">
        <p>Failed to load data</p>
        <button type="button" onClick={() => void refresh()}>
          Retry
        </button>
      </main>
    );
  }

  return (
    <div ref={containerRef}>
      <main
        className={`${styles.dashboardContainer} ${embedStyles.embedDashboard}`}
        data-surface={options.surface}
        data-ads={options.showAds ? 'on' : 'off'}
        data-testid="vote-board-embed"
      >
        <HomeBoardHeader
          season={season}
          quotaRemaining={quota.remaining}
          countdown={countdown}
          isRefreshing={isRefreshing}
        />

        <VoteBoard
          premierLeague={premierLeague}
          allCompanies={allCompanies}
          selectedCompanyId={null}
          selectedCompany={null}
          selectedSubLabelId={null}
          selectedArtistName={null}
          isExpanded={isExpanded}
          isSheetOpen={false}
          isMobile={false}
          onVote={handleVote}
          onSearchSelect={handleSearchSelect}
          onVoteSuccess={handleVoteSuccess}
          onGuestQuotaExhausted={isKpopfaceSurface ? handleKpopfaceQuotaExhausted : undefined}
          onToggleExpand={() => setIsExpanded((current) => !current)}
          onSheetClose={() => undefined}
          voteControllerComponent={VoteController}
          bottomSheetComponent={BottomSheet}
          votePolicy={votePolicy}
          showKpopfaceAd={options.showAds}
          compactTopTen={isKpopfaceSurface}
          expandLabel={topTenCopy.expand}
          collapseLabel={topTenCopy.collapse}
          surface={options.surface}
          showLeagueHeader={false}
          showSearchBar={false}
          interactionMode="direct"
          quotaController={{ quota, useVote: consumeVote, isLoading: isQuotaLoading }}
          testId="shared-vote-board"
        />
      </main>

      {isKpopfaceSurface && (
        <div className={embedStyles.signupCtaContainer}>
          <a
            className={embedStyles.signupCta}
            href="/signup"
            target="_blank"
            rel="noopener noreferrer"
          >
            {signupCopy}
          </a>
        </div>
      )}

      {isKpopfaceSurface && showLoginPrompt && (
        <section className={embedStyles.authPrompt} role="dialog" aria-modal="true">
          <p>{KPOPFACE_SIGNUP_COPY[signupLocale]}</p>
          <button type="button" onClick={handleKpopfaceLogin}>
            {signupLocale === 'ko'
              ? `${BRAND_NAME} 로그인·회원가입`
              : `Log in or sign up for ${BRAND_NAME}`}
          </button>
          <button type="button" onClick={() => setShowLoginPrompt(false)}>
            {signupLocale === 'ko' ? '닫기' : 'Close'}
          </button>
        </section>
      )}
    </div>
  );
}

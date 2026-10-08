'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  ArrowUpRight,
  Building2,
  Heart,
  Loader2,
  Search,
  UserRound,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFollowing } from '@/hooks/useFollowing';
import { useLeagueData } from '@/hooks/useLeagueData';
import type { CompanyRanking, GroupSummary } from '@/types/league';
import { FollowingError, type FollowTargetType } from '@/lib/api/following';
import FollowToggle from '@/components/features/following/FollowToggle';
import styles from './following.module.scss';

interface GroupTarget extends GroupSummary {
  companyId: string;
  companyName: string;
  companyNameKo: string;
  companyRank: number;
  gradientColor: string;
}

interface TargetRowProps {
  targetType: FollowTargetType;
  targetId: string;
  title: string;
  subtitle: string;
  meta: string;
  rank?: string;
  accent: string;
  isFollowing: boolean;
  isPending: boolean;
  followLabel: string;
  followingLabel: string;
  pendingLabel: string;
  onToggle: () => void;
}

function TargetRow({
  targetType,
  targetId,
  title,
  subtitle,
  meta,
  rank,
  accent,
  isFollowing,
  isPending,
  followLabel,
  followingLabel,
  pendingLabel,
  onToggle,
}: TargetRowProps) {
  const Icon = targetType === 'company' ? Building2 : UserRound;

  return (
    <article
      className={styles.targetRow}
      data-testid={`following-target-${targetType}-${targetId}`}
      data-following={isFollowing}
    >
      <span className={styles.targetAccent} style={{ backgroundColor: accent }} aria-hidden="true" />
      <span className={styles.targetIcon} aria-hidden="true">
        <Icon size={17} />
      </span>
      <div className={styles.targetCopy}>
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
      <div className={styles.targetMeta}>
        {rank && <strong>{rank}</strong>}
        <span>{meta}</span>
      </div>
      <FollowToggle
        targetType={targetType}
        targetId={targetId}
        isFollowing={isFollowing}
        isPending={isPending}
        followLabel={followLabel}
        followingLabel={followingLabel}
        pendingLabel={pendingLabel}
        onToggle={onToggle}
      />
    </article>
  );
}

function normalizeSearch(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function matchesSearch(values: string[], query: string): boolean {
  if (!query) return true;
  return values.some((value) => normalizeSearch(value).includes(query));
}

function buildGroupTargets(companies: CompanyRanking[]): GroupTarget[] {
  const byId = new Map<string, GroupTarget>();

  companies.forEach((company) => {
    (company.groups || []).forEach((group) => {
      if (!byId.has(group.id)) {
        byId.set(group.id, {
          ...group,
          companyId: company.companyId,
          companyName: company.nameEn,
          companyNameKo: company.nameKo,
          companyRank: company.rank,
          gradientColor: company.gradientColor,
        });
      }
    });
  });

  return [...byId.values()];
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className={styles.state} aria-busy="true">
      <Loader2 className={styles.spinner} size={20} aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}

export default function FollowingClient() {
  const t = useTranslations('Following');
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const {
    allCompanies,
    isLoading: isCompaniesLoading,
    error: companiesError,
    refresh: refreshCompanies,
  } = useLeagueData({ refreshInterval: 0 });
  const {
    following,
    error: followingError,
    isLoading: isFollowingLoading,
    isFollowing,
    pendingTarget,
    toggle,
    reload: reloadFollowing,
  } = useFollowing();
  const [query, setQuery] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const groupTargets = useMemo(() => buildGroupTargets(allCompanies), [allCompanies]);
  const searchQuery = normalizeSearch(query);

  const visibleCompanies = useMemo(
    () => allCompanies.filter((company) => matchesSearch(
      [company.nameEn, company.nameKo],
      searchQuery,
    )),
    [allCompanies, searchQuery],
  );
  const visibleGroups = useMemo(
    () => groupTargets.filter((group) => matchesSearch(
      [group.nameEn, group.nameKo, group.companyName, group.companyNameKo],
      searchQuery,
    )),
    [groupTargets, searchQuery],
  );

  const followedCompanies = visibleCompanies.filter((company) => isFollowing('company', company.companyId));
  const followedGroups = visibleGroups.filter((group) => isFollowing('group', group.id));
  const recommendedCompanies = visibleCompanies
    .filter((company) => !isFollowing('company', company.companyId))
    .slice(0, searchQuery ? undefined : 8);
  const recommendedGroups = visibleGroups
    .filter((group) => !isFollowing('group', group.id))
    .slice(0, searchQuery ? undefined : 12);
  const followingCount = following.companyIds.length + following.groupIds.length;

  const handleToggle = useCallback(async (
    targetType: FollowTargetType,
    targetId: string,
  ) => {
    setActionError(null);
    try {
      await toggle(targetType, targetId, !isFollowing(targetType, targetId));
    } catch (cause) {
      if (cause instanceof FollowingError && cause.code === 'AUTH_REQUIRED') {
        setActionError(t('login_required'));
      } else {
        setActionError(t('follow_error'));
      }
    }
  }, [isFollowing, t, toggle]);

  const sharedToggleProps = {
    followLabel: t('follow'),
    followingLabel: t('following'),
    pendingLabel: t('pending'),
  };

  if (isAuthLoading) {
    return <LoadingState label={t('loading')} />;
  }

  if (!isAuthenticated) {
    return (
      <section className={styles.loginPanel} data-testid="following-login-panel">
        <span className={styles.loginIcon} aria-hidden="true"><Heart size={23} /></span>
        <p className={styles.eyebrow}>{t('eyebrow')}</p>
        <h2>{t('login_title')}</h2>
        <p className={styles.loginDescription}>{t('login_description')}</p>
        <Link className={styles.primaryCta} href={`/login`}>
          {t('login_cta')}
          <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </section>
    );
  }

  if (isCompaniesLoading || isFollowingLoading) {
    return <LoadingState label={t('loading')} />;
  }

  if (companiesError || followingError) {
    return (
      <div className={styles.state} role="alert">
        <p>{t('error')}</p>
        <button
          type="button"
          className={styles.retryButton}
          onClick={() => {
            void refreshCompanies();
            void reloadFollowing();
          }}
        >
          {t('retry')}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.followingPage} data-testid="following-page">
      <div className={styles.toolbar}>
        <label className={styles.searchField}>
          <Search size={17} aria-hidden="true" />
          <span className={styles.srOnly}>{t('search_label')}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('search_placeholder')}
          />
        </label>
        <Link className={styles.rankingLink} href={`/studio/ranking`}>
          {t('open_ranking')}
          <ArrowUpRight size={15} aria-hidden="true" />
        </Link>
      </div>

      {actionError && (
        <p className={styles.actionError} role="alert">{actionError}</p>
      )}

      <div className={styles.summaryBar}>
        <div>
          <p className={styles.eyebrow}>{t('eyebrow')}</p>
          <strong>{t('following_count', { count: followingCount })}</strong>
        </div>
        <p>{t('summary_description')}</p>
      </div>

      <div className={styles.contentGrid}>
        <section className={styles.panel} data-testid="following-selected">
          <header className={styles.panelHeader}>
            <div>
              <p className={styles.eyebrow}>{t('your_signal')}</p>
              <h2>{t('selected_title')}</h2>
            </div>
            <span className={styles.panelCount}>{followingCount}</span>
          </header>

          {followedCompanies.length === 0 && followedGroups.length === 0 ? (
            <div className={styles.emptyState}>
              <Heart size={20} aria-hidden="true" />
              <p>{t('empty_title')}</p>
              <span>{t('empty_description')}</span>
            </div>
          ) : (
            <div className={styles.targetList}>
              {followedCompanies.map((company) => (
                <TargetRow
                  key={`company-${company.companyId}`}
                  targetType="company"
                  targetId={company.companyId}
                  title={company.nameKo || company.nameEn}
                  subtitle={company.nameEn}
                  meta={t('votes', { count: company.voteCount.toLocaleString() })}
                  rank={t('rank', { rank: company.rank })}
                  accent={company.gradientColor}
                  isFollowing
                  isPending={pendingTarget === `company:${company.companyId}`}
                  onToggle={() => void handleToggle('company', company.companyId)}
                  {...sharedToggleProps}
                />
              ))}
              {followedGroups.map((group) => (
                <TargetRow
                  key={`group-${group.id}`}
                  targetType="group"
                  targetId={group.id}
                  title={group.nameKo || group.nameEn}
                  subtitle={group.nameEn + ' · ' + group.companyName}
                  meta={t('votes', { count: group.voteCount.toLocaleString() })}
                  rank={t('rank', { rank: group.companyRank })}
                  accent={group.gradientColor}
                  isFollowing
                  isPending={pendingTarget === `group:${group.id}`}
                  onToggle={() => void handleToggle('group', group.id)}
                  {...sharedToggleProps}
                />
              ))}
            </div>
          )}
        </section>

        <section className={styles.panel} data-testid="following-recommendations">
          <header className={styles.panelHeader}>
            <div>
              <p className={styles.eyebrow}>{t('discover_eyebrow')}</p>
              <h2>{t('recommendations')}</h2>
            </div>
          </header>

          {recommendedCompanies.length === 0 && recommendedGroups.length === 0 ? (
            <div className={styles.emptyState}>
              <p>{t('no_results')}</p>
            </div>
          ) : (
            <div className={styles.targetList}>
              {recommendedCompanies.map((company) => (
                <TargetRow
                  key={`company-${company.companyId}`}
                  targetType="company"
                  targetId={company.companyId}
                  title={company.nameKo || company.nameEn}
                  subtitle={company.nameEn}
                  meta={t('votes', { count: company.voteCount.toLocaleString() })}
                  rank={t('rank', { rank: company.rank })}
                  accent={company.gradientColor}
                  isFollowing={false}
                  isPending={pendingTarget === `company:${company.companyId}`}
                  onToggle={() => void handleToggle('company', company.companyId)}
                  {...sharedToggleProps}
                />
              ))}
              {recommendedGroups.map((group) => (
                <TargetRow
                  key={`group-${group.id}`}
                  targetType="group"
                  targetId={group.id}
                  title={group.nameKo || group.nameEn}
                  subtitle={group.nameEn + ' · ' + group.companyName}
                  meta={t('votes', { count: group.voteCount.toLocaleString() })}
                  rank={t('rank', { rank: group.companyRank })}
                  accent={group.gradientColor}
                  isFollowing={false}
                  isPending={pendingTarget === `group:${group.id}`}
                  onToggle={() => void handleToggle('group', group.id)}
                  {...sharedToggleProps}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

'use client';

import { useMemo } from 'react';
import type { ComponentType, ReactNode } from 'react';
import classNames from 'classnames';
import { AnimatePresence, motion } from 'framer-motion';
import type { CompanyType } from '@/lib/mock-data';
import type { CompanyRanking } from '@/types/league';
import StickyPanel from '@/components/ui/StickyPanel';
import SearchBar from '@/components/ui/SearchBar';
import PremierLeague from '@/components/features/league/PremierLeague';
import LeagueRankingItem from '@/components/features/league/LeagueRankingItem';
import { LeagueHeader } from '@/components/features/league/LeagueHeader';
import type { VotePolicyAdapter } from '@/components/features/VoteController/votePolicy';
import type { VoteQuotaController } from '@/components/features/VoteController';
import styles from '@/app/(site)/page.module.scss';

export interface VoteControllerRenderProps {
  company: CompanyType | null;
  selectedArtist?: string;
  autoSelectedSubLabelId?: string | null;
  voteSurfaceDescriptionId?: string;
  onVoteSuccess?: (companyId: string) => void;
  onGuestQuotaExhausted?: () => void;
  renderMode?: 'panel' | 'card';
  quotaController?: VoteQuotaController;
  votePolicy?: VotePolicyAdapter;
}

export interface BottomSheetRenderProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  heightRatio?: number;
}

export interface VoteBoardProps {
  premierLeague: CompanyRanking[];
  allCompanies: CompanyRanking[];
  selectedCompanyId: string | null;
  selectedCompany: CompanyType | null;
  selectedSubLabelId?: string | null;
  selectedArtistName?: string | null;
  voteSurfaceDescriptionId?: string;
  isExpanded: boolean;
  isSheetOpen: boolean;
  isMobile: boolean;
  onVote?: (companyId: string, artistName?: string | null) => void;
  onSearchSelect?: (companyId: string, artistName?: string) => void;
  onVoteSuccess: (companyId?: string) => void;
  onGuestQuotaExhausted?: () => void;
  onToggleExpand: () => void;
  onSheetClose: () => void;
  voteControllerComponent: ComponentType<VoteControllerRenderProps>;
  bottomSheetComponent: ComponentType<BottomSheetRenderProps>;
  votePolicy?: VotePolicyAdapter;
  showKpopfaceAd?: boolean;
  /** Kpopface keeps its compact TOP 4 + “Show top 10” interaction. */
  compactTopTen?: boolean;
  /** Optional progressive rank ceiling for the Studio list (for example 5, 10, then 20). */
  rankDisplayLimit?: number;
  /** Explicit label for staged expansion controls. */
  toggleLabel?: string;
  expandLabel?: string;
  collapseLabel?: string;
  panelId?: string;
  testId?: string;
  surface?: string;
  /** standalone embed shell or an existing page shell (empty string) */
  layoutClassName?: string;
  /** The current home shell owns the stable season/quota header. */
  showLeagueHeader?: boolean;
  /** Search remains available to legacy embed callers, not on the home surface. */
  showSearchBar?: boolean;
  /** Direct card voting removes the selection panel and renders a full-card vote surface. */
  interactionMode?: 'selection' | 'direct';
  /** Shared quota state prevents one quota fetch per visible company card. */
  quotaController?: VoteQuotaController;
}

function toCompanyType(company: CompanyRanking): CompanyType {
  return {
    id: company.companyId,
    name: { en: company.nameEn, ko: company.nameKo },
    representative: company.artists,
    firepower: company.voteCount,
    rank: company.rank,
    change: company.rankChange > 0 ? 'up' : company.rankChange < 0 ? 'down' : 'same',
    image: company.gradientColor.startsWith('linear-gradient')
      ? company.gradientColor
      : `linear-gradient(135deg, ${company.gradientColor} 0%, #1A1A1A 100%)`,
    logoUrl: company.logoUrl || undefined,
    stockHistory: [],
    subLabels: company.subLabels,
  };
}

/**
 * Legacy vote board structure shared by the MEARROW home and embed surfaces.
 *
 * In selection mode a ranking card selects a company and VoteController owns
 * the panel contract. In direct mode VoteController owns the full-card
 * one-vote/long-press surface.
 */
export default function VoteBoard({
  premierLeague,
  allCompanies,
  selectedCompanyId,
  selectedCompany,
  selectedSubLabelId,
  selectedArtistName,
  voteSurfaceDescriptionId,
  isExpanded,
  isSheetOpen,
  isMobile,
  onVote,
  onSearchSelect,
  onVoteSuccess,
  onGuestQuotaExhausted,
  onToggleExpand,
  onSheetClose,
  voteControllerComponent: VoteController,
  bottomSheetComponent: BottomSheet,
  votePolicy,
  showKpopfaceAd = true,
  compactTopTen = false,
  rankDisplayLimit,
  toggleLabel,
  expandLabel,
  collapseLabel,
  panelId,
  testId,
  surface,
  layoutClassName,
  showLeagueHeader = true,
  showSearchBar = true,
  interactionMode = 'selection',
  quotaController,
}: VoteBoardProps) {
  const companiesBelow11 = useMemo(() => allCompanies.slice(10), [allCompanies]);
  const companiesToReveal = rankDisplayLimit !== undefined
    ? allCompanies.slice(10, Math.min(rankDisplayLimit, 20))
    : compactTopTen
      ? []
      : companiesBelow11;
  const displayedPremierLeague = rankDisplayLimit !== undefined
    ? premierLeague.slice(0, Math.min(rankDisplayLimit, 10))
    : compactTopTen && !isExpanded
      ? premierLeague.slice(0, 4)
      : premierLeague;
  const shouldShowExpansion = rankDisplayLimit !== undefined
    ? allCompanies.length > 5 || rankDisplayLimit > 5
    : compactTopTen
      ? premierLeague.length > 4
      : companiesBelow11.length > 0;
  const isCollapseAction = toggleLabel
    ? toggleLabel === (collapseLabel || 'Collapse')
    : isExpanded;
  const handleSearchSelect = onSearchSelect ?? onVote ?? (() => undefined);
  const handleGuestQuotaExhausted = onGuestQuotaExhausted ?? onSheetClose;
  const isDirectMode = interactionMode === 'direct';
  const cardSelectionHandler = isDirectMode ? undefined : onVote;
  const renderDirectVote = isDirectMode
    ? (company: CompanyRanking) => (
        <VoteController
          company={toCompanyType(company)}
          renderMode="card"
          voteSurfaceDescriptionId={voteSurfaceDescriptionId}
          quotaController={quotaController}
          onVoteSuccess={onVoteSuccess}
          onGuestQuotaExhausted={onGuestQuotaExhausted}
          votePolicy={votePolicy}
        />
      )
    : undefined;

  return (
    <div
      className={classNames(layoutClassName, {
        [styles.compactEmbed]: compactTopTen,
        [styles.directMode]: isDirectMode && !compactTopTen,
      })}
      data-surface={surface}
      data-ads={showKpopfaceAd ? 'on' : 'off'}
      data-interaction-mode={interactionMode}
      data-testid={testId}
    >
      {showLeagueHeader && (
        <div className={styles.leagueHeaderSection}>
          <LeagueHeader />
        </div>
      )}

      {showSearchBar && (
        <div className={styles.searchSection}>
          <SearchBar onSelect={handleSearchSelect} />
        </div>
      )}

      <div className={styles.contentLayout}>
        <section className={styles.leagueListSection}>
          <PremierLeague
            companies={displayedPremierLeague}
            onVote={cardSelectionHandler}
            selectedCompanyId={selectedCompanyId}
            showKpopfaceAd={showKpopfaceAd}
            compact={compactTopTen}
            renderDirectVote={renderDirectVote}
          />

          {shouldShowExpansion && (
            <div className={styles.expandSection}>
              <AnimatePresence initial={false}>
                {isExpanded && companiesToReveal.length > 0 && (
                  <motion.div
                    key="below11"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                    className={styles.expandedList}
                    style={{ overflow: 'hidden' }}
                  >
                    {companiesToReveal.map((company) => (
                      <LeagueRankingItem
                        key={company.companyId}
                        company={company}
                        onVote={cardSelectionHandler}
                        displayRank={company.rank}
                        isSelected={selectedCompanyId === company.companyId}
                        directVote={renderDirectVote?.(company)}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="button"
                className={styles.expandToggleBtn}
                onClick={onToggleExpand}
                aria-expanded={isExpanded}
              >
                <span>
                {toggleLabel ?? (isExpanded
                  ? (collapseLabel || 'Collapse')
                  : (expandLabel || (compactTopTen ? 'Show top 10' : 'Show more')))}
                </span>
                <motion.svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  animate={{ rotate: isCollapseAction ? 180 : 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  aria-hidden="true"
                >
                  <polyline points="6 9 12 15 18 9" />
                </motion.svg>
              </button>
            </div>
          )}
        </section>

        {isDirectMode && !compactTopTen && (
          <aside className={styles.communityColumn} aria-hidden="true">
            <button
              type="button"
              className={styles.communityButton}
              data-testid="community-button-placeholder"
              hidden
            >
              커뮤니티로 이동하기
            </button>
          </aside>
        )}

        {!isDirectMode && (
          <aside id={panelId} className={styles.panelColumn}>
            <StickyPanel isVisible title="Battle Station">
              <VoteController
                company={selectedCompany}
                onVoteSuccess={onVoteSuccess}
                onGuestQuotaExhausted={handleGuestQuotaExhausted}
                autoSelectedSubLabelId={selectedSubLabelId}
                selectedArtist={selectedArtistName || undefined}
                votePolicy={votePolicy}
              />
            </StickyPanel>
          </aside>
        )}
      </div>

      {!isDirectMode && (
        <BottomSheet isOpen={isSheetOpen && isMobile} onClose={onSheetClose} heightRatio={0.55}>
          <VoteController
            company={selectedCompany}
            onVoteSuccess={onVoteSuccess}
            onGuestQuotaExhausted={handleGuestQuotaExhausted}
            autoSelectedSubLabelId={selectedSubLabelId}
            selectedArtist={selectedArtistName || undefined}
            votePolicy={votePolicy}
          />
        </BottomSheet>
      )}
    </div>
  );
}

/**
 * VoteController
 *
 * 투표 인터페이스 모듈화 컴포넌트
 * BottomSheet(모바일)와 StickyPanel(데스크톱)에서 공통으로 사용됩니다.
 *
 * 기능:
 * - 선택된 소속사 정보 표시
 * - CompactSelect 기반 서브레이블/아티스트 선택 UI
 * - 패널 투표 버튼 또는 카드 전체 투표 surface + 파티클 효과
 * - 현재 화력 점수 표시
 * - 투표권 상태 표시 (VoteQuotaBar)
 *
 * T1.8.2: 1회 투표 = 1점, 일일 100회 제한
 * T2.0: CompactSelect UI
 * 2026-06: 비회원/회원 모두 롱프레스 파워투표 최대 x100 지원
 */

'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Flame, Check, Timer } from 'lucide-react';
import { useTranslations } from 'next-intl';
import classNames from 'classnames';
import { CompanyType } from '@/lib/mock-data';
import { FEATURES } from '@/config/features';
import { VOTE_LIMITS } from '@/config/vote';
import { useVote } from '@/hooks/useVote';
import { useVoteQuota } from '@/hooks/useVoteQuota';
import type { UseVoteQuotaReturn } from '@/hooks/useVoteQuota';
import { useAuth } from '@/hooks/useAuth';
import VoteQuotaBar from '@/components/features/vote/VoteQuotaBar';
import CompactSelect from '@/components/ui/CompactSelect';
import { getCompanyLogoBackground, getCompanyLogoUrl } from '@/lib/company-logos';
import {
  WEB_VOTE_POLICY,
  type VotePolicyAdapter,
  type VotePolicyStatus,
} from './votePolicy';
import styles from './VoteController.module.scss';

/** 파워투표 설정 상수 */
const POWER_VOTE = {
  /** 롱프레스 감지 딜레이 (ms) - 이 시간 이상 누르면 파워투표 시작 */
  HOLD_DELAY: 400,
  /** 최대 파워 레벨 - 모든 사용자 공통 최대 x100 */
  MAX_LEVEL: VOTE_LIMITS.POWER_MAX,
  /** 풀충전 시간 (ms) */
  FULL_CHARGE_MS: 3000,
} as const;

const VOTE_CARD_TIP_SESSION_KEY = 'mearrow-vote-card-tip-shown';
const VOTE_CARD_TIP_DURATION_MS = 4500;

export interface VoteControllerProps {
  /** 선택된 회사 데이터 */
  company: CompanyType | null;
  /** 검색에서 선택된 아티스트 (선택) */
  selectedArtist?: string;
  /** T1.102: 최애 그룹 기반 자동 선택 산하 레이블 ID */
  autoSelectedSubLabelId?: string | null;
  /** 투표 성공 시 콜백 (리스트 하이라이트용) */
  onVoteSuccess?: (companyId: string) => void;
  /** 비로그인 사용자가 일일 투표권을 모두 쓴 뒤 투표를 시도했을 때 호출 */
  onGuestQuotaExhausted?: () => void;
  /** 표시 변형 - PC: full, Mobile: compact */
  variant?: 'full' | 'compact';
  /** 패널형 컨트롤러 또는 카드 전체를 덮는 직접투표 surface */
  renderMode?: 'panel' | 'card';
  /** Accessible description element for a card vote surface, when the host renders one. */
  voteSurfaceDescriptionId?: string;
  /** 여러 카드가 하나의 quota 상태를 공유할 때 주입하는 quota 컨트롤러 */
  quotaController?: Pick<UseVoteQuotaReturn, 'quota' | 'useVote' | 'isLoading'>;
  /** Surface-specific quota/source adapter; omitted for the normal MEARROW web policy. */
  votePolicy?: VotePolicyAdapter;
}

export type VoteQuotaController = Pick<UseVoteQuotaReturn, 'quota' | 'useVote' | 'isLoading'>;

export default function VoteController({
  company,
  selectedArtist,
  autoSelectedSubLabelId,
  onVoteSuccess,
  onGuestQuotaExhausted,
  variant = 'full',
  renderMode = 'panel',
  voteSurfaceDescriptionId,
  quotaController,
  votePolicy = WEB_VOTE_POLICY,
}: VoteControllerProps) {
  const t = useTranslations('Vote');
  const { user, profile, isLoading: isAuthLoading } = useAuth();
  const { submitVote, isLoading } = useVote();
  const internalQuotaOptions = quotaController
    ? {
        guestDailyLimit: votePolicy.guestDailyLimit,
        storageKey: votePolicy.storageKey,
        enabled: false,
      }
    : {
        guestDailyLimit: votePolicy.guestDailyLimit,
        storageKey: votePolicy.storageKey,
      };
  const internalQuotaController = useVoteQuota(user?.id, internalQuotaOptions);
  const activeQuotaController = quotaController ?? internalQuotaController;
  const { quota, useVote: consumeVote, isLoading: isQuotaLoading } = activeQuotaController;
  const [policyStatus, setPolicyStatus] = useState<VotePolicyStatus | null>(null);

  const refreshPolicyStatus = useCallback(async () => {
    if (!votePolicy.readStatus) {
      setPolicyStatus(null);
      return null;
    }

    const nextStatus = await votePolicy.readStatus(user?.id);
    setPolicyStatus(nextStatus);
    return nextStatus;
  }, [user?.id, votePolicy]);

  useEffect(() => {
    let cancelled = false;

    if (!votePolicy.readStatus || isAuthLoading) {
      setPolicyStatus(null);
      return () => {
        cancelled = true;
      };
    }

    void votePolicy.readStatus(user?.id).then((nextStatus) => {
      if (!cancelled) setPolicyStatus(nextStatus);
    });

    return () => {
      cancelled = true;
    };
  }, [isAuthLoading, user?.id, votePolicy]);

  const effectiveRemaining = policyStatus?.remaining ?? quota.remaining;
  const effectiveQuota = policyStatus
    ? {
        ...quota,
        used: Math.max(quota.max - effectiveRemaining, 0),
        remaining: effectiveRemaining,
        canVote: policyStatus.canVote && effectiveRemaining > 0,
      }
    : quota;

  // 선택된 아티스트 상태 (초기값은 props에서 전달받거나 첫번째 아티스트)
  const [chosenArtist, setChosenArtist] = useState<string | null>(selectedArtist || null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showVoteCardTip, setShowVoteCardTip] = useState(false);
  /** 마지막 투표 점수 (성공 애니메이션에 표시) */
  const [lastScore, setLastScore] = useState(1);

  // 모든 사용자가 롱프레스 파워투표를 사용할 수 있습니다. (최대 x100)
  const maxPowerLevel = Math.min(
    votePolicy.maxPowerLevel,
    policyStatus?.maxVotePower ?? quota.remaining,
  );
  /** 파워투표 가능 여부 */
  const canVote = effectiveQuota.canVote && maxPowerLevel > 0;
  const canPowerVote = maxPowerLevel > 1 && effectiveRemaining > 1;
  const stepInterval = Math.max(16, Math.round(POWER_VOTE.FULL_CHARGE_MS / Math.max(maxPowerLevel - 1, 1)));

  // T1.75: 선택된 서브레이블 상태 (null = 전체)
  const [selectedSubLabel, setSelectedSubLabel] = useState<string | null>(null);
  const previousCompanyIdRef = useRef<string | null>(null);
  const previousSelectedArtistPropRef = useRef<string | undefined>(undefined);
  const previousAutoSelectedSubLabelIdRef = useRef<string | null | undefined>(undefined);

  // T1.85: 파워투표 게이지 상태
  /** 현재 파워 레벨 (0 = 누르지 않은 상태, 1~100 = 게이지) */
  const [powerLevel, setPowerLevel] = useState(0);
  /** 롱프레스 진행 중 여부 */
  const [isPressing, setIsPressing] = useState(false);
  /** pointerup 시 React state stale 값을 피하기 위한 최신 누름 상태 */
  const isPressingRef = useRef(false);
  /** 롱프레스 타이머 ref */
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** 게이지 증가 인터벌 ref */
  const gaugeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** 터치 시작 시간 (탭 vs 롱프레스 구분) */
  const pressStartRef = useRef<number>(0);
  /** pointerup 시 React state stale 값을 피하기 위한 최신 파워 레벨 */
  const powerLevelRef = useRef<number>(0);
  /** pointerup과 click이 같은 탭에서 중복 투표를 보내지 않도록 방지 */
  const didHandlePointerVoteRef = useRef(false);
  const voteCardTipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showVoteCardTipOnce = useCallback(() => {
    if (renderMode !== 'card' || typeof window === 'undefined') return;

    try {
      if (window.sessionStorage.getItem(VOTE_CARD_TIP_SESSION_KEY)) return;
      window.sessionStorage.setItem(VOTE_CARD_TIP_SESSION_KEY, 'shown');
    } catch {
      // Keep the vote action usable if browser storage is unavailable.
    }

    setShowVoteCardTip(true);
    if (voteCardTipTimerRef.current) clearTimeout(voteCardTipTimerRef.current);
    voteCardTipTimerRef.current = setTimeout(() => {
      setShowVoteCardTip(false);
      voteCardTipTimerRef.current = null;
    }, VOTE_CARD_TIP_DURATION_MS);
  }, [renderMode]);

  // T1.75: 서브레이블 유무 판단
  const hasSubLabels = FEATURES.SUB_LABEL_VOTING && (company?.subLabels?.length ?? 0) > 0;

  // T1.75/T1.102: 회사/상위 선택 컨텍스트가 실제로 바뀔 때만 초기화한다.
  // 같은 회사 데이터가 투표 후 refresh로 새 객체가 되어도 사용자가 고른 아티스트는 유지한다.
  useEffect(() => {
    const currentCompanyId = company?.id ?? null;
    const companyChanged = previousCompanyIdRef.current !== currentCompanyId;
    const selectedArtistPropChanged = previousSelectedArtistPropRef.current !== selectedArtist;
    const autoSelectedSubLabelIdChanged =
      previousAutoSelectedSubLabelIdRef.current !== autoSelectedSubLabelId;

    previousCompanyIdRef.current = currentCompanyId;
    previousSelectedArtistPropRef.current = selectedArtist;
    previousAutoSelectedSubLabelIdRef.current = autoSelectedSubLabelId;

    if (!company) {
      setSelectedSubLabel(null);
      setChosenArtist(null);
      return;
    }

    if (companyChanged || autoSelectedSubLabelIdChanged) {
      // 자동 선택된 산하 레이블이 있고 현재 회사의 서브레이블에 존재하면 적용
      if (autoSelectedSubLabelId && company.subLabels?.some((sub) => sub.id === autoSelectedSubLabelId)) {
        setSelectedSubLabel(autoSelectedSubLabelId);
      } else {
        setSelectedSubLabel(null);
      }
    }

    if (companyChanged || selectedArtistPropChanged) {
      setChosenArtist(selectedArtist || null);
    }
  }, [company, selectedArtist, autoSelectedSubLabelId]);

  // T1.75: 서브레이블 선택에 따라 아티스트 필터링
  const artists = useMemo(() => {
    if (!company) return [];

    if (!hasSubLabels || !selectedSubLabel) {
      return company.representative.en;
    }

    const subLabel = company.subLabels?.find((sub) => sub.id === selectedSubLabel);
    return subLabel?.artists.en || company.representative.en;
  }, [company, hasSubLabels, selectedSubLabel]);

  /**
   * 투표 실행 (지정된 votePower로 제출)
   */
  const executeVote = useCallback(
    async (votePower: number) => {
      if (!company || isLoading || !canVote) return;

      // 남은 투표권과 최대 파워 레벨을 넘지 않도록 안전하게 보정
      const maxAllowedPower = Math.min(maxPowerLevel, effectiveRemaining);
      const normalizedVotePower = Math.min(Math.max(votePower, 1), maxAllowedPower);

      if (normalizedVotePower <= 0) return;

      const result = await submitVote({
        companyId: company.id,
        companyColor: company.image,
        userId: user?.id,
        votePower: normalizedVotePower,
        voteSource: votePolicy.voteSource,
      });

      if (result?.success) {
        const consumed = result.voteScore || normalizedVotePower;
        consumeVote(consumed);
        setLastScore(consumed);
        setShowSuccess(true);
        onVoteSuccess?.(company.id);

        if (policyStatus) {
          const nextRemaining = result.remaining ?? Math.max(effectiveRemaining - consumed, 0);
          setPolicyStatus((current) => current && {
            ...current,
            canVote: nextRemaining > 0,
            hasUsedEmbed: current.hasUsedEmbed === undefined
              ? current.hasUsedEmbed
              : nextRemaining <= 0,
            remaining: nextRemaining,
            maxVotePower: Math.min(current.maxVotePower, nextRemaining),
          });
        }

        setTimeout(() => {
          setShowSuccess(false);
        }, 1500);
      } else if (result?.errorCode === 'EMBED_DAILY_LIMIT') {
        void refreshPolicyStatus();
        onGuestQuotaExhausted?.();
      } else if (
        result &&
        (result.errorCode === 'RATE_LIMITED' ||
          result.remaining === 0 ||
          result.message.toLowerCase().includes('limit'))
      ) {
        if (!user && quota.remaining > 0) {
          consumeVote(quota.remaining);
        }
        onGuestQuotaExhausted?.();
      }
    },
    [
      company,
      isLoading,
      canVote,
      effectiveRemaining,
      quota.remaining,
      maxPowerLevel,
      submitVote,
      consumeVote,
      onVoteSuccess,
      onGuestQuotaExhausted,
      user,
      votePolicy.voteSource,
      policyStatus,
      refreshPolicyStatus,
    ],
  );

  /**
   * 타이머 정리 유틸
   */
  const clearTimers = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (gaugeIntervalRef.current) {
      clearInterval(gaugeIntervalRef.current);
      gaugeIntervalRef.current = null;
    }
  }, []);

  /**
   * 롱프레스 시작 (pointerdown)
   *
   * 버튼을 누르면:
   * 1. HOLD_DELAY 후 파워투표 모드 진입
   * 2. stepInterval마다 게이지 1칸씩 증가 (최대 100, 남은 투표권 상한)
   */
  const handlePointerDown = useCallback(() => {
    if (!canVote) return;

    const maxChargePower = Math.min(maxPowerLevel, effectiveRemaining);
    if (!company || isLoading || maxChargePower <= 0) return;

    pressStartRef.current = Date.now();
    powerLevelRef.current = 0;
    isPressingRef.current = true;
    setIsPressing(true);

    // HOLD_DELAY 후 파워투표 모드 진입
    holdTimerRef.current = setTimeout(() => {
      let level = 1;
      powerLevelRef.current = level;
      setPowerLevel(level);

      // 남은 투표권이 1이면 추가 충전 없이 1표에서 고정
      if (maxChargePower <= 1) {
        return;
      }

      // 게이지 증가 인터벌
      gaugeIntervalRef.current = setInterval(() => {
        level = Math.min(level + 1, maxChargePower);
        powerLevelRef.current = level;
        setPowerLevel(level);

        // 최대 레벨 도달 시 인터벌 중지 (자동 투표하지 않음, 놓을 때까지 대기)
        if (level >= maxChargePower && gaugeIntervalRef.current) {
          clearInterval(gaugeIntervalRef.current);
          gaugeIntervalRef.current = null;
        }
      }, stepInterval);
    }, POWER_VOTE.HOLD_DELAY);
  }, [canVote, company, effectiveRemaining, isLoading, maxPowerLevel, stepInterval]);

  const handleVoteButtonClick = useCallback(() => {
    if (!canVote) {
      onGuestQuotaExhausted?.();
      return;
    }

    if (didHandlePointerVoteRef.current) {
      didHandlePointerVoteRef.current = false;
      return;
    }

    if (canVote) {
      showVoteCardTipOnce();
      executeVote(1);
    }
  }, [canVote, executeVote, onGuestQuotaExhausted, showVoteCardTipOnce]);

  /**
   * 롱프레스 종료 (pointerup / pointerleave)
   *
   * - 짧은 탭 (< HOLD_DELAY): 1표 일반 투표
   * - 롱프레스: 현재 파워 레벨만큼 투표
   */
  const handlePointerUp = useCallback(() => {
    if (!isPressingRef.current) return;

    const pressDuration = Date.now() - pressStartRef.current;
    clearTimers();
    isPressingRef.current = false;
    setIsPressing(false);
    const finalPower = powerLevelRef.current;
    powerLevelRef.current = 0;

    if (pressDuration < POWER_VOTE.HOLD_DELAY) {
      // 짧은 탭 → 1표 일반 투표
      setPowerLevel(0);
      didHandlePointerVoteRef.current = true;
      showVoteCardTipOnce();
      executeVote(1);
    } else if (finalPower > 0) {
      // 롱프레스 → 파워 레벨만큼 투표
      setPowerLevel(0);
      didHandlePointerVoteRef.current = true;
      executeVote(finalPower);
    } else {
      setPowerLevel(0);
    }
  }, [clearTimers, executeVote, showVoteCardTipOnce]);

  /**
   * 포인터가 투표 surface를 벗어나면 취소
   */
  const handlePointerLeave = useCallback(() => {
    if (isPressingRef.current) {
      clearTimers();
      isPressingRef.current = false;
      setIsPressing(false);
      powerLevelRef.current = 0;
      setPowerLevel(0);
    }
  }, [clearTimers]);

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  useEffect(() => {
    return () => {
      if (voteCardTipTimerRef.current) clearTimeout(voteCardTipTimerRef.current);
    };
  }, []);


  // 회사가 선택되지 않았을 때
  if (!company) {
    return (
      <div className={styles.emptyState}>
        <Flame size={48} className={styles.emptyIcon} />
        <p>{t('select_artist')}</p>
      </div>
    );
  }

  const logoUrl = getCompanyLogoUrl(company.id, company.logoUrl, company.name.en);
  const logoBackground = getCompanyLogoBackground(company.id, company.name.en, logoUrl);

  /** 파워투표 게이지 진행률 (%) */
  const gaugeFill = (powerLevel / maxPowerLevel) * 100;

  return (
    <div className={classNames(styles.voteController, {
      [styles.cardMode]: renderMode === 'card',
    })}>
      {/* 회사 정보 헤더 */}
      {renderMode === 'panel' && <div className={styles.companyHeader}>
        <div className={styles.companyLogo} style={{ background: logoBackground }}>
          {logoUrl ? (
            <img src={logoUrl} alt={company.name.en} className={styles.logoImage} />
          ) : (
            company.name.en.charAt(0)
          )}
        </div>
        <div className={styles.companyInfo}>
          <h3 className={styles.companyName}>{company.name.en}</h3>
          <div className={styles.firepowerBadge}>
            <Zap size={14} />
            <span>{company.firepower.toLocaleString()}</span>
          </div>
        </div>
      </div>}

      {/* T2.0: 서브레이블 CompactSelect */}
      {renderMode === 'panel' && hasSubLabels && company.subLabels && (
        <CompactSelect
          label={t('sub_label_title')}
          value={selectedSubLabel}
          onChange={(val) => {
            setSelectedSubLabel(val);
            setChosenArtist(null);
          }}
          options={company.subLabels.map((sub) => ({ value: sub.id, label: sub.nameEn }))}
          showAllOption={true}
          allOptionLabel={t('sub_label_all')}
        />
      )}

      {/* T2.0: 아티스트 CompactSelect */}
      {renderMode === 'panel' && <div className={styles.questionSection}>
        <CompactSelect
          label={t('who_fan')}
          value={chosenArtist}
          onChange={setChosenArtist}
          options={artists.map((a) => ({ value: a, label: a }))}
          placeholder={t('select_artist')}
          clearable={true}
        />
      </div>}

      {/* T1.85: 투표 surface/버튼 + 롱프레스 파워투표 게이지 */}
      <div className={styles.voteButtonWrapper}>
        {renderMode === 'card' ? (
          <motion.div
            className={styles.voteSurface}
            role="button"
            tabIndex={0}
            aria-disabled={!canVote}
            aria-label={`${company.name.en} ${t('button.vote')}`}
            aria-describedby={voteSurfaceDescriptionId}
            data-testid={`direct-vote-${company.id}`}
            onClick={handleVoteButtonClick}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
            onPointerCancel={handlePointerLeave}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleVoteButtonClick();
              }
            }}
            onContextMenu={(event) => event.preventDefault()}
            style={{
              background: showSuccess ? 'var(--color-secondary)' : 'transparent',
            }}
          >
            {!showSuccess && !isPressing && (
              <span
                className={styles.cardVoteAction}
                data-testid={`direct-vote-label-${company.id}`}
                aria-hidden="true"
                style={{ pointerEvents: 'none' }}
              >
                <span>{t('button.vote')}</span>
                <span aria-hidden="true">→</span>
              </span>
            )}

            {/* 파워투표 게이지 오버레이 */}
            {isPressing && powerLevel > 0 && (
              <div
                className={styles.gaugeOverlay}
                style={{ width: `${gaugeFill}%` }}
              />
            )}

            <AnimatePresence mode="wait">
              {showSuccess ? (
                <motion.div
                  key="success"
                  className={styles.successContent}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                >
                  <Check size={32} strokeWidth={3} />
                  <span>+{lastScore}</span>
                </motion.div>
              ) : isPressing && powerLevel > 0 ? (
                <motion.div
                  key="power"
                  className={styles.powerContent}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                >
                  <Flame size={28} />
                  <span className={styles.powerNumber}>x{powerLevel}</span>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {showVoteCardTip && (
              <span
                className={styles.voteCardTip}
                data-vote-card-tip
                data-testid="vote-card-tip"
                role="status"
                aria-live="polite"
              >
                {t('card_tap_longpress_hint')}
              </span>
            )}
          </motion.div>
        ) : (
          <motion.button
            type="button"
            className={classNames(styles.voteButton, {
              [styles.disabled]: !canVote,
              [styles.pressing]: isPressing && powerLevel > 0,
            })}
            disabled={isLoading}
            onClick={handleVoteButtonClick}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
            onPointerCancel={handlePointerLeave}
            onContextMenu={(e) => e.preventDefault()}
            whileHover={canVote && !isPressing ? { scale: 1.02 } : {}}
            style={{
              background: showSuccess
                ? 'var(--color-secondary)'
                : !canVote
                  ? 'var(--color-text-dim)'
                  : company.image,
            }}
          >
            <AnimatePresence mode="wait">
              {showSuccess ? (
                <motion.div
                  key="success"
                  className={styles.successContent}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                >
                  <Check size={32} strokeWidth={3} />
                  <span>+{lastScore}</span>
                </motion.div>
              ) : isPressing && powerLevel > 0 ? (
                <motion.div
                  key="power"
                  className={styles.powerContent}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                >
                  <Flame size={28} />
                  <span className={styles.powerNumber}>x{powerLevel}</span>
                </motion.div>
              ) : !canVote ? (
                <motion.div
                  key="exhausted"
                  className={styles.exhaustedContent}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Timer size={28} />
                  <span>{t('button.exhausted')}</span>
                </motion.div>
              ) : (
                <motion.div
                  key="vote"
                  className={styles.voteContent}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className={styles.voteMain}>
                    <Flame size={28} />
                    <span>{isLoading ? 'Sending...' : t('button.vote')}</span>
                  </div>
                  {canPowerVote && (
                    <span className={styles.voteSubHint}>
                      {t('button.hold_hint', { max: maxPowerLevel, defaultValue: `Hold for Power Vote (x${maxPowerLevel})` })}
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        )}
      </div>
      {/* 투표권 상태 바 */}
      {renderMode === 'panel' && !isQuotaLoading && (
        <VoteQuotaBar
          used={effectiveQuota.used}
          max={effectiveQuota.max}
          hoursUntilReset={quota.hoursUntilReset}
          minutesUntilReset={quota.minutesUntilReset}
          variant={variant}
          mode={quota.mode}
          isLoggedIn={!!user}
          isPro={!!profile?.is_pro}
        />
      )}

      {/* 선택된 아티스트 컨텍스트 */}
      {renderMode === 'panel' && chosenArtist && (
        <motion.p
          className={styles.forArtist}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          For <strong>{chosenArtist}</strong>
        </motion.p>
      )}
    </div>
  );
}

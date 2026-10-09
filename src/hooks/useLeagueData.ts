/**
 * useLeagueData 훅
 *
 * 리그 데이터(소속사 순위)를 가져오는 커스텀 훅입니다.
 * SWR을 사용하여 캐싱과 자동 갱신을 지원합니다.
 *
 * 기능:
 * - 전체 소속사를 rank 순 단일 배열로 반환 (2부 리그 폐지)
 * - 하위 호환: premierLeague (1-10위), challengers (빈 배열)
 * - 20초마다 자동 갱신
 * - 에러 처리 및 로딩 상태
 * - 수동 새로고침 (mutate)
 *
 * SSG/CSR 마이그레이션:
 * - 기존: fetch('/api/companies') → API Routes 경유
 * - 변경: getCompanies() → Supabase 직접 호출
 */

'use client';

import useSWR from 'swr';
import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type {
  CompanyRanking,
  LeagueTier,
  PromotionBattle,
  PromotionBattles,
  PromotionStatus,
  SeasonInfo,
  SubLabelInfo,
} from '@/types/league';
import type { CompaniesResponse } from '@/types/api';
import { getCompanies } from '@/lib/api';
import { getCompanyLogoUrl } from '@/lib/company-logos';

/** SWR fetcher 함수: Supabase 직접 호출 */
const fetcher = async (): Promise<CompaniesResponse> => {
  const result = await getCompanies();
  if (result.source === 'error') {
    throw new Error('Failed to fetch data');
  }
  return result;
};

/** localStorage 키: 이전 리그 순위 저장용 */
const PREV_LEAGUE_RANKS_KEY = 'kcl_previous_league_ranks';
const PREV_LEAGUE_RANKS_EVENT = 'kcl-previous-league-ranks-change';

/**
 * 이전 리그 순위 데이터 타입
 * 글로벌 순위가 아닌 리그 내 순위(배열 인덱스 기반)를 저장
 */
interface PreviousLeagueRanksData {
  /** 전체 순위: companyId → 순위 */
  premier: Record<string, number>;
  /** 하위 호환용 (사용 안 함, 빈 객체) */
  challengers: Record<string, number>;
  /** 저장 시점 timestamp */
  savedAt: number;
}

/**
 * UTC 기준 오늘 날짜 문자열 반환 (YYYY-MM-DD)
 * 투표권 리셋과 동일한 기준 사용
 */
function getTodayUTC(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * localStorage에서 이전 리그 순위 데이터 로드
 * - 브라우저 환경에서만 동작
 * - UTC 자정(투표권 갱신 시점)이 지나면 무효화 (새 기준점으로 갱신)
 */
function loadPreviousLeagueRanks(): PreviousLeagueRanksData | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(PREV_LEAGUE_RANKS_KEY);
    if (!stored) return null;

    const data: PreviousLeagueRanksData = JSON.parse(stored);

    // UTC 자정이 지났으면 무효화 (투표권 리셋과 동일 시점)
    const savedDate = new Date(data.savedAt);
    const savedDateUTC = `${savedDate.getUTCFullYear()}-${String(savedDate.getUTCMonth() + 1).padStart(2, '0')}-${String(savedDate.getUTCDate()).padStart(2, '0')}`;
    if (savedDateUTC !== getTodayUTC()) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

function subscribeToPreviousLeagueRanks(onChange: () => void): () => void {
  if (typeof window === 'undefined') return () => {};

  window.addEventListener('storage', onChange);
  window.addEventListener(PREV_LEAGUE_RANKS_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(PREV_LEAGUE_RANKS_EVENT, onChange);
  };
}

function getPreviousLeagueRanksSnapshot(): string | null {
  if (!loadPreviousLeagueRanks()) return null;

  try {
    return localStorage.getItem(PREV_LEAGUE_RANKS_KEY);
  } catch {
    return null;
  }
}

function getServerPreviousLeagueRanksSnapshot(): null {
  return null;
}

function parsePreviousLeagueRanksSnapshot(snapshot: string | null): PreviousLeagueRanksData | null {
  if (!snapshot) return null;

  try {
    return JSON.parse(snapshot) as PreviousLeagueRanksData;
  } catch {
    return null;
  }
}

/**
 * 현재 순위를 localStorage에 저장
 * - 이전 순위가 없을 때만 저장 (기준점 설정)
 * - 같은 UTC 날짜의 데이터가 있으면 유지 (투표권 갱신까지 기준점 고정)
 *
 * @param allCompanies - 전체 회사 배열 (rank 순)
 */
function loadOrInitializePreviousLeagueRanks(
  allCompanies: CompanyRanking[],
): PreviousLeagueRanksData | null {
  if (typeof window === 'undefined') return null;

  try {
    const existing = loadPreviousLeagueRanks();
    if (existing) return existing;

    // 새 기준점 저장: 배열 인덱스 + 1 = 전체 순위
    const premier: Record<string, number> = {};
    allCompanies.forEach((company, index) => {
      premier[company.companyId] = index + 1;
    });

    const data: PreviousLeagueRanksData = {
      premier,
      challengers: {},
      savedAt: Date.now(),
    };

    localStorage.setItem(PREV_LEAGUE_RANKS_KEY, JSON.stringify(data));
    window.dispatchEvent(new Event(PREV_LEAGUE_RANKS_EVENT));
    return data;
  } catch {
    // localStorage 접근 실패 시 무시
    return null;
  }
}

/**
 * DB 응답을 CompanyRanking 형식으로 변환 (기본 변환)
 *
 * T1.53: DB의 league_tier 값을 직접 사용 (시즌 중 고정)
 * - 기존: rank 기준으로 tier 계산 (투표 시 즉시 리그 변경 문제)
 * - 변경: DB에서 관리되는 league_tier 값 사용
 *
 * 주의: rankChange는 리그 분리 후 별도 계산 필요 (calculateLeagueRankChanges 참조)
 *
 * @param company - DB 응답 회사 데이터
 */
function transformToCompanyRanking(
  company: CompaniesResponse['companies'][number],
): CompanyRanking {
  // T1.53: DB의 league_tier 값을 직접 사용 (rank 기반 계산 제거)
  const tier: LeagueTier = company.league_tier;

  // 초기값: 리그 분리 후 별도 설정됨
  const isRelegationZone = false;
  const isPromotionZone = false;

  // T1.75: sub_labels → SubLabelInfo[] 변환
  const subLabels: SubLabelInfo[] | undefined = company.sub_labels?.map((sub) => ({
    id: sub.id,
    nameEn: sub.name_en,
    nameKo: sub.name_ko,
    artists: {
      en: sub.groups?.map((g) => g.name_en) || [],
      ko: sub.groups?.map((g) => g.name_ko) || [],
    },
  }));

  return {
    companyId: company.id,
    companyName: company.name_en,
    nameKo: company.name_ko,
    nameEn: company.name_en,
    logoUrl: getCompanyLogoUrl(company.id, company.logo_url, company.name_en),
    gradientColor: company.gradient_color || '#315CFF',
    rank: company.rank,
    previousRank: company.rank, // 초기값, 리그 분리 후 재계산
    rankChange: 0, // 초기값, 리그 분리 후 재계산
    voteCount: company.firepower,
    voteCountHourly: 0, // TODO: 시간당 투표 수 계산 기능 추가
    tier,
    isRelegationZone,
    isPromotionZone,
    promotionStatus: 'safe' as const, // 초기값, 리그 분리 후 재계산
    artists: {
      en: company.groups?.map((g) => g.name_en) || [],
      ko: company.groups?.map((g) => g.name_ko) || [],
    },
    groups: company.groups?.map((group) => ({
      id: group.id,
      nameEn: group.name_en,
      nameKo: group.name_ko,
      voteCount: group.vote_count,
    })),
    ...(subLabels && subLabels.length > 0 && { subLabels }),
  };
}

/**
 * 리그 내 순위 변동 계산
 *
 * 배열 인덱스 기반으로 리그 내 순위 변동을 계산합니다.
 * - 현재 리그 순위: 배열 인덱스 + 1
 * - 이전 리그 순위: localStorage에서 로드한 데이터
 * - rankChange: 이전 순위 - 현재 순위 (양수 = 상승)
 *
 * @param companies - 리그 내 회사 배열 (이미 정렬됨)
 * @param previousLeagueRanks - 해당 리그의 이전 순위 맵
 * @returns 순위 변동이 계산된 회사 배열
 */
function calculateLeagueRankChanges(
  companies: CompanyRanking[],
  previousLeagueRanks: Record<string, number>,
): CompanyRanking[] {
  return companies.map((company, index) => {
    const currentLeagueRank = index + 1;
    const previousLeagueRank = previousLeagueRanks[company.companyId] ?? currentLeagueRank;
    const rankChange = previousLeagueRank - currentLeagueRank;

    return {
      ...company,
      previousRank: previousLeagueRank,
      rankChange,
    };
  });
}

/**
 * 승강 상태 결정
 *
 * 2026년 개편된 승강 규칙에 따라 각 소속사의 승강 상태를 결정합니다.
 * - 1부 10위: relegation_direct (강등 직행)
 * - 1부 9위: relegation_danger (강등 위기)
 * - 2부 1위: promotion_direct (승격 직행)
 * - 2부 2위: promotion_chance (승격 기회)
 * - 그 외: safe
 *
 * @param tier - 소속 리그 (premier/challengers)
 * @param leagueRank - 리그 내 순위 (1-based index)
 * @param leagueSize - 해당 리그의 총 소속사 수
 * @returns 승강 상태
 */
function determinePromotionStatus(
  tier: LeagueTier,
  leagueRank: number,
  leagueSize: number,
): PromotionStatus {
  if (tier === 'premier') {
    // 1부 리그: 마지막(10위) = 강등 직행, 끝에서 두 번째(9위) = 강등 위기
    if (leagueRank === leagueSize) {
      return 'relegation_direct';
    }
    if (leagueRank === leagueSize - 1 && leagueSize >= 2) {
      return 'relegation_danger';
    }
  } else {
    // 2부 리그: 1위 = 승격 직행, 2위 = 승격 기회
    if (leagueRank === 1) {
      return 'promotion_direct';
    }
    if (leagueRank === 2 && leagueSize >= 2) {
      return 'promotion_chance';
    }
  }
  return 'safe';
}

/**
 * 현재 시즌 정보 생성
 */
function getCurrentSeason(): SeasonInfo {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // 월말까지 남은 일수 계산
  const lastDay = new Date(year, month, 0).getDate();
  const daysRemaining = lastDay - now.getDate();

  return {
    year,
    month,
    startDate: new Date(year, month - 1, 1).toISOString(),
    endDate: new Date(year, month, 0).toISOString(),
    daysRemaining,
    isActive: true,
  };
}

interface UseLeagueDataOptions {
  /** 자동 갱신 간격 (ms), 0이면 비활성화 */
  refreshInterval?: number;
  /** 포커스 시 재검증 */
  revalidateOnFocus?: boolean;
  /** SSR 초기 데이터 (서버에서 미리 fetch한 데이터) */
  fallbackData?: CompaniesResponse | null;
}

interface UseLeagueDataReturn {
  /** 1부 리그 소속사 (1-10위) */
  premierLeague: CompanyRanking[];
  /** 2부 리그 소속사 (11위~) */
  challengers: CompanyRanking[];
  /** 전체 소속사 목록 */
  allCompanies: CompanyRanking[];
  /** 시즌 정보 */
  season: SeasonInfo;
  /** 승강전 정보 (기존 호환성 유지: 10위 vs 11위) */
  promotionBattle: PromotionBattle | null;
  /** 전체 승강전 정보 (직행 + 플레이오프) */
  promotionBattles: PromotionBattles | null;
  /** 현재 1위 */
  leader: CompanyRanking | null;
  /** 로딩 상태 */
  isLoading: boolean;
  /** 에러 객체 */
  error: Error | null;
  /** 데이터 새로고침 */
  refresh: () => Promise<CompaniesResponse | undefined>;
  /** 마지막 업데이트 시간 */
  updatedAt: string | null;
}

/**
 * 리그 데이터 훅
 *
 * @param options - SWR 옵션
 * @returns 리그 데이터 및 상태
 *
 * @example
 * ```tsx
 * const { premierLeague, challengers, isLoading, refresh } = useLeagueData();
 *
 * if (isLoading) return <Spinner />;
 *
 * return (
 *   <div>
 *     {premierLeague.map(company => (
 *       <RankingItem key={company.companyId} {...company} />
 *     ))}
 *   </div>
 * );
 * ```
 */
export function useLeagueData(options: UseLeagueDataOptions = {}): UseLeagueDataReturn {
  // T1.30: 기본 polling 주기를 20초로 변경 (Redis 캐시 TTL 25초와 조화)
  const { refreshInterval = 20000, revalidateOnFocus = true, fallbackData } = options;

  // 개발 환경에서 불필요한 API 호출 방지
  const isDev = process.env.NODE_ENV === 'development';
  const hasFallback = !!fallbackData;
  const previousLeagueRanksSnapshot = useSyncExternalStore(
    subscribeToPreviousLeagueRanks,
    getPreviousLeagueRanksSnapshot,
    getServerPreviousLeagueRanksSnapshot,
  );
  const previousLeagueRanks = useMemo(
    () => parsePreviousLeagueRanksSnapshot(previousLeagueRanksSnapshot),
    [previousLeagueRanksSnapshot],
  );

  // [DEV] 개발 환경: 옵션으로 전달된 refreshInterval도 무시하고 0으로 강제 (DB 부하 방지)
  // 프로덕션: 전달된 값 또는 기본값(20초) 사용
  const actualRefreshInterval = isDev ? 0 : refreshInterval;

  // SSG/CSR 마이그레이션: API Routes 대신 Supabase 직접 호출
  // SWR key를 'companies'로 변경 (URL 대신 키 문자열)
  const { data, error, isLoading, mutate } = useSWR<CompaniesResponse>('companies', fetcher, {
    refreshInterval: actualRefreshInterval,
    revalidateOnFocus: isDev ? false : revalidateOnFocus, // 개발 모드: 포커스 재검증 비활성화
    revalidateOnReconnect: !isDev, // 개발 모드: 네트워크 복구 시 재검증 비활성화
    revalidateOnMount: !hasFallback, // fallbackData 있으면 마운트 시 재검증 안 함
    dedupingInterval: isDev ? 2000 : 2000, // 투표 후 즉시 새로고침 위해 2초로 단축
    fallbackData: fallbackData || undefined, // SSR 초기 데이터 전달
  });

  // 전체 소속사 변환 (rank 순 정렬)
  const allCompaniesRaw = useMemo(
    () => (data?.companies || [])
      .map((company) => transformToCompanyRanking(company))
      .sort((a, b) => a.rank - b.rank),
    [data?.companies],
  );

  // Initialize the local baseline after hydration; the external store reads
  // it with a null server snapshot so the first client render matches the SSR.
  useEffect(() => {
    if (allCompaniesRaw.length === 0) return;
    loadOrInitializePreviousLeagueRanks(allCompaniesRaw);
  }, [allCompaniesRaw]);

  // 순위 변동 계산 (전체 순위 기반)
  const allCompaniesWithRankChange = calculateLeagueRankChanges(
    allCompaniesRaw,
    previousLeagueRanks?.premier || {},
  );

  // 단일 리그: 모든 소속사는 'safe' promotionStatus
  // (2부 리그 폐지로 승강 개념 없음)
  const allCompanies = allCompaniesWithRankChange.map((c) => ({
    ...c,
    tier: 'premier' as const,
    isRelegationZone: false,
    isPromotionZone: false,
    promotionStatus: 'safe' as const,
  }));

  // 하위 호환: premierLeague = 1~10위, challengers = 빈 배열
  const premierLeague = allCompanies.slice(0, 10);
  const challengers: CompanyRanking[] = [];

  // 시즌 정보
  const season = getCurrentSeason();

  // 단일 리그이므로 승강전 없음
  const promotionBattle: PromotionBattle | null = null;
  const promotionBattles: PromotionBattles | null = null;

  // 현재 1위
  const leader = allCompanies.find((c) => c.rank === 1) || null;

  // 강제 새로고침 (캐시 무시)
  const forceRefresh = async () => {
    // SWR 캐시 revalidate (페이지 리로드 없이 비동기 갱신)
    return mutate();
  };

  return {
    premierLeague,
    challengers,
    allCompanies,
    season,
    promotionBattle,
    promotionBattles,
    leader,
    isLoading,
    error: error || null,
    refresh: forceRefresh,
    updatedAt: data?.updatedAt || null,
  };
}

export default useLeagueData;

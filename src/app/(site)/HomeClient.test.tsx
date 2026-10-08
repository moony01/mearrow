import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { formatHomeDdayLabel, formatHomeSeasonLabel, HomeClient } from './HomeClient';

const mocks = vi.hoisted(() => ({
  mockUseLeagueData: vi.fn(),
  mockUseAuth: vi.fn(),
  mockUseVoteQuota: vi.fn(),
  mockUseRefreshCountdown: vi.fn(),
  mockRefresh: vi.fn(),
  mockRefetchStats: vi.fn(),
}));

vi.mock('next-intl', () => ({
  useLocale: () => 'ko',
  useTranslations: () => (_key: string, values?: { max?: number }) =>
    `* 카드를 길게 누르고 ${values?.max ?? ''}표 투표하기`,
}));

vi.mock('next/dynamic', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  return {
    default: () => function DynamicMock({ children }: { children?: React.ReactNode }) {
      return React.createElement(React.Fragment, null, children);
    },
  };
});

vi.mock('@/hooks/useLeagueData', () => ({
  useLeagueData: () => mocks.mockUseLeagueData(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mocks.mockUseAuth(),
}));

vi.mock('@/hooks/useVoteQuota', () => ({
  useVoteQuota: (...args: unknown[]) => mocks.mockUseVoteQuota(...args),
}));

vi.mock('@/hooks/useRefreshCountdown', () => ({
  useRefreshCountdown: () => mocks.mockUseRefreshCountdown(),
}));

vi.mock('@/lib/supabase/client', () => ({
  getSupabase: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }),
  }),
}));

vi.mock('@/components/features/vote/VoteBoard', () => ({
  default: ({
    allCompanies,
    selectedCompany,
    showLeagueHeader,
    showSearchBar,
  }: {
    allCompanies: Array<{ companyId: string; nameEn: string }>;
    selectedCompany: { name: { en: string } } | null;
    showLeagueHeader?: boolean;
    showSearchBar?: boolean;
  }) => (
    <section data-testid="legacy-vote-board">
      <div data-testid="board-selected-company">{selectedCompany?.name.en ?? 'none'}</div>
      <div data-testid="board-card-count">{allCompanies.length}</div>
      <div data-testid="board-header-enabled">{String(showLeagueHeader)}</div>
      <div data-testid="board-search-enabled">{String(showSearchBar)}</div>
    </section>
  ),
}));

const companies = [
  {
    companyId: 'company-jyp',
    companyName: 'JYP',
    nameEn: 'JYP',
    nameKo: 'JYP',
    artists: { en: ['RESCENE'], ko: ['리센느'] },
    voteCount: 690,
    voteCountHourly: 0,
    rank: 1,
    previousRank: 1,
    rankChange: 0,
    gradientColor: '#111111',
    logoUrl: '',
    tier: 'premier' as const,
    isRelegationZone: false,
    isPromotionZone: false,
    promotionStatus: 'safe' as const,
  },
  {
    companyId: 'company-sm',
    companyName: 'SM',
    nameEn: 'SM',
    nameKo: 'SM',
    artists: { en: ['aespa'], ko: ['에스파'] },
    voteCount: 387,
    voteCountHourly: 0,
    rank: 2,
    previousRank: 2,
    rankChange: 0,
    gradientColor: '#8B5CF6',
    logoUrl: '',
    tier: 'premier' as const,
    isRelegationZone: false,
    isPromotionZone: false,
    promotionStatus: 'safe' as const,
  },
];

describe('HomeClient legacy vote board surface', () => {
  beforeEach(() => {
    mocks.mockUseLeagueData.mockReset();
    mocks.mockUseAuth.mockReset();
    mocks.mockUseVoteQuota.mockReset();
    mocks.mockUseRefreshCountdown.mockReset();
    mocks.mockRefresh.mockReset();
    mocks.mockRefetchStats.mockReset();

    mocks.mockUseLeagueData.mockReturnValue({
      premierLeague: companies,
      allCompanies: companies,
      season: { year: 2026, month: 8, daysRemaining: 15 },
      isLoading: false,
      error: null,
      refresh: mocks.mockRefresh,
    });
    mocks.mockUseAuth.mockReturnValue({
      user: null,
      profile: null,
      isLoading: false,
      isAuthenticated: false,
    });
    mocks.mockUseVoteQuota.mockReturnValue({
      quota: { remaining: 100 },
      refetchStats: mocks.mockRefetchStats,
    });
    mocks.mockUseRefreshCountdown.mockReturnValue({ countdown: 20, isRefreshing: false });
    window.history.replaceState({}, '', '/');
  });

  it('keeps the stable home header and disables search on the legacy board', () => {
    render(<HomeClient />);

    expect(screen.getByTestId('home-season-label').textContent).toBe('2026년 08시즌');
    expect(screen.getByTestId('home-vote-helper').textContent).toBe(
      '* 카드를 길게 누르고 100표 투표하기',
    );
    expect(screen.getByTestId('home-today-votes').textContent).toBe('오늘 100표 남음');
    expect(screen.getByTestId('home-refresh-indicator').textContent).toBe('20초');
    expect(screen.getByTestId('home-season-dday').textContent).toBe('D-15');
    expect(screen.getByTestId('legacy-vote-board')).toBeDefined();
    expect(screen.getByTestId('board-header-enabled').textContent).toBe('false');
    expect(screen.getByTestId('board-search-enabled').textContent).toBe('false');
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByText('Battle Station')).toBeNull();
  });

  it('keeps the full ranked company collection available to the legacy board', () => {
    render(<HomeClient />);

    expect(screen.getByTestId('board-card-count').textContent).toBe('2');
    expect(screen.getByTestId('board-selected-company').textContent).toBe('none');
  });

  it('retains the existing home label format helpers', () => {
    expect(formatHomeSeasonLabel(2026, 8)).toBe('2026년 08시즌');
    expect(formatHomeDdayLabel(-2.4)).toBe('D-0');
  });
});

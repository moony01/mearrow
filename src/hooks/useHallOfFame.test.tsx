import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useHallOfFame } from './useHallOfFame';

const fixtures = vi.hoisted(() => {
  const januaryChampion = {
    year: 2026,
    month: 1,
    companyId: 'company-hybe',
    companyName: 'HYBE',
    companyLogo: 'H',
    companyLogoUrl: '/images/logos/hybe.webp',
    totalVotes: 18_200_300,
    decidedAt: '2026-02-01T00:00:00Z',
  };

  return {
    januaryChampion,
    data: {
      currentYear: 2026,
      latestGrandChampion: null,
      currentYearRace: [],
      currentYearMonthly: [januaryChampion],
    },
    getHallOfFame: vi.fn(),
  };
});

vi.mock('@/lib/api', () => ({
  getHallOfFame: fixtures.getHallOfFame,
}));

vi.mock('@/lib/mock-hall-of-fame', () => ({
  getMockHallOfFameData: () => fixtures.data,
  getMockMonthlyChampions: (year: number) =>
    year === fixtures.data.currentYear ? [fixtures.januaryChampion] : [],
  getMockYearlyRace: () => [],
}));

describe('useHallOfFame', () => {
  beforeEach(() => {
    fixtures.getHallOfFame.mockReset();
    fixtures.getHallOfFame.mockRejectedValue(new Error('Supabase unavailable'));
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Mock 폴백에서도 현재 연도의 월간 챔피언을 반환한다', async () => {
    const { result } = renderHook(() => useHallOfFame());

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 2_000 },
    );

    expect(result.current.dataSource).toBe('mock');
    expect(result.current.getMonthlyChampions(2026)).toEqual([fixtures.januaryChampion]);
  });

  it('keeps server-rendered records visible while the client refreshes them', () => {
    fixtures.getHallOfFame.mockResolvedValue(fixtures.data);

    const { result } = renderHook(() => useHallOfFame(fixtures.data));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toEqual(fixtures.data);
    expect(result.current.getMonthlyChampions(2026)).toEqual([fixtures.januaryChampion]);
  });
});

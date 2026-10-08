import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import koMessages from '@/messages/ko.json';
import HallOfFameClient from './HallOfFameClient';

const mocks = vi.hoisted(() => ({
  useHallOfFame: vi.fn(),
}));

vi.mock('@/hooks/useHallOfFame', () => ({
  useHallOfFame: () => mocks.useHallOfFame(),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, className }: React.ComponentProps<'a'>) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

const grandChampion = {
  year: 2026,
  companyId: 'company-hybe',
  companyName: 'HYBE',
  companyLogo: 'H',
  totalVotesInYear: 95_821_100,
  winCount: 6,
  decidedAt: '2027-01-01T00:00:00Z',
};

const champions = {
  2027: [
    {
      year: 2027,
      month: 1,
      companyId: 'company-hybe',
      companyName: 'HYBE',
      companyLogo: 'H',
      totalVotes: 18_200_300,
      decidedAt: '2027-02-01T00:00:00Z',
    },
  ],
  2026: [
    {
      year: 2026,
      month: 12,
      companyId: 'company-sm',
      companyName: 'SM',
      companyLogo: 'S',
      totalVotes: 14_100_200,
      decidedAt: '2027-01-01T00:00:00Z',
    },
  ],
};

describe('HallOfFameClient', () => {
  beforeEach(() => {
    mocks.useHallOfFame.mockReturnValue({
      data: {
        currentYear: 2027,
        latestGrandChampion: grandChampion,
        currentYearMonthly: champions[2027],
        currentYearRace: [
          {
            year: 2027,
            companyId: 'company-hybe',
            companyName: 'HYBE',
            companyLogo: 'H',
            winCount: 1,
            rank: 1,
          },
        ],
      },
      isLoading: false,
      error: null,
      getMonthlyChampions: (year: keyof typeof champions) => champions[year] ?? [],
      getYearlyRace: () => [
        {
          year: 2027,
          companyId: 'company-hybe',
          companyName: 'HYBE',
          companyLogo: 'H',
          winCount: 1,
          rank: 1,
        },
      ],
      refresh: vi.fn(),
    });
  });

  it('데이터의 현재 연도를 기본 아카이브로 선택하고 과거 연도로 전환한다', () => {
    render(
      <NextIntlClientProvider locale="ko" messages={koMessages}>
        <HallOfFameClient />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole('heading', { name: '2027 챔피언 아카이브' })).toBeDefined();
    expect(screen.getByRole('heading', { name: '2026 연간 챔피언' })).toBeDefined();
    expect(screen.getByRole('button', { name: '2027' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('link', { name: /현재 시즌 투표하기/ }).getAttribute('href')).toBe('/');
    expect(screen.queryByText('기록 공유')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '2026' }));

    expect(screen.getByRole('heading', { name: '2026 챔피언 아카이브' })).toBeDefined();
    expect(screen.getByText('SM')).toBeDefined();
  });
});

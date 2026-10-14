import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import HomeBoardHeader from './HomeBoardHeader';

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string, values?: Record<string, string | number>) => {
    if (namespace === 'League.season') {
      if (key === 'title') return `${values?.month} ${values?.year} Season`;
      if (key === 'countdown') return `${values?.seconds}s`;
      if (key === 'refreshing') return 'Updating...';
    }
    if (namespace === 'Vote.quota' && key === 'title') return "Today's Votes";
    return `* 카드를 길게 누르고 ${values?.max ?? ''}표 투표하기`;
  },
}));

const season = { year: 2026, month: 8, daysRemaining: 14 };
const expectedMetaSlots = ['home-today-votes', 'home-refresh-indicator', 'home-season-dday'];

function getMetaSlotIds() {
  const quota = screen.getByTestId('home-today-votes');
  const meta = quota.parentElement?.parentElement;

  if (!meta) {
    throw new Error('Expected today-votes to be inside homeHeaderMeta');
  }

  return Array.from(meta.children).map((child) => {
    const slot = child.matches('[data-testid]')
      ? child
      : child.querySelector('[data-testid]');
    return slot?.getAttribute('data-testid') ?? null;
  });
}

describe('HomeBoardHeader', () => {
  it('uses English season and quota copy on Studio and English embeds', () => {
    const { rerender } = render(
      <HomeBoardHeader locale="en" season={season} quotaRemaining={30} countdown={5} isRefreshing={false} />,
    );

    expect(screen.getByTestId('home-season-label').textContent).toBe('August 2026 Season');
    expect(screen.getByTestId('home-today-votes').textContent).toBe("Today's Votes: 30");
    expect(screen.getByTestId('home-refresh-indicator').textContent).toBe('5s');
    expect(screen.getByTestId('home-today-votes').getAttribute('aria-label')).toBe("Today's Votes: 30");
    expect(getMetaSlotIds()).toEqual(expectedMetaSlots);

    rerender(
      <HomeBoardHeader locale="en" season={season} quotaRemaining={30} countdown={20} isRefreshing />,
    );
    expect(screen.getByTestId('home-refresh-indicator').textContent).toBe('Updating...');
  });

  it('keeps quota, refresh, and D-day in stable meta slots across countdown states', () => {
    const { rerender } = render(
      <HomeBoardHeader
        season={season}
        quotaRemaining={0}
        countdown={10}
        isRefreshing={false}
      />,
    );

    expect(getMetaSlotIds()).toEqual(expectedMetaSlots);
    expect(screen.getByTestId('home-today-votes').textContent).toBe('오늘 0표 남음');
    expect(screen.getByTestId('home-refresh-indicator').textContent).toBe('10초');
    expect(screen.getByTestId('home-season-dday').textContent).toBe('D-14');

    rerender(
      <HomeBoardHeader
        season={season}
        quotaRemaining={0}
        countdown={1}
        isRefreshing={false}
      />,
    );

    expect(getMetaSlotIds()).toEqual(expectedMetaSlots);
    expect(screen.getByTestId('home-refresh-indicator').textContent).toBe('1초');
    expect(screen.getByTestId('home-season-dday').textContent).toBe('D-14');

    rerender(
      <HomeBoardHeader season={season} quotaRemaining={0} countdown={20} isRefreshing />,
    );

    expect(getMetaSlotIds()).toEqual(expectedMetaSlots);
    expect(screen.getByTestId('home-today-votes').textContent).toBe('오늘 0표 남음');
    expect(screen.getByTestId('home-refresh-indicator').textContent).toBe('갱신 중…');
    expect(screen.getByTestId('home-season-dday').textContent).toBe('D-14');
  });

  it('keeps the season header focused on season metadata without the vote hint', () => {
    render(
      <HomeBoardHeader
        season={season}
        quotaRemaining={100}
        countdown={20}
        isRefreshing={false}
      />,
    );

    const seasonLabel = screen.getByTestId('home-season-label');
    const todayVotes = screen.getByTestId('home-today-votes');

    expect(screen.queryByTestId('home-vote-helper')).toBeNull();
    expect(seasonLabel.parentElement?.contains(todayVotes)).toBe(false);
  });

});

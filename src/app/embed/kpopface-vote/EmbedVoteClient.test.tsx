import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import EmbedVoteClient from './EmbedVoteClient';

vi.mock('next-intl', () => ({
  useTranslations: () => () => '',
}));

vi.mock('@/hooks/useLeagueData', () => ({
  useLeagueData: () => ({
    allCompanies: [],
    season: { year: 2026, month: 8, daysRemaining: 15 },
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

vi.mock('@/hooks/useHomeDirectVoting', () => ({
  default: () => ({
    quota: { remaining: 30 },
    isAuthLoading: false,
    isQuotaLoading: false,
    isVoteLoading: false,
    voteStates: {},
    onVote: vi.fn(),
  }),
}));

vi.mock('@/hooks/useRefreshCountdown', () => ({
  useRefreshCountdown: () => ({ countdown: 20, isRefreshing: false }),
}));

vi.mock('@/components/features/vote/VoteBoard', () => ({
  default: () => (
    <section data-testid="canonical-vote-board" />
  ),
}));

vi.mock('@/components/features/VoteController', () => ({ default: () => null }));
vi.mock('@/components/ui/BottomSheet', () => ({ default: () => null }));

beforeEach(() => {
  window.history.replaceState({}, '', '/embed/kpopface-vote');
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('legacy Kpopface embed compatibility', () => {
  it('renders the canonical VoteBoard with the Kpopface surface and policy', () => {
    render(<EmbedVoteClient locale="ko" />);

    expect(screen.getByTestId('canonical-vote-board')).toBeDefined();
    expect(screen.getByTestId('vote-board-embed').getAttribute('data-surface')).toBe('kpopface');
  });

  it('preserves an explicit legacy surface query for compatibility callers', () => {
    window.history.replaceState({}, '', '/embed/kpopface-vote?surface=kcl-modal');
    render(<EmbedVoteClient locale="ko" />);

    expect(screen.getByTestId('canonical-vote-board')).toBeDefined();
    expect(screen.getByTestId('vote-board-embed').getAttribute('data-surface')).toBe('kcl-modal');
  });
});

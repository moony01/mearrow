import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import VoteBoardEmbedClient, { parseVoteBoardEmbedOptions } from './VoteBoardEmbedClient';

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
    quota: { remaining: 100 },
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
  default: ({
    showKpopfaceAd,
    showSearchBar,
  }: {
    showKpopfaceAd?: boolean;
    showSearchBar?: boolean;
  }) => (
    <section
      data-testid="shared-vote-board"
      data-ads={showKpopfaceAd ? 'on' : 'off'}
      data-search={showSearchBar ? 'on' : 'off'}
    />
  ),
}));

vi.mock('@/components/features/VoteController', () => ({ default: () => null }));
vi.mock('@/components/ui/BottomSheet', () => ({ default: () => null }));

beforeEach(() => {
  window.history.replaceState({}, '', '/embed/vote-board');
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

describe('parseVoteBoardEmbedOptions', () => {
  it('allows an explicit kpopface surface with ads enabled', () => {
    expect(parseVoteBoardEmbedOptions('?surface=kpopface&ads=on')).toEqual({
      surface: 'kpopface',
      showAds: true,
    });
  });

  it('defaults to a partner surface with ads disabled', () => {
    expect(parseVoteBoardEmbedOptions('')).toEqual({
      surface: 'partner',
      showAds: false,
    });
  });

  it('does not trust unsupported surface or ad values', () => {
    expect(parseVoteBoardEmbedOptions('?surface=javascript:alert(1)&ads=yes')).toEqual({
      surface: 'partner',
      showAds: false,
    });
  });
});

describe('VoteBoardEmbedClient Kpopface signup CTA', () => {
  it.each([
    ['ko', 'MEARROW 가입하고 매일 300표 받기'],
    ['en', 'Join MEARROW for 300 votes every day'],
    ['ja', 'MEARROWに登録して毎日300票を使う'],
    ['zh', '注册 MEARROW，每天获得 300 票'],
    ['es', 'Regístrate en MEARROW y consigue 300 votos diarios'],
    ['fr', 'Inscris-toi sur MEARROW pour 300 votes par jour'],
    ['de', 'Bei MEARROW registrieren und täglich 300 Stimmen erhalten'],
  ])('renders the localized %s CTA after the compact board', async (locale, label) => {
    window.history.replaceState(
      {},
      '',
      `/embed/vote-board/?surface=kpopface&ads=off`,
    );

    render(<VoteBoardEmbedClient locale={locale} />);

    const cta = await screen.findByRole('link', { name: label });
    const board = screen.getByTestId('vote-board-embed');
    const sharedBoard = screen.getByTestId('shared-vote-board');

    expect(cta.getAttribute('href')).toBe(`/signup`);
    expect(cta.getAttribute('target')).toBe('_blank');
    expect(cta.getAttribute('rel')).toBe('noopener noreferrer');
    expect(board.getAttribute('data-ads')).toBe('off');
    expect(sharedBoard.getAttribute('data-search')).toBe('off');
    expect(board.contains(cta)).toBe(false);
    expect(board.compareDocumentPosition(cta) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
  });

  it.each(['partner', 'kcl-modal'])('does not render the CTA on the %s surface', async (surface) => {
    window.history.replaceState(
      {},
      '',
      `/embed/vote-board?surface=${surface}&ads=off`,
    );

    render(<VoteBoardEmbedClient locale="en" />);

    await waitFor(() => {
      expect(screen.getByTestId('vote-board-embed').getAttribute('data-surface')).toBe(surface);
    });
    expect(screen.getByTestId('shared-vote-board').getAttribute('data-search')).toBe('off');
    expect(
      screen.queryByRole('link', { name: 'Join MEARROW for 300 votes every day' }),
    ).toBeNull();
  });
});

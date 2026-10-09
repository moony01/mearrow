import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import koMessages from '@/messages/ko.json';
import NewsGridClient from './NewsGridClient';

const mocks = vi.hoisted(() => ({
  getNewsCommentCounts: vi.fn(),
}));

vi.mock('@/lib/api/news-comments', () => ({
  getNewsCommentCounts: mocks.getNewsCommentCounts,
}));

vi.mock('@/components/news/NewsCard', () => ({
  default: ({ slug, title }: { slug: string; title: string }) => (
    <article data-testid="news-card" data-slug={slug}>
      <h2>{title}</h2>
    </article>
  ),
}));

const newsPosts = Array.from({ length: 25 }, (_, index) => ({
  slug: `news-${index + 1}`,
  title: `News ${index + 1}`,
  excerpt: `Excerpt ${index + 1}`,
  date: '2026-01-01',
  category: index < 15 ? 'A' : 'B',
}));

function renderNewsGrid() {
  return render(
    <NextIntlClientProvider locale="ko" messages={koMessages}>
      <NewsGridClient posts={newsPosts} locale="ko" />
    </NextIntlClientProvider>,
  );
}

describe('NewsGridClient pagination', () => {
  beforeEach(() => {
    mocks.getNewsCommentCounts.mockReset();
    mocks.getNewsCommentCounts.mockImplementation(() => new Promise(() => undefined));
  });

  it('shows six posts per page and fetches comments only for visible slugs', async () => {
    renderNewsGrid();

    expect(screen.getAllByTestId('news-card')).toHaveLength(6);
    expect(screen.queryByRole('button', { name: '더 보기' })).toBeNull();
    expect(screen.getByRole('button', { name: '1페이지' }).getAttribute('aria-current')).toBe('page');
    expect((screen.getByRole('button', { name: '이전 페이지' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: '다음 페이지' }) as HTMLButtonElement).disabled).toBe(false);

    await waitFor(() => {
      expect(mocks.getNewsCommentCounts.mock.calls[0]?.[0]).toEqual(
        newsPosts.slice(0, 6).map((post) => post.slug),
      );
    });

    fireEvent.click(screen.getByRole('button', { name: '2페이지' }));

    expect(screen.getAllByTestId('news-card')).toHaveLength(6);
    expect(screen.getByRole('heading', { name: 'News 7' })).toBeDefined();
    expect(screen.queryByRole('heading', { name: 'News 1' })).toBeNull();
    expect(screen.getByRole('button', { name: '2페이지' }).getAttribute('aria-current')).toBe('page');

    await waitFor(() => {
      const lastCall = mocks.getNewsCommentCounts.mock.calls.at(-1);
      expect(lastCall?.[0]).toEqual(newsPosts.slice(6, 12).map((post) => post.slug));
    });

    fireEvent.click(screen.getByRole('button', { name: '3페이지' }));

    expect(screen.getAllByTestId('news-card')).toHaveLength(6);
    expect(screen.getByRole('heading', { name: 'News 13' })).toBeDefined();
    expect(screen.getByRole('button', { name: '3페이지' }).getAttribute('aria-current')).toBe('page');

    await waitFor(() => {
      const lastCall = mocks.getNewsCommentCounts.mock.calls.at(-1);
      expect(lastCall?.[0]).toEqual(newsPosts.slice(12, 18).map((post) => post.slug));
    });

    expect(screen.queryByRole('button', { name: /^A$/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^B$/ })).toBeNull();
  });
});

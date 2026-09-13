import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';
import type { AuditionMeta } from '@/lib/auditions';
import koMessages from '@/messages/ko.json';
import AuditionsGridClient from './AuditionsGridClient';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.ComponentProps<'a'> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function createAudition(index: number): AuditionMeta {
  return {
    slug: `audition-${index}`,
    locale: 'ko',
    title: `Audition ${index}`,
    excerpt: `Excerpt ${index}`,
    agency: 'MEARROW Agency',
    publishedAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    applicationDeadline: '2026-12-31',
    mode: 'online',
    country: '대한민국',
    city: '서울',
    categories: ['vocal'],
    eligibility: 'Everyone',
    status: index === 7 ? 'closing' : 'open',
    officialUrl: 'https://example.com/apply',
    sourceUrl: 'https://example.com/source',
    verifiedAt: '2026-01-01',
    poster: '/poster.jpg',
    posterAlt: `Poster ${index}`,
    posterWidth: 1600,
    posterHeight: 900,
    active: true,
  };
}

const auditions = Array.from({ length: 7 }, (_, index) => createAudition(index + 1));

describe('AuditionsGridClient pagination', () => {
  it('keeps the card data and links while paginating six cards at a time', () => {
    render(
      <NextIntlClientProvider locale="ko" messages={koMessages}>
        <AuditionsGridClient posts={auditions} locale="ko" />
      </NextIntlClientProvider>,
    );

    expect(screen.getAllByRole('article')).toHaveLength(6);
    expect(screen.getByRole('navigation', { name: '오디션 페이지 탐색' })).toBeDefined();
    expect(screen.getByRole('button', { name: '1페이지' }).getAttribute('aria-current')).toBe('page');

    fireEvent.click(screen.getByRole('button', { name: '2페이지' }));

    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Audition 7' })).toBeDefined();
    expect(screen.getByRole('link', { name: 'Audition 7' }).getAttribute('href')).toBe(
      '/ko/auditions/audition-7',
    );
    expect(screen.getByText('마감 임박')).toBeDefined();
    expect(document.querySelector('time')?.getAttribute('datetime')).toBe('2026-12-31');
    expect(screen.getByRole('button', { name: '2페이지' }).getAttribute('aria-current')).toBe('page');
    expect((screen.getByRole('button', { name: '다음 페이지' }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: '이전 페이지' }));

    expect(screen.getAllByRole('article')).toHaveLength(6);
    expect(screen.getByRole('button', { name: '1페이지' }).getAttribute('aria-current')).toBe('page');
  });
});

import { renderToStaticMarkup } from 'react-dom/server';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicProfileSnapshot } from '@/lib/api/public-profile';
import PublicProfileClient from './PublicProfileClient';

const mocks = vi.hoisted(() => ({ getProfile: vi.fn(), posts: vi.fn(), activities: vi.fn(), social: vi.fn() }));
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }));
vi.mock('next/navigation', () => ({ usePathname: () => '/en/profile/artist' }));
vi.mock('@/lib/api/public-profile', () => ({
  getPublicProfileByUsername: mocks.getProfile,
  listPublicProfilePosts: mocks.posts,
  listPublicProfileActivities: mocks.activities,
}));
vi.mock('@/lib/api/profile-social', () => ({ getProfilePostSocial: mocks.social }));
vi.mock('./ProfilePostSocial', () => ({ default: () => <div>Social controls</div> }));

const snapshot: PublicProfileSnapshot = {
  profile: { id: 'public-user', username: 'artist', bio: 'Public artist introduction', avatar_url: null },
  posts: [{ id: 'public-post', user_id: 'public-user', caption: 'Original performance', media_type: 'image', media_url: 'https://example.com/performance.webp', created_at: '2026-10-01T12:00:00Z' }],
  activities: [{ id: 'activity', user_id: 'public-user', title: 'Public performance history', organization: null, start_date: '2026-10-01', end_date: null, is_current: true, category: 'other', description: null, is_public: true, created_at: '2026-10-01T12:00:00Z', updated_at: '2026-10-01T12:00:00Z' }],
};

describe('public profile initial document', () => {
  beforeEach(() => vi.clearAllMocks());

  it('includes the public introduction, post and activity before any effects execute', () => {
    const html = renderToStaticMarkup(<PublicProfileClient locale="en" username="artist" initialData={snapshot} />);
    expect(html).toContain('Public artist introduction');
    expect(html).toContain('Original performance');
    expect(html).toContain('Public performance history');
    expect(html).not.toContain('aria-busy="true"');
    expect(mocks.getProfile).not.toHaveBeenCalled();
  });

  it('includes a title, explanation and navigation when the preload is unavailable', () => {
    const html = renderToStaticMarkup(<PublicProfileClient locale="en" username="artist" />);
    expect(html).toContain('<h1>artist</h1>');
    expect(html).toContain('intro');
    expect(html).toContain('href="/en"');
  });

  it('keeps preloaded content visible during a pending refresh and a refresh failure', async () => {
    let rejectRefresh!: (reason: Error) => void;
    mocks.getProfile.mockReturnValue(new Promise((_resolve, reject) => { rejectRefresh = reject; }));
    render(<PublicProfileClient locale="en" username="artist" initialData={snapshot} />);
    await waitFor(() => expect(mocks.getProfile).toHaveBeenCalled());
    expect(screen.getByText('Original performance')).toBeTruthy();
    rejectRefresh(new Error('read unavailable'));
    await waitFor(() => expect(screen.queryByText('loading')).toBeNull());
    expect(screen.getByText('Public artist introduction')).toBeTruthy();
    expect(screen.getByText('Original performance')).toBeTruthy();
  });
});

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { getInitialPublicProfile } from './public-profile';

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), profile: vi.fn(), posts: vi.fn(), activities: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }));
vi.mock('@/lib/api/public-profile', () => ({ getPublicProfileByUsername: mocks.profile, listPublicProfilePosts: mocks.posts, listPublicProfileActivities: mocks.activities }));

describe('public anonymous profile preload', () => {
  const client = {};
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://fixture.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'public-fixture-key');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'privileged-key-must-not-be-used');
    mocks.createClient.mockReturnValue(client);
  });
  afterEach(() => vi.unstubAllEnvs());

  it('uses the anonymous key and only serializes the public readers results', async () => {
    mocks.profile.mockResolvedValue({ id: 'artist-id', username: 'artist' });
    mocks.posts.mockResolvedValue([{ id: 'published-post' }]);
    mocks.activities.mockResolvedValue([{ id: 'public-activity' }]);
    const result = await getInitialPublicProfile('artist');
    expect(mocks.createClient.mock.calls[0][1]).toBe('public-fixture-key');
    expect(mocks.posts).toHaveBeenCalledWith('artist-id', client, 12);
    expect(mocks.activities).toHaveBeenCalledWith('artist-id', client, 20);
    expect(result?.posts).toEqual([{ id: 'published-post' }]);
  });

  it('does not fetch posts for a missing profile', async () => {
    mocks.profile.mockResolvedValue(null);
    expect(await getInitialPublicProfile('missing')).toEqual({ profile: null, posts: [], activities: [] });
    expect(mocks.posts).not.toHaveBeenCalled();
  });

  it('returns an unavailable preload without exposing read errors', async () => {
    mocks.profile.mockRejectedValue(new Error('internal database detail'));
    expect(await getInitialPublicProfile('artist')).toBeNull();
  });

  it('skips Pages shell and missing public environment configuration', async () => {
    expect(await getInitialPublicProfile('__profile')).toBeNull();
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    expect(await getInitialPublicProfile('artist')).toBeNull();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
});

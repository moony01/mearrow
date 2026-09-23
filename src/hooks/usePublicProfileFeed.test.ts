import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ListPublicProfilePostsOptions,
  ProfileMediaType,
  PublicProfileFeedPage,
  PublicProfilePostRecord,
} from '@/lib/api/profile-content';
import { usePublicProfileFeed } from './usePublicProfileFeed';

const fixtures = vi.hoisted(() => ({
  listPublicProfilePosts: vi.fn(),
}));

vi.mock('@/lib/api/profile-content', () => ({
  PROFILE_FEED_PAGE_SIZE: 4,
  listPublicProfilePosts: fixtures.listPublicProfilePosts,
}));

function makePost(id: string, mediaType: ProfileMediaType): PublicProfilePostRecord {
  return {
    id,
    media_type: mediaType,
    caption: null,
    created_at: `2026-08-29T00:00:0${id.length}Z`,
    media_url: `https://cdn.example.com/${id}`,
    author: null,
  };
}

function page(posts: PublicProfilePostRecord[], nextCursor: PublicProfileFeedPage['nextCursor'] = null) {
  return { posts, nextCursor };
}

describe('usePublicProfileFeed', () => {
  beforeEach(() => {
    fixtures.listPublicProfilePosts.mockReset();
  });

  it('keeps the existing unfiltered call shape when mediaType is omitted', async () => {
    const post = makePost('all-post', 'image');
    fixtures.listPublicProfilePosts.mockResolvedValue(page([post]));

    const { result } = renderHook(() => usePublicProfileFeed());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fixtures.listPublicProfilePosts).toHaveBeenCalledWith({
      cursor: null,
      limit: 4,
    });
    expect(result.current.posts).toEqual([post]);
  });

  it('keeps a server-rendered first page visible while it refreshes', async () => {
    const serverPost = makePost('server-post', 'image');
    const refreshedPost = makePost('refreshed-post', 'image');
    let resolveRefresh!: (value: PublicProfileFeedPage) => void;
    const refresh = new Promise<PublicProfileFeedPage>((resolve) => {
      resolveRefresh = resolve;
    });
    fixtures.listPublicProfilePosts.mockReturnValue(refresh);

    const { result } = renderHook(() => usePublicProfileFeed(undefined, page([serverPost])));

    expect(result.current.posts).toEqual([serverPost]);
    await waitFor(() => expect(fixtures.listPublicProfilePosts).toHaveBeenCalledTimes(1));

    await act(async () => {
      resolveRefresh(page([refreshedPost]));
      await refresh;
    });

    await waitFor(() => expect(result.current.posts).toEqual([refreshedPost]));
  });

  it('restarts at the first page when the media filter changes', async () => {
    const imagePost = makePost('image-post', 'image');
    const shortPost = makePost('short-post', 'short');
    fixtures.listPublicProfilePosts.mockImplementation(
      async ({ mediaType }: ListPublicProfilePostsOptions) =>
        page(mediaType === 'short' ? [shortPost] : [imagePost]),
    );

    const { result, rerender } = renderHook(
      ({ mediaType }: { mediaType?: ProfileMediaType }) => usePublicProfileFeed(mediaType),
      { initialProps: { mediaType: 'image' as ProfileMediaType } },
    );

    await waitFor(() => expect(result.current.posts).toEqual([imagePost]));

    rerender({ mediaType: 'short' });

    await waitFor(() => expect(result.current.posts).toEqual([shortPost]));
    expect(fixtures.listPublicProfilePosts).toHaveBeenNthCalledWith(2, {
      cursor: null,
      limit: 4,
      mediaType: 'short',
    });
  });

  it('preserves filtered infinite scroll pagination', async () => {
    const firstPost = makePost('first-post', 'image');
    const nextPost = makePost('next-post', 'image');
    const nextCursor = { created_at: '2026-08-28T00:00:00Z', id: 'first-post' };
    fixtures.listPublicProfilePosts
      .mockResolvedValueOnce(page([firstPost], nextCursor))
      .mockResolvedValueOnce(page([nextPost]));

    const { result } = renderHook(() => usePublicProfileFeed('image'));

    await waitFor(() => expect(result.current.posts).toEqual([firstPost]));
    await act(async () => {
      await result.current.loadMore();
    });

    expect(fixtures.listPublicProfilePosts).toHaveBeenLastCalledWith({
      cursor: nextCursor,
      limit: 4,
      mediaType: 'image',
    });
    expect(result.current.posts).toEqual([firstPost, nextPost]);
  });

  it('ignores a stale response after the media filter changes', async () => {
    let resolveImage!: (value: PublicProfileFeedPage) => void;
    let resolveShort!: (value: PublicProfileFeedPage) => void;
    const imageRequest = new Promise<PublicProfileFeedPage>((resolve) => {
      resolveImage = resolve;
    });
    const shortRequest = new Promise<PublicProfileFeedPage>((resolve) => {
      resolveShort = resolve;
    });
    const imagePost = makePost('stale-image', 'image');
    const shortPost = makePost('fresh-short', 'short');

    fixtures.listPublicProfilePosts.mockImplementation(({ mediaType }: ListPublicProfilePostsOptions) =>
      mediaType === 'short' ? shortRequest : imageRequest,
    );

    const { result, rerender } = renderHook(
      ({ mediaType }: { mediaType: ProfileMediaType }) => usePublicProfileFeed(mediaType),
      { initialProps: { mediaType: 'image' } },
    );

    await waitFor(() => expect(fixtures.listPublicProfilePosts).toHaveBeenCalledTimes(1));
    rerender({ mediaType: 'short' });
    await waitFor(() => expect(fixtures.listPublicProfilePosts).toHaveBeenCalledTimes(2));

    await act(async () => {
      resolveImage(page([imagePost]));
      await imageRequest;
    });
    expect(result.current.posts).toEqual([]);

    await act(async () => {
      resolveShort(page([shortPost]));
      await shortRequest;
    });
    await waitFor(() => expect(result.current.posts).toEqual([shortPost]));
  });
});

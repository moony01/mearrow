'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  listPublicProfilePosts,
  PROFILE_FEED_PAGE_SIZE,
  type ProfileFeedCursor,
  type ProfileMediaType,
  type PublicProfileFeedPage,
  type PublicProfilePostRecord,
} from '@/lib/api/profile-content';

export interface UsePublicProfileFeedReturn {
  posts: PublicProfilePostRecord[];
  isLoading: boolean;
  hasMore: boolean;
  error: Error | null;
  loadMore: () => Promise<void>;
  reload: () => Promise<void>;
}

export function usePublicProfileFeed(
  mediaType?: ProfileMediaType,
  initialPage?: PublicProfileFeedPage | null,
): UsePublicProfileFeedReturn {
  const hasInitialPage = initialPage !== null && initialPage !== undefined;
  const preserveInitialPageRef = useRef(hasInitialPage);
  const [posts, setPosts] = useState<PublicProfilePostRecord[]>(() => initialPage?.posts ?? []);
  const [cursor, setCursor] = useState<ProfileFeedCursor | null>(() => initialPage?.nextCursor ?? null);
  const [hasMore, setHasMore] = useState(() => hasInitialPage ? initialPage.nextCursor !== null : true);
  const [isLoading, setIsLoading] = useState(!hasInitialPage);
  const [error, setError] = useState<Error | null>(null);
  const requestIdRef = useRef(0);

  const loadPage = useCallback(
    async (nextCursor: ProfileFeedCursor | null, replace: boolean) => {
      const requestId = ++requestIdRef.current;
      setIsLoading(true);
      setError(null);

      try {
        const page = await listPublicProfilePosts({
          cursor: nextCursor,
          limit: PROFILE_FEED_PAGE_SIZE,
          ...(mediaType ? { mediaType } : {}),
        });
        if (requestId !== requestIdRef.current) return;

        setPosts((current) => {
          if (replace) return page.posts;
          const knownIds = new Set(current.map((post) => post.id));
          return [...current, ...page.posts.filter((post) => !knownIds.has(post.id))];
        });
        setCursor(page.nextCursor);
        setHasMore(page.nextCursor !== null);
      } catch (cause) {
        if (requestId !== requestIdRef.current) return;
        setError(cause instanceof Error ? cause : new Error('Unable to load the public feed.'));
      } finally {
        if (requestId === requestIdRef.current) setIsLoading(false);
      }
    },
    [mediaType],
  );

  useEffect(() => {
    // A server-rendered first page must remain visible during the background
    // refresh. Subsequent filter changes retain the existing reset behavior.
    const preserveInitialPage = preserveInitialPageRef.current;
    preserveInitialPageRef.current = false;
    if (!preserveInitialPage) {
      setPosts([]);
      setCursor(null);
      setHasMore(true);
    }
    void loadPage(null, true);
  }, [loadPage]);

  const loadMore = useCallback(async () => {
    if (!hasMore || !cursor || isLoading) return;
    await loadPage(cursor, false);
  }, [cursor, hasMore, isLoading, loadPage]);

  const reload = useCallback(async () => {
    await loadPage(null, true);
  }, [loadPage]);

  return { posts, isLoading, hasMore, error, loadMore, reload };
}

export default usePublicProfileFeed;

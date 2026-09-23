import { createServerClient } from '@/lib/supabase/server';
import type {
  ProfileMediaType,
  PublicProfileAuthor,
  PublicProfileFeedPage,
  PublicProfilePostRecord,
} from '@/lib/api/profile-content';

/** Keep this aligned with the client feed's first-page size. */
const INITIAL_HOME_FEED_PAGE_SIZE = 4;
const PROFILE_IMAGE_BUCKET = 'profile-images';
const PROFILE_SHORTS_BUCKET = 'profile-shorts';

interface PublicProfilePostRow {
  id: string;
  user_id: string;
  media_type: ProfileMediaType;
  storage_path: string;
  caption: string | null;
  created_at: string;
}

interface PublicProfileAuthorRow extends PublicProfileAuthor {
  id: string;
}

function getPublicMediaUrl(
  mediaType: ProfileMediaType,
  storagePath: string,
  getUrl: (bucket: string, path: string) => string,
): string {
  const bucket = mediaType === 'image' ? PROFILE_IMAGE_BUCKET : PROFILE_SHORTS_BUCKET;
  return getUrl(bucket, storagePath);
}

/**
 * Reads the first public feed page on the server so the home route has real
 * post text and links in its initial HTML. The browser still refreshes this
 * page after hydration and owns the remaining infinite-scroll requests.
 */
export async function getInitialHomeFeed(): Promise<PublicProfileFeedPage | null> {
  const supabase = createServerClient();
  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('profile_posts')
      .select('id, user_id, media_type, storage_path, caption, created_at')
      .eq('status', 'published')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(INITIAL_HOME_FEED_PAGE_SIZE + 1);

    if (error) {
      console.warn('[home-feed] public feed server preload is unavailable');
      return null;
    }

    const records = (data || []) as PublicProfilePostRow[];
    const page = records.slice(0, INITIAL_HOME_FEED_PAGE_SIZE);
    const authorIds = [...new Set(page.map((record) => record.user_id))];
    const authorsById = new Map<string, PublicProfileAuthor>();

    if (authorIds.length > 0) {
      const { data: authors, error: authorsError } = await supabase
        .from('user_profiles')
        .select('id, username, avatar_url')
        .in('id', authorIds);

      if (authorsError) {
        console.warn('[home-feed] public author server preload is unavailable');
        return null;
      }

      for (const author of (authors || []) as PublicProfileAuthorRow[]) {
        authorsById.set(author.id, author);
      }
    }

    const getUrl = (bucket: string, storagePath: string) =>
      supabase.storage.from(bucket).getPublicUrl(storagePath).data.publicUrl;

    const posts: PublicProfilePostRecord[] = page.map((record) => ({
      id: record.id,
      media_type: record.media_type,
      caption: record.caption,
      created_at: record.created_at,
      media_url: getPublicMediaUrl(record.media_type, record.storage_path, getUrl),
      author: authorsById.get(record.user_id) ?? null,
    }));
    const last = page[page.length - 1];

    return {
      posts,
      nextCursor:
        records.length > INITIAL_HOME_FEED_PAGE_SIZE && last
          ? { created_at: last.created_at, id: last.id }
          : null,
    };
  } catch {
    console.warn('[home-feed] public feed server preload failed');
    return null;
  }
}

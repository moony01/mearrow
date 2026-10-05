import { getSupabase, type SupabaseClient } from '@/lib/supabase/client';
import {
  PROFILE_IMAGE_BUCKET,
  PROFILE_SHORTS_BUCKET,
} from './profile-content';
import type {
  ProfileActivityCategory,
  ProfileMediaType,
} from './profile-content';

export interface PublicProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
}

export interface PublicProfilePost {
  id: string;
  user_id: string;
  media_type: ProfileMediaType;
  caption: string | null;
  created_at: string;
  media_url: string;
}

export interface PublicProfileActivity {
  id: string;
  user_id: string;
  title: string;
  organization: string | null;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  category: ProfileActivityCategory;
  description: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface PublicProfileSnapshot {
  profile: PublicProfile | null;
  posts: PublicProfilePost[];
  activities: PublicProfileActivity[];
}

type PublicProfilePostRow = Omit<PublicProfilePost, 'media_url'> & {
  storage_path: string;
};

function getPublicMediaUrl(client: SupabaseClient, mediaType: ProfileMediaType, storagePath: string): string {
  const bucket = mediaType === 'image' ? PROFILE_IMAGE_BUCKET : PROFILE_SHORTS_BUCKET;
  return client.storage.from(bucket).getPublicUrl(storagePath).data.publicUrl;
}

/** Look up only fields intended for a public profile page. */
export async function getPublicProfileByUsername(
  username: string,
  client: SupabaseClient = getSupabase(),
): Promise<PublicProfile | null> {
  const normalizedUsername = username.trim();
  if (!normalizedUsername) return null;

  const { data, error } = await client
    .from('user_profiles')
    .select('id, username, avatar_url, bio')
    .eq('username', normalizedUsername)
    .maybeSingle();

  if (error) throw error;
  return data as PublicProfile | null;
}

/** List only published, public posts owned by the requested profile. */
export async function listPublicProfilePosts(
  userId: string,
  client: SupabaseClient = getSupabase(),
  limit?: number,
): Promise<PublicProfilePost[]> {
  const query = client
    .from('profile_posts')
    .select('id, user_id, media_type, storage_path, caption, created_at')
    .eq('user_id', userId)
    .eq('status', 'published')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });

  const { data, error } = await (limit ? query.limit(limit) : query);

  if (error) throw error;
  return ((data || []) as PublicProfilePostRow[]).map((post) => ({
    id: post.id,
    user_id: post.user_id,
    media_type: post.media_type,
    caption: post.caption,
    created_at: post.created_at,
    media_url: getPublicMediaUrl(client, post.media_type, post.storage_path),
  }));
}

/** List only public activity entries owned by the requested profile. */
export async function listPublicProfileActivities(
  userId: string,
  client: SupabaseClient = getSupabase(),
  limit?: number,
): Promise<PublicProfileActivity[]> {
  const query = client
    .from('profile_activities')
    .select(
      'id, user_id, title, organization, start_date, end_date, is_current, category, description, is_public, created_at, updated_at',
    )
    .eq('user_id', userId)
    .eq('is_public', true)
    .order('is_current', { ascending: false })
    .order('start_date', { ascending: false })
    .order('created_at', { ascending: false });

  const { data, error } = await (limit ? query.limit(limit) : query);

  if (error) throw error;
  return (data || []) as PublicProfileActivity[];
}

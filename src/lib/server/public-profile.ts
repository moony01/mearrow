import { createClient } from '@supabase/supabase-js';
import { PUBLIC_PROFILE_STATIC_SHELL_USERNAME } from '@/lib/constants';
import {
  getPublicProfileByUsername,
  listPublicProfileActivities,
  listPublicProfilePosts,
  type PublicProfileSnapshot,
} from '@/lib/api/public-profile';

/** Public, anonymous reads only; never use the service-role key for profile HTML. */
export async function getInitialPublicProfile(username: string): Promise<PublicProfileSnapshot | null> {
  if (!username.trim() || username === PUBLIC_PROFILE_STATIC_SHELL_USERNAME) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

  try {
    const client = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
    });
    const profile = await getPublicProfileByUsername(username, client);
    if (!profile) return { profile: null, posts: [], activities: [] };
    const [posts, activities] = await Promise.all([
      listPublicProfilePosts(profile.id, client, 12),
      listPublicProfileActivities(profile.id, client, 20),
    ]);
    return { profile, posts, activities };
  } catch {
    // The page keeps its public introduction/navigation during a read outage.
    // Do not expose database errors or credentials in the browser document.
    return null;
  }
}

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createClient } from '@/lib/supabase/client';
import {
  createNoticeComment,
  getNoticeComments,
  supportsNoticeComments,
} from './notice-comments';

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));

describe('notice comments for static notices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('recognizes only database UUIDs as comment-capable notices', () => {
    expect(supportsNoticeComments('event-signup-double-votes-2026-02')).toBe(false);
    expect(supportsNoticeComments('8dd0bf23-5b48-46b0-8ba6-564dc017fd3f')).toBe(true);
  });

  it('does not create a Supabase client for a static notice read or write', async () => {
    await expect(getNoticeComments('event-signup-double-votes-2026-02')).resolves.toEqual([]);
    await expect(createNoticeComment({
      announcement_id: 'event-signup-double-votes-2026-02',
      author_name: 'test',
      password: 'password',
      content: 'test comment',
    })).resolves.toBeNull();

    expect(createClient).not.toHaveBeenCalled();
  });
});

import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CallbackClient, {
  getProviderFromSession,
  getSafeReturnTo,
  getSessionFromStorage,
  resolveProfileRedirect,
} from './CallbackClient';

const mocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  fetch: vi.fn(),
  searchParams: new URLSearchParams('code=signup-code&flow=signup'),
}));

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

vi.mock('next/navigation', () => ({
  usePathname: () => '/auth/callback',
  useSearchParams: () => mocks.searchParams,
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/lib/supabase/client', () => ({
  getSupabase: () => ({
    auth: {
      exchangeCodeForSession: mocks.exchangeCodeForSession,
    },
  }),
}));

describe('CallbackClient onboarding redirect', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'public-anon-key');
    window.localStorage.clear();
    window.localStorage.setItem(
      'sb-test-auth-token',
      JSON.stringify({
        access_token: 'access-token',
        user: {
          id: 'user-1',
          app_metadata: { provider: 'google' },
        },
      }),
    );

    mocks.exchangeCodeForSession.mockReset();
    mocks.exchangeCodeForSession.mockResolvedValue({ data: {}, error: null });
    mocks.fetch.mockReset();
    vi.stubGlobal('fetch', mocks.fetch);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('프로필 조회가 pending이면 15초 후 타임아웃하고 느린 응답으로 이동하지 않는다', async () => {
    vi.useFakeTimers();
    const profileResponse = createDeferred<{
      ok: boolean;
      status: number;
      json: () => Promise<Array<{ onboarding_completed: boolean }>>;
    }>();
    mocks.fetch.mockReturnValue(profileResponse.promise);

    render(<CallbackClient />);

    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.fetch).toHaveBeenCalledWith(
      expect.stringContaining(
        '/rest/v1/user_profiles?id=eq.user-1&select=onboarding_completed',
      ),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer access-token',
        }),
      }),
    );

    await act(async () => {
      vi.advanceTimersByTime(14700);
      await Promise.resolve();
    });

    expect(screen.getByText('error_oauth_timeout')).toBeDefined();
    expect(window.localStorage.getItem('kcl_last_login_provider')).toBeNull();

    profileResponse.resolve({
      ok: true,
      status: 200,
      json: async () => [{ onboarding_completed: true }],
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText('error_oauth_timeout')).toBeDefined();
    expect(window.localStorage.getItem('kcl_last_login_provider')).toBeNull();
  });

  it('앞의 토큰이 깨져 있어도 뒤의 정상 세션과 provider를 찾는다', () => {
    window.localStorage.clear();
    window.localStorage.setItem('sb-broken-auth-token', '{not-json');
    window.localStorage.setItem(
      'sb-valid-auth-token',
      JSON.stringify({
        access_token: 'valid-access-token',
        user: {
          id: 'valid-user',
          app_metadata: { provider: 'google' },
        },
      }),
    );

    expect(getSessionFromStorage()).toEqual({
      userId: 'valid-user',
      accessToken: 'valid-access-token',
    });
    expect(getProviderFromSession()).toBe('google');
  });

  it('production에서 localhost returnTo를 거부하고 development에서만 허용한다', () => {
    expect(getSafeReturnTo('http://localhost:4000/kpopface/', 'production')).toBeNull();
    expect(getSafeReturnTo('http://127.0.0.1:4000/kpopface/', 'production')).toBeNull();

    expect(getSafeReturnTo('http://localhost:4000/kpopface/', 'development')).toBe(
      'http://localhost:4000/kpopface/',
    );
    expect(getSafeReturnTo('http://127.0.0.1:4000/kpopface/', 'development')).toBe(
      'http://127.0.0.1:4000/kpopface/',
    );
  });

  it('production에서 허용된 Kpopface 경로만 returnTo로 인정한다', () => {
    expect(getSafeReturnTo('https://moony01.com/kpopface/', 'production')).toBe(
      'https://moony01.com/kpopface/',
    );
    expect(getSafeReturnTo('https://www.moony01.com/kpopface/result', 'production')).toBe(
      'https://www.moony01.com/kpopface/result',
    );
    expect(getSafeReturnTo('https://moony01.com/not-kpopface', 'production')).toBeNull();
    expect(getSafeReturnTo('https://example.com/kpopface/', 'production')).toBeNull();
  });

  it('Supabase 환경변수가 없으면 fetch 없이 온보딩으로 fail-closed한다', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchImpl = vi.fn();

    await expect(
      resolveProfileRedirect({
        userId: 'user-1',
        accessToken: 'access-token',
        returnTo: 'https://moony01.com/kpopface/',
        supabaseUrl: undefined,
        supabaseKey: undefined,
        fetchImpl,
      }),
    ).resolves.toBe('/onboarding');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('profile 조회가 non-2xx이거나 예외면 온보딩으로 fail-closed한다', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const nonOkFetch = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    const throwingFetch = vi.fn().mockRejectedValue(new Error('network down'));
    const input = {
      userId: 'user-1',
      accessToken: 'access-token',
      returnTo: 'https://moony01.com/kpopface/',
      supabaseUrl: 'https://example.supabase.co',
      supabaseKey: 'public-anon-key',
    };

    await expect(
      resolveProfileRedirect({ ...input, fetchImpl: nonOkFetch }),
    ).resolves.toBe('/onboarding');
    await expect(
      resolveProfileRedirect({ ...input, fetchImpl: throwingFetch }),
    ).resolves.toBe('/onboarding');
  });
});

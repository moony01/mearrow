import { act, render, screen, waitFor } from '@testing-library/react';
import { useContext } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AuthProvider, { AuthContext } from './AuthProvider';
import {
  DEVELOPMENT_TEST_MODE_CHANGE_EVENT,
  DEVELOPMENT_TEST_MODE_STORAGE_KEY,
  DEVELOPMENT_TEST_USER_ID,
} from '@/lib/auth/development-test-mode';

const mocks = vi.hoisted(() => ({
  getSupabase: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  refreshSession: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  getSupabase: mocks.getSupabase,
}));

function AuthProbe() {
  const { isLoading, user, profile, signOut } = useContext(AuthContext);

  return (
    <>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="user">{user?.id ?? 'guest'}</span>
      <span data-testid="profile">{profile?.username ?? 'none'}</span>
      <button type="button" onClick={() => void signOut()}>
        Sign out
      </button>
    </>
  );
}

describe('AuthProvider development test mode', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development');
    window.localStorage.clear();
    mocks.getSupabase.mockReset();
    mocks.getSession.mockReset();
    mocks.onAuthStateChange.mockReset();
    mocks.refreshSession.mockReset();
    mocks.signOut.mockReset();
    mocks.getSession.mockResolvedValue({ data: { session: null } });
    mocks.refreshSession.mockResolvedValue({ data: { session: null, user: null }, error: null });
    mocks.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    mocks.getSupabase.mockReturnValue({
      auth: {
        getSession: mocks.getSession,
        onAuthStateChange: mocks.onAuthStateChange,
        refreshSession: mocks.refreshSession,
        signOut: mocks.signOut,
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { username: 'Test User' }, error: null }),
          }),
        }),
      }),
    });
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/');
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('provides a local authenticated user without initializing or calling Supabase', async () => {
    window.localStorage.setItem(DEVELOPMENT_TEST_MODE_STORAGE_KEY, 'true');

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    expect(screen.getByTestId('user').textContent).toBe(DEVELOPMENT_TEST_USER_ID);
    expect(screen.getByTestId('profile').textContent).toBe('Developer Test');
    expect(mocks.getSupabase).not.toHaveBeenCalled();
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it('clears the local marker on sign-out without calling Supabase in test mode', async () => {
    window.localStorage.setItem(DEVELOPMENT_TEST_MODE_STORAGE_KEY, 'true');

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await act(async () => {
      screen.getByRole('button', { name: 'Sign out' }).click();
    });

    expect(window.localStorage.getItem(DEVELOPMENT_TEST_MODE_STORAGE_KEY)).toBeNull();
    expect(screen.getByTestId('user').textContent).toBe('guest');
    expect(screen.getByTestId('profile').textContent).toBe('none');
    expect(mocks.getSupabase).not.toHaveBeenCalled();
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it('adopts the local authenticated user when test mode is enabled after mount', async () => {
    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    // Let the normal Supabase initialization pass its dynamic import before
    // switching modes so this test does not leave an async initialization
    // from one test racing with the next test.
    await waitFor(() => expect(mocks.getSupabase).toHaveBeenCalledTimes(1));

    await act(async () => {
      window.localStorage.setItem(DEVELOPMENT_TEST_MODE_STORAGE_KEY, 'true');
      window.dispatchEvent(new Event(DEVELOPMENT_TEST_MODE_CHANGE_EVENT));
    });

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe(DEVELOPMENT_TEST_USER_ID);
      expect(screen.getByTestId('profile').textContent).toBe('Developer Test');
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
  });

  it('does not treat a stale marker as test mode in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    window.localStorage.setItem(DEVELOPMENT_TEST_MODE_STORAGE_KEY, 'true');

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    expect(mocks.getSupabase).toHaveBeenCalledTimes(1);
    expect(mocks.getSession).toHaveBeenCalledTimes(1);
    expect(mocks.onAuthStateChange).toHaveBeenCalledTimes(1);
  });

  it('clears only this project session when Supabase returns a missing refresh-token error', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://current-project.supabase.co');
    const currentSessionKey = 'sb-current-project-auth-token';
    const otherProjectSessionKey = 'sb-another-project-auth-token';
    window.localStorage.setItem(currentSessionKey, 'test-fixture');
    window.localStorage.setItem(`${currentSessionKey}-code-verifier`, 'test-fixture');
    window.localStorage.setItem(otherProjectSessionKey, 'test-fixture');
    mocks.getSession.mockResolvedValue({
      data: { session: null },
      error: Object.assign(new Error('Invalid Refresh Token: Refresh Token Not Found'), {
        name: 'AuthApiError',
        code: 'refresh_token_not_found',
      }),
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    expect(window.localStorage.getItem(currentSessionKey)).toBeNull();
    expect(window.localStorage.getItem(`${currentSessionKey}-code-verifier`) !== null).toBe(true);
    expect(window.localStorage.getItem(otherProjectSessionKey) !== null).toBe(true);
    expect(screen.getByTestId('user').textContent).toBe('guest');
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.getSession.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.onAuthStateChange.mock.invocationCallOrder[0]);
    expect(warn).toHaveBeenCalledWith(
      '[AuthProvider] 사용할 수 없는 Refresh Token을 정리했습니다. 다시 로그인해 주세요.',
    );
  });

  it('retains local auth storage for unrelated AuthApiErrors', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://current-project.supabase.co');
    const currentSessionKey = 'sb-current-project-auth-token';
    window.localStorage.setItem(currentSessionKey, 'test-fixture');
    mocks.getSession.mockResolvedValue({
      data: { session: null },
      error: Object.assign(new Error('Auth service unavailable'), {
        name: 'AuthApiError',
        status: 503,
        code: 'service_unavailable',
      }),
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    expect(window.localStorage.getItem(currentSessionKey) !== null).toBe(true);
    expect(screen.getByTestId('user').textContent).toBe('guest');
    expect(warn).toHaveBeenCalledWith(
      '[AuthProvider] 초기 세션 확인 실패 (AuthApiError). 저장된 인증 상태는 유지합니다.',
    );
  });

  it('keeps a normal Supabase session authenticated', async () => {
    const session = {
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: { id: 'valid-user' },
    } as unknown as import('@supabase/supabase-js').Session;
    mocks.getSession.mockResolvedValue({ data: { session }, error: null });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('user').textContent).toBe('valid-user'));
    expect(screen.getByTestId('loading').textContent).toBe('false');
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it('refreshes a normal session before its expiry and keeps it authenticated', async () => {
    const now = Math.floor(Date.now() / 1000);
    const session = {
      expires_at: now + 89,
      user: { id: 'valid-user' },
    } as unknown as import('@supabase/supabase-js').Session;
    const refreshedSession = {
      expires_at: now + 3600,
      user: { id: 'valid-user' },
    } as unknown as import('@supabase/supabase-js').Session;
    mocks.getSession.mockResolvedValue({ data: { session }, error: null });
    mocks.refreshSession.mockResolvedValue({
      data: { session: refreshedSession, user: refreshedSession.user },
      error: null,
    });

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => expect(mocks.refreshSession).toHaveBeenCalledTimes(1));

    expect(screen.getByTestId('user').textContent).toBe('valid-user');
    expect(mocks.signOut).not.toHaveBeenCalled();
  });

  it('clears only this project session when its scheduled refresh token is missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://current-project.supabase.co');
    const currentSessionKey = 'sb-current-project-auth-token';
    const otherProjectSessionKey = 'sb-another-project-auth-token';
    const session = {
      expires_at: Math.floor(Date.now() / 1000) + 89,
      user: { id: 'valid-user' },
    } as unknown as import('@supabase/supabase-js').Session;
    window.localStorage.setItem(currentSessionKey, 'test-fixture');
    window.localStorage.setItem(otherProjectSessionKey, 'test-fixture');
    mocks.getSession.mockResolvedValue({ data: { session }, error: null });
    mocks.refreshSession.mockResolvedValue({
      data: { session: null, user: null },
      error: Object.assign(new Error('Invalid Refresh Token: Refresh Token Not Found'), {
        name: 'AuthApiError',
        code: 'refresh_token_not_found',
      }),
    });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(mocks.refreshSession).toHaveBeenCalledTimes(1);
      expect(window.localStorage.getItem(currentSessionKey)).toBeNull();
      expect(screen.getByTestId('user').textContent).toBe('guest');
    });

    expect(window.localStorage.getItem(otherProjectSessionKey) !== null).toBe(true);
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      '[AuthProvider] 사용할 수 없는 Refresh Token을 정리했습니다. 다시 로그인해 주세요.',
    );
  });

  it('defers session initialization to the OAuth callback and preserves its pending verifier', async () => {
    window.history.replaceState({}, '', '/ko/auth/callback?code=callback-fixture');
    const currentSessionKey = 'sb-current-project-auth-token';
    const verifierKey = `${currentSessionKey}-code-verifier`;
    window.localStorage.setItem(verifierKey, 'pkce-fixture');

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    expect(window.localStorage.getItem(verifierKey) !== null).toBe(true);
    expect(mocks.getSupabase).not.toHaveBeenCalled();
    expect(mocks.getSession).not.toHaveBeenCalled();
    expect(mocks.onAuthStateChange).not.toHaveBeenCalled();
  });
});

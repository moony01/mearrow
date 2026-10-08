'use client';

/**
 * AuthProvider - MEARROW 인증 상태 관리 프로바이더
 *
 * Supabase Auth의 세션 상태를 감지하고, 로그인된 사용자의 프로필 정보를
 * user_profiles 테이블에서 자동으로 조회하여 앱 전체에 제공합니다.
 *
 * 정적 빌드(output: 'export') 호환:
 * - 서버 액션/미들웨어 없이 순수 클라이언트 사이드에서 동작
 * - onAuthStateChange 리스너로 세션 변경 감지
 * - Supabase RLS 정책에 의존하여 보안 유지
 *
 * @example
 * ```tsx
 * // layout.tsx에서 래핑
 * <AuthProvider>
 *   <AppShell>{children}</AppShell>
 * </AuthProvider>
 *
 * // 하위 컴포넌트에서 사용
 * const { user, profile, isAuthenticated, signOut } = useContext(AuthContext);
 * ```
 */

import { createContext, useEffect, useState, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js';
import {
  clearDevelopmentTestMode,
  DEVELOPMENT_TEST_USER_ID,
  DEVELOPMENT_TEST_MODE_CHANGE_EVENT,
  getDevelopmentTestUser,
  isDevelopmentTestModeEnabled,
} from '@/lib/auth/development-test-mode';

const INVALID_REFRESH_TOKEN_REGEX = /invalid refresh token|refresh token not found/i;
const SESSION_REFRESH_LEAD_TIME_MS = 90_000;
const SESSION_REFRESH_RETRY_DELAY_MS = 30_000;

async function loadSupabase() {
  const { getSupabase } = await import('@/lib/supabase/client');
  return getSupabase();
}

/**
 * 비동기 작업 타임아웃 유틸
 * Supabase 내부 lock 대기 등으로 Promise가 장시간 pending 되는 상황을 방지합니다.
 */
async function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`${label} timeout (${ms}ms)`));
    }, ms);
  });

  return Promise.race([promise, timeoutPromise]);
}

function isInvalidRefreshTokenError(error: unknown): boolean {
  if (!error) return false;

  if (typeof error === 'string') {
    return INVALID_REFRESH_TOKEN_REGEX.test(error);
  }

  const maybeError = error as { message?: unknown; code?: unknown };
  return maybeError.code === 'refresh_token_not_found'
    || (typeof maybeError.message === 'string'
      && INVALID_REFRESH_TOKEN_REGEX.test(maybeError.message));
}

function getSupabaseAuthStorageKey(): string | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;

  try {
    const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
    return projectRef ? `sb-${projectRef}-auth-token` : null;
  } catch {
    return null;
  }
}

function clearStaleSupabaseAuthStorage() {
  if (typeof window === 'undefined') return;

  const storageKey = getSupabaseAuthStorageKey();
  if (!storageKey) return;

  try {
    [storageKey, `${storageKey}-user`].forEach((key) => localStorage.removeItem(key));
  } catch {
    console.warn('[AuthProvider] 로컬 인증 스토리지 정리 실패.');
  }
}

function isOAuthCodeCallback(): boolean {
  return typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).has('code')
    && /(?:^|\/)auth\/callback\/?$/.test(window.location.pathname);
}

function getSafeAuthErrorName(error: unknown): string {
  if (error instanceof Error && error.name) return error.name;
  if (error && typeof error === 'object' && 'name' in error && typeof error.name === 'string') {
    return error.name;
  }
  return 'UnknownError';
}

/**
 * 사용자 프로필 타입 (user_profiles 테이블 스키마)
 */
export interface UserProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  favorite_company_id: number | null;
  favorite_group_id: string | null;
  onboarding_completed: boolean;
  total_votes: number;
  /** Pro 구독 상태 (T2.02: MEARROW Pro) */
  is_pro: boolean;
  created_at: string;
  updated_at: string;
}

const DEVELOPMENT_TEST_PROFILE: UserProfile = {
  id: DEVELOPMENT_TEST_USER_ID,
  username: 'Developer Test',
  avatar_url: null,
  bio: 'Local development test account',
  favorite_company_id: null,
  favorite_group_id: null,
  onboarding_completed: true,
  total_votes: 0,
  is_pro: false,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

/**
 * AuthContext에서 제공하는 인증 상태 및 메서드 타입
 */
export interface AuthContextType {
  /** Supabase auth.users 객체 (로그인되지 않으면 null) */
  user: User | null;
  /** user_profiles 테이블의 프로필 데이터 */
  profile: UserProfile | null;
  /** 인증 상태 로딩 중 여부 */
  isLoading: boolean;
  /** 로그인 여부 (user !== null) */
  isAuthenticated: boolean;
  /** 로그아웃 함수 */
  signOut: () => Promise<void>;
  /** 프로필 데이터 수동 새로고침 */
  refreshProfile: () => Promise<void>;
  /** 회원탈퇴 함수 */
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
}

/**
 * 인증 컨텍스트 (기본값: 미인증 상태)
 */
export const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,
  signOut: async () => {},
  refreshProfile: async () => {},
  deleteAccount: async () => ({ success: false, error: 'Not initialized' }),
});

/**
 * AuthProvider 컴포넌트
 *
 * 앱 전체를 감싸서 인증 상태를 제공합니다.
 * Supabase의 onAuthStateChange 리스너를 통해 세션 변경을 실시간으로 감지합니다.
 */
export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * user_profiles 테이블에서 사용자 프로필 조회
   * @param userId - auth.users의 id
   */
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const supabase = await loadSupabase();
      const profileQuery = supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const { data, error } = await withTimeout(
        profileQuery,
        8000,
        'AuthProvider fetchProfile',
      );

      if (error) {
        console.warn('[AuthProvider] 프로필 조회 실패:', error.message);
        setProfile(null);
        return;
      }

      setProfile(data as UserProfile);
    } catch (err) {
      console.warn('[AuthProvider] 프로필 조회 중 예외 발생:', err);
      setProfile(null);
    }
  }, []);

  /**
   * 프로필 데이터 수동 새로고침
   * (닉네임 변경 등 프로필 업데이트 후 호출)
   */
  const refreshProfile = useCallback(async () => {
    if (user?.id && !isDevelopmentTestModeEnabled()) {
      await fetchProfile(user.id);
    }
  }, [user?.id, fetchProfile]);

  /**
   * 로그아웃 처리
   * Supabase 세션 종료 후 상태 초기화
   */
  const signOut = useCallback(async () => {
    try {
      // Local test mode is not a Supabase session. Do not initialize or call
      // Supabase while it is enabled.
      if (!isDevelopmentTestModeEnabled()) {
        const supabase = await loadSupabase();
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error('[AuthProvider] 로그아웃 실패:', err);
    } finally {
      // 로그아웃 성공/실패 여부와 관계없이 클라이언트 상태 항상 초기화 (보안 우선)
      clearDevelopmentTestMode();
      setUser(null);
      setProfile(null);
    }
  }, []);

  /**
   * 회원탈퇴 처리
   * Edge Function 호출로 앱 데이터 정리 + auth.users 삭제를 수행
   */
  const deleteAccount = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (isDevelopmentTestModeEnabled()) {
      return { success: false, error: '개발 테스트 모드에서는 계정 작업을 사용할 수 없습니다.' };
    }

    try {
      const supabase = await loadSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return { success: false, error: '로그인 세션이 만료되었습니다.' };
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) {
        return { success: false, error: '서버 설정 오류' };
      }

      const res = await fetch(`${supabaseUrl}/functions/v1/delete-account`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        return { success: false, error: payload?.error || '계정 삭제에 실패했습니다.' };
      }

      // 로컬 세션 정리
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);

      return { success: true };
    } catch (err) {
      console.error('[AuthProvider] 회원탈퇴 실패:', err);
      return { success: false, error: '계정 삭제 중 오류가 발생했습니다.' };
    }
  }, []);

  /**
   * 초기 세션 확인 + 인증 상태 변경 리스너 등록
   */
  useEffect(() => {
    let disposed = false;
    let subscription: { unsubscribe: () => void } | null = null;
    let supabaseClient: Awaited<ReturnType<typeof loadSupabase>> | null = null;
    let currentSession: Session | null = null;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let staleRefreshTokenHandled = false;

    const clearRefreshTimer = () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
        refreshTimer = null;
      }
    };

    const clearInvalidRefreshTokenSession = () => {
      clearRefreshTimer();
      currentSession = null;
      clearStaleSupabaseAuthStorage();
      setUser(null);
      setProfile(null);

      if (!staleRefreshTokenHandled) {
        console.warn('[AuthProvider] 사용할 수 없는 Refresh Token을 정리했습니다. 다시 로그인해 주세요.');
        staleRefreshTokenHandled = true;
      }
    };

    let refreshSessionNow: () => Promise<void> = async () => {};

    const scheduleSessionRefresh = (session: Session | null, retryDelay?: number) => {
      clearRefreshTimer();
      currentSession = session;

      if (!session?.expires_at || disposed || isDevelopmentTestModeEnabled()) return;

      const refreshAt = retryDelay === undefined
        ? session.expires_at * 1000 - SESSION_REFRESH_LEAD_TIME_MS
        : Date.now() + retryDelay;
      const delay = Math.max(0, refreshAt - Date.now());

      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        if (document.visibilityState === 'visible') {
          void refreshSessionNow();
        }
      }, delay);
    };

    refreshSessionNow = async () => {
      const activeSession = currentSession;
      const activeSupabase = supabaseClient;
      if (!activeSession || !activeSupabase || disposed || isDevelopmentTestModeEnabled()) return;

      try {
        const { data: { session }, error } = await activeSupabase.auth.refreshSession();
        if (disposed) return;

        if (error) {
          if (isInvalidRefreshTokenError(error)) {
            clearInvalidRefreshTokenSession();
            return;
          }

          console.warn(
            `[AuthProvider] 세션 갱신 실패 (${getSafeAuthErrorName(error)}). 재시도합니다.`,
          );
          if (currentSession) {
            scheduleSessionRefresh(currentSession, SESSION_REFRESH_RETRY_DELAY_MS);
          }
          return;
        }

        if (session && currentSession?.user.id === activeSession.user.id) {
          scheduleSessionRefresh(session);
          setUser(session.user);
        }
      } catch (err) {
        if (disposed) return;

        if (isInvalidRefreshTokenError(err)) {
          clearInvalidRefreshTokenSession();
          return;
        }

        console.warn(
          `[AuthProvider] 세션 갱신 실패 (${getSafeAuthErrorName(err)}). 재시도합니다.`,
        );
        if (currentSession) {
          scheduleSessionRefresh(currentSession, SESSION_REFRESH_RETRY_DELAY_MS);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (currentSession) scheduleSessionRefresh(currentSession);
      } else {
        clearRefreshTimer();
      }
    };

    const syncDevelopmentTestMode = () => {
      if (isDevelopmentTestModeEnabled()) {
        clearRefreshTimer();
        currentSession = null;
        setUser(getDevelopmentTestUser());
        setProfile(DEVELOPMENT_TEST_PROFILE);
        setIsLoading(false);
        return true;
      }

      setUser(null);
      setProfile(null);
      setIsLoading(false);
      return false;
    };

    const handleDevelopmentTestModeChange = () => {
      syncDevelopmentTestMode();
    };

    window.addEventListener(
      DEVELOPMENT_TEST_MODE_CHANGE_EVENT,
      handleDevelopmentTestModeChange,
    );

    // Development test mode creates a deterministic local-only user so
    // authenticated UI flows can be exercised without Supabase credentials.
    // Keep the normal Supabase loading state intact when the marker is absent.
    if (isDevelopmentTestModeEnabled()) {
      syncDevelopmentTestMode();
      return () => {
        window.removeEventListener(
          DEVELOPMENT_TEST_MODE_CHANGE_EVENT,
          handleDevelopmentTestModeChange,
        );
      };
    }

    // CallbackClient owns the PKCE code exchange. Avoid reading the previous
    // session while its verifier is in use; the app will initialize normally
    // after the callback redirects with the new session persisted.
    if (isOAuthCodeCallback()) {
      setIsLoading(false);
      return () => {
        window.removeEventListener(
          DEVELOPMENT_TEST_MODE_CHANGE_EVENT,
          handleDevelopmentTestModeChange,
        );
      };
    }

    const initializeAuth = async () => {
      const supabase = await loadSupabase();
      supabaseClient = supabase;
      if (disposed || isDevelopmentTestModeEnabled()) return;

      // 1. 현재 세션 확인 (페이지 로드 시)
      const initSession = async () => {
        try {
          const sessionQuery = supabase.auth.getSession();
          const { data: { session }, error } = await withTimeout<Awaited<ReturnType<typeof supabase.auth.getSession>>>(
            sessionQuery,
            8000,
            'AuthProvider getSession',
          );
          if (disposed || isDevelopmentTestModeEnabled()) return;

          if (error) {
            if (isInvalidRefreshTokenError(error)) {
              clearInvalidRefreshTokenSession();
            } else {
              console.warn(
                `[AuthProvider] 초기 세션 확인 실패 (${getSafeAuthErrorName(error)}). 저장된 인증 상태는 유지합니다.`,
              );
            }
            return;
          }

          if (session?.user) {
            scheduleSessionRefresh(session);
            setUser(session.user);
            void fetchProfile(session.user.id);
          }
        } catch (err) {
          if (disposed) return;
          if (isInvalidRefreshTokenError(err)) {
            clearInvalidRefreshTokenSession();
          } else {
            console.warn(
              `[AuthProvider] 초기 세션 확인 실패 (${getSafeAuthErrorName(err)}). 저장된 인증 상태는 유지합니다.`,
            );
          }
        } finally {
          if (!disposed) setIsLoading(false);
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      // Read and clean up an invalid stored session before subscribing. The
      // SDK's INITIAL_SESSION callback reads storage again and logs returned
      // auth errors directly to console.error.
      await initSession();
      if (disposed || isDevelopmentTestModeEnabled()) return;

      // 2. 인증 상태 변경 리스너 (로그인/로그아웃/토큰 갱신)
      const authSubscription = supabase.auth.onAuthStateChange(
        async (event: AuthChangeEvent, session: Session | null) => {
          if (disposed || isDevelopmentTestModeEnabled()) return;
          if (session?.user) {
            staleRefreshTokenHandled = false;
            scheduleSessionRefresh(session);
            setUser(session.user);
            // 신규 가입(SIGNED_IN) 또는 토큰 갱신 시 프로필 조회
            // 주의: 여기서 await하면 Auth 상태 전환이 lock에 묶일 수 있으므로 non-blocking으로 실행
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
              fetchProfile(session.user.id).catch((err) => {
                console.warn('[AuthProvider] onAuthStateChange 프로필 조회 실패:', err);
              });
            }
          } else {
            scheduleSessionRefresh(null);
            setUser(null);
            setProfile(null);
          }
          setIsLoading(false);
        },
      );
      subscription = authSubscription.data.subscription;
    };

    void initializeAuth();

    // 3. 클린업: 리스너 해제
    return () => {
      disposed = true;
      clearRefreshTimer();
      subscription?.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener(
        DEVELOPMENT_TEST_MODE_CHANGE_EVENT,
        handleDevelopmentTestModeChange,
      );
    };
  }, [fetchProfile]);

  /**
   * 컨텍스트 값 메모이제이션 (불필요한 리렌더 방지)
   */
  const value = useMemo<AuthContextType>(
    () => ({
      user,
      profile,
      isLoading,
      isAuthenticated: !!user,
      signOut,
      refreshProfile,
      deleteAccount,
    }),
    [user, profile, isLoading, signOut, refreshProfile, deleteAccount],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

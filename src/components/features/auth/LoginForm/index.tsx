"use client";

/**
 * LoginForm - MEARROW 로그인 폼 컴포넌트
 *
 * OAuth(Google/Kakao) 로그인만 지원합니다.
 * 정적 빌드 호환을 위해 모든 인증은 클라이언트 사이드에서 처리됩니다.
 *
 * T1.99: 동일 이메일 OAuth 프로바이더 충돌 처리
 * - URL params로 충돌 정보 수신 (?conflict=true&provider=google)
 * - localStorage에서 마지막 로그인 프로바이더 읽어 뱃지 표시
 */

import { useState, useEffect, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './LoginForm.module.scss';
import classNames from 'classnames';
import { FEATURES } from '@/config/features';
import { resetGuestVoteQuota } from '@/lib/vote-quota';
import {
  isDevelopmentEnvironment,
  isDevelopmentTestModeEnabled,
  setDevelopmentTestModeEnabled,
} from '@/lib/auth/development-test-mode';
import { getOAuthCallbackUrl } from '@/lib/auth/oauth-redirect';

/** 마지막 로그인 프로바이더 localStorage 키 (CallbackClient와 공유) */
const LAST_PROVIDER_KEY = 'kcl_last_login_provider';

/** 지원하는 OAuth 프로바이더 타입 */
type OAuthProvider = 'google' | 'kakao';

/** 프로바이더 표시 이름 매핑 (고유명사이므로 i18n 불필요) */
const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  google: 'Google',
  kakao: 'Kakao',
};

/**
 * LoginForm 내부 컴포넌트 (useSearchParams를 위한 Suspense 바운더리 내부)
 */
function LoginFormInner() {
  const t = useTranslations('Auth');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isDevelopment = isDevelopmentEnvironment();
  // Keep the server and first client render identical. The browser-only marker
  // is restored in the mount effect below to avoid a hydration mismatch.
  const [localTestMode, setLocalTestMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [lastProvider, setLastProvider] = useState<string | null>(null);
  const [conflictDismissed, setConflictDismissed] = useState(false);
  const [quotaResetting, setQuotaResetting] = useState(false);

  const queryConflictProvider =
    searchParams.get('conflict') === 'true' ? searchParams.get('provider') : null;
  const conflictProvider = conflictDismissed ? null : queryConflictProvider;

  // 마운트 시 로컬 테스트 로그인 상태와 마지막 프로바이더 정보 읽기
  useEffect(() => {
    const localTestModeEnabled = isDevelopmentTestModeEnabled();
    setLocalTestMode(localTestModeEnabled);

    // 로그인 페이지를 새로 열었을 때도 이미 활성화된 개발자 테스트 세션을
    // 로그인 대기 상태로 남겨두지 않고, 토글 클릭과 동일하게 홈으로 보낸다.
    if (localTestModeEnabled) {
      router.replace(`/`);
    }

    // localStorage에서 마지막 로그인 프로바이더 읽기
    let lastProviderTimer: number | undefined;
    try {
      const saved = localStorage.getItem(LAST_PROVIDER_KEY);
      if (saved) {
        lastProviderTimer = window.setTimeout(() => setLastProvider(saved), 0);
      }
    } catch {
      // localStorage 접근 실패 무시 (Private 브라우징 등)
    }

    return () => {
      if (lastProviderTimer !== undefined) {
        window.clearTimeout(lastProviderTimer);
      }
    };
  }, [locale, router]);

  /**
   * OAuth 로그인 처리 (Google / Kakao)
   * PKCE 플로우를 사용하여 /auth/callback으로 리다이렉트
   */
  const handleOAuthLogin = async (provider: OAuthProvider) => {
    if (isDevelopmentTestModeEnabled()) {
      setError('OAuth is disabled while local test mode is active.');
      return;
    }

    setOauthLoading(provider);
    setError(null);
    setConflictDismissed(true);

    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: getOAuthCallbackUrl(locale, {
            returnTo: searchParams.get('returnTo'),
          }),
          queryParams: {
            prompt: 'select_account',
          },
        },
      });

      if (error) {
        setError(t('error_oauth_generic'));
        setOauthLoading(null);
      }
      // 성공 시 외부 OAuth 페이지로 리다이렉트됨
    } catch {
      setError(t('error_generic'));
      setOauthLoading(null);
    }
  };

  const handleLocalTestModeToggle = () => {
    if (!isDevelopment) return;

    const nextValue = !localTestMode;
    setDevelopmentTestModeEnabled(nextValue);
    setLocalTestMode(nextValue);
    if (nextValue) {
      router.replace(`/`);
    }
  };

  const handleVoteQuotaReset = () => {
    if (quotaResetting) return;

    setQuotaResetting(true);
    setError(null);

    try {
      resetGuestVoteQuota();
    } catch {
      setError('Vote quota reset failed.');
    } finally {
      setQuotaResetting(false);
    }
  };

  /** 프로바이더 버튼에 "마지막 로그인" 뱃지를 표시할지 결정 */
  const isLastProvider = (provider: string): boolean => {
    return lastProvider === provider && !conflictProvider;
  };

  /** 프로바이더 충돌 시 해당 버튼을 강조할지 결정 */
  const isConflictTarget = (provider: string): boolean => {
    return conflictProvider === provider;
  };

  /** 뱃지 텍스트에 프로바이더 이름을 명시하여 혼동 방지 */
  const getProviderBadgeLabel = (provider: string, isConflict: boolean): string => {
    const providerName = PROVIDER_DISPLAY_NAMES[provider] || provider;
    const suffix = isConflict ? t('provider_use_this') : t('provider_last_used');
    return `${providerName} · ${suffix}`;
  };

  return (
    <div className={styles.formWrapper}>
      {/* 프로바이더 충돌 안내 메시지 */}
      {conflictProvider && (
        <div className={styles.conflictAlert}>
          <span className={styles.conflictIcon}>!</span>
          <p>
            {t('error_provider_conflict', {
              provider: PROVIDER_DISPLAY_NAMES[conflictProvider] || conflictProvider,
            })}
          </p>
        </div>
      )}

      {/* OAuth 버튼 영역 */}
      <div className={styles.oauthSection}>
        {/* Google 로그인 버튼 */}
        <div className={styles.oauthBtnWrapper}>
          <button
            type="button"
            className={classNames(
              styles.oauthBtn,
              styles.googleBtn,
              { [styles.conflictHighlight]: isConflictTarget('google') },
            )}
            onClick={() => handleOAuthLogin('google')}
            disabled={!!oauthLoading || localTestMode}
          >
            <svg
              className={styles.oauthIcon}
              viewBox="0 0 24 24"
              width="20"
              height="20"
              aria-hidden="true"
              focusable="false"
            >
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span>{oauthLoading === 'google' ? t('logging_in') : t('google_login')}</span>
          </button>
          {/* 마지막 로그인 뱃지 또는 충돌 시 권장 뱃지 */}
          {(isLastProvider('google') || isConflictTarget('google')) && (
            <span className={classNames(
              styles.providerBadge,
              { [styles.conflictBadge]: isConflictTarget('google') },
            )}>
              {getProviderBadgeLabel('google', isConflictTarget('google'))}
            </span>
          )}
        </div>

        {/* Kakao 로그인 버튼 (KAKAO_LOGIN 플래그로 제어) */}
        {FEATURES.KAKAO_LOGIN && (
          <div className={styles.oauthBtnWrapper}>
            <button
              type="button"
              className={classNames(
                styles.oauthBtn,
                styles.kakaoBtn,
                { [styles.conflictHighlight]: isConflictTarget('kakao') },
              )}
              onClick={() => handleOAuthLogin('kakao')}
              disabled={!!oauthLoading || localTestMode}
            >
              <svg
                className={styles.oauthIcon}
                viewBox="0 0 24 24"
                width="20"
                height="20"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M12 3C6.48 3 2 6.36 2 10.44c0 2.62 1.75 4.93 4.38 6.24l-1.12 4.1a.3.3 0 0 0 .45.34l4.78-3.18c.49.06.99.1 1.51.1 5.52 0 10-3.36 10-7.6C22 6.36 17.52 3 12 3z" fill="#3C1E1E" />
              </svg>
              <span>{oauthLoading === 'kakao' ? t('logging_in') : t('kakao_login')}</span>
            </button>
            {/* 마지막 로그인 뱃지 또는 충돌 시 권장 뱃지 */}
            {(isLastProvider('kakao') || isConflictTarget('kakao')) && (
              <span className={classNames(
                styles.providerBadge,
                { [styles.conflictBadge]: isConflictTarget('kakao') },
              )}>
                {getProviderBadgeLabel('kakao', isConflictTarget('kakao'))}
              </span>
            )}
          </div>
        )}

        {process.env.NODE_ENV === 'development' && isDevelopment && (
          <div className={styles.developerTools} data-testid="developer-auth-tools">
            <p className={styles.developerToolsLabel}>Development tools</p>
            <button
              type="button"
              className={styles.developerToolButton}
              data-testid="developer-test-mode-toggle"
              aria-pressed={localTestMode}
              onClick={handleLocalTestModeToggle}
            >
              {localTestMode ? 'Disable developer test login' : 'Developer test login'}
            </button>
            <button
              type="button"
              className={styles.developerToolButton}
              data-testid="guest-quota-reset"
              onClick={() => void handleVoteQuotaReset()}
              disabled={quotaResetting}
            >
              {quotaResetting
                ? 'Resetting vote quota…'
                : localTestMode
                  ? 'Reset developer vote quota'
                  : 'Reset guest quota'}
            </button>
            <p
              className={styles.developerToolsHint}
              data-testid="developer-test-mode-status"
              role="status"
            >
              {localTestMode
                ? 'Developer test login active: local authenticated user; Supabase auth is disabled.'
                : 'Developer test login creates a local-only authenticated session.'}
            </p>
          </div>
        )}
      </div>

      {/* 에러 메시지 */}
      {error && <div className={styles.errorMsg}>{error}</div>}

      {/* 이메일 회원가입 준비중 안내 */}
      <p className={styles.comingSoonNotice}>{t('email_signup_coming_soon')}</p>
    </div>
  );
}

/**
 * LoginForm 메인 컴포넌트
 * useSearchParams()를 위해 Suspense로 래핑 (Next.js 정적 빌드 요구사항)
 */
export default function LoginForm() {
  return (
    <Suspense fallback={null}>
      <LoginFormInner />
    </Suspense>
  );
}

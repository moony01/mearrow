"use client";

/**
 * ResetPasswordForm - 비밀번호 재설정 폼 컴포넌트
 *
 * 사용자가 이메일의 재설정 링크를 클릭하면 이 페이지로 이동합니다.
 * Supabase가 URL 해시에 토큰을 포함시키며, 클라이언트가 자동으로 세션을 설정합니다.
 * 새 비밀번호를 입력하면 supabase.auth.updateUser()로 비밀번호를 변경합니다.
 *
 * 플로우:
 * 1. 이메일의 재설정 링크 클릭 → /auth/reset-password#access_token=...
 * 2. Supabase 클라이언트가 해시의 토큰으로 자동 세션 설정
 * 3. 새 비밀번호 입력 → updateUser({ password }) 호출
 * 4. 성공 → 로그인 페이지로 안내
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslations } from 'next-intl';
import styles from './ResetPasswordForm.module.scss';
import classNames from 'classnames';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

/** 비밀번호 강도 계산 (0: 약함, 1: 보통, 2: 강함) */
function getPasswordStrength(password: string): number {
  if (!password || password.length < 8) return 0;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  if (hasLetter && hasNumber && hasSpecial && password.length >= 12) return 2;
  if (hasLetter && hasNumber) return 1;
  return 0;
}

/** 비밀번호 재설정 유효성 검사 스키마 */
const schema = z.object({
  password: z.string()
    .min(8)
    .regex(/[a-zA-Z]/, 'Must contain a letter')
    .regex(/\d/, 'Must contain a number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

export default function ResetPasswordForm() {
  const t = useTranslations('Auth');
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  /** 세션 확인 중 여부 */
  const [checking, setChecking] = useState(true);
  /** 유효한 세션 존재 여부 */
  const [hasSession, setHasSession] = useState(false);
  /** 비밀번호 변경 완료 여부 */
  const [success, setSuccess] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const passwordValue = watch('password');
  const confirmPasswordValue = watch('confirmPassword');

  /**
   * 컴포넌트 마운트 시 세션 확인
   * Supabase 클라이언트가 URL 해시의 토큰으로 자동 세션 설정을 시도합니다.
   * RECOVERY 이벤트를 감지하여 비밀번호 재설정 세션임을 확인합니다.
   */
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setHasSession(true);
        setChecking(false);
      }
    });

    // 폴백: 이미 세션이 설정된 경우 확인
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setHasSession(true);
      }
      setChecking(false);
    };

    const timer = setTimeout(checkSession, 1500);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [supabase.auth]);

  /**
   * 새 비밀번호 설정 처리
   */
  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.updateUser({
      password: data.password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // 비밀번호 변경 후 세션 정리
      await supabase.auth.signOut();
      setSuccess(true);
      setLoading(false);
    }
  };

  // 로딩 중 (세션 확인)
  if (checking) {
    return (
      <div className={styles.formWrapper}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
        </div>
      </div>
    );
  }

  // 유효한 세션이 없는 경우 (직접 접근 또는 만료된 링크)
  if (!hasSession) {
    return (
      <div className={styles.formWrapper}>
        <div className={styles.successBox}>
          <div className={styles.successIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h3 className={styles.successTitle}>{t('reset_link_expired_title')}</h3>
          <p className={styles.successDesc}>{t('reset_link_expired_desc')}</p>
          <Link href={`/forgot-password`} className={styles.loginBtn}>
            {t('try_again')}
          </Link>
        </div>
      </div>
    );
  }

  // 비밀번호 변경 완료 화면
  if (success) {
    return (
      <div className={styles.formWrapper}>
        <div className={styles.successBox}>
          <div className={styles.successIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h3 className={styles.successTitle}>{t('reset_success_title')}</h3>
          <p className={styles.successDesc}>{t('reset_success_desc')}</p>
          <Link href={`/login`} className={styles.loginBtn}>
            {t('login_button')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.formWrapper}>
      {/* 안내 문구 */}
      <p className={styles.subtitle}>{t('reset_password_desc')}</p>

      {/* 비밀번호 입력 폼 */}
      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        {/* 새 비밀번호 */}
        <div className={classNames(styles.inputGroup, { [styles.hasValue]: !!passwordValue })}>
          <input
            {...register('password')}
            type="password"
            autoComplete="new-password"
            className={styles.input}
          />
          <label className={styles.floatingLabel}>{t('new_password')}</label>
        </div>
        {errors.password && (
          <p className={styles.errorMsg}>
            {errors.password.message?.includes('letter')
              ? t('error_password_letter')
              : errors.password.message?.includes('number')
                ? t('error_password_number')
                : t('error_password_min')}
          </p>
        )}

        {/* 비밀번호 강도 인디케이터 */}
        {passwordValue && !errors.password && (
          <div className={styles.strengthBar}>
            <div className={styles.strengthTrack}>
              {[0, 1, 2].map((level) => (
                <div
                  key={level}
                  className={classNames(styles.strengthSegment, {
                    [styles.weak]: getPasswordStrength(passwordValue) >= 0 && level === 0,
                    [styles.medium]: getPasswordStrength(passwordValue) >= 1 && level <= 1,
                    [styles.strong]: getPasswordStrength(passwordValue) >= 2,
                  })}
                />
              ))}
            </div>
            <span className={styles.strengthLabel}>
              {getPasswordStrength(passwordValue) === 0
                ? t('password_weak')
                : getPasswordStrength(passwordValue) === 1
                  ? t('password_medium')
                  : t('password_strong')}
            </span>
          </div>
        )}

        {/* 비밀번호 확인 */}
        <div className={classNames(styles.inputGroup, { [styles.hasValue]: !!confirmPasswordValue })}>
          <input
            {...register('confirmPassword')}
            type="password"
            autoComplete="new-password"
            className={styles.input}
          />
          <label className={styles.floatingLabel}>{t('confirm_password')}</label>
        </div>
        {errors.confirmPassword && (
          <p className={styles.errorMsg}>{t('error_password_mismatch')}</p>
        )}

        {/* 서버 에러 메시지 */}
        {error && <div className={styles.errorMsg}>{error}</div>}

        {/* 변경 버튼 */}
        <button type="submit" className={styles.submitBtn} disabled={loading}>
          {loading ? t('updating') : t('reset_password_button')}
        </button>
      </form>
    </div>
  );
}

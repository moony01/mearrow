"use client";

/**
 * ForgotPasswordForm - 비밀번호 찾기 폼 컴포넌트
 *
 * 이메일을 입력하면 Supabase를 통해 비밀번호 재설정 링크를 발송합니다.
 * 정적 빌드 호환을 위해 클라이언트 사이드에서 처리됩니다.
 *
 * 플로우:
 * 1. 이메일 입력 → "재설정 링크 보내기" 클릭
 * 2. Supabase resetPasswordForEmail() 호출
 * 3. 성공 → 이메일 발송 안내 화면 표시
 * 4. 사용자가 이메일의 링크 클릭 → /auth/reset-password 페이지로 이동
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useTranslations } from 'next-intl';
import styles from './ForgotPasswordForm.module.scss';
import classNames from 'classnames';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

/** 이메일 유효성 검사 스키마 */
const schema = z.object({
  email: z.string().email(),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordForm() {
  const t = useTranslations('Auth');
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  /** 재설정 링크 발송 완료 여부 */
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const emailValue = watch('email');

  /**
   * 비밀번호 재설정 이메일 발송 처리
   * Supabase가 해당 이메일로 재설정 링크를 전송합니다.
   */
  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      setError(t('error_generic'));
      setLoading(false);
    } else {
      setSentEmail(data.email);
      setEmailSent(true);
      setLoading(false);
    }
  };

  // 이메일 발송 완료 안내 화면
  if (emailSent) {
    return (
      <div className={styles.formWrapper}>
        <div className={styles.emailSentBox}>
          <div className={styles.emailSentIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
          <h3 className={styles.emailSentTitle}>{t('reset_email_sent_title')}</h3>
          <p className={styles.emailSentDesc}>
            {t('reset_email_sent_desc', { email: sentEmail })}
          </p>
          <Link href={`/login`} className={styles.backToLogin}>
            <ArrowLeft size={16} />
            {t('login_button')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.formWrapper}>
      {/* 안내 문구 */}
      <p className={styles.subtitle}>{t('forgot_password_desc')}</p>

      {/* 이메일 입력 폼 */}
      <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
        {/* 이메일 입력 */}
        <div className={classNames(styles.inputGroup, { [styles.hasValue]: !!emailValue })}>
          <input
            {...register('email')}
            type="email"
            autoComplete="email"
            className={styles.input}
          />
          <label className={styles.floatingLabel}>{t('email_placeholder')}</label>
        </div>
        {errors.email && <p className={styles.errorMsg}>{t('error_email_invalid')}</p>}

        {/* 서버 에러 메시지 */}
        {error && <div className={styles.errorMsg}>{error}</div>}

        {/* 전송 버튼 */}
        <button type="submit" className={styles.submitBtn} disabled={loading}>
          {loading ? t('sending') : t('send_reset_link')}
        </button>
      </form>

      {/* 로그인으로 돌아가기 */}
      <Link href={`/login`} className={styles.backToLogin}>
        <ArrowLeft size={16} />
        {t('back_to_login')}
      </Link>
    </div>
  );
}

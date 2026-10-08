/**
 * 비밀번호 찾기 페이지 (Server Component)
 *
 * 이메일을 입력하면 비밀번호 재설정 링크를 발송합니다.
 * AuthLayout으로 일관된 인증 UI를 제공합니다.
 */

import { Metadata } from 'next';
import AuthLayout from '@/components/features/auth/AuthLayout';
import ForgotPasswordForm from '@/components/features/auth/ForgotPasswordForm';
import { generateAlternates } from '@/lib/seo';

/** 페이지 메타데이터 생성 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = 'ko';

  return {
    title: 'Forgot Password',
    robots: { index: false, follow: false },
    alternates: generateAlternates(locale, '/forgot-password'),
  };
}

export default function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <ForgotPasswordForm />
    </AuthLayout>
  );
}

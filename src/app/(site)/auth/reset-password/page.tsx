/**
 * 비밀번호 재설정 페이지 (Server Component)
 *
 * 이메일의 재설정 링크를 클릭하면 이 페이지로 이동합니다.
 * URL 해시에 포함된 토큰으로 Supabase 세션이 자동 설정되며,
 * 사용자는 새 비밀번호를 입력할 수 있습니다.
 */

import type { Metadata } from 'next';
import AuthLayout from '@/components/features/auth/AuthLayout';
import ResetPasswordForm from '@/components/features/auth/ResetPasswordForm';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/** 지원 로케일에 대한 페이지 생성 */
export default function ResetPasswordPage() {
  return (
    <AuthLayout>
      <ResetPasswordForm />
    </AuthLayout>
  );
}

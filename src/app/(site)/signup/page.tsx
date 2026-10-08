/**
 * 회원가입 페이지 (Server Component)
 *
 * SSG 빌드 시 정적 셸 생성
 *
 * @updated Phase 5 - SSG/CSR 마이그레이션
 */

import { Metadata } from 'next';
import AuthLayout from '@/components/features/auth/AuthLayout';
import SignupForm from '@/components/features/auth/SignupForm';
import { generateAlternates } from '@/lib/seo';

/**
 * 회원가입 페이지 Props
 */
/**
 * 페이지 메타데이터 생성
 * SEO를 위한 canonical 및 hreflang 설정
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = 'ko';

  return {
    title: 'Sign Up',
    robots: { index: false, follow: false },
    alternates: generateAlternates(locale, '/signup'),
  };
}

export default function SignupPage() {
  return (
    <AuthLayout>
      <SignupForm />
    </AuthLayout>
  );
}

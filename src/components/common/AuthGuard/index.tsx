'use client';

/**
 * AuthGuard - 클라이언트 사이드 인증 가드 컴포넌트
 *
 * 보호된 페이지를 감싸서 미인증 사용자를 로그인 페이지로 리다이렉트합니다.
 * MEARROW는 정적 빌드(output: 'export')를 사용하므로 서버 미들웨어 대신
 * 클라이언트에서 인증 상태를 확인합니다.
 *
 * @usage
 * ```tsx
 * <AuthGuard>
 *   <ProtectedContent />
 * </AuthGuard>
 * ```
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import styles from './AuthGuard.module.scss';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // 로딩 완료 후 미인증 상태면 로그인 페이지로 리다이렉트
    if (!isLoading && !isAuthenticated) {
      router.replace(`/login`);
    }
  }, [isLoading, isAuthenticated, router]);

  // 로딩 중: 스피너 표시
  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
      </div>
    );
  }

  // 미인증: 리다이렉트 대기 (빈 화면)
  if (!isAuthenticated) {
    return null;
  }

  // 인증됨: 자식 컴포넌트 렌더링
  return <>{children}</>;
}

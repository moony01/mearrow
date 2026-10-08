'use client';

/**
 * MyClient - 마이페이지 클라이언트 컴포넌트
 *
 * AuthGuard로 보호되며, 인증된 사용자의 프로필 정보를 표시합니다.
 * 실제 데이터(user_profiles)와 연동됩니다.
 */

import AuthGuard from '@/components/common/AuthGuard';
import MyProfile from '@/components/features/my/MyProfile';

export default function MyClient() {
  return (
    <AuthGuard>
      <MyProfile />
    </AuthGuard>
  );
}

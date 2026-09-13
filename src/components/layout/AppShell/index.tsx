/**
 * AppShell
 *
 * 전역 레이아웃 셸 컴포넌트
 * TikTok형 좌측 사이드바 정보 구조를 MEARROW 브랜드에 맞게 해석한 레이아웃 구조를 제공합니다.
 *
 * 구조:
 * - 모든 화면: 좌측 사이드바 + 메인 콘텐츠
 * - 1264px 이상: 사이드바에 레이블을 함께 표시
 *
 * @param children - 페이지별 콘텐츠
 */

'use client';

import { ReactNode } from 'react';
import styles from './AppShell.module.scss';
import Sidebar from '../Sidebar';
import DisclaimerBanner from '@/components/common/DisclaimerBanner';
import DailyVoteModal from '@/components/features/vote/DailyVoteModal';

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className={styles.appContainer}>
      {/* TikTok형 좌측 사이드바: 좁은 화면에서는 아이콘 레일로 고정 */}
      <div className={styles.sidebarWrapper}>
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <main className={styles.mainContent}>
        {/* Page Content */}
        <div className={styles.contentInner}>{children}</div>

        {/* Legal Footer with Disclaimer Banner */}
        <footer className={styles.legalFooter}>
          <DisclaimerBanner />
        </footer>
      </main>

      {/* Global daily voting participation mockup */}
      <DailyVoteModal />
    </div>
  );
}

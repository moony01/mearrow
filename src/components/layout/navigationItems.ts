import type { LucideIcon } from 'lucide-react';
import { Clapperboard, Home, Upload, UserRound } from 'lucide-react';
import { isFeatureEnabled, type FeatureKey } from '@/config/features';

export type MobileNavigationLabelKey = 'home' | 'upload' | 'profile';

export type MobileNavigationItem = {
  id: MobileNavigationLabelKey;
  labelKey: MobileNavigationLabelKey;
  path: string;
  icon: LucideIcon;
};

/**
 * 모바일 하단 내비게이션은 MEARROW의 핵심 소셜 동선만 제공합니다.
 */
export const MOBILE_NAV_ITEMS: readonly MobileNavigationItem[] = [
  { id: 'home', labelKey: 'home', path: '/', icon: Home },
  { id: 'upload', labelKey: 'upload', path: '/my?compose=1', icon: Upload },
  { id: 'profile', labelKey: 'profile', path: '/my', icon: UserRound },
];

export type PrimaryNavigationLabelKey = 'home' | 'studio';

export type PrimaryNavigationItem = {
  id: PrimaryNavigationLabelKey;
  labelKey: PrimaryNavigationLabelKey;
  path: string;
  icon: LucideIcon;
  feature?: FeatureKey;
};

/**
 * 앱 전역 1뎁스 메뉴.
 *
 * 데스크톱 사이드바와 모바일 하단 바는 각 화면에 맞는 직접 링크 목록을 사용해
 * 그룹을 한 번 더 열어야 하는 2뎁스 탐색을 만들지 않도록 합니다.
 * MEARROW의 주 메뉴에는 홈과 Studio를 제공합니다. 소셜 동선은 모바일 하단 바에 둡니다.
 */
export const PRIMARY_NAV_ITEMS: readonly PrimaryNavigationItem[] = [
  { id: 'home', labelKey: 'home', path: '/', icon: Home },
  { id: 'studio', labelKey: 'studio', path: '/studio', icon: Clapperboard },
];

export function getEnabledPrimaryNavItems(): PrimaryNavigationItem[] {
  return PRIMARY_NAV_ITEMS.filter((item) => !item.feature || isFeatureEnabled(item.feature));
}

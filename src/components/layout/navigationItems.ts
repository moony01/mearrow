import type { LucideIcon } from 'lucide-react';
import {
  CalendarSearch,
  Home,
  ListOrdered,
  Newspaper,
  Trophy,
  Upload,
  UserRound,
  Vote,
} from 'lucide-react';
import { isFeatureEnabled, type FeatureKey } from '@/config/features';

export type MobileNavigationLabelKey = 'home' | 'vote' | 'upload' | 'news' | 'profile';

export type MobileNavigationItem = {
  id: MobileNavigationLabelKey;
  labelKey: MobileNavigationLabelKey;
  path: string;
  icon: LucideIcon;
};

/**
 * 모바일 하단 내비게이션은 가장 자주 쓰는 핵심 동선만 고정합니다.
 * 명예의 전당과 오디션은 모바일 헤더의 더보기 drawer에서 제공합니다.
 */
export const MOBILE_NAV_ITEMS: readonly MobileNavigationItem[] = [
  { id: 'home', labelKey: 'home', path: '/', icon: Home },
  { id: 'vote', labelKey: 'vote', path: '/ranking', icon: Vote },
  { id: 'upload', labelKey: 'upload', path: '/my?compose=1', icon: Upload },
  { id: 'news', labelKey: 'news', path: '/news', icon: Newspaper },
  { id: 'profile', labelKey: 'profile', path: '/my', icon: UserRound },
];

export type PrimaryNavigationLabelKey =
  | 'home'
  | 'ranking'
  | 'hall_of_fame'
  | 'news'
  | 'auditions';

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
 * 모바일의 명예의 전당과 오디션은 헤더 drawer에서 접근합니다.
 */
export const PRIMARY_NAV_ITEMS: readonly PrimaryNavigationItem[] = [
  { id: 'home', labelKey: 'home', path: '/', icon: Home },
  { id: 'ranking', labelKey: 'ranking', path: '/ranking', icon: ListOrdered },
  {
    id: 'hall_of_fame',
    labelKey: 'hall_of_fame',
    path: '/hall-of-fame',
    icon: Trophy,
    feature: 'HALL_OF_FAME_PAGE',
  },
  { id: 'news', labelKey: 'news', path: '/news', icon: Newspaper, feature: 'NEWS_PAGE' },
  {
    id: 'auditions',
    labelKey: 'auditions',
    path: '/auditions',
    icon: CalendarSearch,
    feature: 'AUDITIONS_PAGE',
  },
];

export function getEnabledPrimaryNavItems(): PrimaryNavigationItem[] {
  return PRIMARY_NAV_ITEMS.filter((item) => !item.feature || isFeatureEnabled(item.feature));
}

import type { LucideIcon } from 'lucide-react';
import {
  CalendarSearch,
  Home,
  ListOrdered,
  Newspaper,
  Trophy,
} from 'lucide-react';
import { isFeatureEnabled, type FeatureKey } from '@/config/features';

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
 * 데스크톱 사이드바와 모바일 하단 바가 같은 직접 링크 목록을 사용해
 * 그룹을 한 번 더 열어야 하는 2뎁스 탐색을 만들지 않도록 합니다.
 * 관심 피드는 로그인 사용자의 자기 프로필 메뉴에서 접근합니다.
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

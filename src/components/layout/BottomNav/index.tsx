'use client';

/**
 * BottomNav - 모바일 하단 네비게이션 컴포넌트
 *
 * 모바일(<768px)에서만 표시되는 하단 고정 네비게이션입니다.
 * 홈, 투표, 업로드, 뉴스, 프로필의 핵심 동선만 노출하고,
 * 명예의 전당과 오디션은 모바일 헤더 drawer에서 제공합니다.
 */

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import classNames from 'classnames';
import { useAuth } from '@/hooks/useAuth';
import { MOBILE_NAV_ITEMS } from '@/components/layout/navigationItems';
import styles from './BottomNav.module.scss';

export default function BottomNav() {
  const t = useTranslations('Nav');
  const pathname = usePathname();
  // 현재 locale 추출 (예: /en/ranking -> 'en')
  const currentLocale = pathname.split('/')[1] || 'en';
  const { isAuthenticated } = useAuth();

  const getHref = (path: string, id: string) => {
    if (id === 'profile' && !isAuthenticated) return `/${currentLocale}/login`;
    return `/${currentLocale}${path === '/' ? '' : path}`;
  };

  const isActive = (id: string, path: string) => {
    if (id === 'upload') return false;

    const targetPath = id === 'profile' && !isAuthenticated ? '/login' : path.split('?')[0];
    const linkHref = `/${currentLocale}${targetPath === '/' ? '' : targetPath}`;
    return pathname === linkHref ||
      (targetPath !== '/' && pathname.startsWith(`${linkHref}/`));
  };

  return (
    <nav
      className={styles.navContainer}
      data-testid="mobile-bottom-nav"
      aria-label={t('mobile_navigation')}
    >
      <div className={styles.navGlass}>
        {MOBILE_NAV_ITEMS.map((item) => {
          const active = isActive(item.id, item.path);
          const label = t(item.labelKey);
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              href={getHref(item.path, item.id)}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              className={classNames(styles.navItem, { [styles.active]: active })}
              data-nav-id={item.id}
            >
              <span className={styles.iconWrapper}>
                <Icon size={22} strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
              </span>
              <span className={styles.label}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

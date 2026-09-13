'use client';

/**
 * BottomNav - 모바일 하단 네비게이션 컴포넌트
 *
 * 모바일(<768px)에서만 표시되는 하단 고정 네비게이션입니다.
 * Sidebar와 동기화된 1뎁스 직접 링크를 표시하며,
 * AUTH_SYSTEM 활성화 시 프로필/로그인 아이콘을 추가합니다.
 */

import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { User } from 'lucide-react';
import classNames from 'classnames';
import { FEATURES } from '@/config/features';
import { useAuth } from '@/hooks/useAuth';
import { getEnabledPrimaryNavItems } from '@/components/layout/navigationItems';
import styles from './BottomNav.module.scss';

export default function BottomNav() {
  const t = useTranslations('Nav');
  const pathname = usePathname();
  // 현재 locale 추출 (예: /en/ranking -> 'en')
  const currentLocale = pathname.split('/')[1] || 'en';
  const { isAuthenticated } = useAuth();
  const navItems = getEnabledPrimaryNavItems();

  const isActive = (path: string) => {
    const linkHref = `/${currentLocale}${path === '/' ? '' : path}`;
    return path === '/'
      ? pathname === `/${currentLocale}` || pathname === `/${currentLocale}/`
      : pathname === linkHref || pathname.startsWith(`${linkHref}/`);
  };

  return (
    <nav className={styles.navContainer} data-testid="mobile-bottom-nav">
      <div className={styles.navGlass}>
        {navItems.map((item) => {
          const active = isActive(item.path);
          const label = t(item.labelKey);
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              href={`/${currentLocale}${item.path === '/' ? '' : item.path}`}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              className={classNames(styles.navItem, { [styles.active]: active })}
            >
              <div className={styles.iconWrapper}>
                <Icon size={24} strokeWidth={active ? 2.5 : 2} />
              </div>
              <span className={styles.label}>{label}</span>
            </Link>
          );
        })}

        {FEATURES.AUTH_SYSTEM && (
          <Link
            href={`/${currentLocale}${isAuthenticated ? '/my' : '/login'}`}
            aria-label={isAuthenticated ? t('my') : t('login')}
            aria-current={isActive(isAuthenticated ? '/my' : '/login') ? 'page' : undefined}
            className={classNames(styles.navItem, {
              [styles.active]: isActive(isAuthenticated ? '/my' : '/login'),
            })}
          >
            <div className={styles.iconWrapper}>
              <User size={24} strokeWidth={isActive(isAuthenticated ? '/my' : '/login') ? 2.5 : 2} />
            </div>
            <span className={styles.label}>{isAuthenticated ? t('my') : t('login')}</span>
          </Link>
        )}
      </div>
    </nav>
  );
}

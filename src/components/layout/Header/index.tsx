'use client';

/**
 * Header - 전역 상단 헤더
 *
 * 모든 화면에서 설정 페이지 진입과 더보기 drawer를 제공합니다.
 * 데스크톱에서는 좌측 Sidebar와 함께 사용합니다.
 */

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { CalendarSearch, Menu, Settings, Sparkles, Trophy, X } from 'lucide-react';
import styles from './Header.module.scss';
import { BRAND_KOREAN_NAME, BRAND_NAME, BRAND_MARK_PATH } from '@/lib/brand';

export default function Header() {
  const locale = useLocale();
  const t = useTranslations('Nav');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (!isMenuOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isMenuOpen]);

  const drawerItems = [
    {
      href: `/${locale}/ai`,
      label: t('ai'),
      Icon: Sparkles,
    },
    {
      href: `/${locale}/hall-of-fame`,
      label: t('hall_of_fame'),
      Icon: Trophy,
    },
    {
      href: `/${locale}/auditions`,
      label: t('auditions'),
      Icon: CalendarSearch,
    },
  ];

  return (
    <header className={styles.header} data-testid="mobile-header">
      <div className={styles.headerInner}>
        <Link
          href={`/${locale}`}
          className={styles.logoWrapper}
          aria-label={`${BRAND_NAME} (${BRAND_KOREAN_NAME}) 홈`}
        >
          <img
            src={BRAND_MARK_PATH}
            alt={`${BRAND_NAME} 로고`}
            className={styles.logoIcon}
            width={28}
            height={28}
          />
          <span className={styles.logoText}>{BRAND_NAME}</span>
        </Link>

        <div className={styles.controls}>
          <Link
            href={`/${locale}/settings`}
            className={styles.settingsLink}
            aria-label={t('settings')}
            title={t('settings')}
          >
            <Settings size={20} aria-hidden="true" />
            <span>{t('settings')}</span>
          </Link>

          <button
            type="button"
            className={styles.menuButton}
            aria-label={t('menu')}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-navigation-drawer"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {isMenuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className={styles.drawerLayer}>
          <button
            type="button"
            className={styles.drawerBackdrop}
            aria-label={t('menu_backdrop')}
            onClick={() => setIsMenuOpen(false)}
          />
          <aside
            id="mobile-navigation-drawer"
            className={styles.drawer}
            role="dialog"
            aria-modal="true"
            aria-label={t('menu')}
          >
            <div className={styles.drawerHeader}>
              <h2>{t('menu')}</h2>
              <button
                type="button"
                className={styles.drawerClose}
                aria-label={t('menu_close')}
                onClick={() => setIsMenuOpen(false)}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <nav aria-label={t('menu')}>
              <ul className={styles.drawerList}>
                {drawerItems.map(({ href, label, Icon }) => (
                  <li key={href}>
                    <Link href={href} className={styles.drawerLink} onClick={() => setIsMenuOpen(false)}>
                      <Icon size={20} aria-hidden="true" />
                      <span>{label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        </div>
      )}
    </header>
  );
}

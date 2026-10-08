'use client';

/**
 * Header - 모바일 전역 상단 헤더
 *
 * 로고와 더보기 메뉴를 제공합니다. 데스크톱에서는 좌측 Sidebar를 사용합니다.
 */

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Clapperboard, Menu, Settings, X } from 'lucide-react';
import styles from './Header.module.scss';
import { BRAND_KOREAN_NAME, BRAND_NAME, BRAND_MARK_PATH } from '@/lib/brand';

export default function Header() {
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

  return (
    <header className={styles.header} data-testid="mobile-header">
      <div className={styles.headerInner}>
        <Link
          href="/"
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
                <li>
                  <Link href="/studio" className={styles.drawerLink} onClick={() => setIsMenuOpen(false)}>
                    <Clapperboard size={20} aria-hidden="true" />
                    <span>{t('studio')}</span>
                  </Link>
                </li>
                <li>
                  <Link
                    href="/settings"
                    className={styles.drawerLink}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Settings size={20} aria-hidden="true" />
                    <span>{t('settings')}</span>
                  </Link>
                </li>
              </ul>
            </nav>
          </aside>
        </div>
      )}
    </header>
  );
}

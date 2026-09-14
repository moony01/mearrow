'use client';

/**
 * Header - 모바일 전용 상단 헤더
 *
 * 모바일에서는 로고와 전역 컨트롤, 더보기 drawer를 제공합니다.
 * 데스크톱에서는 좌측 Sidebar가 동일한 역할을 하므로 숨깁니다.
 */

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { CalendarSearch, Menu, Trophy, X } from 'lucide-react';
import styles from './Header.module.scss';
import ThemeToggle from '../../common/ThemeToggle';
import { BRAND_KOREAN_NAME, BRAND_NAME, BRAND_MARK_PATH } from '@/lib/brand';
import { SUPPORTED_LOCALES } from '@/lib/constants';

const LOCALE_LABELS: Record<(typeof SUPPORTED_LOCALES)[number], string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
  zh: '中文(简体)',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
};

export default function Header() {
  const locale = useLocale();
  const t = useTranslations('Nav');
  const router = useRouter();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const changeLang = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value;
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
    setIsMenuOpen(false);
    router.push(newPath);
  };

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
          <ThemeToggle compact className={styles.themeToggle} />

          <select
            value={locale}
            onChange={changeLang}
            className={styles.langSelect}
            aria-label={t('language')}
          >
            {SUPPORTED_LOCALES.map((supportedLocale) => (
              <option value={supportedLocale} key={supportedLocale}>
                {LOCALE_LABELS[supportedLocale]}
              </option>
            ))}
          </select>

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

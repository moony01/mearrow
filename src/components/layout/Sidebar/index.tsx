'use client';

/**
 * Sidebar - 데스크탑 좌측 네비게이션 컴포넌트
 *
 * TikTok형 정보 구조를 적용한 좌측 고정 네비게이션입니다.
 * Feature Flags에 따라 메뉴를 동적으로 표시하며,
 * AUTH_SYSTEM 활성화 시 하단에 인증 영역을 표시합니다.
 *
 * 반응형:
 * - Mobile/Tablet(<1264px): 아이콘 레일, 확장하지 않음
 * - Desktop(1264px+): 아이콘 + 레이블 고정
 */

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Check, LogIn, LogOut, Mail, Settings } from 'lucide-react';
import classNames from 'classnames';
import { useCallback, useEffect, useState } from 'react';
import { FEATURES } from '@/config/features';
import { useAuth } from '@/hooks/useAuth';
import { BRAND_KOREAN_NAME, BRAND_NAME, BRAND_MARK_PATH } from '@/lib/brand';
import { CONTACT_EMAIL, SUPPORTED_LOCALES } from '@/lib/constants';
import { getEnabledPrimaryNavItems } from '@/components/layout/navigationItems';
import ThemeToggle from '@/components/common/ThemeToggle';
import styles from './Sidebar.module.scss';

const LOCALE_LABELS: Record<string, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
  zh: '中文(简体)',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
};

export default function Sidebar() {
  const t = useTranslations('Nav');
  const pathname = usePathname();
  const router = useRouter();
  const locale = pathname?.split('/')[1] || 'ko';
  const { profile, isAuthenticated, signOut } = useAuth();
  const [copied, setCopied] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleContactClick = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.location.href = `mailto:${CONTACT_EMAIL}`;
    }
  }, []);

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === `/${locale}` || pathname === `/${locale}/`;
    }
    const localizedPath = `/${locale}${path}`;
    return pathname === localizedPath || pathname?.startsWith(`${localizedPath}/`);
  };

  const navItems = getEnabledPrimaryNavItems();

  useEffect(() => {
    if (!settingsOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSettingsOpen(false);
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [settingsOpen]);

  const changeLanguage = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = event.target.value;
    const newPath = pathname?.replace(`/${locale}`, `/${newLocale}`) ?? `/${newLocale}`;
    setSettingsOpen(false);
    router.push(newPath);
  };

  return (
    <aside className={styles.sidebar} aria-label="주요 메뉴" data-testid="desktop-sidebar">
      {/* Logo Area */}
      <div className={styles.logoArea}>
        <Link
          href={`/${locale}`}
          className={styles.brand}
          aria-label={`${BRAND_NAME} (${BRAND_KOREAN_NAME}) 홈`}
        >
          <div className={styles.logoWrapper}>
            <img
              src={BRAND_MARK_PATH}
              alt={`${BRAND_NAME} 로고`}
              className={styles.logoImage}
              width={40}
              height={40}
            />
          </div>
          <span className={styles.logoText}>{BRAND_NAME}</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className={styles.nav} aria-label="사이트 탐색">
        <ul className={styles.navList}>
          {navItems.map((item) => {
            const active = isActive(item.path);
            const label = t(item.labelKey);
            const Icon = item.icon;

            return (
              <li key={item.id}>
                <Link
                  href={`/${locale}${item.path === '/' ? '' : item.path}`}
                  className={classNames(styles.navItem, { [styles.active]: active })}
                  aria-label={label}
                  aria-current={active ? 'page' : undefined}
                >
                  <div className={styles.iconWrapper}>
                    <Icon className={styles.icon} />
                  </div>
                  <span className={styles.label}>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={styles.sidebarBottom}>
        <div className={styles.settingsSection}>
          <button
            type="button"
            className={classNames(styles.navItem, styles.settingsButton, {
              [styles.active]: settingsOpen,
            })}
            aria-label={t('settings')}
            aria-haspopup="dialog"
            aria-expanded={settingsOpen}
            aria-controls="sidebar-settings-panel"
            onClick={() => setSettingsOpen((open) => !open)}
          >
            <div className={styles.iconWrapper}>
              <Settings className={styles.icon} />
            </div>
            <span className={styles.label}>{t('settings')}</span>
          </button>

          {settingsOpen && (
            <section
              id="sidebar-settings-panel"
              className={styles.settingsPanel}
              role="dialog"
              aria-labelledby="sidebar-settings-title"
            >
              <div className={styles.settingsHeader}>
                <h2 id="sidebar-settings-title">{t('settings')}</h2>
                <button
                  type="button"
                  className={styles.settingsClose}
                  aria-label={t('settings_close')}
                  onClick={() => setSettingsOpen(false)}
                >
                  <span aria-hidden="true">×</span>
                </button>
              </div>

              <div className={styles.settingRow}>
                <span>{t('mode_switch')}</span>
                <ThemeToggle compact className={styles.settingsThemeToggle} />
              </div>

              <label className={styles.languageSetting}>
                <span>{t('language')}</span>
                <select value={locale} onChange={changeLanguage} aria-label={t('language')}>
                  {SUPPORTED_LOCALES.map((supportedLocale) => (
                    <option value={supportedLocale} key={supportedLocale}>
                      {LOCALE_LABELS[supportedLocale]}
                    </option>
                  ))}
                </select>
              </label>
            </section>
          )}
        </div>

        {/* 인증 영역 (AUTH_SYSTEM 플래그 활성화 시 표시) */}
        {FEATURES.AUTH_SYSTEM && (
          <div className={styles.authSection}>
            {isAuthenticated ? (
              <>
                {/* 문의하기 (로그인 회원에게만 표시) */}
                <button
                  onClick={handleContactClick}
                  className={classNames(styles.navItem, styles.contactBtn, {
                    [styles.contactCopied]: copied,
                  })}
                  aria-label={copied ? t('contact_copied') : t('contact')}
                  title={copied ? CONTACT_EMAIL : t('contact')}
                >
                  <div className={styles.iconWrapper}>
                    {copied ? (
                      <Check className={styles.icon} />
                    ) : (
                      <Mail className={styles.icon} />
                    )}
                  </div>
                  <span className={styles.label}>
                    {copied ? t('contact_copied') : t('contact')}
                  </span>
                </button>

                {/* 프로필 정보 */}
                <Link
                  href={`/${locale}/my`}
                  className={classNames(styles.navItem, styles.profileItem)}
                  aria-label={profile?.username || t('my')}
                >
                  <div className={styles.iconWrapper}>
                    <span className={styles.avatarInitial}>
                      {(profile?.username || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className={styles.label}>{profile?.username || t('my')}</span>
                </Link>

                {/* 로그아웃 버튼 */}
                <button
                  onClick={signOut}
                  className={classNames(styles.navItem, styles.logoutBtn)}
                  aria-label={t('logout')}
                >
                  <div className={styles.iconWrapper}>
                    <LogOut className={styles.icon} />
                  </div>
                  <span className={styles.label}>{t('logout')}</span>
                </button>
              </>
            ) : (
              /* 로그인 버튼 */
              <Link
                href={`/${locale}/login`}
                className={classNames(styles.navItem, styles.loginBtn)}
                aria-label={t('login')}
              >
                <div className={styles.iconWrapper}>
                  <LogIn className={styles.icon} />
                </div>
                <span className={styles.label}>{t('login')}</span>
              </Link>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

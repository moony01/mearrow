'use client';

/**
 * Header - 모바일 전역 상단 헤더
 *
 * 로고와 설정 진입을 제공합니다. 데스크톱에서는 좌측 Sidebar를 사용합니다.
 */

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { Settings } from 'lucide-react';
import styles from './Header.module.scss';
import { BRAND_KOREAN_NAME, BRAND_NAME, BRAND_MARK_PATH } from '@/lib/brand';

export default function Header() {
  const locale = useLocale();
  const t = useTranslations('Nav');

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

        </div>
      </div>
    </header>
  );
}

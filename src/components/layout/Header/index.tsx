'use client';

/**
 * Header - 상단 헤더 컴포넌트
 *
 * 모바일: 로고 + 컨트롤 (769px 이상에서는 사이드바가 로고 대체)
 * LeagueHeader(h1)는 HomeClient에서 별도 렌더링
 */

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
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
  const router = useRouter();
  const pathname = usePathname();

  const changeLang = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLocale = e.target.value;
    const newPath = pathname.replace(`/${locale}`, `/${newLocale}`);
    router.push(newPath);
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        {/* 모바일 로고 (769px 이상에서는 사이드바에 로고가 있으므로 숨김) */}
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
        {/* 테마 토글 버튼 (다크/라이트 모드 전환) */}
        <ThemeToggle compact className={styles.themeToggle} />


        <select value={locale} onChange={changeLang} className={styles.langSelect}>
          {SUPPORTED_LOCALES.map((supportedLocale) => (
            <option value={supportedLocale} key={supportedLocale}>
              {LOCALE_LABELS[supportedLocale]}
            </option>
          ))}
        </select>
        </div>
      </div>
    </header>
  );
}

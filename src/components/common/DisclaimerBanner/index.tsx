'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Info, FileText, Shield, HelpCircle, MessageCircle, BookOpen } from 'lucide-react';
import styles from './DisclaimerBanner.module.scss';

/**
 * 법적 면책 조항 배너 컴포넌트
 * - "Unofficial Fan App" 명시
 * - 저작권 관련 안내
 * - 이용약관/개인정보처리방침 링크
 */
export function DisclaimerBanner() {
  const t = useTranslations('Disclaimer');

  return (
    <div className={styles.disclaimerBanner}>
      <div className={styles.mainNotice}>
        <Info className={styles.icon} size={14} />
        <p className={styles.text}>{t('banner')}</p>
      </div>
      <div className={styles.links}>
        <Link href={`/terms`} className={styles.link}>
          <FileText size={12} />
          <span>{t('terms')}</span>
        </Link>
        <span className={styles.divider}>|</span>
        <Link href={`/privacy`} className={styles.link}>
          <Shield size={12} />
          <span>{t('privacy')}</span>
        </Link>
        <span className={styles.divider}>|</span>
        <Link href={`/about`} className={styles.link}>
          <HelpCircle size={12} />
          <span>{t('about')}</span>
        </Link>
        <span className={styles.divider}>|</span>
        <Link href={`/faq`} className={styles.link}>
          <MessageCircle size={12} />
          <span>{t('faq')}</span>
        </Link>
        <span className={styles.divider}>|</span>
        <Link href={`/editorial`} className={styles.link}>
          <BookOpen size={12} />
          <span>{t('editorial')}</span>
        </Link>
      </div>
      <p className={styles.copyright}>{t('copyright')}</p>
    </div>
  );
}

export default DisclaimerBanner;

import { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { generatePageMetadata } from '@/lib/seo';
import { FULL_URL } from '@/lib/constants';
import { BRAND_NAME } from '@/lib/brand';
import { JsonLd } from '@/components/common/JsonLd';
import NoticeClient from './NoticeClient';
import AdBanner from '@/components/common/AdBanner';
import { AD_SLOTS } from '@/types/ads';
import styles from './notice-seo.module.scss';
import PageFrame, { PageHeader } from '@/components/layout/PageFrame';
import { getServerAnnouncements } from '@/lib/api/announcements';

/** 공지사항 페이지 메타데이터 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = 'ko';
  const t = await getTranslations({ locale, namespace: 'Notice' });

  return generatePageMetadata({
    locale,
    pathname: '/notice',
    title: `${t('title')} | ${BRAND_NAME}`,
    description: t('subtitle'),
  });
}

/**
 * 공지사항 페이지
 * SSG 셸 + SEO 콘텐츠 + CSR 클라이언트 컴포넌트 조합
 */
export default async function NoticePage() {
  const locale = 'ko';
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'Notice' });
  const initialNotices = await getServerAnnouncements(undefined, locale);
  const noticeJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${t('title')} | ${BRAND_NAME}`,
    description: t('subtitle'),
    url: `${FULL_URL}/notice`,
    inLanguage: locale,
  };

  return (
    <PageFrame size="narrow">
      <JsonLd data={noticeJsonLd} />

      <PageHeader
        eyebrow={BRAND_NAME}
        title={t('title')}
        description={t('subtitle')}
      />

      {/* CSR 공지사항 목록 */}
      <NoticeClient locale={locale} initialNotices={initialNotices} />

      {/* 공지사항 목록 하단 광고 */}
      <AdBanner adSlot={AD_SLOTS.NOTICE_LIST_BOTTOM} adFormat="leaderboard" />

      {/* SEO 콘텐츠 하단 섹션 */}
      <section className={styles.seoSection}>
        <div className={styles.seoGrid}>
          <div className={styles.seoCard}>
            <h2>{t('seo_categories_title')}</h2>
            <p>{t('seo_categories_desc')}</p>
          </div>
          <div className={styles.seoCard}>
            <h2>{t('seo_stay_title')}</h2>
            <p>{t('seo_stay_desc')}</p>
          </div>
          <div className={styles.seoCard}>
            <h2>{t('seo_why_title')}</h2>
            <p>{t('seo_why_desc')}</p>
          </div>
        </div>
      </section>
    </PageFrame>
  );
}

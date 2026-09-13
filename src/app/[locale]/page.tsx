/**
 * HomePage (리그 시스템)
 *
 * MEARROW 리그 시스템 메인 페이지
 * SSG 빌드 시 정적 셸 생성, 데이터는 CSR(SWR)로 로드
 *
 * @updated Phase 5 - SSG/CSR 마이그레이션
 */

import { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import HomeFeedClient from './HomeFeedClient';
import { generatePageMetadata } from '@/lib/seo';
import { FULL_URL, SUPPORTED_LOCALES } from '@/lib/constants';
import { BRAND_MARK_PATH, BRAND_NAME } from '@/lib/brand';
import { JsonLd } from '@/components/common/JsonLd';
import styles from './seo-content.module.scss';

/** 지원하는 로케일에 대해 페이지 생성 */
export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

/**
 * 홈페이지 Props
 */
interface HomePageProps {
  params: Promise<{ locale: string }>;
}

/**
 * 페이지 메타데이터 생성
 * SEO를 위한 title, description, OG 태그, canonical, hreflang 설정
 */
export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Home' });

  return generatePageMetadata({
    locale,
    title: t('seo_title'),
    description: t('seo_intro'),
  });
}

/**
 * 홈페이지 (피드 + 서버 렌더링 안내 콘텐츠)
 * HomeFeedClient가 public profile_posts를 클라이언트에서 데이터 로드
 * 하단 안내 콘텐츠는 정적 HTML로 렌더링되어 피드의 목적과 서비스 맥락을 설명
 */
export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'Home' });
  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: t('seo_title'),
    url: `${FULL_URL}/${locale}`,
    description: t('seo_intro'),
    inLanguage: locale,
    publisher: {
      '@type': 'Organization',
      name: BRAND_NAME,
      logo: {
        '@type': 'ImageObject',
        url: `${FULL_URL}${BRAND_MARK_PATH}`,
      },
    },
  };

  return (
    <>
      <JsonLd data={websiteJsonLd} />
      <HomeFeedClient />

      {/*
       * 피드 아래의 실제 서비스 안내 콘텐츠.
       * 클라이언트 피드가 로드되기 전에도 HTML에 포함되어 페이지의 목적과
       * 탐색 경로를 설명한다. 숨김 텍스트가 아니라 사용자가 읽을 수 있는
       * 원문 콘텐츠이므로 피드 UI와 별개의 의미 있는 문서 영역이다.
       */}
      <section className={styles.seoSection} aria-labelledby="home-content-title">
        <h2 id="home-content-title" className={styles.seoTitle}>{t('seo_title')}</h2>
        <p className={styles.seoIntro}>{t('seo_intro')}</p>

        <div className={styles.seoGrid}>
          <article className={styles.seoCard}>
            <h3>{t('seo_how_title')}</h3>
            <p>{t('seo_how_desc')}</p>
          </article>
          <article className={styles.seoCard}>
            <h3>{t('seo_vote_title')}</h3>
            <p>{t('seo_vote_desc')}</p>
          </article>
          <article className={styles.seoCard}>
            <h3>{t('seo_season_title')}</h3>
            <p>{t('seo_season_desc')}</p>
          </article>
          <article className={styles.seoCard}>
            <h3>{t('seo_global_title')}</h3>
            <p>{t('seo_global_desc')}</p>
          </article>
          <article className={styles.seoCard}>
            <h3>{t('seo_data_title')}</h3>
            <p>{t('seo_data_desc')}</p>
          </article>
          <article className={styles.seoCard}>
            <h3>{t('seo_trust_title')}</h3>
            <p>{t('seo_trust_desc')}</p>
          </article>
        </div>

        <nav className={styles.seoLinks} aria-label={t('seo_links_label')}>
          <Link href={`/${locale}/ranking`}>{t('seo_ranking_link')}</Link>
          <Link href={`/${locale}/news`}>{t('seo_news_link')}</Link>
          <Link href={`/${locale}/editorial`}>{t('seo_editorial_link')}</Link>
        </nav>
      </section>
    </>
  );
}

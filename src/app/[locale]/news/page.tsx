import { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Newspaper } from 'lucide-react';
import { getAllNews, NEWS_SOURCE_LOCALE } from '@/lib/news';
import NewsGridClient from './NewsGridClient';
import { generatePageMetadata } from '@/lib/seo';
import { FULL_URL, SUPPORTED_LOCALES } from '@/lib/constants';
import { BRAND_NAME } from '@/lib/brand';
import { JsonLd } from '@/components/common/JsonLd';
import PageFrame, { PageHeader } from '@/components/layout/PageFrame';
import styles from './page.module.scss';

/** 지원하는 언어에 대해 정적 페이지 생성 */
export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

/**
 * 뉴스 목록 페이지 Props
 */
interface NewsPageProps {
  params: Promise<{
    locale: string;
  }>;
}

/**
 * 페이지 메타데이터 생성
 * SEO를 위한 title, description, OG 태그, canonical, hreflang 설정
 */
export async function generateMetadata({ params }: NewsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'News' });

  return generatePageMetadata({
    locale,
    pathname: '/news',
    title: `${t('title')} | ${BRAND_NAME}`,
    description: t('subtitle'),
  });
}

/**
 * 뉴스 목록 페이지
 * K-Pop 산업 관련 뉴스 및 분석 리포트 목록 표시
 */
export default async function NewsPage({ params }: NewsPageProps) {
  const { locale } = await params;

  // next-intl 정적 생성 지원
  setRequestLocale(locale);

  // 번역 가져오기
  const t = await getTranslations({ locale, namespace: 'News' });

  // 뉴스 데이터 가져오기
  const posts = getAllNews(locale);

  // ItemList JSON-LD 스키마 생성
  const newsListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${t('title')} | ${BRAND_NAME}`,
    description: t('subtitle'),
    url: `${FULL_URL}/${locale}/news`,
    numberOfItems: posts.length,
    itemListElement: posts.map((post, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${FULL_URL}/${NEWS_SOURCE_LOCALE}/news/${post.slug}`,
      name: post.title,
    })),
  };

  return (
    <PageFrame>
      <JsonLd data={newsListJsonLd} />
      <PageHeader
        eyebrow={BRAND_NAME}
        title={t('title')}
        description={t('subtitle')}
        icon={<Newspaper size={26} />}
      />

      {/* 뉴스 그리드 */}
      {posts.length > 0 ? (
        <section className={styles.grid}>
          <NewsGridClient
            posts={posts.map((post) => ({
              slug: post.slug,
              title: post.title,
              excerpt: post.excerpt,
              date: post.date,
              category: post.category,
              thumbnail: post.thumbnail ?? undefined,
              sourceCount: post.sources?.length ?? 0,
            }))}
            locale={locale}
          />
        </section>
      ) : (
        <div className={styles.empty}>
          <p>{t('noArticles')}</p>
        </div>
      )}

    </PageFrame>
  );
}

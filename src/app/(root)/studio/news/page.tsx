import { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Newspaper } from 'lucide-react';
import { getAllNews, NEWS_SOURCE_LOCALE } from '@/lib/news';
import NewsGridClient from './NewsGridClient';
import { FULL_URL } from '@/lib/constants';
import { BRAND_NAME } from '@/lib/brand';
import { JsonLd } from '@/components/common/JsonLd';
import PageFrame, { PageHeader } from '@/components/layout/PageFrame';
import styles from './page.module.scss';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({ locale: NEWS_SOURCE_LOCALE, namespace: 'News' });
  const url = `${FULL_URL}/studio/news`;

  return {
    title: t('title'),
    description: t('subtitle'),
    alternates: { canonical: url },
    openGraph: { title: `${t('title')} | ${BRAND_NAME}`, description: t('subtitle'), url },
  };
}

/**
 * 뉴스 목록 페이지
 * K-Pop 산업 관련 뉴스 및 분석 리포트 목록 표시
 */
export default async function NewsPage() {
  const locale = NEWS_SOURCE_LOCALE;

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
    url: `${FULL_URL}/studio/news`,
    numberOfItems: posts.length,
    itemListElement: posts.map((post, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${FULL_URL}/studio/news/${post.slug}`,
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
            basePath="/studio/news"
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

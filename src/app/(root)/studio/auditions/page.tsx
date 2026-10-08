import type { Metadata } from 'next';
import { CalendarSearch } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { JsonLd } from '@/components/common/JsonLd';
import { getAllAuditions } from '@/lib/auditions';
import { FULL_URL } from '@/lib/constants';
import PageFrame, { PageHeader } from '@/components/layout/PageFrame';
import AuditionsGridClient from './AuditionsGridClient';
import styles from './page.module.scss';

export async function generateMetadata(): Promise<Metadata> {
  const locale = 'en';
  const t = await getTranslations({ locale, namespace: 'Auditions' });
  const url = `${FULL_URL}/studio/auditions`;

  return {
    title: t('metaTitle'),
    description: t('subtitle'),
    alternates: { canonical: url },
    openGraph: { title: t('metaTitle'), description: t('subtitle'), url },
  };
}

export default async function AuditionsPage() {
  const locale = 'en';
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'Auditions' });
  const posts = getAllAuditions(locale).sort(
    (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  );

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: t('title'),
    description: t('subtitle'),
    url: `${FULL_URL}/studio/auditions`,
    numberOfItems: posts.length,
    itemListElement: posts.map((post, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${FULL_URL}/studio/auditions/${post.slug}`,
      name: post.title,
    })),
  };

  return (
    <PageFrame size="wide">
      <JsonLd data={itemListJsonLd} />

      <PageHeader
        eyebrow={t('eyebrow')}
        title={t('title')}
        description={t('subtitle')}
        icon={<CalendarSearch size={26} />}
      />

      {posts.length === 0 ? (
        <div className={styles.empty}>{t('noAuditions')}</div>
      ) : (
        <AuditionsGridClient posts={posts} locale={locale} basePath="/studio/auditions" />
      )}

      <aside className={styles.notice}>
        <strong>{t('noticeTitle')}</strong>
        <p>{t('noticeBody')}</p>
      </aside>
    </PageFrame>
  );
}

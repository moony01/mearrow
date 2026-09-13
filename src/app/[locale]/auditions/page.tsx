import type { Metadata } from 'next';
import { CalendarSearch } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { JsonLd } from '@/components/common/JsonLd';
import { getAllAuditions } from '@/lib/auditions';
import { FULL_URL, SUPPORTED_LOCALES } from '@/lib/constants';
import { generatePageMetadata } from '@/lib/seo';
import PageFrame, { PageHeader } from '@/components/layout/PageFrame';
import AuditionsGridClient from './AuditionsGridClient';
import styles from './page.module.scss';

interface AuditionsPageProps {
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: AuditionsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Auditions' });

  return generatePageMetadata({
    locale,
    pathname: '/auditions',
    title: t('metaTitle'),
    description: t('subtitle'),
  });
}

export default async function AuditionsPage({ params }: AuditionsPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'Auditions' });
  const posts = getAllAuditions(locale);

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: t('title'),
    description: t('subtitle'),
    url: `${FULL_URL}/${locale}/auditions`,
    numberOfItems: posts.length,
    itemListElement: posts.map((post, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${FULL_URL}/${post.locale}/auditions/${post.slug}`,
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
        <AuditionsGridClient posts={posts} locale={locale} />
      )}

      <aside className={styles.notice}>
        <strong>{t('noticeTitle')}</strong>
        <p>{t('noticeBody')}</p>
      </aside>
    </PageFrame>
  );
}

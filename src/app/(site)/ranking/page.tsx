import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import RankingClient from './RankingClient';
import { generatePageMetadata } from '@/lib/seo';
import { BRAND_NAME } from '@/lib/brand';
import PageFrame, { PageHeader } from '@/components/layout/PageFrame';
import { getInitialLeagueData } from '@/lib/server/public-page-data';

export async function generateMetadata(): Promise<Metadata> {
  const locale = 'ko';
  const t = await getTranslations({ locale, namespace: 'Nav' });
  const tHome = await getTranslations({ locale, namespace: 'Home' });
  return generatePageMetadata({
    locale,
    pathname: '/ranking',
    title: `${t('ranking')} | ${BRAND_NAME}`,
    description: tHome('seo_intro'),
  });
}

export default async function RankingPage() {
  const locale = 'ko';
  setRequestLocale(locale);
  const tNav = await getTranslations({ locale, namespace: 'Nav' });
  const tHome = await getTranslations({ locale, namespace: 'Home' });
  const initialData = await getInitialLeagueData();

  return (
    <PageFrame as="section" size="wide">
      <PageHeader
        eyebrow={BRAND_NAME}
        title={tNav('ranking')}
        description={tHome('title')}
      />
      <RankingClient initialData={initialData} />
    </PageFrame>
  );
}

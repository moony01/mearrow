import type { Metadata } from 'next';
import { Heart } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import PageFrame, { PageHeader } from '@/components/layout/PageFrame';
import { BRAND_NAME } from '@/lib/brand';
import { generatePageMetadata } from '@/lib/seo';
import FollowingClient from './FollowingClient';

export async function generateMetadata(): Promise<Metadata> {
  const locale = 'ko';
  const t = await getTranslations({ locale, namespace: 'Following' });

  return {
    ...generatePageMetadata({
      locale,
      pathname: '/following',
      title: `${t('title')} | ${BRAND_NAME}`,
      description: t('subtitle'),
    }),
    robots: { index: false, follow: false },
  };
}

export default async function FollowingPage() {
  const locale = 'ko';
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'Following' });

  return (
    <PageFrame size="wide">
      <PageHeader
        eyebrow={t('eyebrow')}
        title={t('title')}
        description={t('subtitle')}
        icon={<Heart size={26} />}
      />
      <FollowingClient />
    </PageFrame>
  );
}

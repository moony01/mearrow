import type { Metadata } from 'next';
import { Heart } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import PageFrame, { PageHeader } from '@/components/layout/PageFrame';
import { BRAND_NAME } from '@/lib/brand';
import { SUPPORTED_LOCALES } from '@/lib/constants';
import { generatePageMetadata } from '@/lib/seo';
import FollowingClient from './FollowingClient';

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

interface FollowingPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: FollowingPageProps): Promise<Metadata> {
  const { locale } = await params;
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

export default async function FollowingPage({ params }: FollowingPageProps) {
  const { locale } = await params;
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

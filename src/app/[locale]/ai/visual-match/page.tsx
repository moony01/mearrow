import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import PageFrame from '@/components/layout/PageFrame';
import { generatePageMetadata } from '@/lib/seo';
import { SUPPORTED_LOCALES } from '@/lib/constants';
import VisualMatchExploreClient from './VisualMatchExploreClient';
import styles from './visual-explore.module.scss';

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

interface VisualMatchPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: VisualMatchPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'VisualMatchPage' });

  return generatePageMetadata({
    locale,
    pathname: '/ai/visual-match',
    title: t('meta_title'),
    description: t('meta_description'),
  });
}

export default async function VisualMatchPage({ params }: VisualMatchPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <PageFrame
      size="wide"
      className={styles.visualPage}
      data-testid="visual-match-page"
    >
      <VisualMatchExploreClient />
    </PageFrame>
  );
}

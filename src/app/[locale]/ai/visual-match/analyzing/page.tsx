import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import PageFrame from '@/components/layout/PageFrame';
import { generatePageMetadata } from '@/lib/seo';
import { SUPPORTED_LOCALES } from '@/lib/constants';
import AnalyzingClient from '../AnalyzingClient';
import styles from '../analysis.module.scss';

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

interface AnalyzingPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: AnalyzingPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'VisualMatchPage' });

  return generatePageMetadata({
    locale,
    pathname: '/ai/visual-match/analyzing',
    title: t('analysis_title'),
    description: t('analysis_description'),
  });
}

export default async function AnalyzingPage({ params }: AnalyzingPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <PageFrame size="wide" className={styles.analysisPage} data-testid="visual-match-analyzing-page">
      <AnalyzingClient />
    </PageFrame>
  );
}

import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import PageFrame from '@/components/layout/PageFrame';
import { generatePageMetadata } from '@/lib/seo';
import { DEFAULT_LOCALE } from '@/lib/constants';
import AnalyzingClient from '../AnalyzingClient';
import styles from '../analysis.module.scss';

export async function generateMetadata(): Promise<Metadata> {
  const locale = DEFAULT_LOCALE;
  const t = await getTranslations({ locale, namespace: 'VisualMatchPage' });

  return generatePageMetadata({
    locale,
    pathname: '/ai/visual-match/analyzing',
    title: t('analysis_title'),
    description: t('analysis_description'),
  });
}

export default async function AnalyzingPage() {
  const locale = DEFAULT_LOCALE;
  setRequestLocale(locale);

  return (
    <PageFrame as="div" size="wide" className={styles.analysisPage} data-testid="visual-match-analyzing-page">
      <Suspense fallback={null}><AnalyzingClient /></Suspense>
    </PageFrame>
  );
}

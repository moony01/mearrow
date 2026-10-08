import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import PageFrame from '@/components/layout/PageFrame';
import { generatePageMetadata } from '@/lib/seo';
import { SUPPORTED_LOCALES } from '@/lib/constants';
import ReportClient from '../ReportClient';
import styles from '../pdf-report.module.scss';

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

interface ReportPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: ReportPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'VisualMatchPage' });

  return generatePageMetadata({
    locale,
    pathname: '/ai/visual-match/report',
    title: t('report_title'),
    description: t('report_description'),
  });
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <PageFrame size="wide" className={styles.reportFrame} data-testid="visual-match-report-page">
      <ReportClient />
    </PageFrame>
  );
}

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import PageFrame from '@/components/layout/PageFrame';
import { generatePageMetadata } from '@/lib/seo';
import { DEFAULT_LOCALE } from '@/lib/constants';
import ReportClient from '../ReportClient';
import styles from '../pdf-report.module.scss';

export async function generateMetadata(): Promise<Metadata> {
  const locale = DEFAULT_LOCALE;
  const t = await getTranslations({ locale, namespace: 'VisualMatchPage' });

  return generatePageMetadata({
    locale,
    pathname: '/ai/visual-match/report',
    title: t('report_title'),
    description: t('report_description'),
  });
}

export default async function ReportPage() {
  const locale = DEFAULT_LOCALE;
  setRequestLocale(locale);

  return (
    <PageFrame size="wide" className={styles.reportFrame} data-testid="visual-match-report-page">
      <ReportClient />
    </PageFrame>
  );
}

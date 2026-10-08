import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import PageFrame from '@/components/layout/PageFrame';
import { SUPPORTED_LOCALES } from '@/lib/constants';
import { generatePageMetadata } from '@/lib/seo';
import VisualMatchSurveyClient from '../VisualMatchSurveyClient';
import styles from '../visual-match.module.scss';

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'VisualMatchPage' });
  return generatePageMetadata({ locale, pathname: '/ai/visual-match/survey', title: t('upload_title'), description: t('upload_description') });
}

export default async function VisualMatchSurveyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PageFrame size="wide" className={styles.visualPage} data-testid="visual-match-survey-page"><VisualMatchSurveyClient /></PageFrame>;
}

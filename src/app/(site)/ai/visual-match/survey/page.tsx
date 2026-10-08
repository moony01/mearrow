import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import PageFrame from '@/components/layout/PageFrame';
import { DEFAULT_LOCALE } from '@/lib/constants';
import { generatePageMetadata } from '@/lib/seo';
import VisualMatchSurveyClient from '../VisualMatchSurveyClient';
import styles from '../visual-match.module.scss';

export async function generateMetadata(): Promise<Metadata> {
  const locale = DEFAULT_LOCALE;
  const t = await getTranslations({ locale, namespace: 'VisualMatchPage' });
  return generatePageMetadata({ locale, pathname: '/ai/visual-match/survey', title: t('upload_title'), description: t('upload_description') });
}

export default async function VisualMatchSurveyPage() {
  const locale = DEFAULT_LOCALE;
  setRequestLocale(locale);
  return <PageFrame as="div" size="wide" className={styles.visualPage} data-testid="visual-match-survey-page"><VisualMatchSurveyClient /></PageFrame>;
}

import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import PageFrame from '@/components/layout/PageFrame';
import { generatePageMetadata } from '@/lib/seo';
import { DEFAULT_LOCALE } from '@/lib/constants';
import VisualMatchExploreClient from './VisualMatchExploreClient';
import styles from './visual-explore.module.scss';

export async function generateMetadata(): Promise<Metadata> {
  const locale = DEFAULT_LOCALE;
  const t = await getTranslations({ locale, namespace: 'VisualMatchPage' });

  return generatePageMetadata({
    locale,
    pathname: '/ai/visual-match',
    title: t('meta_title'),
    description: t('meta_description'),
  });
}

export default async function VisualMatchPage() {
  const locale = DEFAULT_LOCALE;
  setRequestLocale(locale);

  return (
    <PageFrame
      as="div"
      size="wide"
      className={styles.visualPage}
      data-testid="visual-match-page"
    >
      <VisualMatchExploreClient />
    </PageFrame>
  );
}

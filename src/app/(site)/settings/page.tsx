import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Settings } from 'lucide-react';
import { generatePageMetadata } from '@/lib/seo';
import { DEFAULT_LOCALE } from '@/lib/constants';
import PageFrame, { PageHeader } from '@/components/layout/PageFrame';
import SettingsClient from './SettingsClient';

export async function generateMetadata(): Promise<Metadata> {
  const locale = DEFAULT_LOCALE;
  const t = await getTranslations({ locale, namespace: 'SettingsPage' });

  return generatePageMetadata({
    locale,
    pathname: '/settings',
    title: t('meta_title'),
    description: t('meta_description'),
  });
}

export default async function SettingsPage() {
  const locale = DEFAULT_LOCALE;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'SettingsPage' });

  return (
    <PageFrame size="narrow">
      <PageHeader
        eyebrow="MEARROW"
        title={t('title')}
        description={t('subtitle')}
        icon={<Settings size={24} strokeWidth={2.2} />}
      />
      <SettingsClient />
    </PageFrame>
  );
}

import type { Metadata } from 'next';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';
import AuthProvider from '@/components/providers/AuthProvider';
import { SWRProvider } from '@/components/providers/SWRProvider';
import VoteBoardEmbedClient from './VoteBoardEmbedClient';
import { getInitialLeagueData } from '@/lib/server/public-page-data';

const SUPPORTED_LOCALES = ['ko', 'en', 'ja', 'zh', 'es', 'fr', 'de'] as const;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export default async function VoteBoardEmbedPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!SUPPORTED_LOCALES.includes(locale as (typeof SUPPORTED_LOCALES)[number])) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages({ locale });
  const initialData = await getInitialLeagueData();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <SWRProvider>
        <AuthProvider>
          <VoteBoardEmbedClient locale={locale} initialData={initialData} />
        </AuthProvider>
      </SWRProvider>
    </NextIntlClientProvider>
  );
}

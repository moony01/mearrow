import type { Metadata } from 'next';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import AuthProvider from '@/components/providers/AuthProvider';
import { SWRProvider } from '@/components/providers/SWRProvider';
import EmbedVoteClient from './EmbedVoteClient';
import { getInitialLeagueData } from '@/lib/server/public-page-data';
import { DEFAULT_LOCALE } from '@/lib/constants';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function KpopfaceVoteEmbedPage() {
  const locale = DEFAULT_LOCALE;
  setRequestLocale(locale);
  const messages = await getMessages({ locale });
  const initialData = await getInitialLeagueData();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <SWRProvider>
        <AuthProvider>
          <EmbedVoteClient locale={locale} initialData={initialData} />
        </AuthProvider>
      </SWRProvider>
    </NextIntlClientProvider>
  );
}

import type { Metadata } from 'next';
import { getMessages, setRequestLocale } from 'next-intl/server';
import VoteEmbedSurface from '../VoteEmbedSurface';
import { getInitialLeagueData } from '@/lib/server/public-page-data';
import { DEFAULT_LOCALE } from '@/lib/constants';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function VoteBoardEmbedPage() {
  const locale = DEFAULT_LOCALE;
  setRequestLocale(locale);
  const messages = await getMessages({ locale });
  const initialData = await getInitialLeagueData();

  return (
    <VoteEmbedSurface initialLocale={locale} initialMessages={messages} initialData={initialData} />
  );
}

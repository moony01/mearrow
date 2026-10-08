import type { Metadata } from 'next';
import RankingClient from './RankingClient';
import { FULL_URL } from '@/lib/constants';
import { BRAND_NAME } from '@/lib/brand';
import PageFrame, { PageHeader } from '@/components/layout/PageFrame';
import { getInitialLeagueData } from '@/lib/server/public-page-data';

const pageTitle = 'Company Rankings & Fan Vote';
const pageDescription = 'Explore K-pop company rankings and support your favorite artists with fan votes.';

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: `${FULL_URL}/studio/ranking` },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: `${FULL_URL}/studio/ranking`,
    siteName: BRAND_NAME,
    locale: 'en_US',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: pageTitle, description: pageDescription },
};

export default async function RankingPage() {
  const initialData = await getInitialLeagueData();

  return (
    <PageFrame size="wide">
      <PageHeader
        eyebrow={`${BRAND_NAME} STUDIO`}
        title="Company Rankings"
        description="See the live K-pop company rankings and support your favorite artists."
      />
      <RankingClient initialData={initialData} />
    </PageFrame>
  );
}

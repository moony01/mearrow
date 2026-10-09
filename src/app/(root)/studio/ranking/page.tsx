import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import { FULL_URL } from '@/lib/constants';
import StudioArchiveRedirect from '../StudioArchiveRedirect';

export const metadata: Metadata = {
  title: 'Fan Vote',
  robots: { index: false, follow: true },
  alternates: { canonical: `${FULL_URL}/studio` },
};

export default function RankingArchivePage() {
  if (process.env.NODE_ENV === 'development' || process.env.NEXT_RUNTIME_TARGET === 'workers') {
    permanentRedirect('/studio#fan-vote');
  }

  return <StudioArchiveRedirect href="/studio#fan-vote" label="Go to Studio Fan Vote" />;
}

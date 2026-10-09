import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import { FULL_URL } from '@/lib/constants';
import StudioArchiveRedirect from '../StudioArchiveRedirect';

export const metadata: Metadata = {
  title: 'News',
  robots: { index: false, follow: true },
  alternates: { canonical: `${FULL_URL}/studio` },
};

export default function NewsArchivePage() {
  if (process.env.NODE_ENV === 'development' || process.env.NEXT_RUNTIME_TARGET === 'workers') {
    permanentRedirect('/studio#news');
  }

  return <StudioArchiveRedirect href="/studio#news" label="Go to Studio News" />;
}

import type { Metadata } from 'next';
import { permanentRedirect } from 'next/navigation';
import { FULL_URL } from '@/lib/constants';
import StudioArchiveRedirect from '../StudioArchiveRedirect';

export const metadata: Metadata = {
  title: 'Auditions',
  robots: { index: false, follow: true },
  alternates: { canonical: `${FULL_URL}/studio` },
};

export default function AuditionsArchivePage() {
  if (process.env.NODE_ENV === 'development' || process.env.NEXT_RUNTIME_TARGET === 'workers') {
    permanentRedirect('/studio#auditions');
  }

  return <StudioArchiveRedirect href="/studio#auditions" label="Go to Studio Auditions" />;
}

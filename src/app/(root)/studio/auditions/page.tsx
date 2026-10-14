import type { Metadata } from 'next';
import { FULL_URL } from '@/lib/constants';
import AuditionsArchiveContent from './AuditionsArchiveContent';

const canonical = `${FULL_URL}/studio/auditions`;

export const metadata: Metadata = {
  title: { absolute: 'K-pop Auditions | MEARROW Studio' },
  description: 'Browse official-source K-pop audition notices, application status, and eligibility.',
  alternates: { canonical },
  openGraph: {
    title: 'K-pop Auditions | MEARROW Studio',
    description: 'Browse official-source K-pop audition notices, application status, and eligibility.',
    siteName: 'MEARROW',
    url: canonical,
    locale: 'en_US',
    type: 'website',
  },
};

export default function AuditionsArchivePage() {
  return <AuditionsArchiveContent />;
}

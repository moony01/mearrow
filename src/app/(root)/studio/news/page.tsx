import type { Metadata } from 'next';
import { FULL_URL } from '@/lib/constants';
import NewsArchiveContent from './NewsArchiveContent';

const canonical = `${FULL_URL}/studio/news`;

export const metadata: Metadata = {
  title: { absolute: 'K-pop News | MEARROW Studio' },
  description: 'Browse K-pop news and analysis from current updates to long-form features.',
  alternates: { canonical },
  openGraph: {
    title: 'K-pop News | MEARROW Studio',
    description: 'Browse K-pop news and analysis from current updates to long-form features.',
    siteName: 'MEARROW',
    url: canonical,
    locale: 'en_US',
    type: 'website',
  },
};

export default function NewsArchivePage() {
  return <NewsArchiveContent />;
}

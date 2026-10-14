import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import AuditionsArchiveContent from '../../AuditionsArchiveContent';
import { getAllAuditions } from '@/lib/auditions';
import { FULL_URL } from '@/lib/constants';
import { AUDITIONS_ARCHIVE_PAGE_SIZE } from '@/lib/content-archive';

export const dynamicParams = false;

export async function generateStaticParams() {
  const totalPages = Math.ceil(getAllAuditions('en').length / AUDITIONS_ARCHIVE_PAGE_SIZE);
  return Array.from({ length: Math.max(0, totalPages - 1) }, (_, index) => ({
    page: String(index + 2),
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ page: string }>;
}): Promise<Metadata> {
  const { page } = await params;
  return {
    title: `Auditions — Page ${page}`,
    description: `Browse page ${page} of MEARROW Studio's official-source audition notices.`,
    alternates: { canonical: `${FULL_URL}/studio/auditions/page/${page}` },
  };
}

export default async function AuditionsArchivePage({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  const pageNumber = Number(page);
  const totalPages = Math.ceil(getAllAuditions('en').length / AUDITIONS_ARCHIVE_PAGE_SIZE);

  if (!Number.isInteger(pageNumber) || pageNumber < 2 || pageNumber > totalPages) {
    notFound();
  }

  return <AuditionsArchiveContent pageNumber={pageNumber} />;
}

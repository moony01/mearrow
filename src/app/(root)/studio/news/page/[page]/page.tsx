import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import NewsArchiveContent from '../../NewsArchiveContent';
import { getAllNews, NEWS_SOURCE_LOCALE } from '@/lib/news';
import { FULL_URL } from '@/lib/constants';
import { NEWS_ARCHIVE_PAGE_SIZE } from '@/lib/content-archive';

export const dynamicParams = false;

export async function generateStaticParams() {
  const totalPages = Math.ceil(getAllNews(NEWS_SOURCE_LOCALE).length / NEWS_ARCHIVE_PAGE_SIZE);
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
    title: `News — Page ${page}`,
    description: `Browse page ${page} of MEARROW Studio's K-pop news and analysis archive.`,
    alternates: { canonical: `${FULL_URL}/studio/news/page/${page}` },
  };
}

export default async function NewsArchivePage({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { page } = await params;
  const pageNumber = Number(page);
  const totalPages = Math.ceil(getAllNews(NEWS_SOURCE_LOCALE).length / NEWS_ARCHIVE_PAGE_SIZE);

  if (!Number.isInteger(pageNumber) || pageNumber < 2 || pageNumber > totalPages) {
    notFound();
  }

  return <NewsArchiveContent pageNumber={pageNumber} />;
}

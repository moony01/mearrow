import { Metadata } from 'next';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { generatePageMetadata } from '@/lib/seo';
import { SUPPORTED_LOCALES } from '@/lib/constants';
import { BRAND_NAME } from '@/lib/brand';
import {
  ANNOUNCEMENT_SOURCE_LOCALE,
  getAnnouncementAvailableLocales,
  getAnnouncementSeoLocale,
  getPublishedAnnouncementIds,
  getServerAnnouncementById,
} from '@/lib/api/announcements';
import NoticeDetailClient from './NoticeDetailClient';

/**
 * 정적 경로 생성
 * 지원 언어 × 모든 공지사항 ID 조합
 * 빌드 타임에 Supabase에서 공개된 공지사항 ID를 조회
 */
export async function generateStaticParams() {
  const ids = await getPublishedAnnouncementIds();

  return SUPPORTED_LOCALES.flatMap((locale) =>
    ids.map((id) => ({ locale, id })),
  );
}

/** 공지사항 상세 페이지 Props */
interface NoticeDetailPageProps {
  params: Promise<{
    locale: string;
    id: string;
  }>;
}

/** 공지사항 상세 페이지 메타데이터 */
export async function generateMetadata({ params }: NoticeDetailPageProps): Promise<Metadata> {
  const { locale, id } = await params;
  const availableLocales = getAnnouncementAvailableLocales(id);
  const metadataLocale = getAnnouncementSeoLocale(id, locale);
  const t = await getTranslations({ locale: metadataLocale, namespace: 'Notice' });

  return generatePageMetadata({
    locale: metadataLocale,
    pathname: `/notice/${id}`,
    title: `${t('title')} | ${BRAND_NAME}`,
    description: t('subtitle'),
    availableLocales,
    defaultLocale: ANNOUNCEMENT_SOURCE_LOCALE,
  });
}

/**
 * 공지사항 상세 페이지
 * SSG 셸 + CSR 클라이언트 컴포넌트 조합
 * Supabase 데이터는 클라이언트에서 페칭
 */
export default async function NoticeDetailPage({ params }: NoticeDetailPageProps) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const initialNotice = await getServerAnnouncementById(id, locale);

  return <NoticeDetailClient locale={locale} noticeId={id} initialNotice={initialNotice} />;
}

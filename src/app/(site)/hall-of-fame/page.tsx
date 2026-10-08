/**
 * Hall of Fame 페이지 (Server Component)
 *
 * SSG 빌드 시 정적 셸을 생성하고 데이터는 CSR로 로드합니다.
 *
 * @updated Phase 5 - SSG/CSR 마이그레이션
 * 화면에는 기록 확인에 필요한 제목과 설명만 노출합니다.
 */

import { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import HallOfFameClient from './HallOfFameClient';
import { generatePageMetadata } from '@/lib/seo';
import { FULL_URL } from '@/lib/constants';
import { BRAND_NAME } from '@/lib/brand';
import { JsonLd } from '@/components/common/JsonLd';
import AdBanner from '@/components/common/AdBanner';
import { AD_SLOTS } from '@/types/ads';
import PageFrame, { PageHeader } from '@/components/layout/PageFrame';
import { getInitialHallOfFameData } from '@/lib/server/public-page-data';

/**
 * 페이지 메타데이터 생성
 * SEO를 위한 title, description, OG 태그, canonical, hreflang 설정
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = 'ko';
  const t = await getTranslations({ locale, namespace: 'HallOfFame' });
  return generatePageMetadata({
    locale,
    pathname: '/hall-of-fame',
    title: t('meta_title'),
    description: t('meta_description'),
  });
}

/**
 * 명예의 전당 페이지 (정적 셸 + CSR 챔피언 데이터)
 */
export default async function HallOfFamePage() {
  const locale = 'ko';
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'HallOfFame' });
  const initialData = await getInitialHallOfFameData();
  const hallOfFameJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${BRAND_NAME} Hall of Fame`,
    description: t('meta_description'),
    url: `${FULL_URL}/hall-of-fame`,
  };

  return (
    <PageFrame>
      <JsonLd data={hallOfFameJsonLd} />

      <PageHeader
        eyebrow={BRAND_NAME}
        title={t('title')}
        description={t('meta_description')}
      />

      {/* CSR 챔피언 데이터 영역 */}
      <HallOfFameClient initialData={initialData} />

      {/* 명예의 전당 하단 광고 */}
      <AdBanner adSlot={AD_SLOTS.HOF_BOTTOM} adFormat="leaderboard" />

    </PageFrame>
  );
}

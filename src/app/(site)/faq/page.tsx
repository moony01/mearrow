import { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { generatePageMetadata } from '@/lib/seo';
import { JsonLd } from '@/components/common/JsonLd';
import FaqClient from './FaqClient';

/** FAQ 페이지 메타데이터 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = 'ko';
  const t = await getTranslations({ locale, namespace: 'FAQ' });
  return generatePageMetadata({
    locale,
    pathname: '/faq',
    title: t('meta_title'),
    description: t('meta_description'),
  });
}

/**
 * FAQ 페이지 - Google 리치 결과(FAQPage) 지원
 * JSON-LD FAQPage 스키마로 검색 결과에 FAQ 드롭다운 노출
 */
export default async function FaqPage() {
  const locale = 'ko';
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'FAQ' });

  /** FAQ 항목 목록 (서버에서 생성하여 클라이언트로 전달) */
  const faqItems = Array.from({ length: 9 }, (_, i) => ({
    question: t(`q${i + 1}`),
    answer: t(`a${i + 1}`),
  }));

  /**
   * JSON-LD FAQPage 구조화 데이터
   * Google 검색 결과에 FAQ 리치 스니펫으로 노출됨 (SEO에 매우 유리)
   * @see https://developers.google.com/search/docs/appearance/structured-data/faqpage
   */
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <>
      <JsonLd data={faqJsonLd} />
      <FaqClient
        title={t('title')}
        subtitle={t('subtitle')}
        items={faqItems}
      />
    </>
  );
}

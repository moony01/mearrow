import { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { generatePageMetadata } from '@/lib/seo';
import { BRAND_NAME } from '@/lib/brand';
import PageFrame, { PageHeader } from '@/components/layout/PageFrame';
import styles from './terms.module.scss';

/**
 * Terms 페이지 메타데이터
 * SEO를 위한 title, description, canonical, hreflang 설정
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = 'ko';
  const t = await getTranslations({ locale, namespace: 'Legal' });
  return generatePageMetadata({
    locale,
    pathname: '/terms',
    title: `${t('terms_title')} | ${BRAND_NAME}`,
    description: t('terms_description'),
  });
}

/**
 * 이용약관 페이지
 * 법률 검토 후 상세 내용 업데이트 예정
 */
export default async function TermsPage() {
  const locale = 'ko';
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'Legal' });

  return (
    <PageFrame size="narrow" className={styles.legalPage}>
      <div className={styles.container}>
        <PageHeader
          eyebrow={BRAND_NAME}
          title={t('terms_title')}
          description={`${t('last_updated')}: 2026-01-15`}
        />

        <article className={styles.content}>
          {/* 서문 */}
          <section className={styles.section}>
            <h2>{t('terms_section1_title')}</h2>
            <p>{t('terms_section1_content')}</p>
          </section>

          {/* 서비스 이용 */}
          <section className={styles.section}>
            <h2>{t('terms_section2_title')}</h2>
            <p>{t('terms_section2_content')}</p>
            <ul>
              <li>{t('terms_section2_item1')}</li>
              <li>{t('terms_section2_item2')}</li>
              <li>{t('terms_section2_item3')}</li>
            </ul>
          </section>

          {/* 지적재산권 */}
          <section className={styles.section}>
            <h2>{t('terms_section3_title')}</h2>
            <p>{t('terms_section3_content')}</p>
          </section>

          {/* 면책조항 */}
          <section className={styles.section}>
            <h2>{t('terms_section4_title')}</h2>
            <p>{t('terms_section4_content')}</p>
          </section>

          {/* 서비스 변경/종료 */}
          <section className={styles.section}>
            <h2>{t('terms_section5_title')}</h2>
            <p>{t('terms_section5_content')}</p>
          </section>

          {/* 관할권 */}
          <section className={styles.section}>
            <h2>{t('terms_section6_title')}</h2>
            <p>{t('terms_section6_content')}</p>
          </section>

          {/* 연락처 */}
          <section className={styles.section}>
            <h2>{t('contact_title')}</h2>
            <p>{t('contact_content')}</p>
          </section>
        </article>

        {/* 법률 검토 예정 안내 */}
        <div className={styles.legalNotice}>
          <p>{t('legal_review_notice')}</p>
        </div>
      </div>
    </PageFrame>
  );
}

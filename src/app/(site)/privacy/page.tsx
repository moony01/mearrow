import { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { generatePageMetadata } from '@/lib/seo';
import { BRAND_NAME } from '@/lib/brand';
import PageFrame, { PageHeader } from '@/components/layout/PageFrame';
import styles from './privacy.module.scss';

/**
 * Privacy 페이지 메타데이터
 * SEO를 위한 title, description, canonical, hreflang 설정
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = 'ko';
  const t = await getTranslations({ locale, namespace: 'Legal' });
  return generatePageMetadata({
    locale,
    pathname: '/privacy',
    title: `${t('privacy_title')} | ${BRAND_NAME}`,
    description: t('privacy_description'),
  });
}

/**
 * 개인정보처리방침 페이지
 * 법률 검토 후 상세 내용 업데이트 예정
 */
export default async function PrivacyPage() {
  const locale = 'ko';
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'Legal' });

  return (
    <PageFrame size="narrow" className={styles.legalPage}>
      <div className={styles.container}>
        <PageHeader
          eyebrow={BRAND_NAME}
          title={t('privacy_title')}
          description={`${t('last_updated')}: 2026-10-05`}
        />

        <article className={styles.content}>
          {/* 개요 */}
          <section className={styles.section}>
            <h2>{t('privacy_section1_title')}</h2>
            <p>{t('privacy_section1_content')}</p>
          </section>

          {/* 수집하는 정보 */}
          <section className={styles.section}>
            <h2>{t('privacy_section2_title')}</h2>
            <p>{t('privacy_section2_content')}</p>
            <ul>
              <li>{t('privacy_section2_item1')}</li>
              <li>{t('privacy_section2_item2')}</li>
              <li>{t('privacy_section2_item3')}</li>
            </ul>
          </section>

          {/* 정보 사용 목적 */}
          <section className={styles.section}>
            <h2>{t('privacy_section3_title')}</h2>
            <p>{t('privacy_section3_content')}</p>
            <ul>
              <li>{t('privacy_section3_item1')}</li>
              <li>{t('privacy_section3_item2')}</li>
              <li>{t('privacy_section3_item3')}</li>
            </ul>
          </section>

          {/* 쿠키 정책 */}
          <section className={styles.section}>
            <h2>{t('privacy_section4_title')}</h2>
            <p>{t('privacy_section4_content')}</p>
            <ul>
              <li><a href="https://policies.google.com/technologies/partner-sites">{t('privacy_google_data_link')}</a></li>
              <li><a href="https://myadcenter.google.com/">{t('privacy_ads_settings_link')}</a></li>
              <li><a href="https://tools.google.com/dlpage/gaoptout">{t('privacy_analytics_optout_link')}</a></li>
              <li><a href="https://optout.aboutads.info/">{t('privacy_ad_partners_optout_link')}</a></li>
            </ul>
          </section>

          {/* 데이터 보안 */}
          <section className={styles.section}>
            <h2>{t('privacy_section5_title')}</h2>
            <p>{t('privacy_section5_content')}</p>
          </section>

          {/* 제3자 공유 */}
          <section className={styles.section}>
            <h2>{t('privacy_section6_title')}</h2>
            <p>{t('privacy_section6_content')}</p>
          </section>

          {/* 사용자 권리 */}
          <section className={styles.section}>
            <h2>{t('privacy_section7_title')}</h2>
            <p>{t('privacy_section7_content')}</p>
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

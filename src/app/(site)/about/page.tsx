import { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';
import { generatePageMetadata } from '@/lib/seo';
import { CONTACT_EMAIL, FULL_URL } from '@/lib/constants';
import { BRAND_NAME, BRAND_TITLE } from '@/lib/brand';
import { JsonLd } from '@/components/common/JsonLd';
import PageFrame, { PageHeader } from '@/components/layout/PageFrame';
import styles from './page.module.scss';

/** About 페이지 메타데이터 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = 'ko';
  const t = await getTranslations({ locale, namespace: 'About' });

  return generatePageMetadata({
    locale,
    pathname: '/about',
    title: t('meta_title'),
    description: t('meta_description'),
  });
}

/** MEARROW 소개 페이지 - AdSense 검토를 위한 필수 정보 페이지 */
export default async function AboutPage() {
  const locale = 'ko';
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'About' });

  /** JSON-LD 구조화 데이터 - AboutPage 타입으로 Google에 페이지 성격 전달 */
  const aboutJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: `${t('title')} | ${BRAND_NAME}`,
    description: t('meta_description'),
    url: `${FULL_URL}/about`,
    inLanguage: locale,
    isPartOf: {
      '@type': 'WebSite',
      name: BRAND_TITLE,
      url: FULL_URL,
    },
  };

  return (
    <>
      <JsonLd data={aboutJsonLd} />
      <PageFrame size="narrow">
        <PageHeader
          eyebrow={BRAND_NAME}
          title={t('title')}
          description={t('subtitle')}
        />
        <div className={styles.container}>
          {/* 소개 섹션 */}
          <section className={styles.section}>
            <p className={styles.intro}>{t('intro')}</p>
          </section>

          {/* 작동 방식 */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('how_it_works_title')}</h2>
            <ol className={styles.stepList}>
              <li>{t('how_it_works_1')}</li>
              <li>{t('how_it_works_2')}</li>
              <li>{t('how_it_works_3')}</li>
              <li>{t('how_it_works_4')}</li>
            </ol>
          </section>

          {/* 주요 기능 */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('features_title')}</h2>
            <div className={styles.featureGrid}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={styles.featureCard}>
                  <h3 className={styles.featureTitle}>{t(`feature_${i}_title`)}</h3>
                  <p className={styles.featureDesc}>{t(`feature_${i}_desc`)}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 편집 기준 */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('editorial_title')}</h2>
            <p className={styles.text}>{t('editorial_desc')}</p>
            <Link href={`/editorial`} className={styles.editorialLink}>
              {t('editorial_link')}
            </Link>
          </section>

          {/* 팀 소개 */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('team_title')}</h2>
            <p className={styles.text}>{t('team_desc')}</p>
          </section>

          {/* 문의 */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{t('contact_title')}</h2>
            <p className={styles.text}>{t('contact_desc')}</p>
            <a href={`mailto:${CONTACT_EMAIL}`} className={styles.contactEmail}>
              {t('contact_email')}
            </a>
          </section>

          {/* 면책 조항 */}
          <div className={styles.disclaimerNotice}>
            <p>{t('disclaimer')}</p>
          </div>
        </div>
      </PageFrame>
    </>
  );
}

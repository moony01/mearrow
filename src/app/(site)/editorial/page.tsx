import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, ExternalLink } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { JsonLd } from '@/components/common/JsonLd';
import PageFrame, { PageHeader } from '@/components/layout/PageFrame';
import { CONTACT_EMAIL, FULL_URL } from '@/lib/constants';
import { BRAND_NAME, BRAND_TITLE } from '@/lib/brand';
import { generatePageMetadata } from '@/lib/seo';
import styles from './page.module.scss';

export async function generateMetadata(): Promise<Metadata> {
  const locale = 'ko';
  const t = await getTranslations({ locale, namespace: 'Editorial' });

  return generatePageMetadata({
    locale,
    pathname: '/editorial',
    title: t('meta_title'),
    description: t('meta_description'),
  });
}

export default async function EditorialPage() {
  const locale = 'ko';
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'Editorial' });

  const editorialJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: t('title'),
    description: t('meta_description'),
    url: `${FULL_URL}/editorial`,
    inLanguage: locale,
    isPartOf: {
      '@type': 'WebSite',
      name: BRAND_TITLE,
      url: FULL_URL,
    },
  };

  const sections = [
    { title: t('sources_title'), body: t('sources_body') },
    { title: t('analysis_title'), body: t('analysis_body') },
    { title: t('ranking_title'), body: t('ranking_body') },
    { title: t('updates_title'), body: t('updates_body') },
    { title: t('corrections_title'), body: t('corrections_body') },
  ];

  return (
    <>
      <JsonLd data={editorialJsonLd} />
      <PageFrame size="narrow">
        <PageHeader
          eyebrow={BRAND_NAME}
          title={t('title')}
          description={t('subtitle')}
          icon={<BookOpen size={26} />}
        />

        <div className={styles.content}>
          <section className={styles.lead}>
            <p>{t('intro')}</p>
          </section>

          {sections.map((section) => (
            <section className={styles.section} key={section.title}>
              <h2>{section.title}</h2>
              <p>{section.body}</p>
            </section>
          ))}

          <section className={styles.contactSection}>
            <h2>{t('contact_title')}</h2>
            <p>{t('contact_body')}</p>
            <a href={`mailto:${CONTACT_EMAIL}`} className={styles.contactLink}>
              {CONTACT_EMAIL}
              <ExternalLink size={14} aria-hidden="true" />
            </a>
          </section>

          <nav className={styles.linkRow} aria-label={t('explore_label')}>
            <Link href={`/studio#news`}>{t('news_link')}</Link>
            <Link href={`/studio#fan-vote`}>{t('ranking_link')}</Link>
            <Link href={`/about`}>{t('about_link')}</Link>
          </nav>

          <p className={styles.reviewed}>{t('reviewed_on')}</p>
        </div>
      </PageFrame>
    </>
  );
}

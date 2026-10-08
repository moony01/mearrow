import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, ScanFace, ScanLine } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import PageFrame from '@/components/layout/PageFrame';
import { generatePageMetadata } from '@/lib/seo';
import { DEFAULT_LOCALE } from '@/lib/constants';
import styles from './ai.module.scss';

const KPOPFACE_URL = 'https://moony01.com/kpopface/';

export async function generateMetadata(): Promise<Metadata> {
  const locale = DEFAULT_LOCALE;
  const t = await getTranslations({ locale, namespace: 'AIPage' });

  return generatePageMetadata({
    locale,
    pathname: '/ai',
    title: t('meta_title'),
    description: t('meta_description'),
  });
}

export default async function AIPage() {
  const locale = DEFAULT_LOCALE;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'AIPage' });

  return (
    <PageFrame as="div" size="wide" className={styles.aiPage} data-testid="ai-page">
      <section className={styles.landing} aria-labelledby="ai-landing-title">
        <header className={styles.landingHero}>
          <div className={styles.landingMeta}>
            <p>{t('eyebrow')}</p>
            <span>{t('tools_label')}</span>
          </div>
          <h1 id="ai-landing-title" className={styles.landingTitle}>{t('title')}</h1>
          <p className={styles.landingLead}>{t('tools_description')}</p>
          <div className={styles.heroFootnote}>
            <span>02</span>
            <span>{t('subtitle')}</span>
          </div>
        </header>

        <ol className={styles.serviceList} aria-label={t('tools_label')} data-testid="ai-tool-list">
          <li>
            <article className={`${styles.service} ${styles.servicePrimary}`}>
              <div className={styles.serviceCopy}>
                <div className={styles.serviceMeta}>
                  <span>01 / {t('visual_kicker')}</span>
                  <span>Visual Match</span>
                </div>
                <h2 className={styles.serviceTitle}>{t('visual_title')}</h2>
                <p className={styles.serviceDescription}>{t('visual_description')}</p>
                <Link
                  href={`/ai/visual-match`}
                  className={styles.serviceAction}
                  aria-label={t('visual_cta')}
                >
                  <span>{t('visual_meta')}</span>
                  <ArrowUpRight size={22} aria-hidden="true" />
                </Link>
              </div>

              <div className={`${styles.serviceVisual} ${styles.visualMatch}`} aria-hidden="true">
                <span className={styles.visualIcon}>
                  <ScanLine size={42} strokeWidth={1.45} />
                </span>
                <p className={styles.visualReadout}>IMAGE SIGNAL<br />PROFILE CONTEXT<br />20 COMPANY REVIEW</p>
              </div>
            </article>
          </li>

          <li>
            <article className={`${styles.service} ${styles.serviceSecondary}`}>
              <div className={styles.serviceCopy}>
                <div className={styles.serviceMeta}>
                  <span>02 / {t('kpopface_kicker')}</span>
                  <span>Kpopface</span>
                </div>
                <h2 className={styles.serviceTitle}>{t('kpopface_title')}</h2>
                <p className={styles.serviceDescription}>{t('kpopface_description')}</p>
                <a
                  href={KPOPFACE_URL}
                  className={styles.serviceAction}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t('kpopface_cta')}
                >
                  <span>{t('kpopface_meta')}</span>
                  <ArrowUpRight size={22} aria-hidden="true" />
                </a>
              </div>

              <div className={`${styles.serviceVisual} ${styles.kpopface}`} aria-hidden="true">
                <span className={styles.visualIcon}>
                  <ScanFace size={36} strokeWidth={1.45} />
                </span>
                <span className={styles.serviceTag}>
                  <span>Face match</span>
                  <span>Free</span>
                </span>
              </div>
            </article>
          </li>
        </ol>

        <div className={styles.guidance} aria-label={t('notice_label')}>
          <span>{t('notice_label')}</span>
          <p>{t('notice_description')}</p>
        </div>
      </section>
    </PageFrame>
  );
}

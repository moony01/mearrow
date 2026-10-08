'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import styles from './visual-explore.module.scss';

export default function VisualMatchExploreClient() {
  const t = useTranslations('VisualMatchPage');
  const locale = useLocale();
  const router = useRouter();

  return (
    <section className={styles.explorePage} data-testid="visual-match-explore" aria-labelledby="visual-match-explore-title">
      <div className={styles.exploreHeading}>
        <p className={styles.eyebrow}>MEARROW AI / VISUAL MATCH</p>
        <h1 id="visual-match-explore-title">{t('explore_title')}</h1>
        <p className={styles.description}>{t('explore_description')}</p>
      </div>

      <div className={styles.exploreScope}>
        <p>{t('explore_scope_label')}</p>
        <ul>
          <li><span>01</span><strong>{t('explore_metric_companies')}</strong><small>{t('explore_metric_companies_description')}</small></li>
          <li><span>02</span><strong>{t('explore_metric_topfive')}</strong><small>{t('explore_metric_topfive_description')}</small></li>
          <li><span>03</span><strong>{t('explore_metric_auditions')}</strong><small>{t('explore_metric_auditions_description')}</small></li>
        </ul>
      </div>

      <div className={styles.exploreAction}>
        <p>{t('explore_start_note')}</p>
        <button type="button" onClick={() => router.push(`/${locale}/ai/visual-match/survey`)}>
          <span>{t('explore_cta')}</span><ArrowRight size={17} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

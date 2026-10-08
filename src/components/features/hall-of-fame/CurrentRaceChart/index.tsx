/**
 * CurrentRaceChart 컴포넌트
 *
 * 현재 연도 상위 3개사의 우승 횟수를 기록표로 표시합니다.
 */

/* eslint-disable @next/next/no-img-element -- DB 로고 URL은 외부 호스트와 크기가 고정되지 않습니다. */

'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { YearlyWinCount } from '@/types/hall-of-fame';
import { getCompanyLogoBackground, getCompanyLogoUrl } from '@/lib/company-logos';
import styles from './CurrentRaceChart.module.scss';

interface CurrentRaceChartProps {
  /** 연도 */
  year: number;
  /** 경쟁 현황 데이터 */
  data: YearlyWinCount[];
}

export default function CurrentRaceChart({ year, data }: CurrentRaceChartProps) {
  const t = useTranslations('HallOfFame');
  const leaders = data.slice(0, 3);

  return (
    <section className={styles.container}>
      <header className={styles.header}>
        <h2 className={styles.title}>{t('title_race', { year })}</h2>
        <Link href={`/`} className={styles.voteCta}>
          <span>{t('vote_cta')}</span>
          <span aria-hidden="true">→</span>
        </Link>
      </header>

      <ol className={styles.raceList}>
        {leaders.map((item, index) => {
          const logoUrl = getCompanyLogoUrl(item.companyId, item.companyLogoUrl, item.companyName);
          const logoBackground = getCompanyLogoBackground(item.companyId, item.companyName, logoUrl);

          return (
            <li key={item.companyId} className={styles.raceRow}>
              <span className={styles.rankNumber}>{item.rank || index + 1}</span>

              <div className={styles.companyInfo}>
                <div className={styles.companyLogo} style={{ background: logoBackground }}>
                  {logoUrl ? (
                    <img src={logoUrl} alt={item.companyName} className={styles.logoImage} />
                  ) : (
                    <span>{item.companyName.charAt(0)}</span>
                  )}
                </div>
                <strong className={styles.companyName}>{item.companyName}</strong>
              </div>

              <div className={styles.winCount}>
                <strong>{item.winCount}</strong>
                <span>{t('victories')}</span>
              </div>
            </li>
          );
        })}

        {leaders.length === 0 && (
          <li className={styles.empty}>
            <p>{t('race_empty')}</p>
          </li>
        )}
      </ol>
    </section>
  );
}

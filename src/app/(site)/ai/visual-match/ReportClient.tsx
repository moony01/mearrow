'use client';

/* eslint-disable @next/next/no-img-element -- the report image is a short-lived private Storage URL. */

import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  VISUAL_MATCH_ANALYSIS_ID_KEY,
  getVisualMatchReport,
  type VisualMatchReportResponse,
} from '@/lib/visual-match/client';
import styles from './pdf-report.module.scss';

const TOTAL_PAGES = 10;

function PageFooter({ page, children }: { page: number; children: ReactNode }) {
  return <div className={styles.pageFooter}><span>{children}</span><span>{String(page).padStart(2, '0')} / {TOTAL_PAGES}</span></div>;
}

function SectionHeader({ kicker, title, description }: { kicker: string; title: string; description: string }) {
  return <header className={styles.sectionHeader}><div><p className={styles.documentKicker}>{kicker}</p><h2>{title}</h2><p className={styles.sectionDescription}>{description}</p></div></header>;
}

function ReportState({ title, description }: { title: string; description: string }) {
  return (
    <section className={styles.reportDocument} aria-live="polite">
      <article className={`${styles.pdfPage} ${styles.coverPage}`}>
        <div className={styles.coverTop}><div className={styles.brandLockup}><img src="/mearrow-mark.svg" alt="MEARROW" width="30" height="30" /><span>MEARROW</span></div><span className={styles.coverSerial}>VISUAL MATCH / REPORT</span></div>
        <div className={styles.coverMain}><p className={styles.coverEyebrow}>MEARROW AI / PERSONAL REPORT</p><h1>{title}</h1><p className={styles.coverDescription}>{description}</p></div>
      </article>
    </section>
  );
}

export default function ReportClient() {
  const t = useTranslations('VisualMatchPage');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const [report, setReport] = useState<VisualMatchReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previous = { htmlHeight: html.style.height, htmlOverflow: html.style.overflowY, bodyHeight: body.style.height, bodyOverflow: body.style.overflowY };
    html.style.height = 'auto'; html.style.overflowY = 'auto'; body.style.height = 'auto'; body.style.overflowY = 'visible';
    return () => { html.style.height = previous.htmlHeight; html.style.overflowY = previous.htmlOverflow; body.style.height = previous.bodyHeight; body.style.overflowY = previous.bodyOverflow; };
  }, []);

  useEffect(() => {
    let isActive = true;
    const analysisId = searchParams.get('analysis') || window.sessionStorage.getItem(VISUAL_MATCH_ANALYSIS_ID_KEY);
    if (!analysisId) {
      const timer = window.setTimeout(() => {
        if (isActive) setError('표시할 분석 리포트를 찾을 수 없습니다. 분석을 먼저 시작해 주세요.');
      }, 0);
      return () => { isActive = false; window.clearTimeout(timer); };
    }

    void getVisualMatchReport(analysisId)
      .then((nextReport) => {
        if (!isActive) return;
        window.sessionStorage.setItem(VISUAL_MATCH_ANALYSIS_ID_KEY, nextReport.analysisId);
        setReport(nextReport);
      })
      .catch(() => {
        if (isActive) setError('리포트 데이터를 불러오지 못했습니다. 로그인 상태를 확인한 뒤 다시 시도해 주세요.');
      });

    return () => { isActive = false; };
  }, [searchParams]);

  const reportView = useMemo(() => {
    if (!report) return null;
    const summaryByRank = new Map(report.report.match_summaries.map((item) => [item.rank, item.summary]));
    const topByRank = new Map(report.report.top_five.map((item) => [item.rank, item]));
    const auditionByRank = new Map(report.report.audition_guidance.map((item) => [item.rank, item]));
    const koreanReport = report.report.language.toLowerCase().startsWith('ko');
    const matches = report.matches.map((match) => ({
      ...match,
      name: koreanReport ? match.company.name_ko : match.company.name_en,
      score: Number(match.score),
      summary: summaryByRank.get(match.rank) || report.visualSignals.visual_summary,
    }));
    return { matches, topFive: matches.slice(0, 5), topByRank, auditionByRank, koreanReport };
  }, [report]);

  if (error) return <ReportState title="리포트를 불러올 수 없습니다" description={error} />;
  if (!report || !reportView) return <ReportState title="개인 리포트를 불러오는 중입니다" description="저장된 분석 결과와 AI 리포트 내용을 확인하고 있습니다." />;

  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(report.completedAt || report.createdAt));
  const reportLanguage = report.input.report_language;
  const country = t(`country_${report.input.country}` as never);
  const primaryField = t(`field_${report.input.primary_field}` as never);

  return (
    <section className={styles.reportDocument} data-testid="visual-match-pdf-document">
      <article className={`${styles.pdfPage} ${styles.coverPage}`}>
        <div className={styles.coverTop}><div className={styles.brandLockup}><img src="/mearrow-mark.svg" alt="MEARROW" width="30" height="30" /><span>MEARROW</span></div><span className={styles.coverSerial}>VISUAL MATCH / PAID REPORT</span></div>
        <div className={styles.coverMain}><p className={styles.coverEyebrow}>MEARROW AI / PERSONAL REPORT</p><h1>{t('report_title')}</h1><p className={styles.coverDescription}>입력한 이미지와 프로필 정보를 바탕으로 AI가 20개 회사 매칭을 정리했습니다.</p><div className={styles.coverRule} /><dl className={styles.coverFacts}><div><dt>ANALYSIS SCOPE</dt><dd>20개 회사 전체 매칭</dd></div><div><dt>DETAILED READ</dt><dd>Top 5 심층 분석</dd></div><div><dt>REPORT LANGUAGE</dt><dd>{reportLanguage}</dd></div></dl></div>
        <dl className={styles.signalGrid}><div><dt>MEMBER</dt><dd>{profile?.username || 'MEARROW MEMBER'}</dd></div><div><dt>PRIMARY FIELD</dt><dd>{primaryField}</dd></div><div><dt>GENERATED</dt><dd>{date}</dd></div></dl><PageFooter page={1}>MEARROW AI · VISUAL MATCH</PageFooter>
      </article>

      <article className={`${styles.pdfPage} ${styles.profilePage}`}>
        <SectionHeader kicker="02 / INPUT PROFILE" title="분석 프로필" description="아래는 이번 분석 요청에 저장된 입력 정보입니다." />
        <div className={styles.profileLayout}><div className={styles.profileImageFrame}><img src={report.imageUrl} alt={t('image_preview_alt')} /></div><dl className={styles.profileFacts}><div><dt>MEMBER</dt><dd>{profile?.username || 'MEARROW MEMBER'}</dd></div><div><dt>ANALYSIS DATE</dt><dd>{date}</dd></div><div><dt>AGE</dt><dd>{report.input.age}</dd></div><div><dt>HEIGHT</dt><dd>{report.input.height} cm</dd></div><div><dt>COUNTRY</dt><dd>{country}</dd></div><div><dt>PRIMARY FIELD</dt><dd>{primaryField}</dd></div><div><dt>LANGUAGE</dt><dd>{reportLanguage}</dd></div><div><dt>REPORT TYPE</dt><dd>PERSONAL MATCH</dd></div></dl></div>
        <section className={styles.profileNotice}><p className={styles.noticeLabel}>VISUAL SUMMARY</p><p>{report.visualSignals.visual_summary}</p></section><PageFooter page={2}>분석 프로필</PageFooter>
      </article>

      <article className={`${styles.pdfPage} ${styles.rankingPage}`}>
        <SectionHeader kicker="03 / MATCH RANKING" title="20개 회사 매칭 순위" description="이번 요청의 시각 신호·선호 콘셉트·주요 분야를 바탕으로 계산한 상대적 적합도입니다." />
        <div className={styles.rankingSummary}><strong>20</strong><span>FULL COMPANY MATCHES</span></div><div className={styles.rankingTableHeader} aria-hidden="true"><span>#</span><span>COMPANY</span><span>READ</span><span>MATCH</span></div>
        <div className={styles.rankingList} role="list" aria-label="20개 회사 매칭 순위">{reportView.matches.map((item) => <div className={`${styles.rankingRow} ${item.rank <= 5 ? styles.rankingRowTop : ''}`} key={item.rank} role="listitem"><span className={styles.rankingRank}>{String(item.rank).padStart(2, '0')}</span><span className={styles.rankingCompany}><strong>{item.name}</strong><span>{item.summary}</span></span><span className={styles.rankingRead}>{item.rank <= 5 ? 'DETAILED' : 'MATCH'}</span><span className={styles.rankingScore}>{item.score.toFixed(1)}%</span></div>)}</div><PageFooter page={3}>20개 회사 매칭 순위</PageFooter>
      </article>

      <article className={`${styles.pdfPage} ${styles.topFivePage}`}>
        <SectionHeader kicker="04 / TOP 5 OVERVIEW" title="가장 높은 적합도를 보인 5개 회사" description="상위 5개 결과의 점수와 AI가 생성한 추천 이유·준비 방향은 다음 상세 페이지에서 확인할 수 있습니다." />
        <ol className={styles.topFiveList}>{reportView.topFive.map((item) => <li key={item.rank}><span className={styles.topFiveRank}>{String(item.rank).padStart(2, '0')}</span><span className={styles.topFiveName}><strong>{item.name}</strong><small>{item.summary}</small></span><span className={styles.topFiveScore}>{item.score.toFixed(1)}%</span></li>)}</ol><section className={styles.topFiveNote}><p>TOP 5 READ</p><strong>이 결과는 소속·합격을 예측하지 않으며, 현재 입력을 토대로 정리한 개인화된 스타일 참고 자료입니다.</strong></section><PageFooter page={4}>Top 5 개요</PageFooter>
      </article>

      {reportView.topFive.map((item, index) => {
        const detail = reportView.topByRank.get(item.rank);
        return <article className={`${styles.pdfPage} ${styles.detailPage}`} key={item.rank}>
          <SectionHeader kicker={`${String(index + 5).padStart(2, '0')} / TOP ${String(item.rank).padStart(2, '0')} DETAIL`} title={item.name} description={`${item.score.toFixed(1)}% MATCH · ${item.summary}`} />
          <div className={styles.detailHero}><span>TOP {String(item.rank).padStart(2, '0')}</span><strong>{item.score.toFixed(1)}%</strong></div><dl className={styles.detailOutline}><div><dt>추천 이유</dt><dd>{detail?.recommendation_reason}</dd></div><div><dt>준비 방향</dt><dd>{detail?.preparation_direction}</dd></div></dl><section className={styles.focusBlock}><p>THIS REPORT SUGGESTS</p><ul>{detail?.focus.map((focus) => <li key={focus}>{focus}</li>)}</ul></section><PageFooter page={index + 5}>{item.name} 상세 분석</PageFooter>
        </article>;
      })}

      <article className={`${styles.pdfPage} ${styles.auditionPage}`}>
        <SectionHeader kicker="10 / RECOMMENDED AUDITIONS" title="추천 오디션 준비 안내" description="실제 진행 공고와 지원 조건은 변동되므로 지원 전 반드시 각 회사의 공식 홈페이지·공식 SNS·공식 오디션 채널에서 최신 정보를 확인하세요." />
        <div className={styles.auditionPageList}>{reportView.topFive.map((item) => { const guidance = reportView.auditionByRank.get(item.rank); return <section className={styles.auditionPageRow} key={item.rank}><div className={styles.auditionPageRank}><span>TOP {String(item.rank).padStart(2, '0')}</span><strong>{item.name}</strong><small>{item.score.toFixed(1)}% MATCH</small></div><dl className={styles.auditionPageFacts}><div><dt>확인 채널</dt><dd>공식 홈페이지 · 공식 SNS · 공식 오디션 채널</dd></div><div><dt>준비 우선순위</dt><dd>{guidance?.preparation_priority}</dd></div><div><dt>지원 전 체크</dt><dd>{guidance?.checklist}</dd></div></dl></section>; })}</div><section className={styles.auditionNotice}><p>OFFICIAL NOTICE REQUIRED</p><span>이 페이지는 AI가 이번 분석 결과를 기준으로 정리한 준비 안내입니다. 실제 일정·지원 링크·자격은 공식 공고를 기준으로 확인해야 합니다.</span><Link className={styles.auditionLink} href={`/studio/auditions`}>최신 오디션 정보 보기 <span aria-hidden="true">→</span></Link></section><PageFooter page={10}>추천 오디션 준비 안내</PageFooter>
      </article>
    </section>
  );
}

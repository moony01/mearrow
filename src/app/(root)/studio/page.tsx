import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, ExternalLink } from 'lucide-react';
import { getAllAuditions } from '@/lib/auditions';
import { getAllNews, NEWS_SOURCE_LOCALE } from '@/lib/news';
import { FULL_URL } from '@/lib/constants';
import { getInitialLeagueData } from '@/lib/server/public-page-data';
import StudioMainBanner from './StudioMainBanner';
import RankingClient from './ranking/RankingClient';
import NewsGridClient from './news/NewsGridClient';
import AuditionsGridClient from './auditions/AuditionsGridClient';
import newsStyles from './news/page.module.scss';
import styles from './page.module.scss';

const STUDIO_URL = `${FULL_URL}/studio`;

export const metadata: Metadata = {
  title: { absolute: 'MEARROW Studio' },
  description:
    'Explore MEARROW news, auditions, fan voting, AI services, and community in one place.',
  alternates: { canonical: STUDIO_URL },
  openGraph: {
    title: 'MEARROW Studio',
    description:
      'Explore MEARROW news, auditions, fan voting, AI services, and community in one place.',
    siteName: 'MEARROW',
    url: STUDIO_URL,
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MEARROW Studio',
    description: 'MEARROW services in one place.',
  },
};

export default async function StudioPage() {
  const initialLeagueData = await getInitialLeagueData();
  const news = getAllNews(NEWS_SOURCE_LOCALE);
  const auditions = getAllAuditions('en')
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

  return (
    <main className={styles.page}>
      <StudioMainBanner />

      <section className={`${styles.section} ${styles.fanVoteSection}`} id="fan-vote" aria-labelledby="fan-vote-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.sectionEyebrow}>TAKE PART</p>
            <h2 id="fan-vote-title">Fan Vote</h2>
            <p>See how fans are supporting K-pop companies right now.</p>
          </div>
        </div>
        <RankingClient initialData={initialLeagueData} embedded />
      </section>

      <section className={styles.section} id="news" aria-labelledby="news-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.sectionEyebrow}>WHAT&apos;S HAPPENING</p>
            <h2 id="news-title">News</h2>
            <p>Recent stories and analysis from across the K-pop industry.</p>
          </div>
        </div>
        {news.length > 0 ? (
          <div className={newsStyles.grid}>
            <NewsGridClient
              posts={news.map((post) => ({
                slug: post.slug,
                title: post.title,
                excerpt: post.excerpt,
                date: post.date,
                category: post.category,
                thumbnail: post.thumbnail ?? undefined,
                sourceCount: post.sources?.length ?? 0,
              }))}
              locale={NEWS_SOURCE_LOCALE}
              basePath="/studio/news"
            />
          </div>
        ) : (
          <p className={styles.emptyState}>No news is available yet.</p>
        )}
      </section>

      <section className={styles.section} id="auditions" aria-labelledby="auditions-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.sectionEyebrow}>FIND YOUR NEXT OPPORTUNITY</p>
            <h2 id="auditions-title">Auditions</h2>
            <p>Explore audition notices checked against official sources.</p>
          </div>
        </div>
        {auditions.length > 0 ? (
          <AuditionsGridClient
            posts={auditions}
            locale="en"
            basePath="/studio/auditions"
            headingLevel={3}
          />
        ) : (
          <p className={styles.emptyState}>No audition information is available yet.</p>
        )}
      </section>

      <section className={styles.section} id="ai-hub" aria-labelledby="ai-hub-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.sectionEyebrow}>AI SERVICES</p>
            <h2 id="ai-hub-title">AI Hub</h2>
            <p>Explore AI services built for K-pop discovery.</p>
          </div>
        </div>
        <div className={styles.serviceGrid}>
          <Link className={`${styles.serviceCard} ${styles.visualMatch}`} href="/ai/visual-match">
            <span className={styles.serviceNumber}>01</span>
            <h3>Visual Match</h3>
            <p>MEARROW&apos;s AI visual matching service.</p>
            <span className={styles.serviceAction}>Open Visual Match <ArrowUpRight size={14} aria-hidden="true" /></span>
          </Link>
          <a
            className={`${styles.serviceCard} ${styles.kpopface}`}
            href="https://moony01.com/kpopface/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className={styles.serviceNumber}>02</span>
            <span className={styles.kpopfaceMark} aria-hidden="true">
              {/* Use the source logo directly; the custom optimizer variant may not exist in development. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/kpopface-logo.webp" alt="" width={32} height={32} />
            </span>
            <h3>Kpopface</h3>
            <p>Find the K-pop idol you look like.</p>
            <span className={styles.serviceAction}>Open Kpopface <ExternalLink size={14} aria-hidden="true" /></span>
          </a>
        </div>
      </section>

      <section className={`${styles.section} ${styles.snsSection}`} id="sns" aria-labelledby="sns-title">
        <div>
          <p className={styles.sectionEyebrow}>CONNECT</p>
          <h2 id="sns-title">SNS</h2>
          <p>Discover community posts and profiles from people across K-pop.</p>
        </div>
        <Link className={styles.primaryLink} href="/">
          Explore the community <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      </section>
    </main>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import ExportedImage from 'next-image-export-optimizer';
import { ArrowRight, ArrowUpRight, CalendarDays, ExternalLink, Newspaper } from 'lucide-react';
import { getAllAuditions } from '@/lib/auditions';
import { getAllNews } from '@/lib/news';
import { FULL_URL } from '@/lib/constants';
import StudioVoteEmbed from './StudioVoteEmbed';
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

function formatDate(value: string) {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(dateOnly ? `${value}T12:00:00Z` : value);
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: dateOnly ? 'UTC' : undefined,
  }).format(date);
}

export default function StudioPage() {
  const news = getAllNews('en').slice(0, 6);
  const auditions = getAllAuditions('en')
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, 6);

  return (
    <main className={styles.page}>
      <section className={styles.hero} aria-labelledby="studio-title">
        <p className={styles.eyebrow}>MEARROW STUDIO</p>
        <h1 id="studio-title">Everything across MEARROW, in one place.</h1>
        <p>Explore the stories, opportunities, votes, and services shaping the K-pop community.</p>
      </section>

      <section className={styles.section} id="fan-vote" aria-labelledby="fan-vote-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.sectionEyebrow}>TAKE PART</p>
            <h2 id="fan-vote-title">Fan Vote</h2>
            <p>See how fans are supporting K-pop companies right now.</p>
          </div>
          <Link className={styles.textLink} href="/studio/ranking">
            Go to voting <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <StudioVoteEmbed />
      </section>

      <section className={styles.section} id="news" aria-labelledby="news-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.sectionEyebrow}>WHAT&apos;S HAPPENING</p>
            <h2 id="news-title">News</h2>
            <p>Recent stories and analysis from across the K-pop industry.</p>
          </div>
          <Link className={styles.textLink} href="/studio/news">
            All news <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        {news.length > 0 ? (
          <div className={styles.newsGrid}>
            {news.map((post) => (
              <article className={styles.newsCard} key={post.slug}>
                <Link className={styles.newsLink} href={`/studio/news/${post.slug}`}>
                  {post.thumbnail ? (
                    <ExportedImage
                      className={styles.newsImage}
                      src={post.thumbnail}
                      alt=""
                      width={640}
                      height={360}
                      sizes="(max-width: 680px) 100vw, (max-width: 1000px) 50vw, 33vw"
                      unoptimized={
                        process.env.NODE_ENV === 'development' ||
                        process.env.NEXT_PUBLIC_RUNTIME_TARGET === 'workers'
                      }
                    />
                  ) : (
                    <span className={styles.newsImagePlaceholder} aria-hidden="true">
                      <Newspaper size={22} />
                    </span>
                  )}
                  <span className={styles.newsCategory}>{post.category || 'News'}</span>
                  <h3>{post.title}</h3>
                  <p>{post.excerpt}</p>
                  <time dateTime={post.date}>{formatDate(post.date)}</time>
                </Link>
              </article>
            ))}
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
          <Link className={styles.textLink} href="/studio/auditions">
            All auditions <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        {auditions.length > 0 ? (
          <div className={styles.auditionGrid}>
            {auditions.map((audition) => (
              <article className={styles.auditionCard} key={audition.slug}>
                <Link href={`/studio/auditions/${audition.slug}`}>
                  <div className={styles.auditionMeta}>
                    <span className={`${styles.status} ${styles[audition.status]}`}>
                      {audition.status === 'open'
                        ? 'Applications open'
                        : audition.status === 'closing'
                          ? 'Closing soon'
                          : audition.status === 'ongoing'
                            ? 'Ongoing'
                            : 'Closed'}
                    </span>
                    <span><CalendarDays size={14} aria-hidden="true" /> {formatDate(audition.publishedAt)}</span>
                  </div>
                  <p className={styles.agency}>{audition.agency}</p>
                  <h3>{audition.title}</h3>
                  <p className={styles.auditionExcerpt}>{audition.excerpt}</p>
                </Link>
              </article>
            ))}
          </div>
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

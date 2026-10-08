import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, BarChart3, CalendarDays, Newspaper } from 'lucide-react';
import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand';
import { FULL_URL } from '@/lib/constants';
import styles from './page.module.scss';

const STUDIO_URL = `${FULL_URL}/studio`;
const PAGE_TITLE = 'MEARROW — K-pop stories, auditions, and fan league';
const PAGE_DESCRIPTION =
  'Follow K-pop stories, discover audition opportunities, and shape the fan league with MEARROW.';

export const metadata: Metadata = {
  metadataBase: new URL(FULL_URL),
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: STUDIO_URL },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    siteName: BRAND_NAME,
    url: STUDIO_URL,
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
};

const pathways = [
  {
    number: '01',
    eyebrow: 'STORIES',
    title: 'Stay close to what is changing.',
    description:
      'Read K-pop news and the context behind the artists, companies, and moments shaping the scene.',
    href: '/en/news',
    action: 'Explore K-pop stories',
    icon: Newspaper,
    tone: 'stories',
  },
  {
    number: '02',
    eyebrow: 'OPPORTUNITIES',
    title: 'Find a stage to work toward.',
    description:
      'Browse audition opportunities and check the details before you take your next step.',
    href: '/en/auditions',
    action: 'Browse auditions',
    icon: CalendarDays,
    tone: 'opportunities',
  },
  {
    number: '03',
    eyebrow: 'FAN LEAGUE',
    title: 'Make your support count.',
    description:
      'Follow the company rankings and take part in a league shaped by community votes.',
    href: '/en/ranking',
    action: 'See the rankings',
    icon: BarChart3,
    tone: 'league',
  },
] as const;

export default function StudioPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link className={styles.brand} href="/en" aria-label="MEARROW home">
            <span className={styles.brandWordmark} aria-hidden="true" />
          </Link>

          <nav className={styles.navigation} aria-label="Explore MEARROW">
            <Link href="/en/news">Stories</Link>
            <Link href="/en/auditions">Auditions</Link>
            <Link href="/en/ranking">Fan league</Link>
          </nav>

          <Link className={styles.headerCta} href="/en">
            Enter MEARROW <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </header>

      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              <span aria-hidden="true" /> K-POP, IN MOTION
            </p>
            <h1 id="hero-title">
              Find your next <em>move in K-pop.</em>
            </h1>
            <p className={styles.heroDescription}>
              Follow the stories, discover auditions, and support the teams moving the scene
              forward. MEARROW brings your next step into view.
            </p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryButton} href="/en/news">
                Explore the stories <ArrowRight size={17} aria-hidden="true" />
              </Link>
              <Link className={styles.secondaryButton} href="/en/auditions">
                Find an audition <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </div>
            <p className={styles.heroNote}>{BRAND_TAGLINE}</p>
          </div>

          <aside className={styles.signalPanel} aria-label="Three ways to explore MEARROW">
            <div className={styles.signalPanelGlow} aria-hidden="true" />
            <div className={styles.signalPanelHeader}>
              <span className={styles.signalMark} aria-hidden="true">
                <span className={styles.signalMarkImage} />
              </span>
              <span>THE MEARROW SIGNAL</span>
            </div>
            <h2>One scene.<br />Three ways in.</h2>
            <div className={styles.signalLinks}>
              {pathways.map((pathway) => (
                <Link className={styles.signalLink} href={pathway.href} key={pathway.number}>
                  <span className={styles.signalNumber}>{pathway.number}</span>
                  <span className={styles.signalLabel}>{pathway.eyebrow}</span>
                  <ArrowUpRight size={17} aria-hidden="true" />
                </Link>
              ))}
            </div>
            <p className={styles.signalFooter}>CONTENT · OPPORTUNITY · COMMUNITY</p>
          </aside>
        </div>
        <div className={styles.heroEdge} aria-hidden="true">
          <span>FOLLOW</span><i /><span>DISCOVER</span><i /><span>TAKE PART</span>
        </div>
      </section>

      <section className={styles.pathwaysSection} aria-labelledby="pathways-title">
        <div className={styles.sectionIntro}>
          <div>
            <p className={styles.sectionEyebrow}>YOUR WAY INTO THE SCENE</p>
            <h2 id="pathways-title">Start with what moves you.</h2>
          </div>
          <p className={styles.sectionDescription}>
            From the story you follow to the opportunity you pursue, MEARROW gives every kind of
            K-pop fan and talent a place to begin.
          </p>
        </div>

        <div className={styles.pathwayGrid}>
          {pathways.map((pathway) => {
            const Icon = pathway.icon;

            return (
              <Link
                className={`${styles.pathwayCard} ${styles[pathway.tone]}`}
                href={pathway.href}
                key={pathway.number}
              >
                <div className={styles.cardTopline}>
                  <span>{pathway.number} / 03</span>
                  <Icon size={21} strokeWidth={1.8} aria-hidden="true" />
                </div>
                <p className={styles.cardEyebrow}>{pathway.eyebrow}</p>
                <h3>{pathway.title}</h3>
                <p className={styles.cardDescription}>{pathway.description}</p>
                <span className={styles.cardAction}>
                  {pathway.action} <ArrowUpRight size={16} aria-hidden="true" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className={styles.nextStep} aria-labelledby="next-step-title">
        <div className={styles.nextStepInner}>
          <div>
            <p className={styles.nextStepEyebrow}>CONTENT BECOMES OPPORTUNITY</p>
            <h2 id="next-step-title">See what is moving in K-pop.</h2>
          </div>
          <Link className={styles.nextStepButton} href="/en">
            Explore MEARROW <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <Link className={styles.footerBrand} href="/en" aria-label="MEARROW home">
            <span className={styles.footerMark} aria-hidden="true" />
            <span>MEARROW</span>
          </Link>
          <p>{BRAND_TAGLINE}</p>
          <nav className={styles.footerLinks} aria-label="MEARROW links">
            <Link href="/en/news">Stories</Link>
            <Link href="/en/auditions">Auditions</Link>
            <Link href="/en/ranking">Fan league</Link>
          </nav>
          <small>© {new Date().getFullYear()} MEARROW. All rights reserved.</small>
        </div>
      </footer>
    </main>
  );
}

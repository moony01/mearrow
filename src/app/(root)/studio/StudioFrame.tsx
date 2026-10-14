import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import styles from './StudioFrame.module.scss';

export default function StudioFrame({ children }: { children: ReactNode }) {
  return (
    <div className={styles.frame}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link className={styles.brand} href="/studio" aria-label="MEARROW Studio home">
            {/* Use the source SVG directly; this project has a custom optimizer loader. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.brandLogo} src="/mearrow-wordmark.svg" alt="" width="360" height="64" />
          </Link>
          <Link className={styles.communityLink} href="/">
            Explore MEARROW <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </header>

      {children}

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerCopy}>
            <span className={styles.footerBrand}>MEARROW STUDIO</span>
            <span>Content becomes opportunity.</span>
            <span className={styles.footerNotice}>
              Independent, fan-made service. Not affiliated with any entertainment company.
            </span>
          </div>
          <nav className={styles.footerLinks} aria-label="Site information">
            <Link href="/about">About</Link>
            <Link href="/faq">FAQ</Link>
            <Link href="/editorial">Editorial standards</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

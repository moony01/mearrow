import ExportedImage from 'next-image-export-optimizer';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import styles from './KpopfaceTestAdCard.module.scss';

const KPOPFACE_TEST_URL = 'https://moony01.com/kpopface/';

type AdPlacement = 'start' | 'middle';

export default function KpopfaceTestAdCard({ placement }: { placement: AdPlacement }) {
  return (
    <aside
      className={styles.card}
      data-ad-slot="kpopface-test-news"
      data-ad-position={placement}
      aria-label="Advertisement"
    >
      <Link
        href={KPOPFACE_TEST_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.link}
        aria-label="Open the free JYP vs YG vs SM K-pop face match test (opens in a new tab)"
      >
        <div className={styles.imageWrap}>
          <ExportedImage
            src="/images/ads/kpopface-test-news-ad.webp"
            alt=""
            width={768}
            height={512}
            sizes="(max-width: 640px) 100vw, 320px"
            unoptimized={
              process.env.NODE_ENV === 'development' ||
              process.env.NEXT_PUBLIC_RUNTIME_TARGET === 'workers'
            }
            className={styles.image}
          />
        </div>

        <div className={styles.content}>
          <span className={styles.eyebrow}>KPOPFACE</span>
          <span className={styles.title}>JYP vs YG vs SM</span>
          <span className={styles.description}>AI trained on 100K+ idol images</span>
        </div>

        <span className={styles.action}>
          Free test
          <ArrowUpRight size={16} aria-hidden="true" />
        </span>
        <span className={styles.adBadge}>AD</span>
      </Link>
    </aside>
  );
}

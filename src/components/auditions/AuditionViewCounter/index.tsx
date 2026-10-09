'use client';

import { useEffect, useRef, useState } from 'react';
import { Eye } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getAuditionViewCount, incrementAuditionView } from '@/lib/api/audition-views';
import styles from './AuditionViewCounter.module.scss';

interface AuditionViewCounterProps {
  slug: string;
  /** true면 상세 페이지 진입 시 조회수를 1회 증가시킨다. */
  incrementOnMount?: boolean;
  iconSize?: number;
}

export default function AuditionViewCounter({
  slug,
  incrementOnMount = false,
  iconSize = 12,
}: AuditionViewCounterProps) {
  const t = useTranslations('Auditions');
  const [viewCount, setViewCount] = useState(0);
  const incrementRequest = useRef<{ slug: string; promise: Promise<number> } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadViewCount() {
      let count: number;
      if (incrementOnMount) {
        if (incrementRequest.current?.slug !== slug) {
          incrementRequest.current = { slug, promise: incrementAuditionView(slug) };
        }
        count = await incrementRequest.current.promise;
      } else {
        count = await getAuditionViewCount(slug);
      }

      if (!cancelled) setViewCount(count);
    }

    void loadViewCount();

    return () => {
      cancelled = true;
    };
  }, [incrementOnMount, slug]);

  return (
    <span className={styles.viewCounter}>
      <Eye size={iconSize} aria-hidden="true" />
      <span>{t('views', { count: viewCount })}</span>
    </span>
  );
}

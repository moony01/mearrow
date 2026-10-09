'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import styles from './StudioVoteEmbed.module.scss';

const EMBED_SRC = '/embed/vote-board?surface=kpopface&ads=off&lang=en';
const EMBED_MESSAGE_SOURCE = 'kcl-kpopface-embed';
const MIN_EMBED_HEIGHT = 280;
const MAX_EMBED_HEIGHT = 900;
const EMBED_HEIGHT_PADDING = 8;

export default function StudioVoteEmbed() {
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const handleMessage = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin || event.source !== frame.contentWindow) return;
      if (!event.data || typeof event.data !== 'object') return;

      const message = event.data as { source?: unknown; type?: unknown; height?: unknown };
      if (message.source !== EMBED_MESSAGE_SOURCE || message.type !== 'resize') return;

      const height = Number(message.height);
      if (!Number.isFinite(height)) return;

      const boundedHeight = Math.max(
        MIN_EMBED_HEIGHT,
        Math.min(Math.ceil(height) + EMBED_HEIGHT_PADDING, MAX_EMBED_HEIGHT),
      );
      frame.style.height = `${boundedHeight}px`;
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className={styles.embedWrapper} data-testid="studio-fan-vote-embed">
      <iframe
        ref={frameRef}
        className={styles.embedFrame}
        src={EMBED_SRC}
        title="K-pop company fan voting"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        allow="clipboard-write"
      />
      <noscript>
        <Link href="/studio#fan-vote">Open the K-pop company rankings and vote</Link>
      </noscript>
    </div>
  );
}

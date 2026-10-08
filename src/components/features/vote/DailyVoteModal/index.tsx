'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronRight, EyeOff, Flame, X } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';
import styles from './DailyVoteModal.module.scss';

type VoteModalCopy = {
  eyebrow: string;
  title: string;
  subtitle: string;
  closeAriaLabel: string;
  backdropAriaLabel: string;
  todayDismiss: string;
  moreVotes: string;
  iframeTitle: string;
};

const COPY: Record<'ko' | 'en', VoteModalCopy> = {
  ko: {
    eyebrow: 'LIVE · DAILY VOTE',
    title: '실시간 TOP 10 투표',
    subtitle: '지금 순위를 확인하고 오늘의 투표권으로 바로 응원하세요.',
    closeAriaLabel: '투표 모달 닫기',
    backdropAriaLabel: '투표 모달 배경 닫기',
    todayDismiss: '오늘 하루 보지 않기',
    moreVotes: '더 투표하러 가기',
    iframeTitle: '실시간 TOP 10 직접 투표',
  },
  en: {
    eyebrow: 'LIVE · DAILY VOTE',
    title: 'Live TOP 10 vote',
    subtitle: "Check the ranking and use today's votes for your pick.",
    closeAriaLabel: 'Close vote modal',
    backdropAriaLabel: 'Close vote modal backdrop',
    todayDismiss: "Don't show again today",
    moreVotes: 'Vote more',
    iframeTitle: 'Live TOP 10 direct voting',
  },
};

const VISIBLE_ROUTE_SEGMENTS = new Set(['news', 'auditions']);
const SUPPORTED_EMBED_LOCALES = new Set(['ko', 'en', 'ja', 'zh', 'es', 'fr', 'de']);
const DAILY_DISMISS_KEY = 'kcl-daily-vote-modal-dismissed-date';

function getLocalDateKey(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function shouldHideVoteModal(pathname: string) {
  const [, , section] = pathname.split('/');
  // The canonical VoteBoard belongs to the home page. Keep the global modal
  // limited to content-discovery routes where the voting nudge is relevant.
  return !section || !VISIBLE_ROUTE_SEGMENTS.has(section);
}

function readStorage(storage: Storage, key: string) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(storage: Storage, key: string, value: string) {
  try {
    storage.setItem(key, value);
  } catch {
    // Storage can be unavailable in private browsing. Closing still works.
  }
}

export default function DailyVoteModal() {
  const locale = useLocale();
  const pathname = usePathname();
  const copy = locale === 'ko' ? COPY.ko : COPY.en;
  const embedLocale = SUPPORTED_EMBED_LOCALES.has(locale) ? locale : 'en';
  const isHiddenRoute = shouldHideVoteModal(pathname);
  const [isOpen, setIsOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  const dismissForToday = useCallback(() => {
    writeStorage(window.localStorage, DAILY_DISMISS_KEY, getLocalDateKey());
    setIsOpen(false);
  }, []);

  useEffect(() => {
    const restoreFrame = window.requestAnimationFrame(() => {
      if (isHiddenRoute) {
        setIsOpen(false);
        return;
      }

      const dismissedToday =
        readStorage(window.localStorage, DAILY_DISMISS_KEY) === getLocalDateKey();
      setIsOpen(!dismissedToday);
    });

    return () => window.cancelAnimationFrame(restoreFrame);
  }, [isHiddenRoute]);

  useEffect(() => {
    if (!isOpen || isHiddenRoute) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [closeModal, isHiddenRoute, isOpen]);

  if (!isOpen || isHiddenRoute) return null;

  return (
    <div className={styles.layer}>
      <button
        type="button"
        className={styles.backdrop}
        onClick={closeModal}
        aria-label={copy.backdropAriaLabel}
        tabIndex={-1}
      />

      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="daily-vote-modal-title"
        aria-describedby="daily-vote-modal-description"
      >
        <header className={styles.header}>
          <div className={styles.headingCopy}>
            <div className={styles.eyebrow}>
              <span className={styles.liveDot} aria-hidden="true" />
              {copy.eyebrow}
            </div>
            <h2 id="daily-vote-modal-title">{copy.title}</h2>
            <p id="daily-vote-modal-description">{copy.subtitle}</p>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            className={styles.closeButton}
            onClick={closeModal}
            aria-label={copy.closeAriaLabel}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <div className={styles.iframeShell}>
          <iframe
            className={styles.iframe}
            src={`/embed/vote-board/${embedLocale}?surface=kcl-modal&ads=off`}
            title={copy.iframeTitle}
          />
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.todayButton} onClick={dismissForToday}>
            <EyeOff size={17} aria-hidden="true" />
            <span>{copy.todayDismiss}</span>
          </button>
          <Link
            className={styles.moreVotesButton}
            href="/studio/ranking"
            onClick={closeModal}
          >
            <Flame size={18} aria-hidden="true" />
            <span>{copy.moreVotes}</span>
            <ChevronRight size={18} aria-hidden="true" />
          </Link>
        </footer>
      </section>
    </div>
  );
}

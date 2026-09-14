'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import {
  Check,
  CirclePlay,
  Clock3,
  Share2,
} from 'lucide-react';
import type { PublicProfilePostRecord } from '@/lib/api/profile-content';
import {
  getProfilePostSocial,
  type ProfilePostSocialRecord,
} from '@/lib/api/profile-social';
import ProfilePostSocial, {
  type ProfilePostSocialLabels,
} from '@/components/features/profile/ProfilePostSocial';
import { usePublicProfileFeed } from '@/hooks/usePublicProfileFeed';
import styles from './home-feed.module.scss';

function getSafeMediaUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

function formatPostDate(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function getAuthorInitial(name: string): string {
  return Array.from(name.trim())[0]?.toUpperCase() || 'M';
}

function ShareButton({
  postId,
  memberLabel,
  caption,
  shareLabel,
  sharedLabel,
  className,
  showLabel = false,
}: {
  postId: string;
  memberLabel: string;
  caption: string | null;
  shareLabel: string;
  sharedLabel: string;
  className?: string;
  showLabel?: boolean;
}) {
  const [shared, setShared] = useState(false);

  const handleShare = async () => {
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin}${window.location.pathname}#post-${postId}`;

    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({
          title: memberLabel,
          text: caption?.trim() || memberLabel,
          url,
        });
      } else if (typeof navigator.clipboard?.writeText === 'function') {
        await navigator.clipboard.writeText(url);
      } else {
        return;
      }

      setShared(true);
      window.setTimeout(() => setShared(false), 2200);
    } catch (cause) {
      // Closing the native share sheet is an expected user action, not an error.
      if (cause instanceof DOMException && cause.name === 'AbortError') return;
    }
  };

  return (
    <button
      type="button"
      className={className || styles.shareButton}
      onClick={() => void handleShare()}
      aria-label={shared ? sharedLabel : shareLabel}
      title={shared ? sharedLabel : shareLabel}
    >
      {shared ? <Check size={16} aria-hidden="true" /> : <Share2 size={16} aria-hidden="true" />}
      {showLabel && <span>{shared ? sharedLabel : shareLabel}</span>}
    </button>
  );
}

function MediaPreview({
  post,
  imageLabel,
  shortLabel,
  unavailableLabel,
}: {
  post: PublicProfilePostRecord;
  imageLabel: string;
  shortLabel: string;
  unavailableLabel: string;
}) {
  const [hasError, setHasError] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaUrl = getSafeMediaUrl(post.media_url);
  const unavailable = hasError || !mediaUrl;
  const mediaLabel = post.media_type === 'short' ? shortLabel : imageLabel;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || post.media_type !== 'short' || typeof IntersectionObserver === 'undefined') return;
    if (
      typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && entry.intersectionRatio >= 0.65) {
          void video.play().catch(() => undefined);
        } else {
          video.pause();
        }
      },
      { threshold: [0, 0.65, 1] },
    );

    observer.observe(video);
    return () => {
      observer.disconnect();
      video.pause();
    };
  }, [post.id, post.media_type]);

  return (
    <div className={`${styles.mediaFrame} ${post.media_type === 'short' ? styles.shortMediaFrame : ''}`}>
      {unavailable ? (
        <div className={styles.mediaFallback} role="img" aria-label={unavailableLabel}>
          <span>{unavailableLabel}</span>
        </div>
      ) : post.media_type === 'short' ? (
        <video
          ref={videoRef}
          className={styles.media}
          controls
          muted
          loop
          preload="metadata"
          playsInline
          src={mediaUrl}
          aria-label={mediaLabel}
          onError={() => setHasError(true)}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={styles.media}
          src={mediaUrl}
          alt={post.caption?.trim() || imageLabel}
          loading="lazy"
          onError={() => setHasError(true)}
        />
      )}
      {!unavailable && post.media_type === 'short' && (
        <span className={styles.mediaBadge} aria-hidden="true">
          <CirclePlay size={13} />
          {shortLabel}
        </span>
      )}
    </div>
  );
}

function FeedCard({
  post,
  locale,
  initialSocial,
  memberLabel,
  imageLabel,
  shortLabel,
  unavailableLabel,
  untitledLabel,
  shareLabel,
  sharedLabel,
  openProfileLabel,
  socialLabels,
}: {
  post: PublicProfilePostRecord;
  locale: string;
  initialSocial?: ProfilePostSocialRecord;
  memberLabel: string;
  imageLabel: string;
  shortLabel: string;
  unavailableLabel: string;
  untitledLabel: string;
  shareLabel: string;
  sharedLabel: string;
  openProfileLabel: string;
  socialLabels: ProfilePostSocialLabels;
}) {
  const postDate = formatPostDate(post.created_at, locale);
  const authorName = post.author?.username?.trim() || memberLabel;
  const authorAvatarUrl = getSafeMediaUrl(post.author?.avatar_url || '');
  const [avatarError, setAvatarError] = useState(false);

  const authorIdentity = (
    <div className={styles.authorIdentity}>
      <span className={styles.authorAvatar}>
        {authorAvatarUrl && !avatarError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className={styles.authorAvatarImage}
            src={authorAvatarUrl}
            alt={`${authorName} ${openProfileLabel}`}
            loading="lazy"
            onError={() => setAvatarError(true)}
          />
        ) : (
          <span aria-hidden="true">{getAuthorInitial(authorName)}</span>
        )}
      </span>
      <span className={styles.authorCopy}>
        <strong>{authorName}</strong>
      </span>
    </div>
  );

  return (
    <article
      id={`post-${post.id}`}
      className={`${styles.feedCard} ${post.media_type === 'short' ? styles.shortCard : ''}`}
      data-testid="profile-feed-card"
      data-media-type={post.media_type}
    >
      <div className={styles.feedMediaColumn}>
        <MediaPreview
          post={post}
          imageLabel={imageLabel}
          shortLabel={shortLabel}
          unavailableLabel={unavailableLabel}
        />
        <div className={styles.mediaScrim} aria-hidden="true" />
        <header className={styles.postHeader}>
          {post.author?.username?.trim() ? (
            <Link
              className={styles.authorLink}
              href={'/' + locale + '/profile/' + encodeURIComponent(post.author.username.trim())}
              aria-label={authorName + ' ' + openProfileLabel}
            >
              {authorIdentity}
            </Link>
          ) : authorIdentity}
        </header>
        <footer className={styles.captionOverlay}>
          <p className={styles.caption}>{post.caption || untitledLabel}</p>
          <span className={styles.postDate}>
            <Clock3 size={13} aria-hidden="true" />
            <time dateTime={post.created_at}>{postDate}</time>
          </span>
        </footer>
      </div>
      <aside className={styles.feedSocialRail} aria-label={socialLabels.commentPanel}>
        <ProfilePostSocial
          postId={post.id}
          locale={locale}
          initialSocial={initialSocial}
          labels={socialLabels}
          variant="immersive"
        />
        <ShareButton
          postId={post.id}
          memberLabel={authorName}
          caption={post.caption}
          shareLabel={shareLabel}
          sharedLabel={sharedLabel}
          className={styles.railShareButton}
        />
      </aside>
    </article>
  );
}

export default function HomeFeedClient() {
  const locale = useLocale();
  const t = useTranslations('Home');
  const { posts, isLoading, hasMore, error, loadMore, reload } = usePublicProfileFeed();
  const [socialByPostId, setSocialByPostId] = useState<Record<string, ProfilePostSocialRecord>>({});
  const requestedSocialIdsRef = useRef(new Set<string>());
  const feedShellRef = useRef<HTMLElement | null>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const requestedSocialIds = requestedSocialIdsRef.current;
    const pendingIds = posts
      .map((post) => post.id)
      .filter((postId) => !requestedSocialIds.has(postId));
    if (pendingIds.length === 0) return;

    pendingIds.forEach((postId) => requestedSocialIds.add(postId));
    let active = true;
    let settled = false;

    void getProfilePostSocial(pendingIds)
      .then((records) => {
        settled = true;
        if (!active) return;
        setSocialByPostId((current) => ({
          ...current,
          ...Object.fromEntries(records.map((record) => [record.post_id, record])),
        }));
      })
      .catch(() => {
        settled = true;
        pendingIds.forEach((postId) => requestedSocialIds.delete(postId));
      });

    return () => {
      active = false;
      if (!settled) pendingIds.forEach((postId) => requestedSocialIds.delete(postId));
    };
  }, [posts]);

  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel || !hasMore || isLoading || error || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      { root: feedShellRef.current, rootMargin: '0px 0px 480px', threshold: 0.01 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [error, hasMore, isLoading, loadMore]);

  const socialLabels: ProfilePostSocialLabels = {
    like: t('feed_like'),
    liked: t('feed_liked'),
    comments: t('feed_comments'),
    commentPanel: t('feed_comment_panel'),
    commentPlaceholder: t('feed_comment_placeholder'),
    commentSubmit: t('feed_comment_submit'),
    commentSubmitting: t('feed_comment_submitting'),
    commentDelete: t('feed_comment_delete'),
    commentEmpty: t('feed_comment_empty'),
    commentLoading: t('feed_comment_loading'),
    commentError: t('feed_comment_error'),
    commentSubmitError: t('feed_comment_submit_error'),
    commentDeleteError: t('feed_comment_delete_error'),
    loginRequired: t('feed_login_required'),
    signupRequired: t('feed_signup_required'),
    retry: t('feed_retry'),
  };

  return (
    <section
      ref={feedShellRef}
      className={styles.feedShell}
      aria-labelledby="home-feed-title"
      data-testid="home-profile-feed"
      tabIndex={0}
    >
      <div className={styles.feedLayout}>
        <div className={styles.feedMain}>
          <h1 id="home-feed-title" className={styles.visuallyHidden}>{t('feed_title')}</h1>

          {isLoading && posts.length === 0 && (
            <div className={styles.feedState} aria-busy="true" aria-live="polite">
              <span className={styles.spinner} aria-hidden="true" />
              <p>{t('feed_loading')}</p>
            </div>
          )}

          {error && posts.length === 0 && (
            <div className={styles.feedState} role="alert">
              <p>{t('feed_error')}</p>
              <button type="button" className={styles.retryButton} onClick={() => void reload()}>
                {t('feed_retry')}
              </button>
            </div>
          )}

          {!isLoading && !error && posts.length === 0 && (
            <div className={styles.feedState} data-testid="profile-feed-empty">
              <p>{t('feed_empty')}</p>
            </div>
          )}

          {posts.length > 0 && (
            <>
              <div className={styles.feedGrid}>
                {posts.map((post) => (
                  <FeedCard
                    key={post.id}
                    post={post}
                    locale={locale}
                    initialSocial={socialByPostId[post.id]}
                    memberLabel={t('feed_member')}
                    imageLabel={t('feed_image')}
                    shortLabel={t('feed_short')}
                    unavailableLabel={t('feed_media_unavailable')}
                    untitledLabel={t('feed_untitled')}
                    shareLabel={t('feed_share')}
                    sharedLabel={t('feed_shared')}
                    openProfileLabel={t('feed_open_profile')}
                    socialLabels={socialLabels}
                  />
                ))}
              </div>
              {error && (
                <div className={styles.inlineError} role="status">
                  <span>{t('feed_more_error')}</span>
                  <button type="button" onClick={() => void loadMore()}>{t('feed_retry')}</button>
                </div>
              )}
              {hasMore && !error && (
                <>
                  <div ref={loadMoreSentinelRef} className={styles.feedSentinel} aria-hidden="true" />
                  {isLoading && (
                    <p className={styles.feedLoadingMore} aria-live="polite">
                      <span className={styles.spinner} aria-hidden="true" />
                      {t('feed_loading')}
                    </p>
                  )}
                </>
              )}
              {hasMore && !error && (
                <button
                  type="button"
                  className={styles.loadMoreButton}
                  onClick={() => void loadMore()}
                  disabled={isLoading}
                >
                  {isLoading ? t('feed_loading') : t('feed_load_more')}
                </button>
              )}
              {!hasMore && <p className={styles.feedEnd}>{t('feed_end')}</p>}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

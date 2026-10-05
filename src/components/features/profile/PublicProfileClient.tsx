'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, CalendarDays, CirclePlay, Image as ImageIcon } from 'lucide-react';
import {
  getProfilePostSocial,
  type ProfilePostSocialRecord,
} from '@/lib/api/profile-social';
import {
  getPublicProfileByUsername,
  listPublicProfileActivities,
  listPublicProfilePosts,
  type PublicProfile,
  type PublicProfileActivity,
  type PublicProfilePost,
  type PublicProfileSnapshot,
} from '@/lib/api/public-profile';
import ProfilePostSocial, {
  type ProfilePostSocialLabels,
} from './ProfilePostSocial';
import PageFrame from '@/components/layout/PageFrame';
import { PUBLIC_PROFILE_STATIC_SHELL_USERNAME } from '@/lib/constants';
import styles from './PublicProfileClient.module.scss';

interface PublicProfileClientProps {
  locale: string;
  username: string;
  initialData?: PublicProfileSnapshot | null;
}

function safeMediaUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

function formatDate(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    // Keep the first server render and the browser render on the same date.
    timeZone: 'UTC',
  }).format(date);
}

function getInitial(username: string): string {
  return Array.from(username.trim())[0]?.toUpperCase() || 'M';
}

function getUsernameFromPathname(pathname: string | null): string | null {
  if (!pathname) return null;

  const marker = '/profile/';
  const markerIndex = pathname.indexOf(marker);
  if (markerIndex < 0) return null;

  const encodedUsername = pathname.slice(markerIndex + marker.length).split('/')[0];
  if (!encodedUsername) return null;

  try {
    return decodeURIComponent(encodedUsername);
  } catch {
    return encodedUsername;
  }
}

function ProfilePostMedia({
  post,
  imageLabel,
  shortLabel,
}: {
  post: PublicProfilePost;
  imageLabel: string;
  shortLabel: string;
}) {
  const mediaUrl = safeMediaUrl(post.media_url);

  if (!mediaUrl) {
    return <div className={styles.mediaFallback}>{imageLabel}</div>;
  }

  if (post.media_type === 'short') {
    return (
      <video
        className={styles.media}
        src={mediaUrl}
        controls
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={shortLabel}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={styles.media}
      src={mediaUrl}
      alt={post.caption || imageLabel}
      loading="lazy"
    />
  );
}

export default function PublicProfileClient({
  locale,
  username,
  initialData = null,
}: PublicProfileClientProps) {
  const t = useTranslations('PublicProfile');
  const homeT = useTranslations('Home');
  const pathname = usePathname();
  const resolvedUsername = username === PUBLIC_PROFILE_STATIC_SHELL_USERNAME
    ? getUsernameFromPathname(pathname) || username
    : username;
  const [profile, setProfile] = useState<PublicProfile | null>(initialData?.profile ?? null);
  const [posts, setPosts] = useState<PublicProfilePost[]>(initialData?.posts ?? []);
  const [activities, setActivities] = useState<PublicProfileActivity[]>(initialData?.activities ?? []);
  const [socialByPostId, setSocialByPostId] = useState<Record<string, ProfilePostSocialRecord>>({});
  const [isLoading, setIsLoading] = useState(initialData === null);
  const [hasError, setHasError] = useState(false);

  const loadProfile = useCallback(async (isActive: () => boolean = () => true) => {
    setIsLoading(true);
    setHasError(false);

    try {
      const nextProfile = await getPublicProfileByUsername(resolvedUsername);
      if (!isActive()) return;
      if (!nextProfile) {
        setProfile(null);
        setPosts([]);
        setActivities([]);
        setSocialByPostId({});
        return;
      }

      const [nextPosts, nextActivities] = await Promise.all([
        listPublicProfilePosts(nextProfile.id),
        listPublicProfileActivities(nextProfile.id),
      ]);
      if (!isActive()) return;
      let nextSocial: ProfilePostSocialRecord[] = [];
      try {
        nextSocial = await getProfilePostSocial(nextPosts.map((post) => post.id));
      } catch {
        // The profile itself stays readable if the optional social aggregate
        // is unavailable before the migration is applied.
      }
      if (!isActive()) return;

      setProfile(nextProfile);
      setPosts(nextPosts);
      setActivities(nextActivities);
      setSocialByPostId(Object.fromEntries(
        nextSocial.map((record) => [record.post_id, record]),
      ));
    } catch {
      if (isActive()) setHasError(true);
    } finally {
      if (isActive()) setIsLoading(false);
    }
  }, [resolvedUsername]);

  useEffect(() => {
    let active = true;
    void loadProfile(() => active);

    return () => {
      active = false;
    };
  }, [loadProfile]);

  const socialLabels: ProfilePostSocialLabels = {
    like: homeT('feed_like'),
    liked: homeT('feed_liked'),
    comments: homeT('feed_comments'),
    commentPanel: homeT('feed_comment_panel'),
    commentPlaceholder: homeT('feed_comment_placeholder'),
    commentSubmit: homeT('feed_comment_submit'),
    commentSubmitting: homeT('feed_comment_submitting'),
    commentDelete: homeT('feed_comment_delete'),
    commentEmpty: homeT('feed_comment_empty'),
    commentLoading: homeT('feed_comment_loading'),
    commentError: homeT('feed_comment_error'),
    commentSubmitError: homeT('feed_comment_submit_error'),
    commentDeleteError: homeT('feed_comment_delete_error'),
    loginRequired: homeT('feed_login_required'),
    signupRequired: homeT('feed_signup_required'),
    retry: t('retry'),
  };

  if (isLoading && !profile) {
    return (
      <PageFrame size="wide" className={styles.container}>
        <header className={styles.profileHeader}>
          <div className={styles.profileCopy}>
            <p className={styles.eyebrow}>{t('public')}</p>
            <h1>{resolvedUsername === PUBLIC_PROFILE_STATIC_SHELL_USERNAME ? t('public') : resolvedUsername}</h1>
            <p className={styles.bio}>{t('intro')}</p>
          </div>
        </header>
        <Link className={styles.backLink} href={'/' + locale}>
          <ArrowLeft size={16} aria-hidden="true" />{t('back')}
        </Link>
        <div className={styles.state} aria-busy="true">
          <span className={styles.spinner} aria-hidden="true" />
          <p>{t('loading')}</p>
        </div>
      </PageFrame>
    );
  }

  if (hasError && !profile) {
    return (
      <PageFrame size="wide" className={styles.container}>
        <div className={styles.state} role="alert">
          <p>{t('error')}</p>
          <button type="button" className={styles.retryButton} onClick={() => void loadProfile()}>
            {t('retry')}
          </button>
        </div>
      </PageFrame>
    );
  }

  if (!profile) {
    return (
      <PageFrame size="wide" className={styles.container}>
        <div className={styles.state}>
          <p>{t('not_found')}</p>
          <Link className={styles.backLink} href={'/' + locale}>
            <ArrowLeft size={16} aria-hidden="true" />
            {t('back')}
          </Link>
        </div>
      </PageFrame>
    );
  }

  const avatarUrl = safeMediaUrl(profile.avatar_url || '');

  return (
    <PageFrame size="wide" className={styles.container}>
      <Link className={styles.backLink} href={'/' + locale}>
        <ArrowLeft size={16} aria-hidden="true" />
        {t('back')}
      </Link>

      <header className={styles.profileHeader}>
        <div className={styles.avatar} aria-hidden={avatarUrl ? 'true' : undefined}>
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" />
          ) : (
            getInitial(profile.username)
          )}
        </div>
        <div className={styles.profileCopy}>
          <p className={styles.eyebrow}>{t('public')}</p>
          <h1>{profile.username}</h1>
          {profile.bio && <p className={styles.bio}>{profile.bio}</p>}
          <p className={styles.bio}>{t('intro')}</p>
        </div>
      </header>

      <nav className={styles.profileTabs} aria-label={t('public')}>
        <a href="#public-profile-posts">{t('posts')}</a>
        <a href="#public-profile-activities">{t('activities')}</a>
      </nav>

      <section className={styles.section} aria-labelledby="public-profile-posts">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>IN MOTION</p>
            <h2 id="public-profile-posts">{t('posts')}</h2>
          </div>
          <span className={styles.sectionCount}>{posts.length}</span>
        </div>

        {posts.length === 0 ? (
          <p className={styles.empty}>{t('no_posts')}</p>
        ) : (
          <div className={styles.postGrid}>
            {posts.map((post) => (
              <article className={styles.postCard} key={post.id}>
                <div className={styles.postMedia}>
                  <ProfilePostMedia
                    post={post}
                    imageLabel={t('image')}
                    shortLabel={t('short')}
                  />
                  <span className={styles.mediaBadge}>
                    {post.media_type === 'short' ? (
                      <CirclePlay size={13} aria-hidden="true" />
                    ) : (
                      <ImageIcon size={13} aria-hidden="true" />
                    )}
                    {post.media_type === 'short' ? t('short') : t('image')}
                  </span>
                </div>
                <div className={styles.postBody}>
                  <p className={styles.postCaption}>{post.caption || t('image')}</p>
                  <time className={styles.postDate} dateTime={post.created_at}>
                    <CalendarDays size={14} aria-hidden="true" />
                    {formatDate(post.created_at, locale)}
                  </time>
                  <ProfilePostSocial
                    postId={post.id}
                    locale={locale}
                    initialSocial={socialByPostId[post.id]}
                    labels={socialLabels}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section} aria-labelledby="public-profile-activities">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>BACKGROUND</p>
            <h2 id="public-profile-activities">{t('activities')}</h2>
          </div>
          <span className={styles.sectionCount}>{activities.length}</span>
        </div>
        {activities.length === 0 ? (
          <p className={styles.empty}>{t('no_activities')}</p>
        ) : (
          <div className={styles.activityList}>
            {activities.map((activity) => (
              <article className={styles.activityItem} key={activity.id}>
                <div className={styles.activityDate}>
                  <strong>{formatDate(activity.start_date, locale)}</strong>
                  <span>{activity.end_date ? formatDate(activity.end_date, locale) : '—'}</span>
                </div>
                <div>
                  <h3>{activity.title}</h3>
                  {activity.organization && <p>{activity.organization}</p>}
                  {activity.description && <span>{activity.description}</span>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </PageFrame>
  );
}

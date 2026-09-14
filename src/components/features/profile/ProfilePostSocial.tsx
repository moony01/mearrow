'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Heart, Loader2, MessageCircle, Send, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  DEVELOPMENT_TEST_USER_ID,
  isDevelopmentTestModeEnabled,
} from '@/lib/auth/development-test-mode';
import {
  createProfilePostComment,
  deleteProfilePostComment,
  listProfilePostComments,
  toggleProfilePostLike,
  type ProfilePostCommentRecord,
  type ProfilePostSocialRecord,
} from '@/lib/api/profile-social';
import styles from './ProfilePostSocial.module.scss';

export interface ProfilePostSocialLabels {
  like: string;
  liked: string;
  comments: string;
  commentPanel: string;
  commentPlaceholder: string;
  commentSubmit: string;
  commentSubmitting: string;
  commentDelete: string;
  commentEmpty: string;
  commentLoading: string;
  commentError: string;
  commentSubmitError: string;
  commentDeleteError: string;
  loginRequired: string;
  signupRequired: string;
  retry: string;
}

interface ProfilePostSocialProps {
  postId: string;
  locale: string;
  labels: ProfilePostSocialLabels;
  initialSocial?: ProfilePostSocialRecord;
  inline?: boolean;
  variant?: 'default' | 'immersive';
}

function isRealMember(
  user: ReturnType<typeof useAuth>['user'],
  isAuthenticated: boolean,
): boolean {
  if (!isAuthenticated || !user?.id || isDevelopmentTestModeEnabled()) return false;
  if (user.id === DEVELOPMENT_TEST_USER_ID) return false;

  const providers = user.app_metadata?.providers;
  return user.app_metadata?.provider !== 'developer'
    && !(Array.isArray(providers) && providers.includes('developer'));
}

function formatCommentDate(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function getCommentAuthorName(comment: ProfilePostCommentRecord, fallback: string): string {
  return comment.author?.username?.trim() || fallback;
}

export default function ProfilePostSocial({
  postId,
  locale,
  labels,
  initialSocial,
  inline = false,
  variant = 'default',
}: ProfilePostSocialProps) {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const signupPath = `/${locale}/signup`;
  const canMutate = useMemo(
    () => isRealMember(user, isAuthenticated),
    [isAuthenticated, user],
  );
  const initialLikesCount = initialSocial?.likes_count ?? 0;
  const initialCommentsCount = initialSocial?.comments_count ?? 0;
  const initialLikedByViewer = initialSocial?.liked_by_viewer === true;
  const [social, setSocial] = useState<ProfilePostSocialRecord>(() => ({
    likes_count: initialLikesCount,
    comments_count: initialCommentsCount,
    liked_by_viewer: initialLikedByViewer,
    post_id: postId,
  }));
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<ProfilePostCommentRecord[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState(false);
  const [likePending, setLikePending] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentSubmitError, setCommentSubmitError] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [commentDeleteError, setCommentDeleteError] = useState(false);
  const [interactionError, setInteractionError] = useState(false);

  useEffect(() => {
    setSocial({
      likes_count: initialLikesCount,
      comments_count: initialCommentsCount,
      liked_by_viewer: initialLikedByViewer,
      post_id: postId,
    });
  }, [
    initialCommentsCount,
    initialLikedByViewer,
    initialLikesCount,
    postId,
  ]);

  const loadComments = async () => {
    setCommentsLoading(true);
    setCommentsError(false);
    try {
      setComments(await listProfilePostComments(postId));
      setCommentsLoaded(true);
    } catch {
      setCommentsError(true);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleCommentsToggle = () => {
    setInteractionError(false);
    const nextOpen = !commentsOpen;
    setCommentsOpen(nextOpen);
    if (nextOpen && !commentsLoaded && !commentsLoading) {
      void loadComments();
    }
  };

  const handleLike = async () => {
    if (likePending) return;
    if (!canMutate) {
      router.push(signupPath);
      return;
    }

    const previous = social;
    const nextLiked = !previous.liked_by_viewer;
    setInteractionError(false);
    setSocial({
      ...previous,
      liked_by_viewer: nextLiked,
      likes_count: Math.max(0, previous.likes_count + (nextLiked ? 1 : -1)),
    });
    setLikePending(true);

    try {
      const result = await toggleProfilePostLike(postId, nextLiked);
      setSocial((current) => ({
        ...current,
        liked_by_viewer: result.liked,
        likes_count: result.likes_count,
      }));
    } catch {
      setSocial(previous);
      setInteractionError(true);
    } finally {
      setLikePending(false);
    }
  };

  const handleSubmitComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (commentSubmitting) return;
    if (!canMutate) {
      router.push(signupPath);
      return;
    }

    const content = commentDraft.trim();
    if (!content) return;
    setCommentSubmitError(false);
    setInteractionError(false);
    setCommentSubmitting(true);

    try {
      const comment = await createProfilePostComment(postId, content);
      setComments((current) => [comment, ...current]);
      setCommentsLoaded(true);
      setCommentDraft('');
      setSocial((current) => ({
        ...current,
        comments_count: current.comments_count + 1,
      }));
    } catch {
      setCommentSubmitError(true);
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user?.id || deletingCommentId) return;
    setCommentDeleteError(false);
    setDeletingCommentId(commentId);

    try {
      const deleted = await deleteProfilePostComment(commentId);
      if (!deleted) throw new Error('Comment was not deleted');
      setComments((current) => current.filter((comment) => comment.id !== commentId));
      setSocial((current) => ({
        ...current,
        comments_count: Math.max(0, current.comments_count - 1),
      }));
    } catch {
      setCommentDeleteError(true);
    } finally {
      setDeletingCommentId(null);
    }
  };

  return (
    <div
      className={[
        styles.root,
        inline ? styles.inlineRoot : '',
        variant === 'immersive' ? styles.immersiveRoot : '',
      ].filter(Boolean).join(' ')}
      data-testid="profile-post-social"
    >
      <div className={styles.actions} aria-label={labels.commentPanel}>
        <button
          type="button"
          className={[
            styles.actionButton,
            social.liked_by_viewer ? styles.actionButtonActive : '',
          ].filter(Boolean).join(' ')}
          onClick={() => void handleLike()}
          disabled={likePending}
          aria-pressed={social.liked_by_viewer}
          aria-label={
            (!canMutate ? labels.signupRequired + ' ' : '')
            + (social.liked_by_viewer ? labels.liked : labels.like)
            + ' (' + social.likes_count + ')'
          }
          title={!canMutate ? labels.signupRequired : labels.like}
        >
          {likePending ? (
            <Loader2 size={16} className={styles.spin} aria-hidden="true" />
          ) : (
            <Heart
              size={16}
              fill={social.liked_by_viewer ? 'currentColor' : 'none'}
              aria-hidden="true"
            />
          )}
          <span>{social.likes_count}</span>
        </button>
        <button
          type="button"
          className={styles.actionButton}
          onClick={handleCommentsToggle}
          aria-expanded={commentsOpen}
          aria-controls={'profile-post-comments-' + postId}
          aria-label={labels.comments + ' (' + social.comments_count + ')'}
          title={labels.comments}
        >
          <MessageCircle size={16} aria-hidden="true" />
          <span>{social.comments_count}</span>
        </button>
      </div>

      {interactionError && (
        <p className={styles.inlineStatus} role="status" aria-live="polite">
          {labels.loginRequired}
        </p>
      )}

      {commentsOpen && (
        <section
          id={'profile-post-comments-' + postId}
          className={styles.commentPanel}
          aria-label={labels.commentPanel}
        >
          {commentsLoading && (
            <p className={styles.panelState} aria-busy="true">
              <Loader2 size={16} className={styles.spin} aria-hidden="true" />
              {labels.commentLoading}
            </p>
          )}
          {commentsError && !commentsLoading && (
            <div className={styles.panelState} role="alert">
              <span>{labels.commentError}</span>
              <button type="button" onClick={() => void loadComments()}>
                {labels.retry}
              </button>
            </div>
          )}
          {commentsLoaded && !commentsLoading && !commentsError && comments.length === 0 && (
            <p className={styles.panelState}>{labels.commentEmpty}</p>
          )}
          {comments.length > 0 && (
            <div className={styles.commentList}>
              {comments.map((comment) => (
                <article className={styles.commentItem} key={comment.id}>
                  <div className={styles.commentMeta}>
                    <strong>{getCommentAuthorName(comment, labels.loginRequired)}</strong>
                    <time dateTime={comment.created_at}>
                      {formatCommentDate(comment.created_at, locale)}
                    </time>
                    {user?.id === comment.user_id && canMutate && (
                      <button
                        type="button"
                        className={styles.deleteButton}
                        onClick={() => void handleDeleteComment(comment.id)}
                        disabled={deletingCommentId === comment.id}
                        aria-label={labels.commentDelete}
                        title={labels.commentDelete}
                      >
                        {deletingCommentId === comment.id ? (
                          <Loader2 size={13} className={styles.spin} aria-hidden="true" />
                        ) : (
                          <Trash2 size={13} aria-hidden="true" />
                        )}
                      </button>
                    )}
                  </div>
                  <p>{comment.content}</p>
                </article>
              ))}
            </div>
          )}

          {commentDeleteError && (
            <p className={styles.formError} role="alert">{labels.commentDeleteError}</p>
          )}
          <form className={styles.commentForm} onSubmit={(event) => void handleSubmitComment(event)}>
            <textarea
              value={commentDraft}
              onChange={(event) => setCommentDraft(event.target.value)}
              placeholder={labels.commentPlaceholder}
              aria-label={labels.commentPlaceholder}
              maxLength={200}
              rows={2}
              disabled={!canMutate || commentSubmitting}
            />
            {!canMutate ? (
              <Link
                href={signupPath}
                className={styles.submitButton}
                aria-label={labels.signupRequired}
                title={labels.signupRequired}
              >
                {labels.signupRequired}
              </Link>
            ) : (
              <button
                type="submit"
                className={styles.submitButton}
                disabled={commentSubmitting || !commentDraft.trim()}
                title={labels.commentSubmit}
              >
                {commentSubmitting ? (
                  <Loader2 size={15} className={styles.spin} aria-hidden="true" />
                ) : (
                  <Send size={15} aria-hidden="true" />
                )}
                {commentSubmitting ? labels.commentSubmitting : labels.commentSubmit}
              </button>
            )}
          </form>
          {commentSubmitError && (
            <p className={styles.formError} role="alert">{labels.commentSubmitError}</p>
          )}
        </section>
      )}
    </div>
  );
}

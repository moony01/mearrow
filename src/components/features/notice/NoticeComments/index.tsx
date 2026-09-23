'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { MessageCircle, Trash2, Send, Loader2, User } from 'lucide-react';
import {
  getNoticeComments,
  createNoticeComment,
  deleteNoticeComment,
  supportsNoticeComments,
  type NoticeComment,
} from '@/lib/api/notice-comments';
import { useAuth } from '@/hooks/useAuth';
import styles from './NoticeComments.module.scss';

interface NoticeCommentsProps {
  /** 공지사항 UUID */
  announcementId: string;
}

/** 스팸 방지: 최소 작성 간격 (ms) */
const MIN_SUBMIT_INTERVAL = 5000;

/**
 * 공지사항 댓글 컴포넌트
 * 댓글 목록 + 작성 폼 + 삭제 기능
 * NewsComments 컴포넌트 패턴 복제 (slug → announcementId)
 */
export default function NoticeComments({ announcementId }: NoticeCommentsProps) {
  if (!supportsNoticeComments(announcementId)) return null;

  return <NoticeCommentsContent announcementId={announcementId} />;
}

function NoticeCommentsContent({ announcementId }: NoticeCommentsProps) {
  const t = useTranslations('NoticeComments');
  const { profile } = useAuth();

  const isAuthenticated = !!profile?.username;
  const autoPassword = profile?.id ? `kcl_auth_${profile.id}` : '';

  const [comments, setComments] = useState<NoticeComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lastSubmitTime, setLastSubmitTime] = useState(0);

  // 댓글 작성 폼
  const [authorName, setAuthorName] = useState('');
  const [password, setPassword] = useState('');
  const [content, setContent] = useState('');
  const [formError, setFormError] = useState('');

  // 삭제 모달
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  /** 댓글 목록 조회 */
  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getNoticeComments(announcementId);
      setComments(data);
    } catch {
      // 조회 실패 무시
    } finally {
      setLoading(false);
    }
  }, [announcementId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  /** 댓글 작성 */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const effectiveName = isAuthenticated ? profile!.username : authorName.trim();
    const effectivePassword = isAuthenticated ? autoPassword : password.trim();

    // 입력값 검증
    if (!isAuthenticated) {
      if (!authorName.trim()) {
        setFormError(t('error_name_required'));
        return;
      }
      if (!password.trim()) {
        setFormError(t('error_password_required'));
        return;
      }
      if (password.trim().length < 4) {
        setFormError(t('error_password_min'));
        return;
      }
    }
    if (!content.trim()) {
      setFormError(t('error_content_required'));
      return;
    }
    if (content.trim().length < 2) {
      setFormError(t('error_content_min'));
      return;
    }

    // 스팸 방지: 최소 간격 체크
    const now = Date.now();
    if (now - lastSubmitTime < MIN_SUBMIT_INTERVAL) {
      setFormError(t('error_too_fast'));
      return;
    }

    try {
      setSubmitting(true);
      const newComment = await createNoticeComment({
        announcement_id: announcementId,
        author_name: effectiveName,
        password: effectivePassword,
        content: content.trim(),
      });

      if (newComment) {
        // 목록 상단에 추가
        setComments((prev) => [newComment, ...prev]);
        // 폼 초기화
        if (!isAuthenticated) {
          setAuthorName('');
          setPassword('');
        }
        setContent('');
        setLastSubmitTime(now);
      } else {
        setFormError(t('error_submit_failed'));
      }
    } catch {
      setFormError(t('error_submit_failed'));
    } finally {
      setSubmitting(false);
    }
  };

  /** 삭제 모달 열기 */
  const openDeleteModal = (commentId: string) => {
    setDeleteTarget(commentId);
    setDeletePassword('');
    setDeleteError('');
  };

  /** 삭제 실행 */
  const handleDelete = async () => {
    const effectiveDeletePassword = isAuthenticated ? autoPassword : deletePassword.trim();
    if (!deleteTarget || !effectiveDeletePassword) return;

    try {
      setDeleting(true);
      setDeleteError('');
      const success = await deleteNoticeComment({
        id: deleteTarget,
        password: effectiveDeletePassword,
      });

      if (success) {
        setComments((prev) => prev.filter((c) => c.id !== deleteTarget));
        setDeleteTarget(null);
      } else {
        setDeleteError(t('error_wrong_password'));
      }
    } catch {
      setDeleteError(t('error_delete_failed'));
    } finally {
      setDeleting(false);
    }
  };

  /** 날짜 포맷팅 */
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-CA');
  };

  return (
    <div className={styles.commentsSection}>
      {/* 섹션 헤더 */}
      <div className={styles.sectionHeader}>
        <MessageCircle size={20} />
        <h3>{t('title')}</h3>
        <span className={styles.commentCount}>{comments.length}</span>
      </div>

      {/* 댓글 작성 폼 */}
      <form className={styles.commentForm} onSubmit={handleSubmit}>
        {isAuthenticated ? (
          <div className={styles.authenticatedRow}>
            <User size={14} />
            <span className={styles.authenticatedName}>{profile?.username}</span>
          </div>
        ) : (
          <div className={styles.formRow}>
            <input
              type="text"
              className={styles.inputField}
              placeholder={t('placeholder_name')}
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              maxLength={30}
            />
            <input
              type="password"
              className={styles.inputField}
              placeholder={t('placeholder_password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={20}
            />
          </div>
        )}
        <div className={styles.formRow}>
          <textarea
            className={styles.textareaField}
            placeholder={t('placeholder_content')}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={500}
            rows={3}
          />
        </div>
        {formError && <p className={styles.errorText}>{formError}</p>}
        <div className={styles.formActions}>
          <span className={styles.charCount}>{content.length}/500</span>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 size={16} className={styles.spinner} />
            ) : (
              <Send size={14} />
            )}
            <span>{t('submit')}</span>
          </button>
        </div>
      </form>

      {/* 댓글 목록 */}
      {loading ? (
        <div className={styles.loadingState}>
          <p>{t('loading')}</p>
        </div>
      ) : comments.length === 0 ? (
        <div className={styles.emptyState}>
          <p>{t('no_comments')}</p>
        </div>
      ) : (
        <div className={styles.commentList}>
          {comments.map((comment) => (
            <div key={comment.id} className={styles.commentItem}>
              <div className={styles.commentHeader}>
                <span className={styles.authorName}>{comment.author_name}</span>
                <span className={styles.commentDate}>{formatDate(comment.created_at)}</span>
                <button
                  className={styles.deleteButton}
                  onClick={() => openDeleteModal(comment.id)}
                  title={t('delete')}
                >
                  <Trash2 size={13} />
                </button>
              </div>
              <p className={styles.commentContent}>{comment.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteTarget && (
        <div className={styles.modalOverlay} onClick={() => setDeleteTarget(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h4>{t('delete_title')}</h4>
            <p>{t('delete_message')}</p>
            {!isAuthenticated && (
              <input
                type="password"
                className={styles.inputField}
                placeholder={t('placeholder_password')}
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                autoFocus
              />
            )}
            {deleteError && <p className={styles.errorText}>{deleteError}</p>}
            <div className={styles.modalActions}>
              <button
                className={styles.cancelButton}
                onClick={() => setDeleteTarget(null)}
              >
                {t('cancel')}
              </button>
              <button
                className={styles.confirmDeleteButton}
                onClick={handleDelete}
                disabled={deleting || (!isAuthenticated && !deletePassword.trim())}
              >
                {deleting ? t('deleting') : t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { isDevelopmentTestModeEnabled } from '@/lib/auth/development-test-mode';
import {
  VISUAL_MATCH_ANALYSIS_ID_KEY,
  VISUAL_MATCH_CHECKOUT_IDEMPOTENCY_KEY,
  VISUAL_MATCH_ORDER_ID_KEY,
  VISUAL_MATCH_PAYMENT_COMPLETE_KEY,
  VISUAL_MATCH_PENDING_REQUEST_KEY,
  getVisualMatchPaymentStatus,
  type VisualMatchAnalysisRequest,
  uploadVisualMatchImage,
  requestVisualMatchAnalysis,
  type PendingVisualMatchRequest,
} from '@/lib/visual-match/client';
import { getVisualMatchImage, removeVisualMatchImage } from '@/lib/visual-match/image-storage';
import styles from './analysis.module.scss';

function errorCode(error: unknown) {
  return error instanceof Error ? error.message : '';
}

export default function AnalyzingClient() {
  const t = useTranslations('VisualMatchPage');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [status, setStatus] = useState('결제 완료 내용을 확인하고 분석을 준비하고 있습니다.');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const analyze = async () => {
      try {
        if (isLoading) return;
        const isLocalTestMode = isDevelopmentTestModeEnabled();
        if (isLocalTestMode && window.sessionStorage.getItem(VISUAL_MATCH_PAYMENT_COMPLETE_KEY) !== 'true') {
          router.replace(`/${locale}/ai/visual-match/payment`);
          return;
        }
        if (!isLocalTestMode && (!isAuthenticated || !user)) {
          throw new Error('ANALYSIS_AUTH_REQUIRED');
        }

        const orderId = searchParams.get('order_id') || window.sessionStorage.getItem(VISUAL_MATCH_ORDER_ID_KEY);
        if (!isLocalTestMode && !orderId) {
          router.replace(`/${locale}/ai/visual-match/payment`);
          return;
        }

        if (!isLocalTestMode && orderId) {
          let paymentConfirmed = false;
          for (let attempt = 0; attempt < 45; attempt += 1) {
            if (!isActive) return;
            setStatus(attempt === 0 ? '결제 승인 내용을 확인하고 있습니다.' : '결제 승인 내용을 기다리고 있습니다.');
            const payment = await getVisualMatchPaymentStatus(orderId);
            if (payment.status === 'paid') {
              paymentConfirmed = true;
              break;
            }
            if (payment.status === 'failed' || payment.status === 'refunded' || payment.status === 'canceled') {
              throw new Error('PAYMENT_NOT_CONFIRMED');
            }
            await new Promise((resolve) => window.setTimeout(resolve, 2000));
          }
          if (!paymentConfirmed) throw new Error('PAYMENT_CONFIRMATION_TIMEOUT');
          window.sessionStorage.setItem(VISUAL_MATCH_ORDER_ID_KEY, orderId);
        }

        const stored = window.sessionStorage.getItem(VISUAL_MATCH_PENDING_REQUEST_KEY);
        if (!stored) throw new Error('ANALYSIS_REQUEST_NOT_FOUND');
        const request = JSON.parse(stored) as Partial<PendingVisualMatchRequest>;
        if (!request.imageStorageKey) throw new Error('ANALYSIS_REQUEST_STALE');

        const image = await getVisualMatchImage(request.imageStorageKey);
        if (!image) throw new Error('ANALYSIS_IMAGE_NOT_FOUND');

        let imageObjectKey = `development-inputs/${request.imageStorageKey}`;
        if (isLocalTestMode) {
          setStatus('결제 확인 후 분석 자료를 준비하고 있습니다.');
        } else {
          if (!user) throw new Error('ANALYSIS_AUTH_REQUIRED');
          setStatus('이미지를 안전하게 업로드하고 있습니다.');
          const uploaded = await uploadVisualMatchImage(user.id, image, request.imageMimeType);
          imageObjectKey = uploaded.objectKey;
        }

        setStatus('AI가 이미지의 스타일 신호와 회사 프로필을 비교하고 있습니다.');
        const analysisRequest: VisualMatchAnalysisRequest = {
          ...request,
          orderId: orderId || 'development-order',
          imageObjectKey,
        } as VisualMatchAnalysisRequest;
        const { analysisId } = await requestVisualMatchAnalysis(analysisRequest);
        if (!isActive) return;

        window.sessionStorage.setItem(VISUAL_MATCH_ANALYSIS_ID_KEY, analysisId);
        window.sessionStorage.removeItem(VISUAL_MATCH_PENDING_REQUEST_KEY);
        window.sessionStorage.removeItem(VISUAL_MATCH_CHECKOUT_IDEMPOTENCY_KEY);
        window.sessionStorage.removeItem(VISUAL_MATCH_ORDER_ID_KEY);
        window.sessionStorage.removeItem(VISUAL_MATCH_PAYMENT_COMPLETE_KEY);
        try {
          await removeVisualMatchImage(request.imageStorageKey);
        } catch (cleanupError) {
          console.warn('[Visual Match] temporary image cleanup failed', cleanupError);
        }
        setStatus('개인 리포트를 구성하고 있습니다.');
        router.replace(`/${locale}/ai/visual-match/report?analysis=${encodeURIComponent(analysisId)}`);
      } catch (error) {
        if (!isActive) return;
        const code = errorCode(error);
        console.error('[Visual Match] analysis start failed', error);

        if (code === 'ANALYSIS_REQUEST_NOT_FOUND' || code === 'ANALYSIS_REQUEST_STALE' || code === 'ANALYSIS_IMAGE_NOT_FOUND') {
          window.sessionStorage.removeItem(VISUAL_MATCH_PENDING_REQUEST_KEY);
          window.sessionStorage.removeItem(VISUAL_MATCH_CHECKOUT_IDEMPOTENCY_KEY);
          window.sessionStorage.removeItem(VISUAL_MATCH_ORDER_ID_KEY);
          window.sessionStorage.removeItem(VISUAL_MATCH_PAYMENT_COMPLETE_KEY);
          setError('결제 전에 준비한 이미지가 만료되었습니다. 입력 화면에서 이미지를 다시 선택해 주세요.');
          return;
        }

        if (code === 'PAYMENT_NOT_CONFIRMED' || code === 'PAYMENT_CONFIRMATION_TIMEOUT') {
          setError('결제 승인을 확인하지 못했습니다. 결제 상태를 확인한 뒤 다시 시도해 주세요.');
          return;
        }

        if (code === 'ANALYSIS_AUTH_REQUIRED') {
          setError('로그인 세션이 만료되었습니다. 다시 로그인한 뒤 분석을 시작해 주세요.');
          return;
        }

        setError('분석을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      }
    };

    void analyze();
    return () => { isActive = false; };
  }, [isAuthenticated, isLoading, locale, router, searchParams, user]);

  return (
    <section className={styles.analysisPage} data-testid="visual-match-analyzing" aria-live="polite">
      <section className={styles.analysisShell} aria-labelledby="visual-match-analysis-title">
        <p className={styles.analysisLabel}>{t('analysis_label')}</p>
        <div className={styles.analysisVisual} aria-hidden="true">
          <span className={styles.analysisOrbit} />
          <span className={styles.analysisCore} />
        </div>
        <h1 id="visual-match-analysis-title">{error ? '분석을 시작할 수 없습니다' : t('analysis_title')}</h1>
        <p className={styles.analysisDescription}>{error || t('analysis_description')}</p>
        {error ? (
          <button className={styles.analysisRetry} type="button" onClick={() => router.replace(`/${locale}/ai/visual-match`)}>
            입력 화면으로 돌아가기
          </button>
        ) : <p className={styles.analysisStatus}>{status}</p>}
      </section>
    </section>
  );
}

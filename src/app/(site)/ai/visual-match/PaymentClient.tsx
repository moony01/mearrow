'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, LoaderCircle, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { isDevelopmentTestModeEnabled } from '@/lib/auth/development-test-mode';
import {
  createVisualMatchCheckout,
  VISUAL_MATCH_CHECKOUT_IDEMPOTENCY_KEY,
  VISUAL_MATCH_ORDER_ID_KEY,
  VISUAL_MATCH_PAYMENT_COMPLETE_KEY,
  VISUAL_MATCH_PENDING_REQUEST_KEY,
  isValidPendingVisualMatchRequest,
  type PendingVisualMatchRequest,
} from '@/lib/visual-match/client';
import styles from './payment.module.scss';

const INCLUDED_FEATURES = [
  '20개 회사 전체 매칭 순위와 점수',
  'Top 5 추천 이유와 준비 방향',
  '추천 회사별 오디션 준비 안내',
  '프로필에 영구 보관되는 개인 리포트',
] as const;

export default function PaymentClient() {
  const locale = useLocale();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = async () => {
    const pendingRequest = window.sessionStorage.getItem(VISUAL_MATCH_PENDING_REQUEST_KEY);
    if (!pendingRequest) {
      setError('입력한 분석 정보를 찾을 수 없습니다. 입력 화면부터 다시 진행해 주세요.');
      return;
    }

    if (isLoading) return;
    if (!isAuthenticated) {
      const returnTo = encodeURIComponent(`/ai/visual-match/payment`);
      router.push(`/login?returnTo=${returnTo}`);
      return;
    }

    setError(null);
    setIsRedirecting(true);

    if (isDevelopmentTestModeEnabled()) {
      window.sessionStorage.setItem(VISUAL_MATCH_PAYMENT_COMPLETE_KEY, 'true');
      router.push(`/ai/visual-match/analyzing`);
      return;
    }

    let request: PendingVisualMatchRequest;
    try {
      const parsedRequest: unknown = JSON.parse(pendingRequest);
      if (!isValidPendingVisualMatchRequest(parsedRequest)) throw new Error('PENDING_REQUEST_INVALID');
      request = parsedRequest;
    } catch {
      window.sessionStorage.removeItem(VISUAL_MATCH_PENDING_REQUEST_KEY);
      window.sessionStorage.removeItem(VISUAL_MATCH_CHECKOUT_IDEMPOTENCY_KEY);
      setIsRedirecting(false);
      setError('입력 정보가 만료되었거나 올바르지 않습니다. 입력 화면부터 다시 진행해 주세요.');
      return;
    }

    const storedIdempotencyKey = window.sessionStorage.getItem(VISUAL_MATCH_CHECKOUT_IDEMPOTENCY_KEY);
    const idempotencyKey = storedIdempotencyKey || crypto.randomUUID();
    window.sessionStorage.setItem(VISUAL_MATCH_CHECKOUT_IDEMPOTENCY_KEY, idempotencyKey);

    try {
      const checkout = await createVisualMatchCheckout(request, locale, idempotencyKey, window.location.origin);
      window.sessionStorage.setItem(VISUAL_MATCH_ORDER_ID_KEY, checkout.orderId);

      if (checkout.status === 'paid') {
        router.push(`/ai/visual-match/analyzing?order_id=${encodeURIComponent(checkout.orderId)}`);
        return;
      }
      if (checkout.provider !== 'toss' || !checkout.providerOrderId || !Number.isInteger(checkout.amount)) {
        throw new Error('PAYMENT_ORDER_INVALID');
      }
      router.push(`/ai/visual-match/payment/checkout?order_id=${encodeURIComponent(checkout.orderId)}`);
    } catch (checkoutError) {
      console.error('[Visual Match] checkout start failed', checkoutError);
      setIsRedirecting(false);
      setError('결제 페이지를 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }
  };

  return (
    <section className={styles.paymentPage} data-testid="visual-match-payment" aria-labelledby="visual-match-payment-title">
      <div className={styles.paymentCard}>
        <div className={styles.heading}>
          <span className={styles.icon} aria-hidden="true"><Sparkles size={20} /></span>
          <p>MEARROW AI / VISUAL MATCH</p>
          <h1 id="visual-match-payment-title">입력을 바탕으로<br />개인 리포트를 만들어요</h1>
          <span>결제 완료 후 AI 분석을 시작하고, 분석이 끝나면 리포트를 바로 보여드립니다.</span>
        </div>

        <ul className={styles.featureList}>
          {INCLUDED_FEATURES.map((feature) => <li key={feature}><Check size={16} aria-hidden="true" /><span>{feature}</span></li>)}
        </ul>

        <div className={styles.priceBlock}><span>분석·개인 리포트 1건</span><strong>1,900원</strong><small>결제 후 분석이 시작됩니다.</small></div>

        <button className={styles.checkoutButton} type="button" onClick={() => void startCheckout()} disabled={isRedirecting || isLoading}>
          {isRedirecting ? <LoaderCircle className={styles.spinner} size={18} aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}
          <span>{isLoading ? '로그인 상태 확인 중…' : isRedirecting ? '결제 페이지로 이동 중…' : '결제하고 분석 시작하기'}</span>
        </button>

        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        {isDevelopmentTestModeEnabled() ? <p className={styles.testNotice}>개발자 테스트 로그인에서는 결제 화면 없이 분석 흐름을 확인합니다.</p> : null}
        <p className={styles.notice}>리포트는 스타일·콘셉트 적합도를 정리하는 참고 자료이며, 오디션 합격이나 소속을 예측하지 않습니다.</p>
      </div>
    </section>
  );
}

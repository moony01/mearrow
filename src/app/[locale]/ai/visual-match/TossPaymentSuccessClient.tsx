'use client';

import { CheckCircle2, LoaderCircle } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  VISUAL_MATCH_ORDER_ID_KEY,
  confirmVisualMatchTossPayment,
} from '@/lib/visual-match/client';
import styles from './payment.module.scss';

export default function TossPaymentSuccessClient() {
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const confirm = async () => {
      if (isLoading) return;
      const orderId = searchParams.get('order_id');
      const providerOrderId = searchParams.get('orderId');
      const paymentKey = searchParams.get('paymentKey');
      const amountValue = searchParams.get('amount');
      const amount = amountValue ? Number(amountValue) : NaN;
      if (!isAuthenticated || !orderId || !providerOrderId || !paymentKey || !Number.isInteger(amount)) {
        setError('결제 정보를 확인하지 못했습니다. 결제 페이지에서 다시 시도해 주세요.');
        return;
      }

      try {
        await confirmVisualMatchTossPayment({ orderId, providerOrderId, paymentKey, amount });
        if (!active) return;
        window.sessionStorage.setItem(VISUAL_MATCH_ORDER_ID_KEY, orderId);
        router.replace(`/${locale}/ai/visual-match/analyzing?order_id=${encodeURIComponent(orderId)}`);
      } catch (confirmError) {
        console.error('[Visual Match] Toss payment confirmation failed', confirmError);
        if (active) setError('결제 승인을 확인하지 못했습니다. 잠시 후 결제 상태를 다시 확인해 주세요.');
      }
    };
    void confirm();
    return () => { active = false; };
  }, [isAuthenticated, isLoading, locale, router, searchParams]);

  return (
    <section className={styles.paymentPage} data-testid="visual-match-toss-success" aria-live="polite">
      <div className={styles.paymentCard}>
        <div className={styles.heading}>
          <span className={styles.icon} aria-hidden="true"><CheckCircle2 size={20} /></span>
          <p>MEARROW AI / PAYMENT</p>
          <h1>결제 승인을<br />확인하고 있어요</h1>
          <span>확인이 끝나면 분석을 자동으로 시작합니다.</span>
        </div>
        {error ? (
          <>
            <p className={styles.error} role="alert">{error}</p>
            <button className={styles.checkoutButton} type="button" onClick={() => router.replace(`/${locale}/ai/visual-match/payment`)}>결제 페이지로 돌아가기</button>
          </>
        ) : <LoaderCircle className={styles.centerSpinner} size={30} aria-label="결제 승인 확인 중" />}
      </div>
    </section>
  );
}

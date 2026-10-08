'use client';

import { loadTossPayments, type TossPaymentsWidgets } from '@tosspayments/tosspayments-sdk';
import { ArrowLeft, CreditCard, LoaderCircle } from 'lucide-react';
import { useLocale } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  getVisualMatchPaymentStatus,
} from '@/lib/visual-match/client';
import styles from './payment.module.scss';

const ORDER_NAME = 'MEARROW Visual Match 개인 리포트';

function formatKrw(amount: number) {
  return new Intl.NumberFormat('ko-KR').format(amount);
}

export default function TossCheckoutClient() {
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading, user } = useAuth();
  const widgetsRef = useRef<TossPaymentsWidgets | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [amount, setAmount] = useState<number | null>(null);
  const [providerOrderId, setProviderOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const orderId = searchParams.get('order_id');

  useEffect(() => {
    let active = true;

    const setup = async () => {
      if (isLoading) return;
      if (!isAuthenticated || !user || !orderId) {
        router.replace(`/ai/visual-match/payment`);
        return;
      }

      try {
        const payment = await getVisualMatchPaymentStatus(orderId);
        if (!active) return;
        if (payment.status === 'paid') {
          router.replace(`/ai/visual-match/analyzing?order_id=${encodeURIComponent(orderId)}`);
          return;
        }
        if (payment.provider !== 'toss' || !payment.providerOrderId || !payment.clientKey || payment.currency !== 'krw' || !Number.isInteger(payment.amount)) {
          throw new Error('PAYMENT_ORDER_INVALID');
        }

        const tossPayments = await loadTossPayments(payment.clientKey);
        const widgets = tossPayments.widgets({ customerKey: user.id });
        await widgets.setAmount({ currency: 'KRW', value: payment.amount });
        await Promise.all([
          widgets.renderPaymentMethods({ selector: '#visual-match-toss-payment-methods', variantKey: 'DEFAULT' }),
          widgets.renderAgreement({ selector: '#visual-match-toss-agreement', variantKey: 'AGREEMENT' }),
        ]);
        if (!active) return;

        widgetsRef.current = widgets;
        setAmount(payment.amount);
        setProviderOrderId(payment.providerOrderId);
        setIsReady(true);
      } catch (setupError) {
        console.error('[Visual Match] Toss widget setup failed', setupError);
        if (active) setError('결제수단을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
      }
    };

    void setup();
    return () => { active = false; };
  }, [isAuthenticated, isLoading, locale, orderId, router, user]);

  const requestPayment = async () => {
    if (!widgetsRef.current || !orderId || !providerOrderId || amount === null) return;
    setError(null);
    setIsPaying(true);
    try {
      await widgetsRef.current.requestPayment({
        orderId: providerOrderId,
        orderName: ORDER_NAME,
        successUrl: `${window.location.origin}/ai/visual-match/payment/success?order_id=${encodeURIComponent(orderId)}`,
        failUrl: `${window.location.origin}/ai/visual-match/payment/fail?order_id=${encodeURIComponent(orderId)}`,
        customerEmail: user?.email,
      });
    } catch (paymentError) {
      console.error('[Visual Match] Toss payment request failed', paymentError);
      setIsPaying(false);
      setError('결제 요청을 시작하지 못했습니다. 결제수단과 약관 동의를 확인해 주세요.');
    }
  };

  return (
    <section className={styles.paymentPage} data-testid="visual-match-toss-checkout" aria-labelledby="visual-match-toss-checkout-title">
      <div className={`${styles.paymentCard} ${styles.tossCheckoutCard}`}>
        <button className={styles.backButton} type="button" onClick={() => router.push(`/ai/visual-match/payment`)}>
          <ArrowLeft size={16} aria-hidden="true" /> 이전으로
        </button>
        <div className={styles.heading}>
          <span className={styles.icon} aria-hidden="true"><CreditCard size={20} /></span>
          <p>MEARROW AI / PAYMENT</p>
          <h1 id="visual-match-toss-checkout-title">결제수단을<br />선택해 주세요</h1>
          <span>결제 승인이 확인되면 바로 개인 분석을 시작합니다.</span>
        </div>

        <div className={styles.tossPrice}>{amount === null ? '결제 정보를 준비 중입니다.' : `총 ${formatKrw(amount)}원`}</div>
        <div id="visual-match-toss-payment-methods" className={styles.tossWidget} />
        <div id="visual-match-toss-agreement" className={styles.tossAgreement} />

        <button className={styles.checkoutButton} type="button" onClick={() => void requestPayment()} disabled={!isReady || isPaying}>
          {isPaying || !isReady ? <LoaderCircle className={styles.spinner} size={18} aria-hidden="true" /> : <CreditCard size={18} aria-hidden="true" />}
          <span>{isPaying ? '결제창으로 이동 중…' : isReady && amount !== null ? `${formatKrw(amount)}원 결제하기` : '결제수단 준비 중…'}</span>
        </button>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        <p className={styles.notice}>카드 정보는 MEARROW 서버에 저장되지 않으며 토스페이먼츠에서 안전하게 처리됩니다.</p>
      </div>
    </section>
  );
}

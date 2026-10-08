'use client';

import { ArrowLeft, CircleX } from 'lucide-react';
import { useRouter } from 'next/navigation';
import styles from './payment.module.scss';

export default function TossPaymentFailClient() {
  const router = useRouter();

  return (
    <section className={styles.paymentPage} data-testid="visual-match-toss-fail" aria-live="polite">
      <div className={styles.paymentCard}>
        <div className={styles.heading}>
          <span className={styles.icon} aria-hidden="true"><CircleX size={20} /></span>
          <p>MEARROW AI / PAYMENT</p>
          <h1>결제가<br />완료되지 않았어요</h1>
          <span>결제수단을 확인한 뒤 다시 시도해 주세요. 결제 승인 전에는 분석이 시작되지 않습니다.</span>
        </div>
        <button className={styles.checkoutButton} type="button" onClick={() => router.replace(`/ai/visual-match/payment`)}>
          <ArrowLeft size={18} aria-hidden="true" /><span>결제 페이지로 돌아가기</span>
        </button>
      </div>
    </section>
  );
}

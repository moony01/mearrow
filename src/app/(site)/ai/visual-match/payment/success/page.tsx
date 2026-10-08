import { Suspense } from 'react';
import { DEFAULT_LOCALE } from '@/lib/constants';
import { setRequestLocale } from 'next-intl/server';
import PageFrame from '@/components/layout/PageFrame';
import TossPaymentSuccessClient from '../../TossPaymentSuccessClient';
import styles from '../../payment.module.scss';

export default async function VisualMatchTossSuccessPage() {
  const locale = DEFAULT_LOCALE;
  setRequestLocale(locale);
  return <PageFrame as="div" size="wide" className={styles.paymentFrame}><Suspense fallback={null}><TossPaymentSuccessClient /></Suspense></PageFrame>;
}

import { setRequestLocale } from 'next-intl/server';
import PageFrame from '@/components/layout/PageFrame';
import TossPaymentSuccessClient from '../../TossPaymentSuccessClient';
import styles from '../../payment.module.scss';

export default async function VisualMatchTossSuccessPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PageFrame size="wide" className={styles.paymentFrame}><TossPaymentSuccessClient /></PageFrame>;
}

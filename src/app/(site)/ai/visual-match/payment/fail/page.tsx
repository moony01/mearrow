import { DEFAULT_LOCALE } from '@/lib/constants';
import { setRequestLocale } from 'next-intl/server';
import PageFrame from '@/components/layout/PageFrame';
import TossPaymentFailClient from '../../TossPaymentFailClient';
import styles from '../../payment.module.scss';

export default async function VisualMatchTossFailPage() {
  const locale = DEFAULT_LOCALE;
  setRequestLocale(locale);
  return <PageFrame size="wide" className={styles.paymentFrame}><TossPaymentFailClient /></PageFrame>;
}

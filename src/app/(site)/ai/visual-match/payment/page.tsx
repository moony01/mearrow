import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import PageFrame from '@/components/layout/PageFrame';
import { DEFAULT_LOCALE } from '@/lib/constants';
import { generatePageMetadata } from '@/lib/seo';
import PaymentClient from '../PaymentClient';
import styles from '../payment.module.scss';

export async function generateMetadata(): Promise<Metadata> {
  const locale = DEFAULT_LOCALE;
  return generatePageMetadata({
    locale,
    pathname: '/ai/visual-match/payment',
    title: 'Visual Match 결제',
    description: 'Visual Match 개인 분석 리포트를 결제합니다.',
  });
}

export default async function VisualMatchPaymentPage() {
  const locale = DEFAULT_LOCALE;
  setRequestLocale(locale);
  return <PageFrame as="div" size="wide" className={styles.paymentFrame}><PaymentClient /></PageFrame>;
}

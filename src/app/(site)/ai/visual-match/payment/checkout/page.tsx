import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import PageFrame from '@/components/layout/PageFrame';
import { DEFAULT_LOCALE } from '@/lib/constants';
import { generatePageMetadata } from '@/lib/seo';
import TossCheckoutClient from '../../TossCheckoutClient';
import styles from '../../payment.module.scss';

export async function generateMetadata(): Promise<Metadata> {
  const locale = DEFAULT_LOCALE;
  return generatePageMetadata({
    locale,
    pathname: '/ai/visual-match/payment/checkout',
    title: 'Visual Match 결제수단 선택',
    description: '토스페이먼츠로 Visual Match 개인 분석 리포트를 결제합니다.',
  });
}

export default async function VisualMatchTossCheckoutPage() {
  const locale = DEFAULT_LOCALE;
  setRequestLocale(locale);
  return <PageFrame size="wide" className={styles.paymentFrame}><TossCheckoutClient /></PageFrame>;
}

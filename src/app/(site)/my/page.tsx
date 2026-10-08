/**
 * My Page (Server Component)
 *
 * SSG 빌드 시 정적 셸 생성
 *
 * @updated Phase 5 - SSG/CSR 마이그레이션
 */

import { Metadata } from 'next';
import MyClient from './MyClient';
import { generateAlternates } from '@/lib/seo';

/**
 * My 페이지 Props
 */
/**
 * 페이지 메타데이터 생성
 * SEO를 위한 canonical 및 hreflang 설정
 */
export async function generateMetadata(): Promise<Metadata> {
  const locale = 'ko';

  return {
    title: 'My Page',
    robots: { index: false, follow: false },
    alternates: generateAlternates(locale, '/my'),
  };
}

/**
 * 마이페이지 (정적 셸)
 */
export default function MyPage() {
  return <MyClient />;
}

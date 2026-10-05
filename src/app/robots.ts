import { MetadataRoute } from 'next';
import { FULL_URL } from '@/lib/constants';

/**
 * MEARROW robots.txt 생성기
 *
 * SEO 최적화:
 * - 검색 엔진 크롤러 허용/차단 규칙
 * - 비공개 페이지 크롤링 차단
 * - sitemap 위치 명시
 *
 * 참고: AI 크롤러 차단(GPTBot, ChatGPT-User, CCBot, Google-Extended)은
 * Cloudflare에서 관리하므로 여기서는 제외합니다.
 * Cloudflare Dashboard > Security > Bots에서 설정 확인 가능.
 *
 * 배포 환경에서 캐시 가능한 robots.txt로 생성됩니다.
 */

// Workers에서도 캐시 가능한 응답으로 유지
export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        // Public rendering assets under /_next/ must remain crawlable.
        allow: '/',
        disallow: [
          // 인증 관련 페이지 (검색 불필요)
          '/*/login',
          '/*/signup',
          '/*/forgot-password',
          '/*/onboarding',
          '/*/auth/',

          // 개인 페이지 (로그인 필요)
          '/*/my',

          // 애플리케이션 API 경로
          '/api/',
        ],
      },
    ],
    sitemap: `${FULL_URL}/sitemap.xml`,
    host: FULL_URL,
  };
}

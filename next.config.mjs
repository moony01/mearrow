import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === 'development';
const isWorkers = process.env.NEXT_RUNTIME_TARGET === 'workers';
const useStaticExport = !isDev && !isWorkers;

// Allow the Tailnet host used to access the development server externally.
// Keep this host-scoped; never open dev resources to arbitrary origins.
const allowedDevOrigins = [
  'server-13.tail3477d3.ts.net',
  'server-13',
  '100.81.184.13',
];

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  {
    key: 'Content-Security-Policy',
    value:
      "default-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://t1.kakaocdn.net https://*.googlesyndication.com https://*.google.com https://*.googleadservices.com https://*.doubleclick.net https://*.adtrafficquality.google https://fundingchoicesmessages.google.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.google-analytics.com https://*.google.com https://*.googlesyndication.com https://*.doubleclick.net https://*.adtrafficquality.google https://kapi.kakao.com https://sharer.kakao.com; frame-src 'self' https://*.doubleclick.net https://*.googlesyndication.com https://*.google.com https://fundingchoicesmessages.google.com https://*.adtrafficquality.google; frame-ancestors 'self' https://moony01.com https://www.moony01.com",
  },
];

/**
 * Next.js 설정
 *
 * SSG/CSR 마이그레이션 완료:
 * - Phase 1-2: Supabase 클라이언트 + API 레이어 (Kai) ✅
 * - Phase 3: API Routes/Redis 제거 (Max) ✅
 * - Phase 4: output: 'export' 설정 (Max) ✅
 * - Phase 5: 페이지 컴포넌트 정리 (Luna) ✅
 * - Phase 6: 빌드/배포 설정 (Max) ✅
 *
 * 배포 아키텍처:
 * - 기존 Pages 빌드: output: 'export' → out/ 디렉토리
 * - Workers 빌드: OpenNext가 SSR/ISR 런타임을 생성
 * - Workers 빌드는 NEXT_RUNTIME_TARGET=workers로 명시
 *
 * 개발 모드에서는 output: export 비활성화 (동적 라우트 지원)
 */
const nextConfig = {
  allowedDevOrigins,
  // 기존 Pages 배포는 정적 export를 유지하고, Workers 빌드에서는
  // OpenNext가 SSR/ISR용 Next 런타임을 생성하도록 output 설정을 비활성화합니다.
  ...(useStaticExport ? { output: 'export' } : {}),
  images: {
    loader: 'custom', // next-image-export-optimizer 사용
    imageSizes: [400],
    deviceSizes: [800],
  },
  transpilePackages: ['next-image-export-optimizer'], // 이미지 최적화 패키지
  reactCompiler: !isDev, // 개발 모드에서 비활성화 (HMR 속도 개선)
  // Worktrees have their own .next cache; never infer the parent checkout.
  turbopack: {
    root: __dirname,
    ...(isWorkers
      ? {
          // Workers bundle size reduction: avoid bundling next/og's resvg/wasm runtime.
          resolveAlias: {
            'next/og': './src/lib/workers-og-shim.ts',
          },
        }
      : {}),
  },
  sassOptions: {
    includePaths: [
      path.join(__dirname, 'src/styles'),
      path.join(__dirname, 'src/styles/abstracts'),
    ],
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: '', // SSG: Cloudflare Pages 기본 경로
    // Workers 빌드에서는 Pages 전용 optimizer 산출물이 없으므로 원본 WebP를 사용합니다.
    NEXT_PUBLIC_RUNTIME_TARGET: isWorkers ? 'workers' : 'pages',
    // next-image-export-optimizer 설정
    nextImageExportOptimizer_imageFolderPath: 'public/images',
    nextImageExportOptimizer_exportFolderPath: 'out',
    nextImageExportOptimizer_quality: '75',
    nextImageExportOptimizer_storePicturesInWEBP: 'true',
    nextImageExportOptimizer_exportFolderName: 'nextImageExportOptimizer',
    nextImageExportOptimizer_generateAndUseBlurImages: 'true',
    nextImageExportOptimizer_remoteImageCacheTTL: '0',
  },
  // Cloudflare Workers serve SSR responses through OpenNext, so the Pages
  // `public/_headers` file does not cover this runtime.
  ...(isWorkers
    ? {
        headers: async () => [
          {
            source: '/:path*',
            headers: securityHeaders,
          },
        ],
      }
    : {}),
  /**
   * 보안 헤더 설정 (SSG 모드)
   *
   * 참고: output: 'export' 모드에서는 headers()가 빌드에 포함되지 않습니다.
   * 대신 Cloudflare Pages의 _headers 파일 또는 Pages Functions에서 설정합니다.
   *
   * Cloudflare Pages _headers 파일 예시 (public/_headers):
   * ```
   * /*
   *   X-Frame-Options: DENY
   *   X-Content-Type-Options: nosniff
   *   Referrer-Policy: strict-origin-when-cross-origin
   *   X-XSS-Protection: 1; mode=block
   *   Permissions-Policy: camera=(), microphone=(), geolocation=()
   * ```
   */
  // SSG에서는 headers() 비활성화 - Cloudflare _headers로 대체
};

export default withNextIntl(nextConfig);

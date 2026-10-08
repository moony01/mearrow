/**
 * OG 이미지 동적 생성
 * Next.js ImageResponse를 사용하여 한국어 기본 OG 이미지를 생성합니다.
 */
import { ImageResponse } from 'next/og';
import { SITE_URL, type SupportedLocale } from '@/lib/constants';
import { BRAND_NAME, BRAND_POSITIONING, BRAND_TAGLINE } from '@/lib/brand';

export const dynamic = 'force-static';

/** OG 이미지 크기 설정 (권장 사이즈) */
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

const SITE_HOST = SITE_URL.replace(/^https?:\/\//, '').replace(/\/+$/, '');

/** 언어별 타이틀 */
const titles: Record<SupportedLocale, string> = {
  ko: BRAND_POSITIONING,
  en: BRAND_POSITIONING,
  ja: BRAND_POSITIONING,
  zh: BRAND_POSITIONING,
  es: BRAND_POSITIONING,
  fr: BRAND_POSITIONING,
  de: BRAND_POSITIONING,
};

/** 언어별 부제목 */
const subtitles: Record<SupportedLocale, string> = {
  ko: BRAND_TAGLINE,
  en: BRAND_TAGLINE,
  ja: BRAND_TAGLINE,
  zh: BRAND_TAGLINE,
  es: BRAND_TAGLINE,
  fr: BRAND_TAGLINE,
  de: BRAND_TAGLINE,
};

/**
 * OG 이미지 생성 함수
 */
export default async function Image() {
  const safeLocale: SupportedLocale = 'ko';

  const title = titles[safeLocale];
  const subtitle = subtitles[safeLocale];

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #080B14 0%, #172B79 54%, #315CFF 100%)',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* 배경 패턴 */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage:
              'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 50%)',
          }}
        />

        {/* MEARROW 로고 텍스트 */}
        <div
          style={{
            fontSize: 80,
            fontWeight: 900,
            color: 'white',
            textShadow: '0 4px 12px rgba(0,0,0,0.3)',
            letterSpacing: '-2px',
            marginBottom: 8,
          }}
        >
          {BRAND_NAME}
        </div>

        {/* 타이틀 */}
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: 'white',
            textAlign: 'center',
            marginBottom: 16,
            textShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}
        >
          {title}
        </div>

        {/* 부제목 */}
        <div
          style={{
            fontSize: 28,
            fontWeight: 500,
            color: 'rgba(255,255,255,0.9)',
            textAlign: 'center',
          }}
        >
          {subtitle}
        </div>

        {/* 트로피 이모지 */}
        <div
          style={{
            display: 'flex',
            gap: 24,
            marginTop: 32,
            fontSize: 48,
          }}
        >
          <span>🏆</span>
          <span>⭐</span>
          <span>🎤</span>
        </div>

        {/* 하단 URL */}
        <div
          style={{
            position: 'absolute',
            bottom: 32,
            fontSize: 22,
            color: 'rgba(255,255,255,0.7)',
            fontWeight: 500,
          }}
        >
          {`${SITE_HOST} · ${BRAND_NAME}`}
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}

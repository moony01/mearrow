/**
 * 명예의 전당 페이지 OG 이미지 동적 생성
 * Next.js ImageResponse를 사용하여 한국어 기본 OG 이미지를 생성합니다.
 */
import { ImageResponse } from 'next/og';
import { SITE_URL, type SupportedLocale } from '@/lib/constants';
import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand';

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
  ko: '명예의 전당',
  en: 'Hall of Fame',
  ja: '殿堂入り',
  zh: '名人堂',
  es: 'Salón de la Fama',
  fr: 'Temple de la Renommée',
  de: 'Hall of Fame',
};

/** 언어별 부제목 */
const subtitles: Record<SupportedLocale, string> = {
  ko: 'K-Pop 챔피언의 역사',
  en: 'K-Pop Champions History',
  ja: 'K-Popチャンピオンの歴史',
  zh: 'K-Pop冠军历史',
  es: 'Historia de Campeones K-Pop',
  fr: 'Histoire des Champions K-Pop',
  de: 'K-Pop Champions Geschichte',
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
          background: 'linear-gradient(135deg, #080B14 0%, #172B79 58%, #315CFF 100%)',
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
              'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.15) 0%, transparent 50%)',
          }}
        />

        {/* 브랜드명 */}
        <div
          style={{
            fontSize: 42,
            fontWeight: 900,
            color: '#C7FF32',
            letterSpacing: '3px',
            marginBottom: 18,
          }}
        >
          {BRAND_NAME}
        </div>

        {/* 트로피 이모지 */}
        <div
          style={{
            fontSize: 96,
            marginBottom: 16,
          }}
        >
          🏆
        </div>

        {/* 타이틀 */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 900,
            color: 'white',
            textAlign: 'center',
            marginBottom: 16,
            textShadow: '0 4px 12px rgba(0,0,0,0.3)',
          }}
        >
          {title}
        </div>

        {/* 부제목 */}
        <div
          style={{
            fontSize: 32,
            fontWeight: 500,
            color: 'rgba(255,255,255,0.95)',
            textAlign: 'center',
          }}
        >
          {subtitle}
        </div>

        {/* 별 장식 */}
        <div
          style={{
            display: 'flex',
            gap: 16,
            marginTop: 24,
            fontSize: 36,
          }}
        >
          <span>⭐</span>
          <span>👑</span>
          <span>⭐</span>
        </div>

        {/* 하단 URL */}
        <div
          style={{
            position: 'absolute',
            bottom: 32,
            fontSize: 22,
            color: 'rgba(255,255,255,0.8)',
            fontWeight: 500,
          }}
        >
          {`${SITE_HOST}/hall-of-fame · ${BRAND_TAGLINE}`}
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}

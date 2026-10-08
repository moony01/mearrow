/**
 * 뉴스 목록 페이지 OG 이미지 동적 생성
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
  ko: `${BRAND_NAME} 뉴스 & 인사이트`,
  en: `${BRAND_NAME} News & Insights`,
  ja: `${BRAND_NAME} ニュース & インサイト`,
  zh: `${BRAND_NAME} 新闻与洞察`,
  es: `${BRAND_NAME} Noticias e Insights`,
  fr: `${BRAND_NAME} Actualités et Analyses`,
  de: `${BRAND_NAME} Nachrichten & Insights`,
};

/** 언어별 부제목 */
const subtitles: Record<SupportedLocale, string> = {
  ko: 'K-Pop 산업 트렌드와 분석',
  en: 'K-Pop Industry Trends & Analysis',
  ja: 'K-Pop業界トレンドと分析',
  zh: 'K-Pop行业趋势与分析',
  es: 'Tendencias y Análisis de la Industria K-Pop',
  fr: "Tendances et Analyses de l'Industrie K-Pop",
  de: 'K-Pop Branchentrends & Analysen',
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
          background: 'linear-gradient(135deg, #080B14 0%, #315CFF 58%, #172B79 100%)',
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

        {/* 뉴스 아이콘 */}
        <div
          style={{
            fontSize: 72,
            marginBottom: 16,
          }}
        >
          📰
        </div>

        {/* 타이틀 */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
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
            fontSize: 28,
            fontWeight: 500,
            color: 'rgba(255,255,255,0.9)',
            textAlign: 'center',
            maxWidth: '80%',
          }}
        >
          {subtitle}
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
          {`${SITE_HOST}/news · ${BRAND_TAGLINE}`}
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}

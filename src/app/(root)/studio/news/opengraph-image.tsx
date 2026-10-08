/**
 * 뉴스 목록 페이지 OG 이미지 동적 생성
 * Next.js ImageResponse를 사용하여 언어별 OG 이미지 생성
 */
import { ImageResponse } from 'next/og';
import { SITE_URL } from '@/lib/constants';
import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand';

/** OG 이미지 크기 설정 (권장 사이즈) */
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

const SITE_HOST = SITE_URL.replace(/^https?:\/\//, '').replace(/\/+$/, '');

/**
 * OG 이미지 생성 함수
 */
export default async function Image() {
  const title = `${BRAND_NAME} News & Insights`;
  const subtitle = 'K-Pop Industry Trends & Analysis';

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
          {`${SITE_HOST}/studio/news · ${BRAND_TAGLINE}`}
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}

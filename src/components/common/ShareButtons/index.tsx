'use client';

/**
 * ShareButtons - 소셜 공유 버튼 컴포넌트
 *
 * K-pop 팬덤의 "자랑과 공유" 문화에 맞춘 공유 기능 제공
 * 카카오톡, X(Twitter), Facebook, 링크 복사 기능 지원
 *
 * @author Luna - Lead Frontend Engineer
 * @updated 2026-01-31 - 카카오톡 공유 추가
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import classNames from 'classnames';
import styles from './ShareButtons.module.scss';
import { BRAND_NAME, BRAND_POSITIONING } from '@/lib/brand';
import { FULL_URL } from '@/lib/constants';

/** X(Twitter) 아이콘 SVG */
function XIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/** Facebook 아이콘 SVG */
function FacebookIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

/** 링크 아이콘 SVG */
function LinkIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

/** 카카오톡 아이콘 SVG */
function KakaoIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3C6.48 3 2 6.58 2 11c0 2.83 1.89 5.29 4.67 6.67l-.97 3.56c-.1.36.3.66.62.46l4.26-2.82c.47.05.94.13 1.42.13 5.52 0 10-3.58 10-8s-4.48-8-10-8z" />
    </svg>
  );
}

/** 체크 아이콘 SVG */
function CheckIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/**
 * ShareButtons Props
 */
interface ShareButtonsProps {
  /** 공유할 제목 */
  title: string;
  /** 공유할 URL (미입력 시 현재 페이지 URL 사용) */
  url?: string;
  /** 공유할 설명 (일부 플랫폼에서 사용) */
  description?: string;
  /** 공유할 이미지 URL (카카오톡 공유 시 사용) */
  imageUrl?: string;
  /** 컴포넌트 방향 */
  direction?: 'horizontal' | 'vertical';
  /** 레이블 표시 여부 */
  showLabel?: boolean;
  /** 버튼 크기 */
  size?: 'sm' | 'md' | 'lg';
  /** 추가 CSS 클래스 */
  className?: string;
}

/**
 * 소셜 공유 버튼 컴포넌트
 *
 * @example
 * <ShareButtons
 *   title="BTS가 MEARROW 1월 챔피언으로 선정!"
 *   url="https://mearrow.com/news/bts-january-champion"
 * />
 */
export default function ShareButtons({
  title,
  url,
  description,
  imageUrl,
  direction = 'horizontal',
  showLabel = true,
  size = 'md',
  className,
}: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [kakaoReady, setKakaoReady] = useState(false);

  // 카카오 SDK 초기화
  useEffect(() => {
    // 이미 로드되었는지 확인
    if (typeof window !== 'undefined' && window.Kakao) {
      if (!window.Kakao.isInitialized()) {
        // 카카오 JavaScript 키 (공개 키)
        window.Kakao.init(process.env.NEXT_PUBLIC_KAKAO_JS_KEY || '');
      }
      const readyTimer = window.setTimeout(() => setKakaoReady(true), 0);
      return () => window.clearTimeout(readyTimer);
    }

    // 카카오 SDK 동적 로드
    const script = document.createElement('script');
    script.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js';
    script.integrity = 'sha384-TiCUE00h649CAMonG018J2ujOgDKW/kVWlChEuu4jK2vxfAAD0eZxzCKakxg55G4';
    script.crossOrigin = 'anonymous';
    script.async = true;
    script.onload = () => {
      if (window.Kakao && !window.Kakao.isInitialized()) {
        window.Kakao.init(process.env.NEXT_PUBLIC_KAKAO_JS_KEY || '');
      }
      setKakaoReady(true);
    };
    document.head.appendChild(script);

    return () => {
      // cleanup은 하지 않음 (SDK는 한 번 로드되면 유지)
    };
  }, []);

  // 공유 URL 결정 (SSR 안전하게 처리)
  const getShareUrl = useCallback(() => {
    return url || (typeof window !== 'undefined' ? window.location.href : '');
  }, [url]);

  /**
   * 카카오톡 공유
   * 카카오 SDK를 사용하여 카카오톡으로 공유
   */
  const shareToKakao = useCallback(() => {
    if (!kakaoReady || !window.Kakao) {
      console.warn('Kakao SDK not ready');
      return;
    }

    const shareUrl = getShareUrl();

    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: title,
        description: description || `${BRAND_NAME} - ${BRAND_POSITIONING}`,
        imageUrl: imageUrl || `${FULL_URL}/opengraph-image`,
        link: {
          mobileWebUrl: shareUrl,
          webUrl: shareUrl,
        },
      },
      buttons: [
        {
          title: '자세히 보기',
          link: {
            mobileWebUrl: shareUrl,
            webUrl: shareUrl,
          },
        },
      ],
    });
  }, [title, description, imageUrl, getShareUrl, kakaoReady]);

  /**
   * X(Twitter) 공유
   * 트위터 인텐트 API를 사용하여 새 창에서 공유
   */
  const shareToX = useCallback(() => {
    const shareUrl = getShareUrl();
    const text = encodeURIComponent(title);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank', 'width=550,height=420,noopener,noreferrer');
  }, [title, getShareUrl]);

  /**
   * Facebook 공유
   * Facebook 공유 다이얼로그 API 사용
   */
  const shareToFacebook = useCallback(() => {
    const shareUrl = getShareUrl();
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(facebookUrl, '_blank', 'width=580,height=400,noopener,noreferrer');
  }, [getShareUrl]);

  /**
   * 링크 복사
   * Clipboard API를 사용하여 URL 복사
   */
  const copyLink = useCallback(async () => {
    const shareUrl = getShareUrl();
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      // 2초 후 상태 리셋
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Clipboard API 실패 시 fallback
      console.error('Failed to copy link:', err);
    }
  }, [getShareUrl]);

  return (
    <div className={classNames(styles.shareButtons, styles[direction], styles[size], className)}>
      {showLabel && <span className={styles.label}>Share</span>}

      <div className={styles.buttons}>
        {/* 카카오톡 공유 버튼 */}
        <motion.button
          type="button"
          onClick={shareToKakao}
          className={classNames(styles.shareBtn, styles.kakao)}
          aria-label="카카오톡으로 공유"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={!kakaoReady}
        >
          <KakaoIcon size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />
          {size !== 'sm' && <span className={styles.btnText}>카카오톡</span>}
        </motion.button>

        {/* X(Twitter) 공유 버튼 */}
        <motion.button
          type="button"
          onClick={shareToX}
          className={classNames(styles.shareBtn, styles.twitter)}
          aria-label="Share on X (Twitter)"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <XIcon size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />
          {size !== 'sm' && <span className={styles.btnText}>X</span>}
        </motion.button>

        {/* Facebook 공유 버튼 */}
        <motion.button
          type="button"
          onClick={shareToFacebook}
          className={classNames(styles.shareBtn, styles.facebook)}
          aria-label="Share on Facebook"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <FacebookIcon size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />
          {size !== 'sm' && <span className={styles.btnText}>Facebook</span>}
        </motion.button>

        {/* 링크 복사 버튼 */}
        <motion.button
          type="button"
          onClick={copyLink}
          className={classNames(styles.shareBtn, styles.copy, { [styles.copied]: copied })}
          aria-label={copied ? 'Link copied!' : 'Copy link'}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {copied ? (
              <motion.span
                key="check"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className={styles.iconWrapper}
              >
                <CheckIcon size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />
              </motion.span>
            ) : (
              <motion.span
                key="link"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className={styles.iconWrapper}
              >
                <LinkIcon size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />
              </motion.span>
            )}
          </AnimatePresence>
          {size !== 'sm' && <span className={styles.btnText}>{copied ? 'Copied!' : 'Copy'}</span>}
        </motion.button>
      </div>
    </div>
  );
}

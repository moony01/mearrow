/**
 * 뉴스 데이터 접근 레이어
 *
 * Edge Runtime 호환을 위해 fs/path 대신 prebuild 단계에서 생성된 JSON 사용
 * @see scripts/generate-news-json.js
 */

import newsMeta from '@/generated/news-meta.json';
import { loadNewsPost } from '@/generated/news-runtime';

export const NEWS_SOURCE_LOCALE = 'en';

export interface NewsSource {
  label: string;
  url: string;
}

/**
 * 뉴스 게시글 타입 정의
 * 마크다운 파일의 frontmatter와 본문을 포함
 */
export interface NewsPost {
  /** URL용 식별자 (파일명에서 .md 제외) */
  slug: string;
  /** 기사 제목 */
  title: string;
  /** 기사 요약문 (목록 카드용) */
  excerpt: string;
  /** 작성일 (YYYY-MM-DD) */
  date: string;
  /** 마지막 검토일 (YYYY-MM-DD) */
  updatedAt?: string;
  /** 콘텐츠 작성 주체 */
  author?: string;
  /** 마크다운 본문 */
  content: string;
  /** 썸네일 이미지 경로 */
  thumbnail?: string | null;
  /** 썸네일 이미지의 초점 위치 (CSS object-position) */
  thumbnailPosition?: string | null;
  /** 카테고리 */
  category?: string;
  /** 언어 코드 */
  locale: string;
  /** 본문에 표시할 외부 출처 */
  sources?: NewsSource[];
}

/**
 * 뉴스 메타데이터 타입 (목록용 - content 미포함)
 */
export interface NewsMeta {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  updatedAt?: string;
  author?: string;
  thumbnail?: string | null;
  /** 썸네일 이미지의 초점 위치 (CSS object-position) */
  thumbnailPosition?: string | null;
  category?: string;
  locale: string;
  sources?: NewsSource[];
  /** 활성 여부 (false면 목록에서 숨김, 기본값: true) */
  active?: boolean;
}

/**
 * 특정 언어(locale)의 모든 뉴스 게시글을 가져옵니다.
 * 날짜순(최신순)으로 정렬하여 반환합니다.
 *
 * @param locale - 언어 코드 (기본값: 'ko')
 * @returns 뉴스 메타데이터 배열
 */
export function getAllNews(locale: string = 'ko'): NewsMeta[] {
  void locale;

  // 현재 뉴스 원문은 영어 하나만 유지한다. 모든 locale 목록은 영어 원문을 사용한다.
  return (newsMeta as NewsMeta[])
    .filter((post) => post.locale === NEWS_SOURCE_LOCALE && post.active !== false)
    .sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
}

/**
 * 슬러그(URL ID)로 특정 뉴스 상세 정보를 가져옵니다.
 * 동적 import를 사용하여 해당 뉴스의 JSON 파일 로드
 *
 * @param slug - 뉴스 식별자
 * @param locale - 언어 코드 (기본값: 'ko')
 * @returns 뉴스 게시글 또는 null
 */
export async function getNewsBySlug(slug: string, locale: string = 'ko'): Promise<NewsPost | null> {
  void locale;

  // 한국어를 포함한 모든 locale URL은 영어 원문 파일로 fallback한다.
  const post = await loadNewsPost(slug, NEWS_SOURCE_LOCALE);
  if (!post || post.active === false) return null;
  return post as NewsPost | null;
}

/**
 * 현재 기사와 관련된 다른 뉴스를 가져옵니다.
 * 같은 카테고리 우선, 부족하면 최신순으로 채움
 *
 * @param currentSlug - 현재 기사 slug (제외용)
 * @param locale - 언어 코드
 * @param limit - 반환할 최대 개수 (기본값: 3)
 * @returns 관련 뉴스 메타데이터 배열
 */
export function getRelatedNews(
  currentSlug: string,
  locale: string = 'ko',
  limit: number = 3,
  currentCategory?: string,
): NewsMeta[] {
  const allPosts = getAllNews(locale).filter((p) => p.slug !== currentSlug);

  if (!currentCategory) return allPosts.slice(0, limit);

  // 같은 카테고리 우선
  const sameCategory = allPosts.filter((p) => p.category === currentCategory);
  const others = allPosts.filter((p) => p.category !== currentCategory);

  return [...sameCategory, ...others].slice(0, limit);
}

/**
 * 모든 뉴스 슬러그를 가져옵니다.
 * generateStaticParams에서 사용
 *
 * @param locale - 언어 코드
 * @returns 슬러그 배열
 */
export function getAllNewsSlugs(locale: string = 'ko'): string[] {
  const posts = getAllNews(locale);
  return posts.map((post) => post.slug);
}

/**
 * 모든 로케일에 대한 뉴스 슬러그 조합 반환
 * generateStaticParams에서 정적 경로 생성용
 *
 * @param locales - 지원 로케일 배열
 * @returns {locale, slug}[] 배열
 */
export function getAllNewsParams(locales: string[]): { locale: string; slug: string }[] {
  const params: { locale: string; slug: string }[] = [];

  for (const locale of locales) {
    const posts = getAllNews(locale);
    for (const post of posts) {
      params.push({ locale, slug: post.slug });
    }
  }

  return params;
}

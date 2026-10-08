import { MetadataRoute } from 'next';
import { FULL_URL, SUPPORTED_LOCALES, SupportedLocale } from '@/lib/constants';
import { getAllAuditions } from '@/lib/auditions';
import { getAllNews, NEWS_SOURCE_LOCALE } from '@/lib/news';
import {
  ANNOUNCEMENT_SOURCE_LOCALE,
  getAnnouncementAvailableLocales,
  getPublishedAnnouncementIds,
} from '@/lib/api/announcements';

/**
 * MEARROW 사이트맵 생성기
 *
 * SEO 최적화 (2026-01-31 업데이트):
 * - 실제 콘텐츠가 있는 페이지만 포함
 * - 공개 표면에 남긴 핵심 페이지만 포함
 * - 뉴스는 콘텐츠가 존재하는 언어만 포함 (ko, en)
 * - 정적 페이지는 주요 언어만 포함 (크롤링 효율화)
 *
 * 배포 환경에서 캐시 가능한 sitemap으로 생성됩니다.
 * Google Search Console에서 /sitemap.xml로 제출하세요.
 */

// Workers에서도 캐시 가능한 응답으로 유지
export const dynamic = 'force-static';

/**
 * sitemap에 포함할 언어 목록
 * 실제 트래픽과 콘텐츠가 있는 언어만 포함
 */
const SITEMAP_LOCALES = SUPPORTED_LOCALES;

/**
 * 최신 뉴스로 간주할 개수
 * 최신 N개의 뉴스는 높은 priority (0.8) 부여
 */
const RECENT_NEWS_COUNT = 5;

/**
 * 정적 페이지용 alternates 생성
 * sitemap에 포함된 언어만
 */
function generateStaticAlternates(path: string): Record<string, string> {
  const alternates: Record<string, string> = {};

  for (const locale of SITEMAP_LOCALES) {
    alternates[locale] = `${FULL_URL}/${locale}${path}`;
  }

  alternates['x-default'] = `${FULL_URL}/en${path}`;

  return alternates;
}

function generateNoticeAlternates(
  path: string,
  availableLocales: readonly SupportedLocale[],
): Record<string, string> {
  const alternates: Record<string, string> = {};

  for (const locale of availableLocales) {
    alternates[locale] = `${FULL_URL}/${locale}${path}`;
  }

  alternates['x-default'] = `${FULL_URL}/${ANNOUNCEMENT_SOURCE_LOCALE}${path}`;
  return alternates;
}

/**
 * 정적 페이지 정의
 * 활성화된 기능 페이지만 포함 (FEATURES 플래그 참조)
 *
 * 제외된 페이지:
 * - hidden app flows such as auth and account pages
 * - legacy pages removed from the public surface
 */
interface StaticPage {
  path: string;
  priority: number;
  changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
}

const STATIC_PAGES: StaticPage[] = [
  // 메인 페이지 (리그 랭킹) - 핵심 콘텐츠
  { path: '', priority: 1.0, changeFrequency: 'daily' },

  // 명예의 전당 - 활성화됨
  { path: '/hall-of-fame', priority: 0.8, changeFrequency: 'weekly' },

  // 공지사항 - 공개 페이지
  { path: '/notice', priority: 0.5, changeFrequency: 'weekly' },

  // About & FAQ - AdSense 필수 페이지
  { path: '/about', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/editorial', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/faq', priority: 0.6, changeFrequency: 'monthly' },

  // 법적 페이지 - 필수
  { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sitemapEntries: MetadataRoute.Sitemap = [];

  // 1. 정적 콘텐츠 페이지
  for (const page of STATIC_PAGES) {
    for (const locale of SITEMAP_LOCALES) {
      // 주요 언어(en, ko)는 높은 priority, 나머지는 약간 낮춤
      const priority = ['en', 'ko'].includes(locale)
        ? page.priority
        : Math.max(0.1, page.priority - 0.1);

      sitemapEntries.push({
        url: `${FULL_URL}/${locale}${page.path}`,
        changeFrequency: page.changeFrequency,
        priority,
        alternates: {
          languages: generateStaticAlternates(page.path),
        },
      });
    }
  }

  // Studio hub and its English-only content archives use locale-less canonicals.
  sitemapEntries.push(
    { url: `${FULL_URL}/studio`, changeFrequency: 'daily', priority: 1.0 },
    { url: `${FULL_URL}/studio/ranking`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${FULL_URL}/studio/news`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${FULL_URL}/studio/auditions`, changeFrequency: 'daily', priority: 0.8 },
  );

  // News detail pages use the single English source and Studio canonical paths.
  try {
    const posts = getAllNews(NEWS_SOURCE_LOCALE);

    for (let i = 0; i < posts.length; i++) {
      const post = posts[i];
      const priority = i < RECENT_NEWS_COUNT ? 0.8 : 0.6;

      sitemapEntries.push({
        url: `${FULL_URL}/studio/news/${post.slug}`,
        lastModified: new Date(post.date),
        changeFrequency: i < RECENT_NEWS_COUNT ? 'weekly' : 'monthly',
        priority,
      });
    }
  } catch {
    console.warn('[sitemap] No news found for Studio.');
  }

  // English audition detail pages include closed records in the archive.
  const auditions = getAllAuditions('en').sort(
    (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  );
  for (const post of auditions) {
    const isActive = post.status !== 'closed';

    sitemapEntries.push({
      url: `${FULL_URL}/studio/auditions/${post.slug}`,
      lastModified: new Date(post.updatedAt || post.publishedAt),
      changeFrequency: isActive ? 'daily' : 'monthly',
      priority: isActive ? 0.8 : 0.5,
    });
  }

  // 5. 공지사항 상세 페이지 (공개 ID만, 상세 route와 동일한 locale 정책)
  const announcementIds = await getPublishedAnnouncementIds();
  for (const id of announcementIds) {
    const noticePath = `/notice/${id}`;
    const availableLocales = getAnnouncementAvailableLocales(id);
    for (const locale of availableLocales) {
      sitemapEntries.push({
        url: `${FULL_URL}/${locale}${noticePath}`,
        changeFrequency: 'weekly',
        priority: 0.4,
        alternates: {
          languages: generateNoticeAlternates(noticePath, availableLocales),
        },
      });
    }
  }

  return sitemapEntries;
}

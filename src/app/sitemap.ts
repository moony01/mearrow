import { MetadataRoute } from 'next';
import { FULL_URL } from '@/lib/constants';
import { getAllAuditions } from '@/lib/auditions';
import { getAllNews, NEWS_SOURCE_LOCALE } from '@/lib/news';
import { getPublishedAnnouncementIds } from '@/lib/api/announcements';

export const dynamic = 'force-static';

const RECENT_NEWS_COUNT = 5;

const STATIC_PAGES: Array<{
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
}> = [
  { path: '/', priority: 1.0, changeFrequency: 'daily' },
  { path: '/hall-of-fame', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/studio', priority: 1.0, changeFrequency: 'daily' },
  { path: '/studio/news', priority: 0.8, changeFrequency: 'daily' },
  { path: '/studio/ranking', priority: 0.9, changeFrequency: 'daily' },
  { path: '/notice', priority: 0.5, changeFrequency: 'weekly' },
  { path: '/studio/auditions', priority: 0.9, changeFrequency: 'daily' },
  { path: '/about', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/editorial', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/faq', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = STATIC_PAGES.map((page) => ({
    url: `${FULL_URL}${page.path}`,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));

  try {
    const posts = getAllNews(NEWS_SOURCE_LOCALE);
    posts.forEach((post, index) => {
      entries.push({
        url: `${FULL_URL}/studio/news/${post.slug}`,
        lastModified: new Date(post.date),
        changeFrequency: index < RECENT_NEWS_COUNT ? 'weekly' : 'monthly',
        priority: index < RECENT_NEWS_COUNT ? 0.8 : 0.6,
      });
    });
  } catch {
    console.warn('[sitemap] No news found for the source locale.');
  }

  const auditionPostsBySlug = new Map<string, ReturnType<typeof getAllAuditions>[number]>();
  for (const post of getAllAuditions('en')) {
    if (!auditionPostsBySlug.has(post.slug)) auditionPostsBySlug.set(post.slug, post);
  }

  for (const post of auditionPostsBySlug.values()) {
    const isActive = post.status !== 'closed';
    entries.push({
      url: `${FULL_URL}/studio/auditions/${post.slug}`,
      lastModified: new Date(post.updatedAt),
      changeFrequency: isActive ? 'daily' : 'monthly',
      priority: isActive ? 0.8 : 0.5,
    });
  }

  const announcementIds = await getPublishedAnnouncementIds();
  for (const id of announcementIds) {
    entries.push({
      url: `${FULL_URL}/notice/${id}`,
      changeFrequency: 'weekly',
      priority: 0.4,
    });
  }

  return entries;
}

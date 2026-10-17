import Link from 'next/link';
import { getAllNews, NEWS_SOURCE_LOCALE } from '@/lib/news';
import { NEWS_ARCHIVE_PAGE_SIZE } from '@/lib/content-archive';
import NewsGridClient from './NewsGridClient';
import newsStyles from './page.module.scss';
import studioStyles from '../page.module.scss';

export default function NewsArchiveContent({ pageNumber = 1 }: { pageNumber?: number }) {
  const posts = getAllNews(NEWS_SOURCE_LOCALE);
  const pageCount = Math.max(1, Math.ceil(posts.length / NEWS_ARCHIVE_PAGE_SIZE));

  return (
    <main className={studioStyles.page}>
      <section className={studioStyles.section} aria-labelledby="news-archive-title">
        <div className={studioStyles.sectionHeading}>
          <div>
            <p className={studioStyles.sectionEyebrow}>WHAT&apos;S HAPPENING</p>
            <h1 className={studioStyles.archiveTitle} id="news-archive-title">News</h1>
            <p>K-pop news and analysis from across the industry, from current updates to long-form features.</p>
          </div>
          <Link className={studioStyles.primaryLink} href="/studio#news">
            Back to Studio
          </Link>
        </div>
        <div className={newsStyles.grid}>
          <NewsGridClient
            posts={posts.map((post) => ({
              slug: post.slug,
              title: post.title,
              excerpt: post.excerpt,
              date: post.date,
              category: post.category,
              thumbnail: post.thumbnail ?? undefined,
              thumbnailPosition: post.thumbnailPosition ?? undefined,
              sourceCount: post.sources?.length ?? 0,
            }))}
            locale={NEWS_SOURCE_LOCALE}
            basePath="/studio/news"
            paginationBasePath="/studio/news"
            initialPage={pageNumber}
          />
        </div>
        <p className={studioStyles.archivePageStatus} aria-live="polite">
          Page {pageNumber} of {pageCount}
        </p>
      </section>
    </main>
  );
}

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import ExportedImage from 'next-image-export-optimizer';
import { ArrowLeft, Calendar, Tag } from 'lucide-react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  getNewsBySlug,
  getAllNews,
  getRelatedNews,
  NEWS_SOURCE_LOCALE,
} from '@/lib/news';
import { FULL_URL } from '@/lib/constants';
import { BRAND_MARK_PATH, BRAND_NAME } from '@/lib/brand';
import { JsonLd } from '@/components/common/JsonLd';
import ShareButtons from '@/components/common/ShareButtons';
import NewsViewCounter from '@/components/news/NewsViewCounter';
import NewsComments from '@/components/news/NewsComments';
import RelatedNewsGrid from '@/components/news/RelatedNewsGrid';
import KpopfaceTestAdCard from '@/components/news/KpopfaceTestAdCard';
import PageFrame from '@/components/layout/PageFrame';
import styles from './page.module.scss';

function absoluteNewsImage(value: string | null | undefined): string {
  if (!value) return `${FULL_URL}${BRAND_MARK_PATH}`;
  if (/^https?:\/\//i.test(value)) return value;
  return `${FULL_URL}${value.startsWith('/') ? value : `/${value}`}`;
}

function splitContentBySections(content: string): string[] {
  const sections = content.split(/(?=^## )/m).filter((section) => section.trim());
  if (sections.length > 1) return sections;

  const blocks = content.split(/\n\s*\n/).filter((block) => block.trim());
  return blocks.length > 1 ? blocks : sections;
}

/** Find the internal section boundary closest to the middle of the article. */
function findMiddleAdBoundary(sections: string[]): number {
  if (sections.length < 2) return 1;

  const firstBoundary = sections.length > 3 ? 2 : 1;
  const midpoint = sections.reduce((total, section) => total + section.length, 0) / 2;
  let bestBoundary = firstBoundary;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (let boundary = firstBoundary; boundary < sections.length; boundary += 1) {
    const precedingLength = sections
      .slice(0, boundary)
      .reduce((total, section) => total + section.length, 0);
    const distance = Math.abs(precedingLength - midpoint);

    if (distance < bestDistance) {
      bestBoundary = boundary;
      bestDistance = distance;
    }
  }

  return bestBoundary;
}

/**
 * Generate one English-only route for each published article.
 */
export function generateStaticParams() {
  // Workers에서는 본문을 ASSETS에서 요청 시 읽어 Worker 번들에 포함하지 않는다.
  if (process.env.NEXT_RUNTIME_TARGET === 'workers') return [];

  return getAllNews(NEWS_SOURCE_LOCALE).map(({ slug }) => ({ slug }));
}

/**
 * 뉴스 상세 페이지 Props
 */
interface NewsDetailPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * 페이지 메타데이터 생성
 * SEO를 위한 동적 title, description, canonical, hreflang 설정
 */
export async function generateMetadata({ params }: NewsDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getNewsBySlug(slug, NEWS_SOURCE_LOCALE);

  if (!post) {
    return {
      title: 'Not Found',
    };
  }

  const canonical = `${FULL_URL}/studio/news/${slug}`;
  const image = absoluteNewsImage(post.thumbnail);

  return {
    title: `${post.title} | ${BRAND_NAME} News`,
    description: post.excerpt,
    alternates: { canonical },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.excerpt,
      url: canonical,
      images: [image],
      publishedTime: post.date,
      modifiedTime: post.updatedAt ?? post.date,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [image],
    },
  };
}

/**
 * 뉴스 상세 페이지
 * 마크다운 본문을 렌더링하여 기사 전문 표시
 */
export default async function NewsDetailPage({ params }: NewsDetailPageProps) {
  const { slug } = await params;
  const locale = NEWS_SOURCE_LOCALE;

  // next-intl 정적 생성 지원
  setRequestLocale(locale);

  // 번역 가져오기
  const t = await getTranslations({ locale, namespace: 'News' });

  // 뉴스 데이터 가져오기 (async 함수)
  const post = await getNewsBySlug(slug, locale);

  // 뉴스가 없으면 404
  if (!post) {
    notFound();
  }

  const canonical = `${FULL_URL}/studio/news/${slug}`;
  const articleImage = absoluteNewsImage(post.thumbnail);

  // 날짜 포맷팅
  const formattedDate = new Date(post.date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const sources = post.sources ?? [];
  const contentSections = splitContentBySections(post.content);
  const middleAdBoundary = findMiddleAdBoundary(contentSections);
  const markdownComponents: Partial<Components> = {
    img: ({ src, alt }) => {
      if (typeof src === 'string' && src) {
        return (
          <span className={styles.contentImage}>
            <ExportedImage
              src={src}
              alt={alt || ''}
              width={800}
              height={450}
              sizes="(max-width: 768px) 100vw, 800px"
              unoptimized={
                process.env.NODE_ENV === 'development' ||
                process.env.NEXT_PUBLIC_RUNTIME_TARGET === 'workers'
              }
              style={{ width: '100%', height: 'auto' }}
            />
          </span>
        );
      }
      return null;
    },
  };

  return (
    <PageFrame size="narrow">
      {/* 뒤로가기 링크 */}
      <Link href="/studio#news" className={styles.backLink}>
        <ArrowLeft size={18} />
        <span>{t('backToList')}</span>
      </Link>

      {/* 기사 헤더 */}
      <header className={styles.header}>
        {/* 히어로 이미지 (썸네일 또는 placeholder) */}
        <div className={styles.heroImage}>
          {post.thumbnail ? (
            <ExportedImage
              src={post.thumbnail}
              alt={post.title}
              width={1200}
              height={630}
              priority
              sizes="(max-width: 768px) 100vw, 800px"
              unoptimized={
                process.env.NODE_ENV === 'development' ||
                process.env.NEXT_PUBLIC_RUNTIME_TARGET === 'workers'
              }
              style={{ objectPosition: post.thumbnailPosition ?? undefined }}
            />
          ) : (
            <div className={styles.heroPlaceholder}>
              <span>📰</span>
            </div>
          )}
        </div>

        {/* 카테고리 */}
        <div className={styles.category}>
          <Tag size={14} />
          <span>{post.category}</span>
        </div>

        {/* 제목 */}
        <h1 className={styles.title}>{post.title}</h1>

        {/* 메타 정보 (날짜 + 조회수) */}
        <div className={styles.meta}>
          <div className={styles.metaLeft}>
            <div className={styles.date}>
              <Calendar size={16} />
              <time dateTime={post.date}>{formattedDate}</time>
            </div>
            <NewsViewCounter slug={slug} incrementOnMount />
          </div>
        </div>
      </header>

      {/* 기사 본문 */}
      <article className={styles.content}>
        <KpopfaceTestAdCard placement="start" />
        {contentSections.map((section, index) => (
          <div key={index}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {section}
            </ReactMarkdown>
            {index + 1 === middleAdBoundary && <KpopfaceTestAdCard placement="middle" />}
          </div>
        ))}
      </article>

      {/* 기사 하단 공유 버튼 */}
      <div className={styles.shareSection}>
        <ShareButtons
          title={post.title}
          url={canonical}
          description={post.excerpt}
          imageUrl={post.thumbnail ? `${FULL_URL}${post.thumbnail}` : undefined}
          size="md"
          showLabel={false}
          showKakaoButton={false}
        />
      </div>

      {/* 관련 뉴스 (크로스 프로모션) - 조회수/댓글수 포함 */}
      {(() => {
        const relatedPosts = getRelatedNews(slug, locale, 3, post.category);
        if (relatedPosts.length === 0) return null;
        return (
          <section className={styles.relatedSection}>
            <h3 className={styles.relatedTitle}>{t('relatedNews')}</h3>
            <RelatedNewsGrid
              posts={relatedPosts.map((r) => ({
                slug: r.slug,
                title: r.title,
                date: r.date,
                category: r.category,
                thumbnail: r.thumbnail ?? undefined,
                thumbnailPosition: r.thumbnailPosition ?? undefined,
              }))}
              locale={locale}
              basePath="/studio/news"
            />
          </section>
        );
      })()}

      {/* 댓글 섹션 */}
      <NewsComments slug={slug} />

      {/* JSON-LD 구조화 데이터 (Article 스키마) */}
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: post.title,
          description: post.excerpt,
          url: canonical,
          mainEntityOfPage: canonical,
          inLanguage: NEWS_SOURCE_LOCALE,
          datePublished: post.date,
          dateModified: post.updatedAt ?? post.date,
          image: articleImage,
          author: {
            '@type': 'Organization',
            name: post.author || BRAND_NAME,
          },
          publisher: {
            '@type': 'Organization',
            name: BRAND_NAME,
            logo: {
              '@type': 'ImageObject',
              url: `${FULL_URL}${BRAND_MARK_PATH}`,
            },
          },
          citation: sources.map((source) => source.url),
        }}
      />
    </PageFrame>
  );
}

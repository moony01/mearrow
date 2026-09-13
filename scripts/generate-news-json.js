/**
 * prebuild 스크립트: 마크다운 뉴스 파일을 JSON으로 변환
 *
 * Edge Runtime에서는 fs, path 등 Node.js API를 사용할 수 없으므로,
 * 빌드 전에 마크다운 파일을 JSON으로 변환하여 import 가능하게 만듦
 *
 * 생성 파일:
 * - src/generated/news-meta.json: 목록용 메타데이터
 * - src/generated/news-content/{locale}/{slug}.json: 본문 포함 상세 데이터
 * - public/api/news.json: 외부 연동용 공개 API (영어, active 뉴스만)
 *
 * @example
 * ```bash
 * node scripts/generate-news-json.js
 * ```
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { fileURLToPath } from 'url';
import { evaluateNewsQuality } from '../src/lib/news-quality.js';

// ES Module에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 경로 설정
const CONTENT_DIR = path.join(__dirname, '../src/content/news');
const SOURCE_LOCALE = 'en';
const OUTPUT_DIR = path.join(__dirname, '../src/generated');
const META_OUTPUT = path.join(OUTPUT_DIR, 'news-meta.json');
const CONTENT_OUTPUT_DIR = path.join(OUTPUT_DIR, 'news-content');
// 외부 연동용 공개 API JSON 경로
const PUBLIC_API_DIR = path.join(__dirname, '../public/api');
const PUBLIC_API_OUTPUT = path.join(PUBLIC_API_DIR, 'news.json');
// Workers 런타임이 ASSETS binding으로 읽을 상세 본문 경로
const PUBLIC_CONTENT_OUTPUT_DIR = path.join(PUBLIC_API_DIR, 'news-content');
// Pages와 Workers가 서로 다른 본문 로더를 사용하도록 빌드마다 생성
const RUNTIME_OUTPUT = path.join(OUTPUT_DIR, 'news-runtime.ts');
const PUBLIC_SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://mearrow.com').replace(
  /\/+$/,
  '',
);

/**
 * 디렉토리가 없으면 재귀적으로 생성
 * @param {string} dirPath - 생성할 디렉토리 경로
 */
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`  [생성] 디렉토리: ${path.relative(process.cwd(), dirPath)}`);
  }
}

/**
 * 빌드 타깃별 뉴스 본문 로더 생성
 *
 * Pages/test: 기존 generated JSON dynamic import를 사용
 * Workers: public/api/news-content 정적 asset을 ASSETS binding으로 읽음
 */
function writeRuntimeModule() {
  const isWorkersBuild = process.env.NEXT_RUNTIME_TARGET === 'workers';

  const workersModule = `import { getCloudflareContext } from '@opennextjs/cloudflare';

export interface GeneratedNewsPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  updatedAt?: string;
  author?: string;
  content: string;
  thumbnail?: string | null;
  category?: string;
  locale: string;
  sources?: Array<{ label: string; url: string }>;
  active?: boolean;
}

export async function loadNewsPost(
  slug: string,
  locale: string,
): Promise<GeneratedNewsPost | null> {
  try {
    const { env } = getCloudflareContext();
    if (!env.ASSETS) return null;

    const assetPath = \`/api/news-content/\${encodeURIComponent(locale)}/\${encodeURIComponent(slug)}.json\`;
    const response = await env.ASSETS.fetch(new URL(assetPath, 'http://assets.local'));

    if (!response.ok) {
      await response.body?.cancel();
      return null;
    }

    return (await response.json()) as GeneratedNewsPost;
  } catch {
    return null;
  }
}
`;

  const pagesModule = `export interface GeneratedNewsPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  updatedAt?: string;
  author?: string;
  content: string;
  thumbnail?: string | null;
  category?: string;
  locale: string;
  sources?: Array<{ label: string; url: string }>;
  active?: boolean;
}

export async function loadNewsPost(
  slug: string,
  locale: string,
): Promise<GeneratedNewsPost | null> {
  try {
    const newsModule = await import(\`@/generated/news-content/\${locale}/\${slug}.json\`);
    return newsModule.default as GeneratedNewsPost;
  } catch {
    return null;
  }
}
`;

  fs.writeFileSync(RUNTIME_OUTPUT, isWorkersBuild ? workersModule : pagesModule, 'utf8');
}

/**
 * 마크다운 파일을 파싱하여 뉴스 데이터 객체 반환
 * @param {string} filePath - 마크다운 파일 경로
 * @param {string} locale - 언어 코드
 * @returns {Object} 뉴스 데이터 객체
 */
function parseNewsFile(filePath, locale) {
  const fileContents = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(fileContents);

  // 파일명에서 slug 추출 (확장자 제거)
  const slug = path.basename(filePath, '.md');
  const quality = evaluateNewsQuality(content, { category: data.category });
  const publishedDate = data.date || new Date().toISOString().split('T')[0];

  const result = {
    slug,
    locale,
    title: data.title || '제목 없음',
    excerpt: data.excerpt || '',
    date: publishedDate,
    updatedAt: data.updatedAt || publishedDate,
    author: data.author || 'MEARROW Editorial Desk',
    category: data.category || 'General',
    thumbnail: data.thumbnail || null,
    sources: quality.sources,
    content,
  };

  // 원문에 명시적으로 비활성화한 글만 숨깁니다.
  // 품질 평가는 출처/분석 보강을 위한 감사 정보로 유지하되,
  // 기존 원문을 자동으로 비공개 처리하지 않습니다.
  if (data.active === false) {
    result.active = false;
  }

  return result;
}

/**
 * 메인 실행 함수
 */
function main() {
  console.log('\n📰 뉴스 JSON 생성 시작...\n');

  // 출력 디렉토리 생성
  ensureDir(OUTPUT_DIR);
  ensureDir(PUBLIC_API_DIR);

  // 생성물에 남아 있는 이전 로케일 콘텐츠가 fallback을 우회하지 않도록
  // 뉴스 출력 디렉토리는 매번 원문 로케일 기준으로 재생성한다.
  fs.rmSync(CONTENT_OUTPUT_DIR, { recursive: true, force: true });
  fs.rmSync(PUBLIC_CONTENT_OUTPUT_DIR, { recursive: true, force: true });
  ensureDir(CONTENT_OUTPUT_DIR);
  ensureDir(PUBLIC_CONTENT_OUTPUT_DIR);

  // 콘텐츠 디렉토리 존재 확인
  if (!fs.existsSync(CONTENT_DIR)) {
    console.error(`❌ 콘텐츠 디렉토리가 없습니다: ${CONTENT_DIR}`);
    process.exit(1);
  }

  // 모든 뉴스 메타데이터 수집
  const allNewsMeta = [];
  let publishedCount = 0;
  let explicitlyDisabledCount = 0;

  // 로케일 디렉토리 순회
  const sourceLocaleDir = path.join(CONTENT_DIR, SOURCE_LOCALE);
  const localeDirs = fs.existsSync(sourceLocaleDir) ? [SOURCE_LOCALE] : [];

  console.log(`  [원문] 로케일: ${localeDirs.join(', ') || '(없음)'}`);

  for (const locale of localeDirs) {
    const localeDir = path.join(CONTENT_DIR, locale);
    const localeOutputDir = path.join(CONTENT_OUTPUT_DIR, locale);
    const publicLocaleOutputDir = path.join(PUBLIC_CONTENT_OUTPUT_DIR, locale);

    // 로케일별 출력 디렉토리 생성
    ensureDir(localeOutputDir);
    ensureDir(publicLocaleOutputDir);

    // 마크다운 파일 순회
    const mdFiles = fs.readdirSync(localeDir).filter((file) => file.endsWith('.md'));

    console.log(`  [처리] ${locale}: ${mdFiles.length}개 파일`);

    for (const mdFile of mdFiles) {
      const filePath = path.join(localeDir, mdFile);
      const newsData = parseNewsFile(filePath, locale);

      if (newsData.active === false) explicitlyDisabledCount += 1;
      else publishedCount += 1;

      // 메타데이터 (목록용 - content 제외)
      const meta = { ...newsData };
      delete meta.content;
      allNewsMeta.push(meta);

      // 상세 데이터 (본문 포함)
      const contentOutputPath = path.join(localeOutputDir, `${newsData.slug}.json`);
      fs.writeFileSync(contentOutputPath, JSON.stringify(newsData, null, 2), 'utf8');

      // Workers 런타임의 공개 ASSETS에는 원문 전체를 복사한다.
      // 명시적으로 비활성화한 원문만 공개 경계에서 제외한다.
      if (newsData.active !== false) {
        const publicContentOutputPath = path.join(
          publicLocaleOutputDir,
          `${newsData.slug}.json`,
        );
        fs.writeFileSync(publicContentOutputPath, JSON.stringify(newsData, null, 2), 'utf8');
      }
    }
  }

  // 메타데이터를 날짜순으로 정렬 (최신순)
  allNewsMeta.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // news-meta.json 저장
  fs.writeFileSync(META_OUTPUT, JSON.stringify(allNewsMeta, null, 2), 'utf8');

  // 외부 연동용 공개 API JSON 생성 (영어 + active 뉴스만)
  const publicApiData = allNewsMeta
    .filter((item) => item.locale === 'en' && item.active !== false)
    .map((item) => ({
      title: item.title,
      summary: item.excerpt,
      slug: item.slug,
      date: item.date,
      updatedAt: item.updatedAt,
      author: item.author,
      category: item.category,
      sources: item.sources,
      url: `${PUBLIC_SITE_URL}/en/news/${item.slug}`,
    }));
  fs.writeFileSync(PUBLIC_API_OUTPUT, JSON.stringify(publicApiData, null, 2), 'utf8');

  writeRuntimeModule();

  console.log(`\n✅ 생성 완료!`);
  console.log(`   - 메타데이터: ${path.relative(process.cwd(), META_OUTPUT)}`);
  console.log(`   - 콘텐츠: ${path.relative(process.cwd(), CONTENT_OUTPUT_DIR)}/`);
  console.log(`   - 공개 API: ${path.relative(process.cwd(), PUBLIC_API_OUTPUT)} (${publicApiData.length}개)`);
  console.log(`   - 총 ${allNewsMeta.length}개 뉴스 처리됨\n`);
  console.log(
    `   - 공개 상태: ${publishedCount}개 공개 / ${explicitlyDisabledCount}개 명시적 비활성\n`,
  );
}

// 스크립트 실행
main();

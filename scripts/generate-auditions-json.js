/**
 * Convert audition Markdown files to importable JSON before Next.js runs.
 *
 * Source: src/content/auditions/{locale}/{slug}.md
 * Output:
 * - src/generated/auditions-meta.json
 * - src/generated/auditions-content/{locale}/{slug}.json
 * - public/api/auditions-content/{locale}/{slug}.json (Workers ASSETS)
 * - src/generated/auditions-runtime.ts (Pages/Workers loader)
 */

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTENT_DIR = path.join(__dirname, '../src/content/auditions');
const OUTPUT_DIR = path.join(__dirname, '../src/generated');
const META_OUTPUT = path.join(OUTPUT_DIR, 'auditions-meta.json');
const CONTENT_OUTPUT_DIR = path.join(OUTPUT_DIR, 'auditions-content');
const PUBLIC_API_DIR = path.join(__dirname, '../public/api');
const PUBLIC_CONTENT_OUTPUT_DIR = path.join(PUBLIC_API_DIR, 'auditions-content');
const RUNTIME_OUTPUT = path.join(OUTPUT_DIR, 'auditions-runtime.ts');

const ALLOWED_LOCALES = new Set(['ko', 'en', 'ja', 'zh', 'es', 'fr', 'de']);
const ALLOWED_MODES = new Set(['online', 'offline', 'hybrid']);
const ALLOWED_STATUSES = new Set(['open', 'closing', 'ongoing', 'closed']);

/**
 * Build-target-specific audition content loader.
 *
 * Pages/test builds import generated JSON directly. Workers requests read
 * public JSON through the OpenNext ASSETS binding so dynamic detail routes do
 * not need to bundle every Markdown-derived record.
 */
function writeRuntimeModule() {
  const isWorkersBuild = process.env.NEXT_RUNTIME_TARGET === 'workers';

  const workersModule = `import { getCloudflareContext } from '@opennextjs/cloudflare';

export interface GeneratedAuditionPost {
  slug: string;
  locale: string;
  title: string;
  excerpt: string;
  agency: string;
  publishedAt: string;
  updatedAt: string;
  applicationStart?: string;
  applicationDeadline?: string;
  auditionDate?: string;
  timezone?: string;
  mode: 'online' | 'offline' | 'hybrid';
  country?: string;
  city?: string;
  venueName?: string;
  venueAddress?: string;
  virtualLocationUrl?: string;
  categories: string[];
  eligibility: string;
  status: 'open' | 'closing' | 'ongoing' | 'closed';
  officialUrl: string;
  sourceUrl: string;
  verifiedAt: string;
  poster: string;
  posterAlt: string;
  posterWidth: number;
  posterHeight: number;
  content: string;
  active?: boolean;
}

export async function loadAuditionPost(
  slug: string,
  locale: string,
): Promise<GeneratedAuditionPost | null> {
  try {
    const { env } = getCloudflareContext();
    if (!env.ASSETS) return null;

    const assetPath = \`/api/auditions-content/\${encodeURIComponent(locale)}/\${encodeURIComponent(slug)}.json\`;
    const response = await env.ASSETS.fetch(new URL(assetPath, 'http://assets.local'));

    if (!response.ok) {
      await response.body?.cancel();
      return null;
    }

    return (await response.json()) as GeneratedAuditionPost;
  } catch {
    return null;
  }
}
`;

  const pagesModule = `export interface GeneratedAuditionPost {
  slug: string;
  locale: string;
  title: string;
  excerpt: string;
  agency: string;
  publishedAt: string;
  updatedAt: string;
  applicationStart?: string;
  applicationDeadline?: string;
  auditionDate?: string;
  timezone?: string;
  mode: 'online' | 'offline' | 'hybrid';
  country?: string;
  city?: string;
  venueName?: string;
  venueAddress?: string;
  virtualLocationUrl?: string;
  categories: string[];
  eligibility: string;
  status: 'open' | 'closing' | 'ongoing' | 'closed';
  officialUrl: string;
  sourceUrl: string;
  verifiedAt: string;
  poster: string;
  posterAlt: string;
  posterWidth: number;
  posterHeight: number;
  content: string;
  active?: boolean;
}

export async function loadAuditionPost(
  slug: string,
  locale: string,
): Promise<GeneratedAuditionPost | null> {
  try {
    const auditionModule = await import(\`@/generated/auditions-content/\${locale}/\${slug}.json\`);
    return auditionModule.default as GeneratedAuditionPost;
  } catch {
    return null;
  }
}
`;

  fs.writeFileSync(RUNTIME_OUTPUT, isWorkersBuild ? workersModule : pagesModule, 'utf8');
}

function fail(filePath, message) {
  throw new Error(`[auditions] ${path.relative(process.cwd(), filePath)}: ${message}`);
}

function requireString(data, key, filePath) {
  const value = data[key];
  if (typeof value !== 'string' || value.trim() === '') {
    fail(filePath, `frontmatter '${key}' must be a non-empty string`);
  }
  return value.trim();
}

function optionalString(data, key, filePath) {
  const value = data[key];
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') {
    fail(filePath, `frontmatter '${key}' must be a string when provided`);
  }
  return value.trim();
}

function requireStringArray(data, key, filePath) {
  const value = data[key];
  if (!Array.isArray(value) || value.length === 0 || value.some((item) => typeof item !== 'string' || item.trim() === '')) {
    fail(filePath, `frontmatter '${key}' must be a non-empty string array`);
  }
  return value.map((item) => item.trim());
}

function requirePositiveInteger(data, key, filePath) {
  const value = data[key];
  if (!Number.isInteger(value) || value <= 0) {
    fail(filePath, `frontmatter '${key}' must be a positive integer`);
  }
  return value;
}

function validateDate(value, key, filePath) {
  if (value === undefined) return;
  if (Number.isNaN(Date.parse(value))) {
    fail(filePath, `frontmatter '${key}' must be an ISO-compatible date`);
  }
}

function validateUrl(value, key, filePath, allowLocal = false) {
  if (allowLocal && value.startsWith('/')) return;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('unsupported protocol');
  } catch {
    fail(filePath, `frontmatter '${key}' must be an HTTP(S) URL${allowLocal ? ' or root-relative path' : ''}`);
  }
}

function parseAuditionFile(filePath, locale) {
  const fileContents = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(fileContents);
  const slug = path.basename(filePath, '.md');

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    fail(filePath, 'filename must be a lowercase kebab-case slug');
  }
  if (content.trim() === '') fail(filePath, 'Markdown body must not be empty');

  const mode = requireString(data, 'mode', filePath);
  const status = requireString(data, 'status', filePath);
  if (!ALLOWED_MODES.has(mode)) fail(filePath, `unsupported mode '${mode}'`);
  if (!ALLOWED_STATUSES.has(status)) fail(filePath, `unsupported status '${status}'`);

  const result = {
    slug,
    locale,
    title: requireString(data, 'title', filePath),
    excerpt: requireString(data, 'excerpt', filePath),
    agency: requireString(data, 'agency', filePath),
    publishedAt: requireString(data, 'publishedAt', filePath),
    updatedAt: requireString(data, 'updatedAt', filePath),
    applicationStart: optionalString(data, 'applicationStart', filePath),
    applicationDeadline: optionalString(data, 'applicationDeadline', filePath),
    auditionDate: optionalString(data, 'auditionDate', filePath),
    timezone: optionalString(data, 'timezone', filePath),
    mode,
    country: optionalString(data, 'country', filePath),
    city: optionalString(data, 'city', filePath),
    venueName: optionalString(data, 'venueName', filePath),
    venueAddress: optionalString(data, 'venueAddress', filePath),
    virtualLocationUrl: optionalString(data, 'virtualLocationUrl', filePath),
    categories: requireStringArray(data, 'categories', filePath),
    eligibility: requireString(data, 'eligibility', filePath),
    status,
    officialUrl: requireString(data, 'officialUrl', filePath),
    sourceUrl: requireString(data, 'sourceUrl', filePath),
    verifiedAt: requireString(data, 'verifiedAt', filePath),
    poster: requireString(data, 'poster', filePath),
    posterAlt: requireString(data, 'posterAlt', filePath),
    posterWidth: requirePositiveInteger(data, 'posterWidth', filePath),
    posterHeight: requirePositiveInteger(data, 'posterHeight', filePath),
    content: content.trim(),
  };

  for (const key of ['publishedAt', 'updatedAt', 'applicationStart', 'applicationDeadline', 'auditionDate', 'verifiedAt']) {
    validateDate(result[key], key, filePath);
  }
  validateUrl(result.officialUrl, 'officialUrl', filePath);
  validateUrl(result.sourceUrl, 'sourceUrl', filePath);
  validateUrl(result.poster, 'poster', filePath, true);
  if (result.virtualLocationUrl) validateUrl(result.virtualLocationUrl, 'virtualLocationUrl', filePath);

  if (data.active !== undefined) {
    if (typeof data.active !== 'boolean') fail(filePath, "frontmatter 'active' must be boolean");
    result.active = data.active;
  }

  return result;
}

function main() {
  console.log('\nAudition JSON generation started.\n');

  if (!fs.existsSync(CONTENT_DIR)) {
    throw new Error(`[auditions] content directory not found: ${CONTENT_DIR}`);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.rmSync(CONTENT_OUTPUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(CONTENT_OUTPUT_DIR, { recursive: true });
  fs.mkdirSync(PUBLIC_API_DIR, { recursive: true });
  fs.rmSync(PUBLIC_CONTENT_OUTPUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(PUBLIC_CONTENT_OUTPUT_DIR, { recursive: true });
  writeRuntimeModule();

  const allMeta = [];
  const seen = new Set();
  const localeDirs = fs.readdirSync(CONTENT_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const locale of localeDirs) {
    if (!ALLOWED_LOCALES.has(locale)) {
      throw new Error(`[auditions] unsupported locale directory '${locale}'`);
    }

    const localeDir = path.join(CONTENT_DIR, locale);
    const localeOutputDir = path.join(CONTENT_OUTPUT_DIR, locale);
    const publicLocaleOutputDir = path.join(PUBLIC_CONTENT_OUTPUT_DIR, locale);
    fs.mkdirSync(localeOutputDir, { recursive: true });
    fs.mkdirSync(publicLocaleOutputDir, { recursive: true });

    const markdownFiles = fs.readdirSync(localeDir)
      .filter((file) => file.endsWith('.md'))
      .sort();

    console.log(`  ${locale}: ${markdownFiles.length} file(s)`);

    for (const markdownFile of markdownFiles) {
      const filePath = path.join(localeDir, markdownFile);
      const audition = parseAuditionFile(filePath, locale);
      const key = `${audition.locale}:${audition.slug}`;
      if (seen.has(key)) fail(filePath, `duplicate locale/slug '${key}'`);
      seen.add(key);

      const meta = { ...audition };
      delete meta.content;
      allMeta.push(meta);
      fs.writeFileSync(
        path.join(localeOutputDir, `${audition.slug}.json`),
        JSON.stringify(audition, null, 2),
        'utf8',
      );

      // Workers ASSETS should expose only active audition details.
      if (audition.active !== false) {
        fs.writeFileSync(
          path.join(publicLocaleOutputDir, `${audition.slug}.json`),
          JSON.stringify(audition, null, 2),
          'utf8',
        );
      }
    }
  }

  allMeta.sort((a, b) => {
    const aDate = a.applicationDeadline || a.updatedAt;
    const bDate = b.applicationDeadline || b.updatedAt;
    return Date.parse(aDate) - Date.parse(bDate);
  });

  fs.writeFileSync(META_OUTPUT, JSON.stringify(allMeta, null, 2), 'utf8');
  console.log(`\nAudition JSON generation complete: ${allMeta.length} record(s).\n`);
}

main();

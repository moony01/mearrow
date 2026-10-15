#!/usr/bin/env node

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_KAKAO_JS_KEY',
];
const missing = required.filter((name) => !process.env[name]?.trim());
const canonicalSiteOrigin = 'https://mearrow.com';
const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

if (missing.length > 0) {
  console.error(
    `[deploy-env] Missing required deployment environment variable(s): ${missing.join(', ')}`,
  );
  console.error(
    '[deploy-env] Refusing to build or deploy because a required browser integration is unavailable.',
  );
  process.exit(1);
}

if (configuredSiteUrl) {
  let parsedSiteUrl;
  try {
    parsedSiteUrl = new URL(configuredSiteUrl);
  } catch {
    console.error('[deploy-env] NEXT_PUBLIC_SITE_URL is not a valid URL.');
    process.exit(1);
  }

  if (
    parsedSiteUrl.origin !== canonicalSiteOrigin ||
    parsedSiteUrl.username ||
    parsedSiteUrl.password
  ) {
    console.error(
      `[deploy-env] NEXT_PUBLIC_SITE_URL must use the canonical origin ${canonicalSiteOrigin}.`,
    );
    process.exit(1);
  }
}

let parsedUrl;
try {
  parsedUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
} catch {
  console.error('[deploy-env] NEXT_PUBLIC_SUPABASE_URL is not a valid URL.');
  process.exit(1);
}

if (parsedUrl.protocol !== 'https:') {
  console.error('[deploy-env] NEXT_PUBLIC_SUPABASE_URL must use HTTPS.');
  process.exit(1);
}

if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length < 20) {
  console.error('[deploy-env] NEXT_PUBLIC_SUPABASE_ANON_KEY is unexpectedly short.');
  process.exit(1);
}

console.log(
  `[deploy-env] OK: ${parsedUrl.origin}; NEXT_PUBLIC_SUPABASE_ANON_KEY present (length=${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length})`,
);

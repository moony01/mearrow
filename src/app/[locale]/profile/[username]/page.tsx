import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import PublicProfileClient from '@/components/features/profile/PublicProfileClient';
import { BRAND_NAME } from '@/lib/brand';
import {
  FULL_URL,
  PUBLIC_PROFILE_STATIC_SHELL_USERNAME,
  SUPPORTED_LOCALES,
} from '@/lib/constants';
import { JsonLd } from '@/components/common/JsonLd';
import { generatePageMetadata } from '@/lib/seo';

interface PublicProfilePageProps {
  params: Promise<{
    locale: string;
    username: string;
  }>;
}

/**
 * Public profiles are loaded from Supabase in the client. Pages needs one
 * concrete shell path because arbitrary database usernames are not known at
 * build time. Workers keeps the dynamic route server-rendered so every
 * username can resolve at request time.
 */
export function generateStaticParams() {
  if (process.env.NEXT_RUNTIME_TARGET === 'workers') {
    return [];
  }

  return SUPPORTED_LOCALES.map((locale) => ({
    locale,
    username: PUBLIC_PROFILE_STATIC_SHELL_USERNAME,
  }));
}

function decodeUsername(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function generateMetadata({
  params,
}: PublicProfilePageProps): Promise<Metadata> {
  const { locale, username: rawUsername } = await params;
  const username = decodeUsername(rawUsername);
  const t = await getTranslations({ locale, namespace: 'PublicProfile' });

  return {
    ...generatePageMetadata({
      locale,
      pathname: `/profile/${encodeURIComponent(username)}`,
      title: `${username} | ${t('title_suffix')} | ${BRAND_NAME}`,
      description: `${t('public')}: ${username}. ${t('posts')}. ${t('activities')}.`,
    }),
    robots: { index: false, follow: false },
  };
}

export default async function PublicProfilePage({
  params,
}: PublicProfilePageProps) {
  const { locale, username: rawUsername } = await params;
  setRequestLocale(locale);
  const username = decodeUsername(rawUsername);
  const profileJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    name: `${username} | ${BRAND_NAME}`,
    url: `${FULL_URL}/${locale}/profile/${encodeURIComponent(username)}`,
    inLanguage: locale,
    isPartOf: { '@type': 'WebSite', name: BRAND_NAME, url: FULL_URL },
  };

  return (
    <>
      <JsonLd data={profileJsonLd} />
      <PublicProfileClient locale={locale} username={username} />
    </>
  );
}

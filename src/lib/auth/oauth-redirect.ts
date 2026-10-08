import { SITE_URL } from '@/lib/constants';

export interface OAuthCallbackOptions {
  returnTo?: string | null;
  flow?: 'signup';
}

function getOAuthOrigin(): string {
  if (process.env.NODE_ENV === 'production') {
    return SITE_URL;
  }

  return typeof window === 'undefined' ? SITE_URL : window.location.origin;
}

/** Build the locale-free callback URL used by browser OAuth flows. */
export function getOAuthCallbackUrl(
  _locale: string,
  options: OAuthCallbackOptions = {},
): string {
  const callback = new URL('/auth/callback', getOAuthOrigin());

  if (options.returnTo) {
    callback.searchParams.set('returnTo', options.returnTo);
  }

  if (options.flow) {
    callback.searchParams.set('flow', options.flow);
  }

  return callback.toString();
}

import { afterEach, describe, expect, it, vi } from 'vitest';
import { getOAuthCallbackUrl } from './oauth-redirect';

vi.hoisted(() => {
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://mearrow.com');
});

describe('getOAuthCallbackUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses the canonical locale-free callback URL in production', () => {
    vi.stubEnv('NODE_ENV', 'production');

    expect(getOAuthCallbackUrl('ko')).toBe('https://mearrow.com/auth/callback');
  });

  it('uses the current browser origin in development', () => {
    vi.stubEnv('NODE_ENV', 'development');

    expect(new URL(getOAuthCallbackUrl('en')).origin).toBe(window.location.origin);
    expect(new URL(getOAuthCallbackUrl('en')).pathname).toBe('/auth/callback');
  });

  it('preserves supported OAuth callback query parameters', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const returnTo = 'https://mearrow.com/news?tab=latest&sort=desc';

    const loginCallback = getOAuthCallbackUrl('ko', { returnTo });
    const signupCallback = getOAuthCallbackUrl('ko', { flow: 'signup' });

    expect(new URL(loginCallback).searchParams.get('returnTo')).toBe(returnTo);
    expect(new URL(signupCallback).searchParams.get('flow')).toBe('signup');
  });

  it('ignores locale values in the callback path', () => {
    vi.stubEnv('NODE_ENV', 'production');

    const redirect = new URL(getOAuthCallbackUrl('//attacker'));

    expect(redirect.origin).toBe('https://mearrow.com');
    expect(redirect.pathname).toBe('/auth/callback');
  });
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SignupForm from './index';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  signInWithOAuth: vi.fn(),
}));

vi.mock('next-intl', () => ({
  useLocale: () => 'ko',
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: mocks.createClient,
}));

describe('SignupForm OAuth redirect', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
    mocks.createClient.mockReset();
    mocks.signInWithOAuth.mockReset();
    mocks.signInWithOAuth.mockResolvedValue({ error: null });
    mocks.createClient.mockReturnValue({
      auth: { signInWithOAuth: mocks.signInWithOAuth },
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each([
    ['google', 'google_login'],
    ['kakao', 'kakao_login'],
  ] as const)('uses the canonical production callback for %s signup', async (provider, label) => {
    render(<SignupForm />);
    fireEvent.click(screen.getByRole('button', { name: label }));

    await waitFor(() => expect(mocks.signInWithOAuth).toHaveBeenCalledTimes(1));

    const [{ options }] = mocks.signInWithOAuth.mock.calls[0];
    const redirect = new URL(options.redirectTo);
    expect(redirect.origin).toBe('https://mearrow.com');
    expect(redirect.pathname).toBe('/auth/callback');
    expect(redirect.searchParams.get('flow')).toBe('signup');
    expect(mocks.signInWithOAuth.mock.calls[0][0].provider).toBe(provider);
  });
});

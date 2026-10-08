import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import LoginForm from './index';
import { DEVELOPMENT_TEST_MODE_STORAGE_KEY } from '@/lib/auth/development-test-mode';
import { VOTE_QUOTA_STORAGE_KEY } from '@/lib/vote-quota';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  signInWithOAuth: vi.fn(),
  routerReplace: vi.fn(),
  getSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('next-intl', () => ({
  useLocale: () => 'ko',
  useTranslations: () => (key: string) => key,
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => mocks.getSearchParams(),
  useRouter: () => ({ replace: mocks.routerReplace }),
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: mocks.createClient,
}));

describe('LoginForm development controls', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development');
    window.localStorage.clear();
    mocks.createClient.mockReset();
    mocks.signInWithOAuth.mockReset();
    mocks.routerReplace.mockReset();
    mocks.getSearchParams.mockReset();
    mocks.getSearchParams.mockReturnValue(new URLSearchParams());
    mocks.createClient.mockReturnValue({
      auth: { signInWithOAuth: mocks.signInWithOAuth },
    });
    mocks.signInWithOAuth.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('renders the controls only in development and exposes the local authenticated test session', () => {
    window.localStorage.setItem(DEVELOPMENT_TEST_MODE_STORAGE_KEY, 'true');

    render(<LoginForm />);

    expect(screen.getByTestId('developer-auth-tools')).toBeDefined();
    expect(screen.getByTestId('guest-quota-reset')).toBeDefined();
    expect(screen.getByTestId('developer-test-mode-status').textContent).toContain(
      'local authenticated user',
    );
    expect((screen.getByRole('button', { name: 'google_login' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it('returns to the local home when an active test session reopens the login page', () => {
    window.localStorage.setItem(DEVELOPMENT_TEST_MODE_STORAGE_KEY, 'true');

    render(<LoginForm />);

    expect(mocks.routerReplace).toHaveBeenCalledWith('/');
  });

  it('keeps the server markup independent of the browser test-mode marker', () => {
    window.localStorage.setItem(DEVELOPMENT_TEST_MODE_STORAGE_KEY, 'true');

    const markup = renderToString(<LoginForm />);

    expect(markup).toContain('Developer test login');
    expect(markup).toContain('aria-pressed="false"');
    expect(markup).not.toContain('disabled=""');
  });

  it('activates the local developer login and routes to the local home', () => {
    render(<LoginForm />);

    fireEvent.click(screen.getByTestId('developer-test-mode-toggle'));

    expect(window.localStorage.getItem(DEVELOPMENT_TEST_MODE_STORAGE_KEY)).toBe('true');
    expect(mocks.routerReplace).toHaveBeenCalledWith('/');
    expect(screen.getByTestId('developer-test-mode-status').textContent).toContain(
      'local authenticated user',
    );
  });

  it('resets only the local guest quota from the development control', () => {
    render(<LoginForm />);

    fireEvent.click(screen.getByTestId('guest-quota-reset'));

    expect(JSON.parse(window.localStorage.getItem(VOTE_QUOTA_STORAGE_KEY) ?? '')).toMatchObject({
      used: 0,
      max: 100,
    });
  });

  it('resets only the local quota even when the local test session is active', () => {
    window.localStorage.setItem(DEVELOPMENT_TEST_MODE_STORAGE_KEY, 'true');

    render(<LoginForm />);

    fireEvent.click(screen.getByTestId('guest-quota-reset'));

    expect(JSON.parse(window.localStorage.getItem(VOTE_QUOTA_STORAGE_KEY) ?? '')).toMatchObject({
      used: 0,
      max: 100,
    });
  });

  it('does not render development controls in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    window.localStorage.setItem(DEVELOPMENT_TEST_MODE_STORAGE_KEY, 'true');

    render(<LoginForm />);

    expect(screen.queryByTestId('developer-auth-tools')).toBeNull();
    expect(screen.queryByTestId('guest-quota-reset')).toBeNull();
    expect((screen.getByRole('button', { name: 'google_login' }) as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it.each([
    ['google', 'google_login'],
    ['kakao', 'kakao_login'],
  ] as const)('uses the canonical production callback for %s login', async (provider, label) => {
    vi.stubEnv('NODE_ENV', 'production');
    const returnTo = 'https://mearrow.com/news?source=login';
    mocks.getSearchParams.mockReturnValue(new URLSearchParams({ returnTo }));

    render(<LoginForm />);
    fireEvent.click(screen.getByRole('button', { name: label }));

    await waitFor(() => expect(mocks.signInWithOAuth).toHaveBeenCalledTimes(1));

    const [{ options }] = mocks.signInWithOAuth.mock.calls[0];
    const redirect = new URL(options.redirectTo);
    expect(redirect.origin).toBe('https://mearrow.com');
    expect(redirect.pathname).toBe('/auth/callback');
    expect(redirect.searchParams.get('returnTo')).toBe(returnTo);
    expect(mocks.signInWithOAuth.mock.calls[0][0].provider).toBe(provider);
  });
});

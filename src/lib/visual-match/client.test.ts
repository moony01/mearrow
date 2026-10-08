import { beforeEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.fn();

vi.mock('@/lib/supabase/client', () => ({
  getSupabase: () => ({
    functions: { invoke },
    storage: { from: vi.fn() },
  }),
}));

vi.mock('@/lib/auth/development-test-mode', () => ({
  isDevelopmentTestModeEnabled: () => false,
}));

import {
  createVisualMatchCheckout,
  isValidPendingVisualMatchRequest,
  type PendingVisualMatchRequest,
} from './client';

const request: PendingVisualMatchRequest = {
  imageStorageKey: 'inputs/test/image.jpg',
  imageMimeType: 'image/jpeg',
  age: 20,
  gender: 'female',
  height: 165,
  country: 'KR',
  primaryField: 'vocal',
  interests: ['vocal'],
  concepts: ['fresh'],
  reportLanguage: 'ko',
  saveOriginal: false,
};

describe('createVisualMatchCheckout', () => {
  beforeEach(() => {
    invoke.mockReset();
  });

  it('preserves an Edge Function HTTP status and safe error code', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: {
        message: 'Edge Function returned a non-2xx status code',
        context: {
          status: 401,
          clone: () => ({ json: async () => ({ error: 'UNAUTHORIZED' }) }),
        },
      },
    });

    await expect(createVisualMatchCheckout(request, 'ko', 'idempotency-key')).rejects.toThrow(
      'CHECKOUT_REQUEST_FAILED:401:UNAUTHORIZED',
    );
  });

  it('preserves the status when the error body cannot be parsed safely', async () => {
    invoke.mockResolvedValue({
      data: null,
      error: {
        message: 'Edge Function returned a non-2xx status code',
        context: {
          status: 502,
          clone: () => ({ json: async () => { throw new Error('not json'); } }),
        },
      },
    });

    await expect(createVisualMatchCheckout(request, 'ko', 'idempotency-key')).rejects.toThrow(
      'CHECKOUT_REQUEST_FAILED:502',
    );
  });
});

describe('isValidPendingVisualMatchRequest', () => {
  it('accepts the shape produced by the survey', () => {
    expect(isValidPendingVisualMatchRequest(request)).toBe(true);
  });

  it('rejects values that the checkout function rejects', () => {
    expect(isValidPendingVisualMatchRequest({ ...request, age: 20.5 })).toBe(false);
    expect(isValidPendingVisualMatchRequest({ ...request, height: Number.NaN })).toBe(false);
    expect(isValidPendingVisualMatchRequest({ ...request, reportLanguage: '' })).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { shouldOpenFeedComposer } from './compose-query';

describe('shouldOpenFeedComposer', () => {
  it('compose=1일 때 게시 composer를 연다', () => {
    expect(shouldOpenFeedComposer('?compose=1')).toBe(true);
  });

  it('다른 query나 값에서는 composer를 열지 않는다', () => {
    expect(shouldOpenFeedComposer('')).toBe(false);
    expect(shouldOpenFeedComposer('?compose=0')).toBe(false);
    expect(shouldOpenFeedComposer('?compose=true')).toBe(false);
  });
});

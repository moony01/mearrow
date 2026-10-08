import { describe, expect, it } from 'vitest';
import {
  getAuthenticatedRedirect,
  hasCompletedOnboarding,
} from './onboarding';

describe('onboarding profile authority', () => {
  it('서버 완료 마커가 저장된 프로필만 완료로 판단한다', () => {
    expect(hasCompletedOnboarding({ onboarding_completed: true })).toBe(true);
    expect(hasCompletedOnboarding({ onboarding_completed: false })).toBe(false);
    expect(hasCompletedOnboarding(undefined)).toBe(false);
  });

  it('완료 사용자는 홈으로 이동한다', () => {
    expect(
      getAuthenticatedRedirect({
        profile: { onboarding_completed: true },
      }),
    ).toBe('/');
  });

  it('완료 사용자만 검증된 returnTo로 이동한다', () => {
    expect(
      getAuthenticatedRedirect({
        profile: { onboarding_completed: true },
        returnTo: 'https://moony01.com/kpopface/',
      }),
    ).toBe('https://moony01.com/kpopface/');
  });

  it('신규·미완료 사용자는 returnTo가 있어도 온보딩을 우선한다', () => {
    expect(
      getAuthenticatedRedirect({
        profile: { onboarding_completed: false },
        returnTo: 'https://moony01.com/kpopface/',
      }),
    ).toBe('/onboarding');
  });
});

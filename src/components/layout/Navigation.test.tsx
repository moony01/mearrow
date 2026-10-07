import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

const navigationMocks = vi.hoisted(() => ({ pathname: '/ko' }));
import Sidebar from './Sidebar/index';
import BottomNav from './BottomNav/index';
import Header from './Header/index';
import { NextIntlClientProvider } from 'next-intl';

// next/navigation mock
vi.mock('next/navigation', () => ({
  usePathname: () => navigationMocks.pathname,
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('next-intl', async () => {
  const actual = await vi.importActual<typeof import('next-intl')>('next-intl');
  return {
    ...actual,
    useLocale: () => 'ko',
  };
});

// next/link mock
vi.mock('next/link', () => {
  return {
    __esModule: true,
    default: ({
      children,
      href,
      ...anchorProps
    }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
      href: string;
    }) => {
      return (
        <a href={href} {...anchorProps}>
          {children}
        </a>
      );
    },
  };
});

// useAuth mock — 비로그인 상태
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    profile: null,
    isAuthenticated: false,
    signOut: vi.fn(),
  }),
}));

// 현재 Feature Flags 기준 Nav 메시지
const messages = {
  Nav: {
    home: '홈',
    ranking: '랭킹',
    vote: '투표',
    upload: '업로드',
    profile: '프로필',
    hall_of_fame: '명예의 전당',
    news: '뉴스',
    auditions: '오디션',
    menu: '더보기',
    menu_close: '메뉴 닫기',
    menu_backdrop: '메뉴 배경 닫기',
    mobile_navigation: '모바일 주요 메뉴',
    following: '관심 피드',
    theme: '테마',
    settings: '설정',
    language: '언어',
    settings_close: '설정 닫기',
    mode_switch: '모드 전환',
    login: '로그인',
    logout: '로그아웃',
    my: '마이',
  },
};

describe('Navigation Components', () => {
  it('Sidebar는 Feature Flags에 따라 활성 메뉴만 렌더링한다', () => {
    render(
      <NextIntlClientProvider locale="ko" messages={messages}>
        <Sidebar />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole('complementary', { name: '주요 메뉴' })).toBeDefined();
    expect(screen.getByTestId('desktop-sidebar')).toBeDefined();
    expect(screen.getByText('MEARROW')).toBeDefined();

    // 모든 메뉴를 1뎁스 직접 링크로 노출한다.
    expect(screen.queryByRole('button', { name: '탐색' })).toBeNull();
    expect(screen.queryByRole('button', { name: '콘텐츠' })).toBeNull();
    expect(screen.getByText('홈')).toBeDefined();
    expect(screen.queryByText('명예의 전당')).toBeNull();
    expect(screen.queryByRole('link', { name: '뉴스' })).toBeNull();
    expect(screen.queryByRole('link', { name: '오디션' })).toBeNull();
    expect(screen.queryByRole('link', { name: '랭킹' })).toBeNull();
    expect(screen.queryByRole('menu')).toBeNull();

    // 비노출 메뉴
    expect(screen.queryByText('통계')).toBeNull();
    expect(screen.queryByText('커뮤니티')).toBeNull();
    expect(screen.queryByText('공지사항')).toBeNull();
    expect(screen.queryByRole('link', { name: '관심 피드' })).toBeNull();
    expect(screen.getByRole('link', { name: '홈' }).getAttribute('aria-current')).toBe('page');

    // AUTH_SYSTEM=true이므로 로그인 링크 표시 (비로그인 상태)
    expect(screen.getByText('로그인')).toBeDefined();
  });

  it('BottomNav는 모바일 소셜 핵심 동선 3개만 렌더링한다', () => {
    render(
      <NextIntlClientProvider locale="ko" messages={messages}>
        <BottomNav />
      </NextIntlClientProvider>,
    );

    const nav = screen.getByTestId('mobile-bottom-nav');
    expect(nav).toBeDefined();
    expect(screen.getAllByRole('link')).toHaveLength(3);
    expect(screen.getByRole('link', { name: '홈' }).getAttribute('href')).toBe('/ko');
    expect(screen.getByRole('link', { name: '업로드' }).getAttribute('href')).toBe('/ko/my?compose=1');
    expect(screen.getByRole('link', { name: '프로필' }).getAttribute('href')).toBe('/ko/login');
    expect(screen.getByRole('link', { name: '홈' }).getAttribute('aria-current')).toBe('page');
    expect(screen.queryByRole('link', { name: '투표' })).toBeNull();
    expect(screen.queryByRole('link', { name: '뉴스' })).toBeNull();
    expect(screen.queryByRole('link', { name: '명예의 전당' })).toBeNull();
    expect(screen.queryByRole('link', { name: '오디션' })).toBeNull();
  });

  it('피드 메뉴에서 분리된 뉴스 경로에서는 모바일 메뉴를 활성화하지 않는다', () => {
    navigationMocks.pathname = '/ko/news';

    render(
      <NextIntlClientProvider locale="ko" messages={messages}>
        <BottomNav />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole('link', { name: '홈' }).getAttribute('aria-current')).toBeNull();
    expect(screen.getByRole('link', { name: '프로필' }).getAttribute('aria-current')).toBeNull();
    expect(screen.getByRole('link', { name: '업로드' }).getAttribute('aria-current')).toBeNull();

    navigationMocks.pathname = '/ko';
  });

  it('모바일 헤더에 더보기 drawer를 노출하지 않는다', () => {
    render(
      <NextIntlClientProvider locale="ko" messages={messages}>
        <Header />
      </NextIntlClientProvider>,
    );

    expect(screen.queryByRole('link', { name: '명예의 전당' })).toBeNull();
    expect(screen.queryByRole('link', { name: '오디션' })).toBeNull();
    expect(screen.queryByRole('button', { name: '더보기' })).toBeNull();
    expect(screen.queryByRole('dialog', { name: '더보기' })).toBeNull();
  });

  it('헤더 설정 버튼은 설정 페이지로 이동한다', () => {
    render(
      <NextIntlClientProvider locale="ko" messages={messages}>
        <Header />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole('link', { name: '설정' }).getAttribute('href')).toBe('/ko/settings');
  });

  it('사이드바 설정 메뉴는 설정 페이지로 이동한다', () => {
    render(
      <NextIntlClientProvider locale="ko" messages={messages}>
        <Sidebar />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole('link', { name: '설정' }).getAttribute('href')).toBe('/ko/settings');
    expect(screen.queryByRole('dialog', { name: '설정' })).toBeNull();
  });
});

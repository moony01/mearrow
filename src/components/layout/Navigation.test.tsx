import { fireEvent, render, screen } from '@testing-library/react';
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
    expect(screen.getByText('명예의 전당')).toBeDefined();
    expect(screen.getByRole('link', { name: '뉴스' })).toBeDefined();
    expect(screen.getByRole('link', { name: '오디션' })).toBeDefined();
    expect(screen.getByRole('link', { name: '오디션' }).getAttribute('href')).toBe(
      '/ko/auditions',
    );
    expect(screen.queryByRole('menu')).toBeNull();

    // 비노출 메뉴
    expect(screen.queryByText('통계')).toBeNull();
    expect(screen.queryByText('커뮤니티')).toBeNull();
    expect(screen.queryByText('공지사항')).toBeNull();
    // 랭킹 메뉴는 전용 route로 노출
    expect(screen.getByRole('link', { name: '랭킹' }).getAttribute('href')).toBe('/ko/ranking');
    expect(screen.queryByRole('link', { name: '관심 피드' })).toBeNull();
    expect(screen.getByRole('link', { name: '홈' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: '랭킹' }).getAttribute('aria-current')).toBeNull();

    // AUTH_SYSTEM=true이므로 로그인 링크 표시 (비로그인 상태)
    expect(screen.getByText('로그인')).toBeDefined();
  });

  it('BottomNav는 모바일 핵심 동선 5개만 렌더링한다', () => {
    render(
      <NextIntlClientProvider locale="ko" messages={messages}>
        <BottomNav />
      </NextIntlClientProvider>,
    );

    const nav = screen.getByTestId('mobile-bottom-nav');
    expect(nav).toBeDefined();
    expect(screen.getAllByRole('link')).toHaveLength(5);
    expect(screen.getByRole('link', { name: '홈' }).getAttribute('href')).toBe('/ko');
    expect(screen.getByRole('link', { name: '투표' }).getAttribute('href')).toBe('/ko/ranking');
    expect(screen.getByRole('link', { name: '업로드' }).getAttribute('href')).toBe('/ko/my?compose=1');
    expect(screen.getByRole('link', { name: '뉴스' }).getAttribute('href')).toBe('/ko/news');
    expect(screen.getByRole('link', { name: '프로필' }).getAttribute('href')).toBe('/ko/login');
    expect(screen.getByRole('link', { name: '홈' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByRole('link', { name: '투표' }).getAttribute('aria-current')).toBeNull();
    expect(screen.queryByRole('link', { name: '명예의 전당' })).toBeNull();
    expect(screen.queryByRole('link', { name: '오디션' })).toBeNull();
  });

  it('BottomNav는 현재 하위 경로에서 홈을 활성화하지 않는다', () => {
    navigationMocks.pathname = '/ko/news';

    render(
      <NextIntlClientProvider locale="ko" messages={messages}>
        <BottomNav />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole('link', { name: '홈' }).getAttribute('aria-current')).toBeNull();
    expect(screen.getByRole('link', { name: '뉴스' }).getAttribute('aria-current')).toBe('page');

    navigationMocks.pathname = '/ko';
  });

  it('모바일 헤더 drawer에서 명예의 전당과 오디션을 제공한다', () => {
    render(
      <NextIntlClientProvider locale="ko" messages={messages}>
        <Header />
      </NextIntlClientProvider>,
    );

    expect(screen.queryByRole('link', { name: '명예의 전당' })).toBeNull();
    expect(screen.queryByRole('link', { name: '오디션' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '더보기' }));

    expect(screen.getByRole('dialog', { name: '더보기' })).toBeDefined();
    expect(screen.getByRole('link', { name: '명예의 전당' }).getAttribute('href')).toBe('/ko/hall-of-fame');
    expect(screen.getByRole('link', { name: '오디션' }).getAttribute('href')).toBe('/ko/auditions');

    fireEvent.click(screen.getByRole('button', { name: '메뉴 닫기' }));
    expect(screen.queryByRole('dialog', { name: '더보기' })).toBeNull();
  });

  it('설정 메뉴에서 테마와 언어 컨트롤을 제공하고 Escape로 닫힌다', () => {
    render(
      <NextIntlClientProvider locale="ko" messages={messages}>
        <Sidebar />
      </NextIntlClientProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: '설정' }));

    expect(screen.getByRole('dialog', { name: '설정' })).toBeDefined();
    expect(screen.getByRole('button', { name: /모드 전환/ })).toBeDefined();
    expect(screen.getByRole('combobox', { name: '언어' })).toBeDefined();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: '설정' })).toBeNull();
  });
});

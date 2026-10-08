import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import koMessages from '@/messages/ko.json';
import OnboardingClient from './OnboardingClient';

const mockReplace = vi.fn();
const mockUseAuth = vi.fn();
const mockFrom = vi.fn();
const mockRefreshProfile = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => '/onboarding',
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/lib/supabase/client', () => ({
  getSupabase: () => ({
    from: mockFrom,
  }),
}));

const messages = { Onboarding: koMessages.Onboarding };

function createProfileQuery(
  username = '테스터',
  favoriteGroupId: string | null = null,
  onboardingCompleted: boolean | null = false,
  updatedProfileId: string | null = 'user-1',
) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: {
      username,
      favorite_group_id: favoriteGroupId,
      onboarding_completed: onboardingCompleted,
    },
    error: null,
  });
  const selectEq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq: selectEq });
  const updateMaybeSingle = vi.fn().mockResolvedValue({
    data: updatedProfileId ? { id: updatedProfileId } : null,
    error: null,
  });
  const updateSelect = vi.fn().mockReturnValue({ maybeSingle: updateMaybeSingle });
  const updateEq = vi.fn().mockReturnValue({ select: updateSelect });
  const update = vi.fn().mockReturnValue({ eq: updateEq });

  return { select, update, updateEq, updateSelect, updateMaybeSingle };
}

function createGroupsQuery(groups: unknown[]) {
  const order = vi.fn().mockResolvedValue({ data: groups, error: null });
  const eq = vi.fn().mockReturnValue({ order });
  const select = vi.fn().mockReturnValue({ eq });

  return { select, order };
}

function onboardingTree() {
  return (
    <NextIntlClientProvider locale="ko" messages={messages}>
      <OnboardingClient />
    </NextIntlClientProvider>
  );
}

function renderWithIntl() {
  return render(onboardingTree());
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe('OnboardingClient', () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockUseAuth.mockReset();
    mockFrom.mockReset();
    mockRefreshProfile.mockReset();
    mockRefreshProfile.mockResolvedValue(undefined);
  });

  it('비로그인 상태에서 로그인 페이지로 리다이렉트한다', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
    });

    renderWithIntl();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/login');
    });
  });

  it('그룹 선택 없이 온보딩을 완료한 사용자도 재방문 시 홈으로 리다이렉트한다', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      isLoading: false,
      refreshProfile: mockRefreshProfile,
    });

    const groupsQuery = createGroupsQuery([]);
    const profileQuery = createProfileQuery(
      '테스터',
      null,
      true,
    );

    mockFrom.mockImplementation((table: string) => {
      if (table === 'groups') {
        return groupsQuery;
      }
      if (table === 'user_profiles') {
        return profileQuery;
      }
      throw new Error(`unexpected table: ${table}`);
    });

    renderWithIntl();

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });

  it('완료 프로필 응답을 확인하기 전과 리다이렉트 중에 온보딩 UI를 노출하지 않는다', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      isLoading: false,
      refreshProfile: mockRefreshProfile,
    });

    const profileResponse = createDeferred<{
      data: { username: string; onboarding_completed: boolean };
      error: null;
    }>();
    const maybeSingle = vi.fn().mockReturnValue(profileResponse.promise);
    const profileQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ maybeSingle }),
      }),
      update: vi.fn(),
    };
    const groupsQuery = createGroupsQuery([]);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'groups') return groupsQuery;
      if (table === 'user_profiles') return profileQuery;
      throw new Error(`unexpected table: ${table}`);
    });

    renderWithIntl();
    await waitFor(() => expect(maybeSingle).toHaveBeenCalled());

    expect(screen.queryByRole('button', { name: '나중에 하기' })).toBeNull();
    expect(screen.queryByRole('button', { name: '시작하기' })).toBeNull();
    expect(screen.queryByPlaceholderText('그룹 이름으로 검색...')).toBeNull();

    await act(async () => {
      profileResponse.resolve({
        data: { username: '테스터', onboarding_completed: true },
        error: null,
      });
      await Promise.resolve();
    });

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
    expect(screen.queryByRole('button', { name: '나중에 하기' })).toBeNull();
    expect(screen.queryByRole('button', { name: '시작하기' })).toBeNull();
  });

  it('프로필 조회가 실패하면 완료로 간주하지 않고 온보딩 폼을 보여준다', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      isLoading: false,
      refreshProfile: mockRefreshProfile,
    });

    const maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code: 'PGRST500', message: 'profile unavailable' },
    });
    const profileQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ maybeSingle }),
      }),
      update: vi.fn(),
    };
    const groupsQuery = createGroupsQuery([]);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'groups') return groupsQuery;
      if (table === 'user_profiles') return profileQuery;
      throw new Error(`unexpected table: ${table}`);
    });

    renderWithIntl();

    expect(await screen.findByRole('button', { name: '나중에 하기' })).toBeDefined();
    expect(mockReplace).not.toHaveBeenCalledWith('/');
    expect(consoleError).toHaveBeenCalledWith(
      '[Onboarding] 프로필 조회 실패:',
      expect.objectContaining({ code: 'PGRST500' }),
    );
    consoleError.mockRestore();
  });

  it('그룹 목록을 불러오고 한글/영문 검색이 동작한다', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      isLoading: false,
      refreshProfile: mockRefreshProfile,
    });

    const groups = [
      {
        id: 'group-aespa',
        name_ko: '에스파',
        name_en: 'aespa',
        company_id: 'company-sm',
        slug: 'aespa',
        group_type: 'girl',
        companies: { name_ko: 'SM', name_en: 'SM' },
      },
      {
        id: 'group-bts',
        name_ko: '방탄소년단',
        name_en: 'BTS',
        company_id: 'company-hybe',
        slug: 'bts',
        group_type: 'boy',
        companies: { name_ko: '하이브', name_en: 'HYBE' },
      },
    ];

    const groupsQuery = createGroupsQuery(groups);
    const profileQuery = createProfileQuery();

    mockFrom.mockImplementation((table: string) => {
      if (table === 'groups') {
        return groupsQuery;
      }
      if (table === 'user_profiles') {
        return profileQuery;
      }
      throw new Error(`unexpected table: ${table}`);
    });

    renderWithIntl();

    await waitFor(() => {
      expect(groupsQuery.order).toHaveBeenCalled();
    });

    fireEvent.change(screen.getByPlaceholderText('그룹 이름으로 검색...'), {
      target: { value: 'bts' },
    });

    await waitFor(() => {
      expect(screen.queryByText('에스파')).toBeNull();
      expect(screen.getByText('방탄소년단')).toBeDefined();
    });
  });

  it('그룹 선택 시 favorite_group_id를 저장하고 홈으로 이동한다', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      isLoading: false,
      refreshProfile: mockRefreshProfile,
    });

    const groups = [
      {
        id: 'group-aespa',
        name_ko: '에스파',
        name_en: 'aespa',
        company_id: 'company-sm',
        slug: 'aespa',
        group_type: 'girl',
        companies: { name_ko: 'SM', name_en: 'SM' },
      },
    ];

    const groupsQuery = createGroupsQuery(groups);
    const profileQuery = createProfileQuery();

    mockFrom.mockImplementation((table: string) => {
      if (table === 'groups') {
        return groupsQuery;
      }
      if (table === 'user_profiles') {
        return profileQuery;
      }
      throw new Error(`unexpected table: ${table}`);
    });

    renderWithIntl();

    await screen.findByDisplayValue('테스터');

    fireEvent.change(screen.getByPlaceholderText('그룹 이름으로 검색...'), {
      target: { value: '에스' },
    });

    fireEvent.mouseDown(await screen.findByText('에스파'));
    fireEvent.click(screen.getByRole('button', { name: '시작하기' }));

    await waitFor(() => {
      expect(profileQuery.update).toHaveBeenCalledWith({
        username: '테스터',
        favorite_group_id: 'group-aespa',
        onboarding_completed: true,
      });
      expect(profileQuery.updateEq).toHaveBeenCalledWith('id', 'user-1');
      expect(mockRefreshProfile).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });

  it('건너뛰기 버튼 클릭 시 홈으로 이동한다', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      isLoading: false,
      refreshProfile: mockRefreshProfile,
    });

    const groupsQuery = createGroupsQuery([]);
    const profileQuery = createProfileQuery();

    mockFrom.mockImplementation((table: string) => {
      if (table === 'groups') {
        return groupsQuery;
      }
      if (table === 'user_profiles') {
        return profileQuery;
      }
      throw new Error(`unexpected table: ${table}`);
    });

    renderWithIntl();

    await screen.findByDisplayValue('테스터');
    fireEvent.click(screen.getByRole('button', { name: '나중에 하기' }));

    await waitFor(() => {
      expect(profileQuery.update).toHaveBeenCalledWith({
        username: '테스터',
        onboarding_completed: true,
      });
      expect(profileQuery.updateEq).toHaveBeenCalledWith('id', 'user-1');
      expect(mockRefreshProfile).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });

  it('시작하기 update가 0개 행을 반환하면 저장 성공으로 처리하지 않는다', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      isLoading: false,
      refreshProfile: mockRefreshProfile,
    });

    const groups = [
      {
        id: 'group-aespa',
        name_ko: '에스파',
        name_en: 'aespa',
        company_id: 'company-sm',
        slug: 'aespa',
        group_type: 'girl',
        companies: { name_ko: 'SM', name_en: 'SM' },
      },
    ];
    const groupsQuery = createGroupsQuery(groups);
    const profileQuery = createProfileQuery('테스터', null, null, null);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'groups') return groupsQuery;
      if (table === 'user_profiles') return profileQuery;
      throw new Error(`unexpected table: ${table}`);
    });

    renderWithIntl();
    await screen.findByDisplayValue('테스터');
    fireEvent.change(screen.getByPlaceholderText('그룹 이름으로 검색...'), {
      target: { value: '에스' },
    });
    fireEvent.mouseDown(await screen.findByText('에스파'));
    fireEvent.click(screen.getByRole('button', { name: '시작하기' }));

    await waitFor(() => {
      expect(profileQuery.updateMaybeSingle).toHaveBeenCalled();
      expect(
        (screen.getByRole('button', { name: '시작하기' }) as HTMLButtonElement).disabled,
      ).toBe(false);
    });
    expect(mockRefreshProfile).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalledWith('/');
  });

  it('나중에 하기 update가 0개 행을 반환하면 저장 성공으로 처리하지 않는다', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1' },
      isLoading: false,
      refreshProfile: mockRefreshProfile,
    });

    const groupsQuery = createGroupsQuery([]);
    const profileQuery = createProfileQuery('테스터', null, null, null);
    mockFrom.mockImplementation((table: string) => {
      if (table === 'groups') return groupsQuery;
      if (table === 'user_profiles') return profileQuery;
      throw new Error(`unexpected table: ${table}`);
    });

    renderWithIntl();
    await screen.findByDisplayValue('테스터');
    fireEvent.click(screen.getByRole('button', { name: '나중에 하기' }));

    await waitFor(() => {
      expect(profileQuery.updateMaybeSingle).toHaveBeenCalled();
      expect(
        (screen.getByRole('button', { name: '나중에 하기' }) as HTMLButtonElement).disabled,
      ).toBe(false);
    });
    expect(mockRefreshProfile).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalledWith('/');
  });

  it('사용자가 바뀐 후 느리게 도착한 이전 프로필 응답을 무시한다', async () => {
    const userAProfile = createDeferred<{
      data: { username: string; onboarding_completed: boolean };
      error: null;
    }>();
    const userBProfile = createDeferred<{
      data: { username: string; onboarding_completed: boolean };
      error: null;
    }>();
    const profileEq = vi.fn((_column: string, userId: string) => ({
      maybeSingle: () =>
        userId === 'user-a' ? userAProfile.promise : userBProfile.promise,
    }));
    const profileQuery = {
      select: vi.fn().mockReturnValue({ eq: profileEq }),
      update: vi.fn(),
    };
    const groupsQuery = createGroupsQuery([]);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'groups') return groupsQuery;
      if (table === 'user_profiles') return profileQuery;
      throw new Error(`unexpected table: ${table}`);
    });

    mockUseAuth.mockReturnValue({
      user: { id: 'user-a' },
      isLoading: false,
      refreshProfile: mockRefreshProfile,
    });
    const view = renderWithIntl();
    await waitFor(() => expect(profileEq).toHaveBeenCalledWith('id', 'user-a'));

    mockUseAuth.mockReturnValue({
      user: { id: 'user-b' },
      isLoading: false,
      refreshProfile: mockRefreshProfile,
    });
    view.rerender(onboardingTree());
    await waitFor(() => expect(profileEq).toHaveBeenCalledWith('id', 'user-b'));

    await act(async () => {
      userAProfile.resolve({
        data: {
          username: '사용자A',
          onboarding_completed: true,
        },
        error: null,
      });
      await Promise.resolve();
    });
    expect(mockReplace).not.toHaveBeenCalledWith('/');

    await act(async () => {
      userBProfile.resolve({
        data: { username: '사용자B', onboarding_completed: false },
        error: null,
      });
      await Promise.resolve();
    });
    expect(await screen.findByDisplayValue('사용자B')).toBeDefined();
    expect(mockReplace).not.toHaveBeenCalledWith('/');
  });
});

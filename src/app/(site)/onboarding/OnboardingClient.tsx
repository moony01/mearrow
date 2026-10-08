'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import classNames from 'classnames';
import { useTranslations } from 'next-intl';
import { getSupabase } from '@/lib/supabase/client';
import { hasCompletedOnboarding } from '@/lib/auth/onboarding';
import { useAuth } from '@/hooks/useAuth';
import styles from './Onboarding.module.scss';

/** 닉네임 최소/최대 길이 상수 */
const NICKNAME_MIN_LENGTH = 2;
const NICKNAME_MAX_LENGTH = 20;

/** 검색 드롭다운 최소 입력 글자 수 */
const SEARCH_MIN_LENGTH = 2;

/** 드롭다운 최대 표시 결과 수 */
const DROPDOWN_MAX_RESULTS = 6;

interface CompanyRow {
  name_ko: string | null;
  name_en: string | null;
}

interface GroupRow {
  id: string;
  name_ko: string | null;
  name_en: string | null;
  company_id: string;
  slug: string;
  group_type: string | null;
  companies: CompanyRow | CompanyRow[] | null;
}

/** 로케일에 따라 한글/영문 이름을 반환 */
function toDisplayName(valueKo: string | null, valueEn: string | null, isKo: boolean) {
  if (isKo) {
    return valueKo || valueEn || '-';
  }
  return valueEn || valueKo || '-';
}

export default function OnboardingClient() {
  const t = useTranslations('Onboarding');
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname?.split('/')[1] || 'en';
  const isKo = locale === 'ko';

  const { user, isLoading, refreshProfile } = useAuth();
  const userId = user?.id;

  /* ─── 닉네임 관련 state ─── */
  const [nickname, setNickname] = useState('');
  const [nicknameError, setNicknameError] = useState('');
  const [loadedProfileUserId, setLoadedProfileUserId] = useState<string | null>(null);
  const [completedProfileUserId, setCompletedProfileUserId] = useState<string | null>(null);
  const isNicknameLoaded = Boolean(userId && loadedProfileUserId === userId);
  const hasCompletedProfile = Boolean(userId && completedProfileUserId === userId);

  /* ─── 그룹 검색 관련 state ─── */
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [search, setSearch] = useState('');
  const [isFetching, setIsFetching] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [selectedGroup, setSelectedGroup] = useState<GroupRow | null>(null);

  /* ─── 저장 관련 state ─── */
  const [isSaving, setIsSaving] = useState(false);

  /* ─── click-outside 감지용 ref ─── */
  const groupSearchRef = useRef<HTMLDivElement>(null);

  /** 비인증 사용자 리다이렉트 */
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(`/login`);
    }
  }, [isLoading, user, router, locale]);

  /** DB에서 온보딩 완료 상태와 현재 username 불러오기 */
  useEffect(() => {
    if (!userId) {
      return;
    }
    let cancelled = false;

    const fetchUsername = async () => {
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('user_profiles')
          .select('username, onboarding_completed')
          .eq('id', userId)
          .maybeSingle();

        if (cancelled) return;
        if (error && error.code !== 'PGRST116') {
          console.error('[Onboarding] 프로필 조회 실패:', error);
          setNickname('');
        } else if (hasCompletedOnboarding(data)) {
          setCompletedProfileUserId(userId);
          router.replace(`/`);
        } else if (data?.username) {
          setNickname(data.username);
        } else {
          setNickname('');
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[Onboarding] 프로필 조회 중 예외 발생:', err);
          setNickname('');
        }
      } finally {
        if (!cancelled) {
          setLoadedProfileUserId(userId);
        }
      }
    };

    fetchUsername();
    return () => {
      cancelled = true;
    };
  }, [userId, router, locale]);

  /** 그룹 목록 조회 */
  useEffect(() => {
    if (!user) {
      return;
    }

    const fetchGroups = async () => {
      setIsFetching(true);
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('groups')
          .select(
            'id, name_ko, name_en, company_id, slug, group_type, companies(name_ko, name_en)',
          )
          .eq('is_active', true)
          .order('name_en');

        if (error) {
          console.error('[Onboarding] 그룹 조회 실패:', error);
          setGroups([]);
          return;
        }

        setGroups((data ?? []) as GroupRow[]);
      } catch (err) {
        console.error('[Onboarding] 그룹 조회 중 예외 발생:', err);
        setGroups([]);
      } finally {
        setIsFetching(false);
      }
    };

    fetchGroups();
  }, [user]);

  /** click-outside로 드롭다운 닫기 */
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        groupSearchRef.current &&
        !groupSearchRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
        setHighlightedIndex(-1);
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);

  /** 검색 필터링 — 2글자 이상일 때만 필터 적용, 최대 6개 */
  const filteredGroups = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (keyword.length < SEARCH_MIN_LENGTH) {
      return [];
    }

    const matched = groups.filter((group) => {
      const ko = (group.name_ko || '').toLowerCase();
      const en = (group.name_en || '').toLowerCase();
      return ko.includes(keyword) || en.includes(keyword);
    });

    return matched.slice(0, DROPDOWN_MAX_RESULTS);
  }, [groups, search]);

  /** 그룹의 소속사 이름 추출 */
  const getCompanyName = useCallback(
    (group: GroupRow) => {
      const company = Array.isArray(group.companies)
        ? group.companies[0] || null
        : group.companies;

      return toDisplayName(company?.name_ko ?? null, company?.name_en ?? null, isKo);
    },
    [isKo],
  );

  /** 닉네임 유효성 검증 */
  const validateNickname = useCallback(
    (value: string): string => {
      const trimmed = value.trim();
      if (trimmed.length < NICKNAME_MIN_LENGTH) {
        return t('nickname_error_min');
      }
      if (trimmed.length > NICKNAME_MAX_LENGTH) {
        return t('nickname_error_max');
      }
      return '';
    },
    [t],
  );

  /** 닉네임 입력 변경 핸들러 */
  const handleNicknameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setNickname(value);

    /* 에러가 표시된 상태에서 수정 시 실시간으로 에러 제거 */
    if (nicknameError) {
      const error = validateNickname(value);
      if (!error) {
        setNicknameError('');
      }
    }
  };

  /** 검색 입력 변경 핸들러 */
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearch(value);
    setHighlightedIndex(-1);

    if (value.trim().length >= SEARCH_MIN_LENGTH) {
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  };

  /** 검색 입력 포커스 핸들러 */
  const handleSearchFocus = () => {
    if (search.trim().length >= SEARCH_MIN_LENGTH) {
      setShowDropdown(true);
    }
  };

  /** 드롭다운에서 그룹 선택 */
  const handleGroupSelect = (group: GroupRow) => {
    setSelectedGroup(group);
    setSearch('');
    setShowDropdown(false);
    setHighlightedIndex(-1);
  };

  /** 선택된 그룹 칩 제거 */
  const handleGroupRemove = () => {
    setSelectedGroup(null);
  };

  /** 키보드 내비게이션 핸들러 */
  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || filteredGroups.length === 0) {
      if (event.key === 'Escape') {
        setShowDropdown(false);
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredGroups.length - 1 ? prev + 1 : 0,
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredGroups.length - 1,
        );
        break;
      case 'Enter':
        event.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredGroups.length) {
          handleGroupSelect(filteredGroups[highlightedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  /** "시작하기" 버튼 — 닉네임 + 그룹 동시 저장 */
  const handleSubmit = async () => {
    if (!user || isSaving) {
      return;
    }

    const error = validateNickname(nickname);
    if (error) {
      setNicknameError(error);
      return;
    }

    setNicknameError('');
    setIsSaving(true);

    try {
      const supabase = getSupabase();

      /* 닉네임 + 선택된 그룹을 한 번에 저장 */
      const updateData: {
        username: string;
        favorite_group_id?: string;
        onboarding_completed: boolean;
      } = {
        username: nickname.trim(),
        onboarding_completed: true,
      };

      if (selectedGroup) {
        updateData.favorite_group_id = selectedGroup.id;
      }

      const { data: updatedProfile, error: updateError } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', user.id)
        .select('id')
        .maybeSingle();

      if (updateError || updatedProfile?.id !== user.id) {
        console.error(
          '[Onboarding] 프로필 저장 실패:',
          updateError || '수정된 프로필 행이 반환되지 않음',
        );
        setIsSaving(false);
        return;
      }

      await refreshProfile();
      router.replace(`/`);
    } catch (err) {
      console.error('[Onboarding] 프로필 저장 중 예외 발생:', err);
      setIsSaving(false);
    }
  };

  /** "나중에 하기" — 닉네임만 저장 후 홈으로 */
  const handleSkip = async () => {
    if (!user || isSaving) {
      return;
    }

    const error = validateNickname(nickname);
    if (error) {
      setNicknameError(error);
      return;
    }

    setNicknameError('');
    setIsSaving(true);

    try {
      const supabase = getSupabase();
      const { data: updatedProfile, error: updateError } = await supabase
        .from('user_profiles')
        .update({
          username: nickname.trim(),
          onboarding_completed: true,
        })
        .eq('id', user.id)
        .select('id')
        .maybeSingle();

      if (updateError || updatedProfile?.id !== user.id) {
        console.error(
          '[Onboarding] 닉네임 저장 실패:',
          updateError || '수정된 프로필 행이 반환되지 않음',
        );
        setIsSaving(false);
        return;
      }

      await refreshProfile();
      router.replace(`/`);
    } catch (err) {
      console.error('[Onboarding] 닉네임 저장 중 예외 발생:', err);
      setIsSaving(false);
    }
  };

  /** 닉네임 유효 여부 (버튼 활성화 조건) */
  const isNicknameValid =
    nickname.trim().length >= NICKNAME_MIN_LENGTH &&
    nickname.trim().length <= NICKNAME_MAX_LENGTH;

  /** 로딩 상태 */
  if (isLoading || (!user && !isLoading) || !isNicknameLoaded || hasCompletedProfile) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>{t('saving')}</div>
      </div>
    );
  }

  return (
    <section className={styles.container}>
      {/* ─── 헤더 ─── */}
      <header className={styles.header}>
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.subtitle}>{t('subtitle')}</p>
      </header>

      <div className={styles.formArea}>
        {/* ─── 닉네임 입력 ─── */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="onboarding-nickname">
            {t('label_nickname')}
          </label>
          <div className={styles.nicknameField}>
            {!isNicknameLoaded ? (
              <div className={styles.loading}>{t('saving')}</div>
            ) : (
              <>
                <input
                  id="onboarding-nickname"
                  className={classNames(styles.nicknameInput, {
                    [styles.nicknameInputError]: !!nicknameError,
                  })}
                  type="text"
                  value={nickname}
                  onChange={handleNicknameChange}
                  placeholder={t('nickname_placeholder')}
                  maxLength={NICKNAME_MAX_LENGTH}
                  autoComplete="off"
                />
                <div className={styles.nicknameCount}>
                  {nickname.trim().length} / {NICKNAME_MAX_LENGTH}
                </div>
                {nicknameError && (
                  <p className={styles.nicknameErrorText}>{nicknameError}</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* ─── 최애 그룹 검색 ─── */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="onboarding-group-search">
            {t('label_group')}
          </label>
          <div className={styles.groupSearchWrap} ref={groupSearchRef}>
            <input
              id="onboarding-group-search"
              className={styles.searchInput}
              type="text"
              value={search}
              onChange={handleSearchChange}
              onFocus={handleSearchFocus}
              onKeyDown={handleSearchKeyDown}
              placeholder={t('group_search_placeholder')}
              autoComplete="off"
              disabled={isFetching}
            />

            {/* 드롭다운 결과 */}
            {showDropdown && (
              <div className={styles.groupDropdown} role="listbox">
                {filteredGroups.length === 0 ? (
                  <div className={styles.groupDropdownEmpty}>{t('no_results')}</div>
                ) : (
                  filteredGroups.map((group, index) => (
                    <div
                      key={group.id}
                      role="option"
                      tabIndex={-1}
                      aria-selected={highlightedIndex === index}
                      className={classNames(styles.groupDropdownItem, {
                        [styles.groupDropdownItemActive]: highlightedIndex === index,
                      })}
                      onMouseDown={() => handleGroupSelect(group)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                    >
                      <span className={styles.groupDropdownName}>
                        {toDisplayName(group.name_ko, group.name_en, isKo)}
                      </span>
                      <span className={styles.groupDropdownCompany}>
                        {getCompanyName(group)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* 선택된 그룹 칩 */}
          {selectedGroup && (
            <div className={styles.groupChip}>
              <span className={styles.groupChipText}>
                {toDisplayName(selectedGroup.name_ko, selectedGroup.name_en, isKo)}
                <span className={styles.groupChipCompany}>
                  {' · '}
                  {getCompanyName(selectedGroup)}
                </span>
              </span>
              <button
                type="button"
                className={styles.groupChipRemove}
                onClick={handleGroupRemove}
                aria-label="Remove"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* ─── 시작하기 버튼 ─── */}
        <button
          type="button"
          className={styles.submitButton}
          onClick={handleSubmit}
          disabled={isSaving || !isNicknameLoaded || !isNicknameValid}
        >
          {isSaving ? t('saving') : t('submit')}
        </button>

        {/* ─── 나중에 하기 링크 ─── */}
        <button
          type="button"
          className={styles.skipLink}
          onClick={handleSkip}
          disabled={isSaving}
        >
          {t('skip')}
        </button>
      </div>
    </section>
  );
}

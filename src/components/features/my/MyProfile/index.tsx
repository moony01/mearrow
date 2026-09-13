'use client';

/**
 * MyProfile - 연습생 중심 프로필 퍼블리싱 프로토타입
 *
 * 1차 범위는 프로필 헤더, 활동 이력, 이미지·숏츠 피드다.
 * 저장·업로드·소셜 데이터 연동은 다음 단계에서 붙인다.
 */

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CalendarDays,
  Check,
  ChevronDown,
  CirclePlay,
  Heart,
  Image as ImageIcon,
  LogOut,
  MoreHorizontal,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  PROFILE_ACTIVITY_CATEGORIES,
  PROFILE_CAPTION_MAX_LENGTH,
  PROFILE_VIDEO_MAX_SECONDS,
  createProfileActivity,
  deleteProfileActivity,
  deleteProfilePost,
  listProfileActivities,
  listProfilePosts,
  readProfileVideoDuration,
  updateProfileActivity,
  uploadProfilePost,
  validateProfileMediaFile,
  type ProfileActivityCategory,
  type ProfileActivityInput,
  type ProfileActivityRecord,
  type ProfilePostRecord,
} from '@/lib/api/profile-content';
import { isDevelopmentTestModeEnabled } from '@/lib/auth/development-test-mode';
import styles from './MyProfile.module.scss';

type LocalizedText = {
  ko: string;
  en: string;
};

type CareerEntry = {
  id: string;
  title: LocalizedText;
  organization: LocalizedText;
  period: LocalizedText;
  description: LocalizedText;
  tag: LocalizedText;
  startDate?: string;
  endDate?: string | null;
  isCurrent?: boolean;
  category?: ProfileActivityCategory;
  isLocal?: boolean;
};

const DEVELOPMENT_PROFILE_ACTIVITIES_STORAGE_KEY = 'kcl_dev_profile_activities_v1';

const isLocalizedText = (value: unknown): value is LocalizedText => {
  if (!value || typeof value !== 'object') return false;
  const text = value as Partial<LocalizedText>;
  return typeof text.ko === 'string' && typeof text.en === 'string';
};

const isCareerEntry = (value: unknown): value is CareerEntry => {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<CareerEntry>;

  return Boolean(
    typeof entry.id === 'string' &&
    isLocalizedText(entry.title) &&
    isLocalizedText(entry.organization) &&
    isLocalizedText(entry.period) &&
    isLocalizedText(entry.description) &&
    isLocalizedText(entry.tag) &&
    (entry.startDate === undefined || typeof entry.startDate === 'string') &&
    (entry.endDate === undefined || entry.endDate === null || typeof entry.endDate === 'string') &&
    (entry.isCurrent === undefined || typeof entry.isCurrent === 'boolean') &&
    (entry.category === undefined || PROFILE_ACTIVITY_CATEGORIES.includes(entry.category))
  );
};

function readLocalCareerEntries(): CareerEntry[] | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(DEVELOPMENT_PROFILE_ACTIVITIES_STORAGE_KEY);
    if (raw === null) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;

    return parsed.filter(isCareerEntry).map((entry) => ({ ...entry, isLocal: true }));
  } catch {
    return null;
  }
}

function writeLocalCareerEntries(entries: CareerEntry[]): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      DEVELOPMENT_PROFILE_ACTIVITIES_STORAGE_KEY,
      JSON.stringify(entries.map((entry) => ({ ...entry, isLocal: true }))),
    );
  } catch {
    // Storage restrictions should not block the in-memory developer preview.
  }
}

type FeedItem = {
  id: string;
  type: 'image' | 'short';
  title: LocalizedText;
  caption: LocalizedText;
  imageSrc?: string;
  mediaUrl?: string;
  storagePath?: string;
  duration?: string;
  isLocal?: boolean;
};

type FeedFilter = 'all' | 'image' | 'short';

type ActivityFormValues = ProfileActivityInput;

const EMPTY_ACTIVITY_FORM: ActivityFormValues = {
  title: '',
  organization: '',
  startDate: '',
  endDate: '',
  isCurrent: false,
  category: 'training',
  description: '',
};

const CAREER_ENTRIES: CareerEntry[] = [
  {
    id: 'performance-training',
    title: { ko: '퍼포먼스 트레이닝', en: 'Performance training' },
    organization: { ko: 'Independent trainee', en: 'Independent trainee' },
    period: { ko: '2024 — 현재', en: '2024 — Present' },
    description: {
      ko: '댄스, 보컬, 무대 표현을 중심으로 기본기를 쌓고 있습니다.',
      en: 'Building fundamentals across dance, vocal, and stage presence.',
    },
    tag: { ko: '훈련', en: 'Training' },
    startDate: '2024-01-01',
    endDate: null,
    isCurrent: true,
    category: 'training',
  },
  {
    id: 'audition-workshop',
    title: { ko: '월간 오디션 워크숍', en: 'Monthly audition workshop' },
    organization: { ko: 'Seoul · Open class', en: 'Seoul · Open class' },
    period: { ko: '2025 — 현재', en: '2025 — Present' },
    description: {
      ko: '카메라 테스트와 자유 안무 루틴을 정리하고 있습니다.',
      en: 'Practicing camera tests and refining a personal choreography routine.',
    },
    tag: { ko: '오디션', en: 'Audition' },
    startDate: '2025-01-01',
    endDate: null,
    isCurrent: true,
    category: 'audition',
  },
  {
    id: 'stage-session',
    title: { ko: '스테이지 세션', en: 'Stage session' },
    organization: { ko: 'Practice showcase', en: 'Practice showcase' },
    period: { ko: '2025', en: '2025' },
    description: {
      ko: '팀 퍼포먼스에서 센터 동선과 표정 연기를 경험했습니다.',
      en: 'Explored center blocking and facial expression in a team showcase.',
    },
    tag: { ko: '공연', en: 'Showcase' },
    startDate: '2025-01-01',
    endDate: '2025-12-01',
    isCurrent: false,
    category: 'showcase',
  },
];

const FEED_ITEMS: FeedItem[] = [
  {
    id: 'short-practice',
    type: 'short',
    title: { ko: '후렴구 루틴', en: 'Chorus routine' },
    caption: { ko: '오늘의 댄스 연습', en: 'Dance practice today' },
    imageSrc: '/images/news/india-kdream-stage-1.png',
    duration: '0:18',
  },
  {
    id: 'image-portrait',
    type: 'image',
    title: { ko: '프로필 테스트', en: 'Profile test' },
    caption: { ko: '카메라 테스트 · 자연광', en: 'Camera test · natural light' },
    imageSrc: '/images/news/foreign-trainee-reality-visa-culture-1.png',
  },
  {
    id: 'short-freestyle',
    type: 'short',
    title: { ko: '프리스타일 01', en: 'Freestyle 01' },
    caption: { ko: '움직임과 리듬 찾기', en: 'Finding movement and rhythm' },
    imageSrc: '/images/news/lisa-world-cup-stage-1.png',
    duration: '0:24',
  },
  {
    id: 'image-studio',
    type: 'image',
    title: { ko: '스튜디오 노트', en: 'Studio notes' },
    caption: { ko: '이번 주 보컬 연습', en: 'Vocal practice this week' },
    imageSrc: '/images/news/big4-trainee-requirements-attitude-1.png',
  },
];

const CATEGORY_LABELS: Record<ProfileActivityCategory, LocalizedText> = {
  training: { ko: '훈련', en: 'Training' },
  audition: { ko: '오디션', en: 'Audition' },
  showcase: { ko: '공연', en: 'Showcase' },
  education: { ko: '교육', en: 'Education' },
  other: { ko: '기타', en: 'Other' },
};

const getText = (text: LocalizedText, isKorean: boolean) =>
  isKorean ? text.ko : text.en;

const formatActivityPeriod = (
  activity: ProfileActivityRecord,
  locale: string,
): string => {
  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(locale === 'ko' ? 'ko-KR' : 'en-US', {
      year: 'numeric',
      month: 'short',
    }).format(new Date(`${value}T00:00:00`));
  const start = formatDate(activity.start_date);
  const end = activity.is_current
    ? locale === 'ko' ? '현재' : 'Present'
    : activity.end_date
      ? formatDate(activity.end_date)
      : locale === 'ko' ? '현재' : 'Present';

  return `${start} — ${end}`;
};

const toCareerEntry = (activity: ProfileActivityRecord, locale: string): CareerEntry => ({
  id: activity.id,
  title: { ko: activity.title, en: activity.title },
  organization: {
    ko: activity.organization || '개인 활동',
    en: activity.organization || 'Independent activity',
  },
  period: {
    ko: formatActivityPeriod(activity, 'ko'),
    en: formatActivityPeriod(activity, locale === 'ko' ? 'en' : locale),
  },
  description: {
    ko: activity.description || '활동 내용을 기록했습니다.',
    en: activity.description || 'Activity recorded on the profile.',
  },
  tag: CATEGORY_LABELS[activity.category] || CATEGORY_LABELS.other,
  startDate: activity.start_date,
  endDate: activity.end_date,
  isCurrent: activity.is_current,
  category: activity.category,
});

const toFeedItem = (post: ProfilePostRecord): FeedItem => ({
  id: post.id,
  type: post.media_type,
  title: {
    ko: post.media_type === 'short' ? '숏츠 게시물' : '이미지 게시물',
    en: post.media_type === 'short' ? 'Shorts post' : 'Image post',
  },
  caption: { ko: post.caption || '', en: post.caption || '' },
  mediaUrl: post.media_url,
  storagePath: post.storage_path,
  duration: post.duration_seconds ? `0:${String(post.duration_seconds).padStart(2, '0')}` : undefined,
});

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const toHandle = (value: string) => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-');

  return normalized.replace(/^-|-$/g, '') || 'trainee';
};

export default function MyProfile() {
  const { user, profile, signOut, deleteAccount } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const locale = pathname?.split('/')[1] || 'en';
  const isKorean = locale === 'ko';

  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');
  const [showAllCareer, setShowAllCareer] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteAccountError, setDeleteAccountError] = useState('');
  const [accountDeleting, setAccountDeleting] = useState(false);
  const [careerEntries, setCareerEntries] = useState<CareerEntry[]>([]);
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [localPreviewMode, setLocalPreviewMode] = useState(false);
  const [contentLoading, setContentLoading] = useState(true);
  const [contentError, setContentError] = useState('');
  const [activityFormOpen, setActivityFormOpen] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [activityForm, setActivityForm] = useState<ActivityFormValues>({
    ...EMPTY_ACTIVITY_FORM,
  });
  const [activityFormError, setActivityFormError] = useState('');
  const [activitySaving, setActivitySaving] = useState(false);
  const [feedFormOpen, setFeedFormOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState('');
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [feedCaption, setFeedCaption] = useState('');
  const [feedFormError, setFeedFormError] = useState('');
  const [feedUploading, setFeedUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const localPreviewUrlsRef = useRef<Set<string>>(new Set());

  const copy = isKorean
    ? {
        profileLabel: 'MEARROW 프로필',
        fallbackName: '나의 프로필',
        fallbackHeadline: 'K-pop 연습생 · 나의 성장 과정을 기록합니다',
        trainee: 'K-pop 연습생',
        activity: '활동 이력',
        activityEyebrow: 'BACKGROUND',
        addActivity: '활동 이력 추가',
        editActivity: '활동 이력 수정',
        deleteActivity: '활동 이력 삭제',
        activityFormTitle: '활동 이력 기록하기',
        activityTitle: '활동명',
        activityOrganization: '소속·기관',
        activityStart: '시작일',
        activityEnd: '종료일',
        activityCurrent: '현재 진행 중',
        activityCategory: '분류',
        activityDescription: '설명',
        activityEmpty: '아직 기록된 활동 이력이 없습니다.',
        activitySave: '활동 저장',
        activitySaving: '저장 중…',
        feed: '피드',
        feedEyebrow: 'IN MOTION',
        addFeed: '피드 게시물 추가',
        feedFormTitle: '피드에 게시하기',
        chooseFile: '이미지 또는 숏츠 선택',
        fileHint: '이미지 10MB · 숏츠 50MB / 60초 이하',
        caption: '캡션',
        captionPlaceholder: '지금의 연습과 순간을 기록해보세요.',
        feedEmpty: '아직 게시한 피드가 없습니다.',
        upload: '게시하기',
        uploading: '업로드 중…',
        uploadError: '피드 게시물을 업로드하지 못했습니다.',
        videoReading: '영상 길이를 확인하는 중입니다. 잠시 후 다시 시도해주세요.',
        videoTooLong: `숏츠는 ${PROFILE_VIDEO_MAX_SECONDS}초 이하만 업로드할 수 있습니다.`,
        deletePost: '게시물 삭제',
        contentLoadError: '프로필 콘텐츠를 불러오지 못했습니다.',
        all: '전체',
        images: '이미지',
        shorts: '숏츠',
        moreCareer: '활동 이력 더 보기',
        lessCareer: '간단히 보기',
        following: '관심 피드',
        logout: '로그아웃',
        deleteAccount: '회원탈퇴',
        close: '닫기',
        deleteTitle: '정말 탈퇴하시겠어요?',
        deleteDescription: '탈퇴하면 프로필과 계정 데이터가 삭제됩니다.',
        deleteHint: '확인하려면 "탈퇴"를 입력하세요.',
        deletePlaceholder: '탈퇴 입력',
        cancel: '취소',
        confirmDelete: '탈퇴하기',
        deleteError: '탈퇴 문구를 정확히 입력해주세요.',
        requiredActivityTitle: '활동명을 입력해주세요.',
        requiredActivityStart: '시작일을 입력해주세요.',
        requiredActivityEnd: '현재 진행 중이 아니라면 종료일을 입력해주세요.',
        invalidActivityDates: '종료일은 시작일보다 빠를 수 없습니다.',
        activitySaveError: '활동 이력을 저장하지 못했습니다.',
        postDeleteError: '게시물을 삭제하지 못했습니다.',
        save: '저장',
        short: 'SHORT',
      }
    : {
        profileLabel: 'MEARROW PROFILE',
        fallbackName: 'Your profile',
        fallbackHeadline: 'K-pop trainee · documenting the work in progress',
        trainee: 'K-pop trainee',
        activity: 'Activity history',
        activityEyebrow: 'BACKGROUND',
        addActivity: 'Add activity history',
        editActivity: 'Edit activity history',
        deleteActivity: 'Delete activity history',
        activityFormTitle: 'Record an activity',
        activityTitle: 'Activity title',
        activityOrganization: 'Organization',
        activityStart: 'Start date',
        activityEnd: 'End date',
        activityCurrent: 'Currently ongoing',
        activityCategory: 'Category',
        activityDescription: 'Description',
        activityEmpty: 'No activity history yet.',
        activitySave: 'Save activity',
        activitySaving: 'Saving…',
        feed: 'Feed',
        feedEyebrow: 'IN MOTION',
        addFeed: 'Add feed post',
        feedFormTitle: 'Publish to your feed',
        chooseFile: 'Choose image or short',
        fileHint: 'Images 10MB · Shorts 50MB / up to 60 sec',
        caption: 'Caption',
        captionPlaceholder: 'Document the work and moments in progress.',
        feedEmpty: 'No feed posts yet.',
        upload: 'Publish',
        uploading: 'Uploading…',
        uploadError: 'The feed post could not be uploaded.',
        videoReading: 'Checking the video duration. Please try again in a moment.',
        videoTooLong: `Shorts must be ${PROFILE_VIDEO_MAX_SECONDS} seconds or shorter.`,
        deletePost: 'Delete post',
        contentLoadError: 'Profile content could not be loaded.',
        all: 'All',
        images: 'Images',
        shorts: 'Shorts',
        moreCareer: 'Show more history',
        lessCareer: 'Show less',
        following: 'Following',
        logout: 'Log out',
        deleteAccount: 'Delete account',
        close: 'Close',
        deleteTitle: 'Delete your account?',
        deleteDescription: 'Your profile and account data will be deleted.',
        deleteHint: 'Type "DELETE" to confirm.',
        deletePlaceholder: 'Type DELETE',
        cancel: 'Cancel',
        confirmDelete: 'Delete account',
        deleteError: 'Please type the confirmation text exactly.',
        requiredActivityTitle: 'Enter an activity title.',
        requiredActivityStart: 'Choose a start date.',
        requiredActivityEnd: 'Choose an end date or mark it as ongoing.',
        invalidActivityDates: 'The end date cannot be before the start date.',
        activitySaveError: 'Activity could not be saved.',
        postDeleteError: 'Post could not be deleted.',
        save: 'Save',
        short: 'SHORT',
      };

  const displayName = profile?.username?.trim() || copy.fallbackName;
  const handle = toHandle(profile?.username || 'trainee');
  const initial = displayName.charAt(0).toUpperCase();
  const bio = profile?.bio?.trim();
  const headline = bio && !bio.toLowerCase().includes('local development')
    ? bio
    : copy.fallbackHeadline;

  useEffect(() => {
    const previewUrls = localPreviewUrlsRef.current;
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
      previewUrls.clear();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const isLocalMode = isDevelopmentTestModeEnabled();

    setLocalPreviewMode(isLocalMode);
    setContentError('');

    if (isLocalMode) {
      const storedEntries = readLocalCareerEntries();
      setCareerEntries(
        storedEntries ?? CAREER_ENTRIES.map((entry) => ({ ...entry, isLocal: true })),
      );
      setFeedItems(FEED_ITEMS.map((item) => ({ ...item, isLocal: true })));
      setContentLoading(false);
      return () => {
        cancelled = true;
      };
    }

    if (!user?.id) {
      setCareerEntries([]);
      setFeedItems([]);
      setContentLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setContentLoading(true);
    Promise.all([listProfileActivities(user.id), listProfilePosts(user.id)])
      .then(([activities, posts]) => {
        if (cancelled) return;
        setCareerEntries(activities.map((activity) => toCareerEntry(activity, locale)));
        setFeedItems(posts.map(toFeedItem));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setContentError(getErrorMessage(error, copy.contentLoadError));
        setCareerEntries([]);
        setFeedItems([]);
      })
      .finally(() => {
        if (!cancelled) setContentLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [copy.contentLoadError, locale, user?.id]);

  useEffect(() => {
    if (localPreviewMode) writeLocalCareerEntries(careerEntries);
  }, [careerEntries, localPreviewMode]);

  const filteredFeed = useMemo(
    () =>
      feedFilter === 'all'
        ? feedItems
        : feedItems.filter((item) => item.type === feedFilter),
    [feedFilter, feedItems],
  );

  const visibleCareer = showAllCareer
    ? careerEntries
    : careerEntries.slice(0, 2);

  const updateActivityForm = (
    update: (current: ActivityFormValues) => ActivityFormValues,
  ) => {
    setActivityFormError('');
    setActivityForm(update);
  };

  const openActivityForm = (entry?: CareerEntry) => {
    setActivityFormError('');
    setEditingActivityId(entry?.id || null);
    setActivityForm(
      entry
        ? {
            title: entry.title.ko,
            organization: entry.organization.ko === '개인 활동' ? '' : entry.organization.ko,
            startDate: entry.startDate || '',
            endDate: entry.endDate || '',
            isCurrent: entry.isCurrent ?? false,
            category: entry.category || 'other',
            description: entry.description.ko === '활동 내용을 기록했습니다.' ? '' : entry.description.ko,
          }
        : { ...EMPTY_ACTIVITY_FORM },
    );
    setActivityFormOpen(true);
  };

  const closeActivityForm = () => {
    if (activitySaving) return;
    setActivityFormOpen(false);
    setEditingActivityId(null);
    setActivityFormError('');
  };

  const validateActivityForm = (input: ActivityFormValues): string | null => {
    if (!input.title.trim()) return copy.requiredActivityTitle;
    if (!input.startDate) return copy.requiredActivityStart;
    if (!input.isCurrent && !input.endDate) return copy.requiredActivityEnd;
    if (input.endDate && input.endDate < input.startDate) return copy.invalidActivityDates;
    return null;
  };

  const buildLocalCareerEntry = (input: ActivityFormValues, id: string): CareerEntry => {
    const periodEnd = input.isCurrent ? (isKorean ? '현재' : 'Present') : input.endDate;
    const period = `${input.startDate} — ${periodEnd}`;
    return {
      id,
      title: { ko: input.title.trim(), en: input.title.trim() },
      organization: {
        ko: input.organization.trim() || '개인 활동',
        en: input.organization.trim() || 'Independent activity',
      },
      period: { ko: period, en: period },
      description: {
        ko: input.description.trim() || '활동 내용을 기록했습니다.',
        en: input.description.trim() || 'Activity recorded on the profile.',
      },
      tag: CATEGORY_LABELS[input.category],
      startDate: input.startDate,
      endDate: input.endDate || null,
      isCurrent: input.isCurrent,
      category: input.category,
      isLocal: true,
    };
  };

  const handleActivitySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validateActivityForm(activityForm);
    if (validationError) {
      setActivityFormError(validationError);
      return;
    }

    setActivitySaving(true);
    setActivityFormError('');

    try {
      const existingEntry = editingActivityId
        ? careerEntries.find((entry) => entry.id === editingActivityId)
        : undefined;

      if (localPreviewMode || existingEntry?.isLocal) {
        const localEntry = buildLocalCareerEntry(
          activityForm,
          editingActivityId || `local-activity-${Date.now()}`,
        );
        setCareerEntries((current) =>
          editingActivityId
            ? current.map((entry) => (entry.id === editingActivityId ? localEntry : entry))
            : [localEntry, ...current],
        );
      } else {
        if (!user?.id) throw new Error(copy.activitySaveError);
        const saved = editingActivityId
          ? await updateProfileActivity(user.id, editingActivityId, activityForm)
          : await createProfileActivity(user.id, activityForm);
        const savedEntry = toCareerEntry(saved, locale);

        setCareerEntries((current) =>
          editingActivityId
            ? current.map((entry) => (entry.id === editingActivityId ? savedEntry : entry))
            : [savedEntry, ...current],
        );
      }

      setShowAllCareer(true);
      closeActivityForm();
    } catch (error: unknown) {
      setActivityFormError(getErrorMessage(error, copy.activitySaveError));
    } finally {
      setActivitySaving(false);
    }
  };

  const handleActivityDelete = async (entry: CareerEntry) => {
    const message = isKorean ? '이 활동 이력을 삭제할까요?' : 'Delete this activity history?';
    if (!window.confirm(message)) return;

    try {
      if (!localPreviewMode && !entry.isLocal) {
        if (!user?.id) throw new Error(copy.activitySaveError);
        await deleteProfileActivity(user.id, entry.id);
      }
      setCareerEntries((current) => current.filter((item) => item.id !== entry.id));
    } catch (error: unknown) {
      setContentError(getErrorMessage(error, copy.activitySaveError));
    }
  };

  const resetFeedComposer = (revokePreview: boolean) => {
    if (revokePreview && filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setSelectedFile(null);
    setFilePreviewUrl('');
    setVideoDuration(null);
    setFeedCaption('');
    setFeedFormError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openFeedForm = () => {
    resetFeedComposer(true);
    setFeedFormOpen(true);
  };

  const closeFeedForm = () => {
    if (feedUploading) return;
    resetFeedComposer(true);
    setFeedFormOpen(false);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setSelectedFile(null);
    setFilePreviewUrl('');
    setVideoDuration(null);
    setFeedFormError('');

    const validationError = validateProfileMediaFile(file);
    if (validationError || !file) {
      setFeedFormError(validationError || copy.chooseFile);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setFilePreviewUrl(previewUrl);

    if (file.type.startsWith('video/')) {
      void readProfileVideoDuration(file)
        .then((duration) => {
          setVideoDuration(duration);
          if (duration > PROFILE_VIDEO_MAX_SECONDS) {
            setFeedFormError(copy.videoTooLong);
          }
        })
        .catch((error: unknown) => {
          setFeedFormError(getErrorMessage(error, copy.videoReading));
        });
    }
  };

  const handleFeedSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validateProfileMediaFile(selectedFile);
    if (validationError || !selectedFile) {
      setFeedFormError(validationError || copy.chooseFile);
      return;
    }
    if (selectedFile.type.startsWith('video/') && videoDuration === null) {
      setFeedFormError(copy.videoReading);
      return;
    }
    if (selectedFile.type.startsWith('video/') && videoDuration !== null && videoDuration > PROFILE_VIDEO_MAX_SECONDS) {
      setFeedFormError(copy.videoTooLong);
      return;
    }
    if (feedCaption.trim().length > PROFILE_CAPTION_MAX_LENGTH) {
      setFeedFormError(`캡션은 ${PROFILE_CAPTION_MAX_LENGTH}자 이하로 작성해주세요.`);
      return;
    }

    setFeedUploading(true);
    setFeedFormError('');

    try {
      if (localPreviewMode) {
        const isVideo = selectedFile.type.startsWith('video/');
        const localItem: FeedItem = {
          id: `local-post-${Date.now()}`,
          type: isVideo ? 'short' : 'image',
          title: { ko: isVideo ? '숏츠 게시물' : '이미지 게시물', en: isVideo ? 'Shorts post' : 'Image post' },
          caption: { ko: feedCaption.trim(), en: feedCaption.trim() },
          imageSrc: isVideo ? undefined : filePreviewUrl,
          mediaUrl: filePreviewUrl,
          duration: isVideo && videoDuration ? `0:${String(videoDuration).padStart(2, '0')}` : undefined,
          isLocal: true,
        };
        localPreviewUrlsRef.current.add(filePreviewUrl);
        setFeedItems((current) => [localItem, ...current]);
        resetFeedComposer(false);
      } else {
        if (!user?.id) throw new Error(copy.contentLoadError);
        const saved = await uploadProfilePost(
          user.id,
          selectedFile,
          feedCaption,
          videoDuration,
        );
        setFeedItems((current) => [toFeedItem(saved), ...current]);
        resetFeedComposer(true);
      }
      setFeedFormOpen(false);
    } catch (error: unknown) {
      setFeedFormError(getErrorMessage(error, copy.uploadError));
    } finally {
      setFeedUploading(false);
    }
  };

  const handleFeedDelete = async (item: FeedItem) => {
    const message = isKorean ? '이 게시물을 삭제할까요?' : 'Delete this post?';
    if (!window.confirm(message)) return;

    try {
      if (!localPreviewMode && !item.isLocal) {
        if (!user?.id || !item.storagePath) throw new Error(copy.postDeleteError);
        const result = await deleteProfilePost(user.id, item.id);
        if (result.cleanupWarning) setContentError(result.cleanupWarning);
      } else if (item.mediaUrl) {
        localPreviewUrlsRef.current.delete(item.mediaUrl);
        URL.revokeObjectURL(item.mediaUrl);
      }
      setFeedItems((current) => current.filter((feedItem) => feedItem.id !== item.id));
    } catch (error: unknown) {
      setContentError(getErrorMessage(error, copy.postDeleteError));
    }
  };

  const handleSignOut = async () => {
    setShowProfileMenu(false);
    await signOut();
    router.replace(`/${locale}`);
  };

  const handleDeleteAccount = async () => {
    const confirmWord = isKorean ? '탈퇴' : 'DELETE';
    if (deleteConfirmText.trim() !== confirmWord) {
      setDeleteAccountError(copy.deleteError);
      return;
    }

    setAccountDeleting(true);
    setDeleteAccountError('');
    const result = await deleteAccount();

    if (result.success) {
      router.replace(`/${locale}`);
      return;
    }

    setDeleteAccountError(result.error || copy.deleteError);
    setAccountDeleting(false);
  };

  return (
    <div className={styles.container}>
      <section className={styles.introPanel} aria-labelledby="profile-title">
        <div className={styles.coverArt} aria-hidden="true">
          <span className={styles.coverOrb} />
          <span className={styles.coverLine} />
          <span className={styles.coverLineSecondary} />
        </div>

        <div className={styles.introBody}>
          <div className={styles.identityRow}>
            <div className={styles.avatar} aria-hidden="true">
              <span className={styles.avatarInitial}>{initial}</span>
            </div>

            <div className={styles.identityContent}>
              <p className={styles.eyebrow}>{copy.profileLabel}</p>
              <div className={styles.nameRow}>
                <h1 id="profile-title" className={styles.username}>
                  {displayName}
                </h1>
                {profile?.is_pro && <span className={styles.proBadge}>PRO</span>}
              </div>
              <p className={styles.handle}>@{handle}</p>
            </div>

            <div className={styles.profileMenuWrap}>
              <button
                type="button"
                className={styles.moreButton}
                aria-label={isKorean ? '프로필 메뉴' : 'Profile menu'}
                aria-expanded={showProfileMenu}
                onClick={() => setShowProfileMenu((current) => !current)}
              >
                <MoreHorizontal size={20} />
              </button>

              {showProfileMenu && (
                <div className={styles.profileMenu} role="menu">
                  <Link
                    href={`/${locale}/following`}
                    onClick={() => setShowProfileMenu(false)}
                    role="menuitem"
                  >
                    <Heart size={15} />
                    {copy.following}
                  </Link>
                  <button type="button" onClick={() => void handleSignOut()} role="menuitem">
                    <LogOut size={15} />
                    {copy.logout}
                  </button>
                  <button
                    type="button"
                    className={styles.dangerMenuItem}
                    onClick={() => {
                      setShowProfileMenu(false);
                      setDeleteConfirmText('');
                      setDeleteAccountError('');
                      setShowDeleteModal(true);
                    }}
                    role="menuitem"
                  >
                    <Trash2 size={15} />
                    {copy.deleteAccount}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className={styles.introDetails}>
            <p className={styles.headline}>{headline}</p>
            <div className={styles.metaRow}>
              <span>
                <Sparkles size={15} />
                {copy.trainee}
              </span>
              <span>
                <CalendarDays size={15} />
                {isKorean ? '성장 과정을 기록 중' : 'Building in public'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {contentError && <p className={styles.contentError} role="alert">{contentError}</p>}

      <div className={styles.contentGrid}>
        <motion.section
          className={styles.careerSection}
          aria-labelledby="activity-title"
          data-testid="profile-career-section"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
        >
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>{copy.activityEyebrow}</p>
              <h2 id="activity-title">{copy.activity}</h2>
            </div>
            <button
              type="button"
              className={styles.addButton}
              aria-label={isKorean ? '활동 이력 추가' : 'Add activity history'}
              onClick={() => openActivityForm()}
            >
              <Plus size={18} />
            </button>
          </div>

          <div className={styles.careerList}>
            {contentLoading ? (
              <p className={styles.emptyState}>{isKorean ? '불러오는 중…' : 'Loading…'}</p>
            ) : visibleCareer.length === 0 ? (
              <p className={styles.emptyState}>{copy.activityEmpty}</p>
            ) : (
              visibleCareer.map((entry) => (
                <article className={styles.careerItem} key={entry.id}>
                  <div className={styles.timelineRail} aria-hidden="true">
                    <span className={styles.timelineDot} />
                  </div>
                  <div className={styles.careerContent}>
                    <div className={styles.careerMeta}>
                      <span>{getText(entry.period, isKorean)}</span>
                      <span className={styles.careerTag}>{getText(entry.tag, isKorean)}</span>
                      <div className={styles.entryActions}>
                        <button
                          type="button"
                          aria-label={`${copy.editActivity}: ${getText(entry.title, isKorean)}`}
                          onClick={() => openActivityForm(entry)}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          className={styles.entryDeleteButton}
                          aria-label={`${copy.deleteActivity}: ${getText(entry.title, isKorean)}`}
                          onClick={() => void handleActivityDelete(entry)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <h3>{getText(entry.title, isKorean)}</h3>
                    <p className={styles.careerOrganization}>
                      {getText(entry.organization, isKorean)}
                    </p>
                    <p className={styles.careerDescription}>
                      {getText(entry.description, isKorean)}
                    </p>
                  </div>
                </article>
              ))
            )}
          </div>

          {careerEntries.length > 2 && (
            <button
              type="button"
              className={styles.textButton}
              onClick={() => setShowAllCareer((current) => !current)}
            >
              {showAllCareer ? copy.lessCareer : copy.moreCareer}
              <ChevronDown
                size={15}
                className={showAllCareer ? styles.chevronUp : undefined}
              />
            </button>
          )}
        </motion.section>

        <motion.section
          className={styles.feedSection}
          aria-labelledby="feed-title"
          data-testid="profile-feed-section"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.12 }}
        >
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>{copy.feedEyebrow}</p>
              <h2 id="feed-title">{copy.feed}</h2>
            </div>
            <button
              type="button"
              className={styles.addButton}
              aria-label={isKorean ? '피드 게시물 추가' : 'Add feed post'}
              onClick={openFeedForm}
            >
              <Plus size={18} />
            </button>
          </div>

          <div className={styles.filterBar} role="tablist" aria-label={copy.feed}>
            {(
              [
                ['all', copy.all],
                ['image', copy.images],
                ['short', copy.shorts],
              ] as const
            ).map(([value, label]) => (
              <button
                type="button"
                key={value}
                className={feedFilter === value ? styles.filterActive : styles.filterButton}
                role="tab"
                aria-selected={feedFilter === value}
                onClick={() => setFeedFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className={styles.feedGrid}>
            {contentLoading ? (
              <p className={styles.emptyState}>{isKorean ? '불러오는 중…' : 'Loading…'}</p>
            ) : filteredFeed.length === 0 ? (
              <p className={styles.emptyState}>{copy.feedEmpty}</p>
            ) : (
              filteredFeed.map((item) => (
                <article className={styles.feedItem} key={item.id}>
                  <div className={styles.feedMedia}>
                    {item.mediaUrl ? (
                      item.type === 'short' ? (
                        <video
                          className={styles.feedVideo}
                          src={item.mediaUrl}
                          muted
                          loop
                          playsInline
                          controls
                          preload="metadata"
                          aria-label={getText(item.title, isKorean)}
                        />
                      ) : (
                        <div
                          className={styles.feedImage}
                          role="img"
                          aria-label={getText(item.title, isKorean)}
                          style={{ backgroundImage: `url(${item.mediaUrl})` }}
                        />
                      )
                    ) : (
                      <div
                        className={styles.feedImage}
                        role="img"
                        aria-label={getText(item.title, isKorean)}
                        style={{ backgroundImage: `url(${item.imageSrc})` }}
                      />
                    )}
                    <div className={styles.mediaShade} />
                    {item.type === 'short' && (
                      <div className={styles.shortBadge}>
                        <CirclePlay size={14} />
                        {copy.short}
                        <span>{item.duration}</span>
                      </div>
                    )}
                    <div className={styles.mediaCaption}>
                      <span>{getText(item.caption, isKorean)}</span>
                      {item.type === 'short' ? <CirclePlay size={17} /> : <ImageIcon size={16} />}
                    </div>
                    <button
                      type="button"
                      className={styles.feedDeleteButton}
                      aria-label={`${copy.deletePost}: ${getText(item.title, isKorean)}`}
                      onClick={() => void handleFeedDelete(item)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </motion.section>
      </div>

      {activityFormOpen && (
        <div className={styles.modalOverlay} role="presentation">
          <button
            type="button"
            className={styles.modalBackdrop}
            aria-label={copy.close}
            onClick={closeActivityForm}
          />
          <form
            className={styles.composerModal}
            onSubmit={(event) => void handleActivitySubmit(event)}
            aria-labelledby="activity-form-title"
          >
            <button type="button" className={styles.modalClose} aria-label={copy.close} onClick={closeActivityForm}>
              <X size={18} />
            </button>
            <p className={styles.modalEyebrow}>{copy.activityEyebrow}</p>
            <h2 id="activity-form-title">
              {editingActivityId ? copy.editActivity : copy.activityFormTitle}
            </h2>

            <div className={styles.formGrid}>
              <label className={styles.formField}>
                <span>{copy.activityTitle}</span>
                <input
                  type="text"
                  value={activityForm.title}
                  onChange={(event) => updateActivityForm((current) => ({ ...current, title: event.target.value }))}
                  maxLength={100}
                  aria-required="true"
                  autoFocus
                />
              </label>
              <label className={styles.formField}>
                <span>{copy.activityOrganization}</span>
                <input
                  type="text"
                  value={activityForm.organization}
                  onChange={(event) => updateActivityForm((current) => ({ ...current, organization: event.target.value }))}
                  maxLength={120}
                />
              </label>
              <div className={styles.formRow}>
                <label className={styles.formField}>
                  <span>{copy.activityStart}</span>
                  <input
                    type="date"
                    value={activityForm.startDate}
                    onChange={(event) => updateActivityForm((current) => ({ ...current, startDate: event.target.value }))}
                    aria-required="true"
                  />
                </label>
                <label className={styles.formField}>
                  <span>{copy.activityEnd}</span>
                  <input
                    type="date"
                    value={activityForm.endDate}
                    onChange={(event) => updateActivityForm((current) => ({ ...current, endDate: event.target.value }))}
                    disabled={activityForm.isCurrent}
                  />
                </label>
              </div>
              <label className={styles.checkboxField}>
                <input
                  type="checkbox"
                  checked={activityForm.isCurrent}
                  onChange={(event) => updateActivityForm((current) => ({ ...current, isCurrent: event.target.checked }))}
                />
                <span className={styles.checkboxMark}><Check size={13} /></span>
                <span>{copy.activityCurrent}</span>
              </label>
              <label className={styles.formField}>
                <span>{copy.activityCategory}</span>
                <select
                  value={activityForm.category}
                  onChange={(event) => updateActivityForm((current) => ({
                    ...current,
                    category: event.target.value as ProfileActivityCategory,
                  }))}
                >
                  {PROFILE_ACTIVITY_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {getText(CATEGORY_LABELS[category], isKorean)}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.formField}>
                <span>{copy.activityDescription}</span>
                <textarea
                  value={activityForm.description}
                  onChange={(event) => updateActivityForm((current) => ({ ...current, description: event.target.value }))}
                  maxLength={500}
                  rows={4}
                />
              </label>
            </div>

            {activityFormError && <p className={styles.formError} role="alert">{activityFormError}</p>}
            <div className={styles.formActions}>
              <button type="button" className={styles.cancelButton} onClick={closeActivityForm} disabled={activitySaving}>
                {copy.cancel}
              </button>
              <button type="submit" className={styles.primaryFormButton} disabled={activitySaving}>
                {activitySaving ? copy.activitySaving : copy.activitySave}
              </button>
            </div>
          </form>
        </div>
      )}

      {feedFormOpen && (
        <div className={styles.modalOverlay} role="presentation">
          <button
            type="button"
            className={styles.modalBackdrop}
            aria-label={copy.close}
            onClick={closeFeedForm}
          />
          <form
            className={styles.composerModal}
            onSubmit={(event) => void handleFeedSubmit(event)}
            aria-labelledby="feed-form-title"
          >
            <button type="button" className={styles.modalClose} aria-label={copy.close} onClick={closeFeedForm}>
              <X size={18} />
            </button>
            <p className={styles.modalEyebrow}>{copy.feedEyebrow}</p>
            <h2 id="feed-form-title">{copy.feedFormTitle}</h2>

            <label className={styles.filePicker}>
              <Upload size={19} />
              <span>{selectedFile?.name || copy.chooseFile}</span>
              <small>{copy.fileHint}</small>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,video/mp4,video/webm,video/quicktime"
                onChange={handleFileChange}
              />
            </label>

            {selectedFile && filePreviewUrl && (
              <div className={styles.uploadPreview}>
                {selectedFile.type.startsWith('video/') ? (
                  <video src={filePreviewUrl} controls muted playsInline preload="metadata" />
                ) : (
                  <div
                    className={styles.uploadImage}
                    role="img"
                    aria-label={copy.chooseFile}
                    style={{ backgroundImage: `url(${filePreviewUrl})` }}
                  />
                )}
              </div>
            )}

            <label className={styles.formField}>
              <span>{copy.caption}</span>
              <textarea
                value={feedCaption}
                onChange={(event) => setFeedCaption(event.target.value)}
                maxLength={PROFILE_CAPTION_MAX_LENGTH}
                rows={3}
                placeholder={copy.captionPlaceholder}
              />
              <small className={styles.characterCount}>{feedCaption.length}/{PROFILE_CAPTION_MAX_LENGTH}</small>
            </label>

            {feedFormError && <p className={styles.formError} role="alert">{feedFormError}</p>}
            <div className={styles.formActions}>
              <button type="button" className={styles.cancelButton} onClick={closeFeedForm} disabled={feedUploading}>
                {copy.cancel}
              </button>
              <button type="submit" className={styles.primaryFormButton} disabled={feedUploading || !selectedFile}>
                {feedUploading ? copy.uploading : copy.upload}
              </button>
            </div>
          </form>
        </div>
      )}

      {showDeleteModal && (
        <div className={styles.modalOverlay} role="presentation">
          <button
            type="button"
            className={styles.modalBackdrop}
            aria-label={copy.close}
            onClick={() => !accountDeleting && setShowDeleteModal(false)}
          />
          <div className={styles.deleteModal} role="dialog" aria-modal="true" aria-labelledby="delete-title">
            <button
              type="button"
              className={styles.modalClose}
              aria-label={copy.close}
              onClick={() => !accountDeleting && setShowDeleteModal(false)}
            >
              <X size={18} />
            </button>
            <div className={styles.deleteModalIcon}>
              <Trash2 size={24} />
            </div>
            <h2 id="delete-title">{copy.deleteTitle}</h2>
            <p>{copy.deleteDescription}</p>
            <p className={styles.deleteHint}>{copy.deleteHint}</p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(event) => setDeleteConfirmText(event.target.value)}
              placeholder={copy.deletePlaceholder}
              className={styles.deleteInput}
              disabled={accountDeleting}
              autoComplete="off"
            />
            {deleteAccountError && <p className={styles.deleteError}>{deleteAccountError}</p>}
            <div className={styles.deleteActions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => setShowDeleteModal(false)}
                disabled={accountDeleting}
              >
                {copy.cancel}
              </button>
              <button
                type="button"
                className={styles.confirmDeleteButton}
                onClick={() => void handleDeleteAccount()}
                disabled={accountDeleting}
              >
                <Trash2 size={15} />
                {copy.confirmDelete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

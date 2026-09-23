/**
 * MEARROW 공지사항 Supabase API 레이어
 * 클라이언트 사이드에서 Supabase를 통해 공지사항 데이터 조회
 * 빌드 타임에서는 서버 클라이언트를 통해 정적 페이지 생성용 데이터 조회
 */

import { createClient } from '@/lib/supabase/client';
import { BRAND_NAME } from '@/lib/brand';
import { SUPPORTED_LOCALES, SupportedLocale } from '@/lib/constants';
import type { Announcement, AnnouncementCategory, AnnouncementListItem } from '@/types/announcement';
import type { SupabaseClient } from '@supabase/supabase-js';

export const SIGNUP_EVENT_NOTICE_ID = 'event-signup-double-votes-2026-02';

/**
 * Generic database announcements are source-authored in English. The signup
 * event is the only announcement with locale-specific generated copy.
 */
export const ANNOUNCEMENT_SOURCE_LOCALE: SupportedLocale = 'en';

export function getAnnouncementAvailableLocales(id: string): readonly SupportedLocale[] {
  return id === SIGNUP_EVENT_NOTICE_ID ? SUPPORTED_LOCALES : [ANNOUNCEMENT_SOURCE_LOCALE];
}

export function getAnnouncementSeoLocale(id: string, requestedLocale: string): SupportedLocale {
  const availableLocales = getAnnouncementAvailableLocales(id);
  return availableLocales.includes(requestedLocale as SupportedLocale)
    ? (requestedLocale as SupportedLocale)
    : ANNOUNCEMENT_SOURCE_LOCALE;
}

interface EventNoticeCopy {
  title: string;
  content: string;
}

function getEventNoticeCopy(locale = 'ko'): EventNoticeCopy {
  const copies: Record<string, EventNoticeCopy> = {
    ko: {
      title: `${BRAND_NAME} 일일 투표권 안내`,
      content:
        `<p><strong>${BRAND_NAME} 일일 투표권은 비로그인 100표, 로그인 회원 300표입니다.</strong></p><p>투표권은 매일 UTC 자정에 다시 충전됩니다.</p><p>파워투표는 한 번에 최대 100표까지 사용할 수 있습니다.</p><p>로그인하고 최애 소속사를 더 오래 응원해보세요.</p>`,
    },
    en: {
      title: `${BRAND_NAME} daily vote guide`,
      content:
        `<p><strong>${BRAND_NAME} gives guests 100 votes and signed-in members 300 votes daily.</strong></p><p>Votes refresh every day at midnight UTC.</p><p>Power Vote lets you cast up to 100 votes at once.</p><p>Sign in and support your favorite company for longer.</p>`,
    },
    ja: {
      title: `${BRAND_NAME}デイリー投票権ガイド`,
      content:
        `<p><strong>${BRAND_NAME}ではゲストは毎日100票、ログイン会員は毎日300票を利用できます。</strong></p><p>投票権は毎日UTC午前0時に再チャージされます。</p><p>パワー投票では一度に最大100票まで使用できます。</p><p>ログインして推しの事務所をもっと長く応援しましょう。</p>`,
    },
    zh: {
      title: `${BRAND_NAME} 每日投票权指南`,
      content:
        `<p><strong>${BRAND_NAME} 游客每天 100 票，登录会员每天 300 票。</strong></p><p>投票权会在每天 UTC 午夜刷新。</p><p>火力投票一次最多可使用 100 票。</p><p>登录后可以更久地支持你喜爱的公司。</p>`,
    },
    es: {
      title: `Guía de votos diarios de ${BRAND_NAME}`,
      content:
        `<p><strong>${BRAND_NAME} ofrece 100 votos diarios a invitados y 300 votos diarios a miembros con sesión iniciada.</strong></p><p>Los votos se recargan cada día a medianoche UTC.</p><p>El Voto Poderoso permite emitir hasta 100 votos de una vez.</p><p>Inicia sesión y apoya por más tiempo a tu empresa favorita.</p>`,
    },
    fr: {
      title: `Guide des votes quotidiens ${BRAND_NAME}`,
      content:
        `<p><strong>${BRAND_NAME} offre 100 votes par jour aux visiteurs et 300 votes par jour aux membres connectés.</strong></p><p>Les votes se rechargent chaque jour à minuit UTC.</p><p>Le Vote Puissant permet de lancer jusqu\u2019à 100 votes en une fois.</p><p>Connectez-vous et soutenez plus longtemps votre entreprise favorite.</p>`,
    },
    de: {
      title: `${BRAND_NAME}-Leitfaden für tägliche Stimmen`,
      content:
        `<p><strong>${BRAND_NAME} gibt Gästen täglich 100 Stimmen und eingeloggten Mitgliedern täglich 300 Stimmen.</strong></p><p>Stimmen werden jeden Tag um Mitternacht UTC aufgefüllt.</p><p>Power-Voting erlaubt bis zu 100 Stimmen auf einmal.</p><p>Melde dich an und unterstütze dein Lieblingsunternehmen länger.</p>`,
    },
  };

  return copies[locale] ?? copies.en;
}

function createSignupEventNotice(locale = 'ko'): Announcement {
  const copy = getEventNoticeCopy(locale);

  return {
    id: SIGNUP_EVENT_NOTICE_ID,
    title: copy.title,
    content: copy.content,
    category: 'event',
    is_pinned: true,
    is_published: true,
    view_count: 0,
    created_at: '2026-02-23T00:00:00.000Z',
    updated_at: '2026-02-23T00:00:00.000Z',
  };
}

function withSignupEventNotice(
  notices: AnnouncementListItem[],
  category: AnnouncementCategory | undefined,
  locale: string,
): AnnouncementListItem[] {
  if (category && category !== 'event') {
    return notices;
  }

  const eventNotice = createSignupEventNotice(locale);
  const hasSameId = notices.some((notice) => notice.id === eventNotice.id);
  return hasSameId ? notices : [eventNotice, ...notices];
}

async function queryAnnouncements(
  supabase: SupabaseClient,
  category?: AnnouncementCategory,
  locale = 'ko',
): Promise<AnnouncementListItem[]> {
  let query = supabase
    .from('announcements')
    .select('id, title, category, is_pinned, is_published, view_count, created_at, updated_at')
    .eq('is_published', true)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false });

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[announcements] 목록 조회 실패:', error);
    throw error;
  }

  return withSignupEventNotice((data || []) as AnnouncementListItem[], category, locale);
}

async function queryAnnouncementById(
  supabase: SupabaseClient,
  id: string,
  locale = 'ko',
): Promise<Announcement | null> {
  if (id === SIGNUP_EVENT_NOTICE_ID) {
    return createSignupEventNotice(locale);
  }

  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('id', id)
    .eq('is_published', true)
    .single();

  if (error) {
    console.error('[announcements] 상세 조회 실패:', error);
    return null;
  }

  return data as Announcement;
}

/** 공지사항 목록 조회 (공개된 것만, RLS 적용) */
export async function getAnnouncements(
  category?: AnnouncementCategory,
  locale = 'ko',
): Promise<AnnouncementListItem[]> {
  return queryAnnouncements(createClient(), category, locale);
}

/** 공지사항 상세 조회 */
export async function getAnnouncementById(id: string, locale = 'ko'): Promise<Announcement | null> {
  return queryAnnouncementById(createClient(), id, locale);
}

/**
 * Build-time/server equivalent of getAnnouncements.
 * Only published fields are returned, so the result is safe to serialize into
 * a public static page.
 */
export async function getServerAnnouncements(
  category?: AnnouncementCategory,
  locale = 'ko',
): Promise<AnnouncementListItem[]> {
  const { createServerClient } = await import('@/lib/supabase/server');
  const supabase = createServerClient();

  if (!supabase) {
    return withSignupEventNotice([], category, locale);
  }

  try {
    return await queryAnnouncements(supabase, category, locale);
  } catch {
    return withSignupEventNotice([], category, locale);
  }
}

/** Build-time/server equivalent of getAnnouncementById. */
export async function getServerAnnouncementById(
  id: string,
  locale = 'ko',
): Promise<Announcement | null> {
  if (id === SIGNUP_EVENT_NOTICE_ID) {
    return createSignupEventNotice(locale);
  }

  const { createServerClient } = await import('@/lib/supabase/server');
  const supabase = createServerClient();
  if (!supabase) return null;

  try {
    return await queryAnnouncementById(supabase, id, locale);
  } catch {
    return null;
  }
}

/** 조회수 증가 */
export async function incrementAnnouncementView(id: string): Promise<void> {
  if (id === SIGNUP_EVENT_NOTICE_ID) {
    return;
  }

  const supabase = createClient();

  await supabase.rpc('increment_kcl_announcement_view', { p_id: id });
}

/**
 * 공개된 공지사항 ID 전체 조회 (빌드 타임 전용)
 * generateStaticParams()에서 사용하여 정적 페이지 생성
 * 서버 환경에서만 호출됨 (createServerClient 사용)
 */
export async function getPublishedAnnouncementIds(): Promise<string[]> {
  const { createServerClient } = await import('@/lib/supabase/server');
  const supabase = createServerClient();

  if (!supabase) {
    console.warn('[announcements] 서버 클라이언트 생성 실패, 이벤트 공지 ID만 반환');
    return [SIGNUP_EVENT_NOTICE_ID];
  }

  const { data, error } = await supabase
    .from('announcements')
    .select('id')
    .eq('is_published', true);

  if (error) {
    console.error('[announcements] ID 목록 조회 실패, 이벤트 공지 ID만 반환:', error);
    return [SIGNUP_EVENT_NOTICE_ID];
  }

  const ids = (data || []).map((row: { id: string }) => row.id);
  return ids.includes(SIGNUP_EVENT_NOTICE_ID) ? ids : [SIGNUP_EVENT_NOTICE_ID, ...ids];
}

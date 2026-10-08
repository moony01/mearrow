'use client';

import { getSupabase } from '@/lib/supabase/client';
import { isDevelopmentTestModeEnabled } from '@/lib/auth/development-test-mode';

export const VISUAL_MATCH_PENDING_REQUEST_KEY = 'mearrow-visual-match-pending-request';
export const VISUAL_MATCH_ANALYSIS_ID_KEY = 'mearrow-visual-match-analysis-id';
export const VISUAL_MATCH_ORDER_ID_KEY = 'mearrow-visual-match-order-id';
export const VISUAL_MATCH_CHECKOUT_IDEMPOTENCY_KEY = 'mearrow-visual-match-checkout-idempotency-key';
export const VISUAL_MATCH_PAYMENT_COMPLETE_KEY = 'mearrow-visual-match-payment-complete';
const INPUT_BUCKET = 'visual-match-inputs';
const DEVELOPMENT_REPORT_KEY = 'mearrow-visual-match-development-report';

export type VisualMatchDiscipline = 'vocal' | 'rap' | 'dance' | 'acting' | 'model' | 'songwriting';
export type VisualMatchConcept = 'fresh' | 'dark' | 'elegant' | 'street' | 'dreamy' | 'powerful';

export interface PendingVisualMatchRequest {
  imageStorageKey: string;
  imageMimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  age: number;
  gender: 'male' | 'female';
  height: number;
  country: string;
  primaryField: VisualMatchDiscipline;
  interests: VisualMatchDiscipline[];
  concepts: VisualMatchConcept[];
  customConcept?: string;
  reportLanguage: string;
  saveOriginal: boolean;
}

const VISUAL_MATCH_DISCIPLINES = new Set<VisualMatchDiscipline>([
  'vocal',
  'rap',
  'dance',
  'acting',
  'model',
  'songwriting',
]);
const VISUAL_MATCH_CONCEPT_VALUES = new Set<VisualMatchConcept>([
  'fresh',
  'dark',
  'elegant',
  'street',
  'dreamy',
  'powerful',
]);
const VISUAL_MATCH_IMAGE_MIME_TYPES = new Set<PendingVisualMatchRequest['imageMimeType']>([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export function isValidPendingVisualMatchRequest(value: unknown): value is PendingVisualMatchRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const request = value as Partial<PendingVisualMatchRequest>;
  const interests = request.interests;
  const concepts = request.concepts;

  return typeof request.imageStorageKey === 'string'
    && request.imageStorageKey.trim().length > 0
    && typeof request.imageMimeType === 'string'
    && VISUAL_MATCH_IMAGE_MIME_TYPES.has(request.imageMimeType)
    && typeof request.age === 'number'
    && Number.isInteger(request.age)
    && request.age >= 1
    && request.age <= 100
    && (request.gender === 'male' || request.gender === 'female')
    && typeof request.height === 'number'
    && Number.isFinite(request.height)
    && request.height >= 100
    && request.height <= 250
    && typeof request.country === 'string'
    && request.country.trim().length > 0
    && typeof request.primaryField === 'string'
    && VISUAL_MATCH_DISCIPLINES.has(request.primaryField)
    && Array.isArray(interests)
    && interests.every((value) => typeof value === 'string' && VISUAL_MATCH_DISCIPLINES.has(value as VisualMatchDiscipline))
    && Array.isArray(concepts)
    && concepts.every((value) => typeof value === 'string' && VISUAL_MATCH_CONCEPT_VALUES.has(value as VisualMatchConcept))
    && typeof request.reportLanguage === 'string'
    && request.reportLanguage.trim().length > 0
    && request.reportLanguage.trim().length <= 32
    && typeof request.saveOriginal === 'boolean';
}

export interface VisualMatchAnalysisRequest extends PendingVisualMatchRequest {
  orderId: string;
  imageObjectKey: string;
}

export interface VisualMatchCheckoutResponse {
  orderId: string;
  status: 'checkout_pending' | 'paid' | 'failed' | 'refunded' | 'canceled';
  provider: 'toss';
  providerOrderId: string;
  orderName: string;
  amount: number;
  currency: 'krw';
}

export interface VisualMatchPaymentStatusResponse {
  orderId: string;
  status: 'pending' | 'paid' | 'failed' | 'refunded' | 'canceled';
  analysisId: string | null;
  paidAt: string | null;
  refundedAt: string | null;
  provider: 'toss' | 'stripe';
  providerOrderId: string | null;
  amount: number;
  currency: 'krw';
  clientKey: string | null;
}

export interface VisualMatchReportResponse {
  analysisId: string;
  status: 'completed';
  createdAt: string;
  completedAt: string | null;
  imageUrl: string;
  input: {
    age: number;
    gender: 'male' | 'female';
    height: number;
    country: string;
    primary_field: VisualMatchDiscipline;
    interests: VisualMatchDiscipline[];
    concepts: VisualMatchConcept[];
    custom_concept: string | null;
    report_language: string;
  };
  visualSignals: { visual_summary: string };
  report: {
    version: number;
    language: string;
    visual_summary: string;
    match_summaries: Array<{ rank: number; summary: string }>;
    top_five: Array<{
      rank: number;
      recommendation_reason: string;
      preparation_direction: string;
      focus: string[];
    }>;
    audition_guidance: Array<{
      rank: number;
      preparation_priority: string;
      checklist: string;
    }>;
  };
  matches: Array<{
    rank: number;
    score: number | string;
    scoring_snapshot: { company_style_keywords?: string[] };
    company: { name_ko: string; name_en: string; slug: string };
  }>;
}

const DEVELOPMENT_COMPANIES = [
  ['HYBE', 'HYBE'],
  ['SM Entertainment', 'SM Entertainment'],
  ['JYP Entertainment', 'JYP Entertainment'],
  ['YG Entertainment', 'YG Entertainment'],
  ['STARSHIP Entertainment', 'STARSHIP Entertainment'],
  ['CUBE Entertainment', 'CUBE Entertainment'],
  ['FNC Entertainment', 'FNC Entertainment'],
  ['KQ Entertainment', 'KQ Entertainment'],
  ['RBW', 'RBW'],
  ['WAKEONE', 'WAKEONE'],
  ['P NATION', 'P NATION'],
  ['Fantagio', 'Fantagio'],
  ['HIGH UP Entertainment', 'HIGH UP Entertainment'],
  ['WM Entertainment', 'WM Entertainment'],
  ['MODHAUS', 'MODHAUS'],
  ['ATTRAKT', 'ATTRAKT'],
  ['THE MUZE Entertainment', 'THE MUZE Entertainment'],
  ['Woollim Entertainment', 'Woollim Entertainment'],
  ['MYSTIC STORY', 'MYSTIC STORY'],
  ['S2 Entertainment', 'S2 Entertainment'],
] as const;

function createDevelopmentReport(
  analysisId: string,
  input: PendingVisualMatchRequest,
): VisualMatchReportResponse {
  const now = new Date().toISOString();
  const focus = [input.primaryField, ...(input.concepts ?? []).slice(0, 2), 'portfolio'].filter(Boolean);
  const matches = DEVELOPMENT_COMPANIES.map(([nameKo, nameEn], index) => ({
    rank: index + 1,
    score: Number((96 - index * 2.35).toFixed(1)),
    scoring_snapshot: { company_style_keywords: focus },
    company: {
      name_ko: nameKo,
      name_en: nameEn,
      slug: `development-company-${index + 1}`,
    },
  }));

  return {
    analysisId,
    status: 'completed',
    createdAt: now,
    completedAt: now,
    imageUrl: '/mearrow-mark.svg',
    input: {
      age: input.age,
      gender: input.gender,
      height: input.height,
      country: input.country,
      primary_field: input.primaryField,
      interests: input.interests ?? [],
      concepts: input.concepts ?? [],
      custom_concept: input.customConcept ?? null,
      report_language: input.reportLanguage,
    },
    visualSignals: {
      visual_summary: '개발 테스트 모드에서 입력 흐름 확인을 위해 생성한 시각 분석 요약입니다.',
    },
    report: {
      version: 1,
      language: input.reportLanguage,
      visual_summary: '개발 테스트 모드에서 입력 흐름 확인을 위해 생성한 리포트입니다.',
      match_summaries: matches.map((match) => ({
        rank: match.rank,
        summary: `${match.company.name_ko}의 공개된 방향과 입력 프로필을 기준으로 정리한 개발 테스트 결과입니다.`,
      })),
      top_five: matches.slice(0, 5).map((match) => ({
        rank: match.rank,
        recommendation_reason: `입력한 ${input.primaryField} 프로필과 ${focus.join(', ')} 신호가 ${match.company.name_ko}의 공개된 방향성과 잘 맞습니다. 개발 테스트용으로 생성된 추천 이유입니다.`,
        preparation_direction: `${match.company.name_ko} 지원을 준비한다면 ${focus.join(', ')}을 중심으로 본인의 강점을 보여주는 포트폴리오와 오디션 영상을 정리해 보세요.`,
        focus,
      })),
      audition_guidance: matches.slice(0, 5).map((match) => ({
        rank: match.rank,
        preparation_priority: `${match.company.name_ko}의 최신 오디션 방향에 맞춰 ${focus.join(', ')} 준비물을 우선 정리하세요.`,
        checklist: '공식 홈페이지·공식 SNS·공식 오디션 채널의 최신 공고, 지원 자격, 제출 형식을 확인하세요.',
      })),
    },
    matches,
  };
}

function extensionFor(mimeType: PendingVisualMatchRequest['imageMimeType']) {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

function safeFunctionErrorCode(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const candidate = (payload as { code?: unknown; error?: unknown }).code
    ?? (payload as { error?: unknown }).error;
  if (typeof candidate !== 'string' || !/^[A-Z0-9_]{2,80}$/.test(candidate)) return null;
  return candidate;
}

async function responseError(error: unknown, fallback: string): Promise<string> {
  const context = typeof error === 'object' && error !== null && 'context' in error
    ? (error as { context?: unknown }).context
    : null;

  if (
    context
    && typeof context === 'object'
    && 'status' in context
    && typeof (context as { status?: unknown }).status === 'number'
    && 'clone' in context
    && typeof (context as { clone?: unknown }).clone === 'function'
  ) {
    const response = context as { status: number; clone: () => { json: () => Promise<unknown> } };
    try {
      const code = safeFunctionErrorCode(await response.clone().json());
      return `${fallback}:${response.status}${code ? `:${code}` : ''}`;
    } catch {
      return `${fallback}:${response.status}`;
    }
  }

  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') return error.message;
  return fallback;
}

export async function uploadVisualMatchImage(
  userId: string,
  file: Blob,
  requestedMimeType?: PendingVisualMatchRequest['imageMimeType'],
): Promise<{ objectKey: string; mimeType: PendingVisualMatchRequest['imageMimeType'] }> {
  const mimeType = (requestedMimeType || file.type) as PendingVisualMatchRequest['imageMimeType'];
  const objectKey = `inputs/${userId}/${crypto.randomUUID()}.${extensionFor(mimeType)}`;
  const { error } = await getSupabase().storage.from(INPUT_BUCKET).upload(objectKey, file, {
    cacheControl: '3600',
    contentType: mimeType,
    upsert: false,
  });
  if (error) throw new Error(await responseError(error, 'IMAGE_UPLOAD_FAILED'));
  return { objectKey, mimeType };
}

export async function createVisualMatchCheckout(
  request: PendingVisualMatchRequest,
  locale: string,
  idempotencyKey: string,
  appUrl?: string,
): Promise<VisualMatchCheckoutResponse> {
  const { data, error } = await getSupabase().functions.invoke('visual-match-checkout', {
    body: {
      request,
      locale,
      idempotencyKey,
      appUrl,
    },
  });
  if (error) throw new Error(await responseError(error, 'CHECKOUT_REQUEST_FAILED'));
  if (!data || typeof data !== 'object' || typeof (data as { orderId?: unknown }).orderId !== 'string') {
    throw new Error('CHECKOUT_RESPONSE_INVALID');
  }
  return data as VisualMatchCheckoutResponse;
}

export async function confirmVisualMatchTossPayment(input: {
  orderId: string;
  providerOrderId: string;
  paymentKey: string;
  amount: number;
}): Promise<{ orderId: string; status: 'paid'; paidAt: string | null }> {
  const { data, error } = await getSupabase().functions.invoke('visual-match-toss-confirm', { body: input });
  if (error) throw new Error(await responseError(error, 'PAYMENT_CONFIRM_REQUEST_FAILED'));
  if (!data || typeof data !== 'object' || (data as { status?: unknown }).status !== 'paid') {
    throw new Error('PAYMENT_CONFIRM_RESPONSE_INVALID');
  }
  return data as { orderId: string; status: 'paid'; paidAt: string | null };
}

export async function getVisualMatchPaymentStatus(orderId: string): Promise<VisualMatchPaymentStatusResponse> {
  const { data, error } = await getSupabase().functions.invoke('visual-match-payment-status', {
    body: { orderId },
  });
  if (error) throw new Error(await responseError(error, 'PAYMENT_STATUS_REQUEST_FAILED'));
  if (!data || typeof data !== 'object' || typeof (data as { orderId?: unknown }).orderId !== 'string') {
    throw new Error('PAYMENT_STATUS_RESPONSE_INVALID');
  }
  return data as VisualMatchPaymentStatusResponse;
}

export async function requestVisualMatchAnalysis(input: VisualMatchAnalysisRequest): Promise<{ analysisId: string }> {
  if (isDevelopmentTestModeEnabled()) {
    const analysisId = `development-${crypto.randomUUID()}`;
    window.sessionStorage.setItem(
      DEVELOPMENT_REPORT_KEY,
      JSON.stringify(createDevelopmentReport(analysisId, input)),
    );
    return { analysisId };
  }

  const { imageStorageKey, ...analysisPayload } = input;
  void imageStorageKey;
  const { data, error } = await getSupabase().functions.invoke('visual-match-analyze', { body: analysisPayload });
  if (error) throw new Error(await responseError(error, 'ANALYSIS_REQUEST_FAILED'));
  if (!data || typeof data !== 'object' || typeof (data as { analysisId?: unknown }).analysisId !== 'string') {
    throw new Error('ANALYSIS_RESPONSE_INVALID');
  }
  return { analysisId: (data as { analysisId: string }).analysisId };
}

export async function getVisualMatchReport(analysisId: string): Promise<VisualMatchReportResponse> {
  if (isDevelopmentTestModeEnabled()) {
    const storedReport = window.sessionStorage.getItem(DEVELOPMENT_REPORT_KEY);
    if (!storedReport) {
      throw new Error('개발 테스트 리포트를 찾을 수 없습니다. 분석을 다시 시작해 주세요.');
    }

    const report = JSON.parse(storedReport) as VisualMatchReportResponse;
    if (report.analysisId !== analysisId) {
      throw new Error('개발 테스트 리포트의 분석 ID가 일치하지 않습니다.');
    }
    return report;
  }

  const { data, error } = await getSupabase().functions.invoke('visual-match-analyze', {
    body: { action: 'report', analysisId },
  });
  if (error) throw new Error(await responseError(error, 'REPORT_REQUEST_FAILED'));
  if (!data || typeof data !== 'object') throw new Error('REPORT_RESPONSE_INVALID');
  return data as VisualMatchReportResponse;
}

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.90.1';
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { authenticateRequest } from '../_shared/http.ts';
import { sanitizeVisualMatchOrderRequest } from '../_shared/visual-match-request.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
// Browser-managed secret entry can carry accidental surrounding whitespace.
// Normalize it without ever exposing the value in logs or responses.
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')?.trim();
const OPENAI_MODEL = Deno.env.get('OPENAI_VISUAL_MATCH_MODEL') ?? 'gpt-4o-mini';
const ALLOWED_ORIGIN = Deno.env.get('VISUAL_MATCH_ALLOWED_ORIGIN') ?? '*';

const BUCKET_ID = 'visual-match-inputs';
const COMPANY_PROFILE_VERSION = 1;
const REPORT_VERSION = 1;
const CONCEPTS = ['fresh', 'dark', 'elegant', 'street', 'dreamy', 'powerful'] as const;
const DISCIPLINES = ['vocal', 'rap', 'dance', 'acting', 'model', 'songwriting'] as const;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

type Concept = (typeof CONCEPTS)[number];
type Discipline = (typeof DISCIPLINES)[number];
type Vector = Record<string, number>;

interface AnalysisRequest {
  orderId: string;
  imageObjectKey: string;
  imageMimeType: string;
  age: number;
  gender: 'male' | 'female';
  height: number;
  country: string;
  primaryField: Discipline;
  interests?: Discipline[];
  concepts?: Concept[];
  customConcept?: string;
  reportLanguage: string;
  saveOriginal: boolean;
}

interface CompanyProfile {
  company_id: string;
  concept_weights: Vector;
  discipline_weights: Vector;
  style_keywords: string[];
  company: {
    id: string;
    name_ko: string;
    name_en: string;
    slug: string;
    league_tier: string | null;
    parent_company_id: string | null;
    deleted_at: string | null;
  };
}

interface VisualSignals {
  visual_summary: string;
  concept_signals: Record<Concept, number>;
}

interface RankedCandidate {
  company_id: string;
  company: CompanyProfile['company'];
  score: number;
  scoring_snapshot: Record<string, unknown>;
  rank: number;
}

interface ReportNarrative {
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
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'access-control-allow-origin': ALLOWED_ORIGIN,
      'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
      'content-type': 'application/json; charset=utf-8',
      vary: 'origin',
    },
  });
}

function fail(code: string, status: number) {
  return json({ error: code }, status);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asBoundedNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
    ? value
    : null;
}

function isConcept(value: unknown): value is Concept {
  return typeof value === 'string' && CONCEPTS.includes(value as Concept);
}

function isDiscipline(value: unknown): value is Discipline {
  return typeof value === 'string' && DISCIPLINES.includes(value as Discipline);
}

function sanitizeRequest(value: unknown): AnalysisRequest | null {
  if (!isRecord(value)) return null;

  const orderId = typeof value.orderId === 'string' ? value.orderId : '';
  const interests = Array.isArray(value.interests) ? value.interests.filter(isDiscipline) : [];
  const concepts = Array.isArray(value.concepts) ? value.concepts.filter(isConcept) : [];
  const imageObjectKey = typeof value.imageObjectKey === 'string' ? value.imageObjectKey : '';
  const imageMimeType = typeof value.imageMimeType === 'string' ? value.imageMimeType : '';

  if (
    !isUuid(orderId) ||
    !imageObjectKey ||
    !IMAGE_TYPES.has(imageMimeType) ||
    typeof value.age !== 'number' || value.age < 1 || value.age > 100 ||
    (value.gender !== 'male' && value.gender !== 'female') ||
    typeof value.height !== 'number' || value.height < 100 || value.height > 250 ||
    typeof value.country !== 'string' || !value.country ||
    !isDiscipline(value.primaryField) ||
    typeof value.reportLanguage !== 'string' || !value.reportLanguage ||
    typeof value.saveOriginal !== 'boolean'
  ) {
    return null;
  }

  return {
    orderId,
    imageObjectKey,
    imageMimeType,
    age: value.age,
    gender: value.gender,
    height: value.height,
    country: value.country,
    primaryField: value.primaryField,
    interests,
    concepts,
    customConcept: typeof value.customConcept === 'string' ? value.customConcept.slice(0, 120) : undefined,
    reportLanguage: value.reportLanguage.slice(0, 32),
    saveOriginal: value.saveOriginal,
  };
}

function belongsToUser(objectKey: string, userId: string) {
  return objectKey.startsWith(`inputs/${userId}/`);
}

function byteArrayToBase64(bytes: Uint8Array) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function cosineSimilarity(left: Vector, right: Vector, keys: readonly string[]) {
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (const key of keys) {
    const leftValue = Math.max(0, Number(left[key] ?? 0));
    const rightValue = Math.max(0, Number(right[key] ?? 0));
    dot += leftValue * rightValue;
    leftMagnitude += leftValue ** 2;
    rightMagnitude += rightValue ** 2;
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) return 0;
  return dot / Math.sqrt(leftMagnitude * rightMagnitude);
}

function selectionVector(keys: readonly string[], selected: readonly string[], primary?: string): Vector {
  const selectedSet = new Set(selected);
  return Object.fromEntries(keys.map((key) => [key, key === primary ? 1 : selectedSet.has(key) ? 0.65 : 0]));
}

function readOutputText(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  if (typeof payload.output_text === 'string') return payload.output_text;
  if (!Array.isArray(payload.output)) return null;

  for (const item of payload.output) {
    if (!isRecord(item) || !Array.isArray(item.content)) continue;
    for (const content of item.content) {
      if (isRecord(content) && content.type === 'output_text' && typeof content.text === 'string') {
        return content.text;
      }
    }
  }
  return null;
}

function parseVisualSignals(value: unknown): VisualSignals | null {
  if (!isRecord(value) || typeof value.visual_summary !== 'string' || !isRecord(value.concept_signals)) {
    return null;
  }

  const conceptSignals = {} as Record<Concept, number>;
  for (const concept of CONCEPTS) {
    const signal = asBoundedNumber(value.concept_signals[concept]);
    if (signal === null) return null;
    conceptSignals[concept] = signal;
  }

  return { visual_summary: value.visual_summary.slice(0, 600), concept_signals: conceptSignals };
}

function readNarrativeText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 1_600) : null;
}

function parseReportNarrative(value: unknown, language: string, visualSummary: string): ReportNarrative | null {
  if (!isRecord(value) || !Array.isArray(value.match_summaries) || !Array.isArray(value.top_five) || !Array.isArray(value.audition_guidance)) {
    return null;
  }

  const summaries = value.match_summaries.map((item) => {
    if (!isRecord(item) || !Number.isInteger(item.rank)) return null;
    const summary = readNarrativeText(item.summary);
    return summary ? { rank: item.rank, summary } : null;
  });
  const topFive = value.top_five.map((item) => {
    if (!isRecord(item) || !Number.isInteger(item.rank)) return null;
    const reason = readNarrativeText(item.recommendation_reason);
    const direction = readNarrativeText(item.preparation_direction);
    const focus = Array.isArray(item.focus)
      ? item.focus.map(readNarrativeText).filter((item): item is string => Boolean(item)).slice(0, 4)
      : [];
    return reason && direction && focus.length > 0
      ? { rank: item.rank, recommendation_reason: reason, preparation_direction: direction, focus }
      : null;
  });
  const auditions = value.audition_guidance.map((item) => {
    if (!isRecord(item) || !Number.isInteger(item.rank)) return null;
    const preparationPriority = readNarrativeText(item.preparation_priority);
    const checklist = readNarrativeText(item.checklist);
    return preparationPriority && checklist
      ? { rank: item.rank, preparation_priority: preparationPriority, checklist }
      : null;
  });

  const hasRanks = (items: Array<{ rank: number }>, expected: number[]) =>
    items.length === expected.length && expected.every((rank) => items.some((item) => item.rank === rank));
  if (summaries.some((item) => !item) || topFive.some((item) => !item) || auditions.some((item) => !item)) return null;
  if (!hasRanks(summaries as Array<{ rank: number }>, Array.from({ length: 20 }, (_, index) => index + 1))) return null;
  if (!hasRanks(topFive as Array<{ rank: number }>, [1, 2, 3, 4, 5])) return null;
  if (!hasRanks(auditions as Array<{ rank: number }>, [1, 2, 3, 4, 5])) return null;

  return {
    version: REPORT_VERSION,
    language,
    visual_summary: visualSummary,
    match_summaries: summaries as Array<{ rank: number; summary: string }>,
    top_five: topFive as ReportNarrative['top_five'],
    audition_guidance: auditions as ReportNarrative['audition_guidance'],
  };
}

async function inferReportNarrative(
  visualSignals: VisualSignals,
  input: AnalysisRequest,
  rankedCandidates: RankedCandidate[],
): Promise<ReportNarrative> {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_NOT_CONFIGURED');

  const candidates = rankedCandidates.map((candidate) => ({
    rank: candidate.rank,
    company_name: candidate.company.name_en || candidate.company.name_ko,
    score: candidate.score,
    style_keywords: candidate.scoring_snapshot.company_style_keywords,
  }));
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: new Headers({
      authorization: `Bearer ${OPENAI_API_KEY}`,
      'content-type': 'application/json',
    }),
    body: JSON.stringify({
      model: OPENAI_MODEL,
      store: false,
      input: [
        {
          role: 'developer',
          content: 'Write a supportive personal style-and-preparation report using only the supplied visual-style summary, selected concepts, primary field, and company editorial keywords. This is not an audition outcome, recruitment advice, eligibility assessment, attractiveness judgment, or talent evaluation. Never infer protected or sensitive traits from the image. Do not claim a live audition is open or invent dates, requirements, or links. Give practical portfolio and preparation suggestions only. Return JSON only in the requested report language.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            report_language: input.reportLanguage,
            visual_summary: visualSignals.visual_summary,
            selected_concepts: input.concepts ?? [],
            custom_concept: input.customConcept ?? null,
            primary_field: input.primaryField,
            interests: input.interests ?? [],
            companies: candidates,
            required_output: {
              match_summaries: 'Exactly 20 concise one-sentence summaries, one for each supplied rank.',
              top_five: 'Exactly ranks 1-5. Give a substantial recommendation_reason, a substantial preparation_direction, and 2-4 concrete focus labels for each.',
              audition_guidance: 'Exactly ranks 1-5. Give preparation_priority and a pre-submission checklist. Refer users to official channels for live notices.',
            },
          }),
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'visual_match_personal_report',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['match_summaries', 'top_five', 'audition_guidance'],
            properties: {
              match_summaries: {
                type: 'array', minItems: 20, maxItems: 20,
                items: { type: 'object', additionalProperties: false, required: ['rank', 'summary'], properties: { rank: { type: 'integer', minimum: 1, maximum: 20 }, summary: { type: 'string' } } },
              },
              top_five: {
                type: 'array', minItems: 5, maxItems: 5,
                items: { type: 'object', additionalProperties: false, required: ['rank', 'recommendation_reason', 'preparation_direction', 'focus'], properties: { rank: { type: 'integer', minimum: 1, maximum: 5 }, recommendation_reason: { type: 'string' }, preparation_direction: { type: 'string' }, focus: { type: 'array', minItems: 2, maxItems: 4, items: { type: 'string' } } } },
              },
              audition_guidance: {
                type: 'array', minItems: 5, maxItems: 5,
                items: { type: 'object', additionalProperties: false, required: ['rank', 'preparation_priority', 'checklist'], properties: { rank: { type: 'integer', minimum: 1, maximum: 5 }, preparation_priority: { type: 'string' }, checklist: { type: 'string' } } },
              },
            },
          },
        },
      },
    }),
  });
  if (!response.ok) throw new Error(`OPENAI_REPORT_REQUEST_FAILED_${response.status}`);

  const text = readOutputText(await response.json());
  if (!text) throw new Error('OPENAI_REPORT_EMPTY_RESPONSE');
  try {
    const report = parseReportNarrative(JSON.parse(text), input.reportLanguage, visualSignals.visual_summary);
    if (report) return report;
  } catch {
    // Keep provider output private and return a stable error code below.
  }
  throw new Error('OPENAI_REPORT_INVALID_RESPONSE');
}

async function inferVisualSignals(image: Blob, mimeType: string): Promise<VisualSignals> {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_NOT_CONFIGURED');

  const imageBase64 = byteArrayToBase64(new Uint8Array(await image.arrayBuffer()));
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: new Headers({
      authorization: `Bearer ${OPENAI_API_KEY}`,
      'content-type': 'application/json',
    }),
    body: JSON.stringify({
      model: OPENAI_MODEL,
      store: false,
      input: [
        {
          role: 'developer',
          content: 'Analyze only visual styling: outfit silhouette, styling, color palette, pose, composition, and creative mood. Do not identify the person, infer age, gender, ethnicity, nationality, body type, or attractiveness. Do not assess talent, eligibility, or audition potential. Return JSON only.',
        },
        {
          role: 'user',
          content: [
            { type: 'input_text', text: 'Extract six visual-concept signals from this full-body styling image.' },
            { type: 'input_image', image_url: `data:${mimeType};base64,${imageBase64}`, detail: 'low' },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'visual_match_style_signals',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['visual_summary', 'concept_signals'],
            properties: {
              visual_summary: { type: 'string' },
              concept_signals: {
                type: 'object',
                additionalProperties: false,
                required: [...CONCEPTS],
                properties: Object.fromEntries(CONCEPTS.map((concept) => [concept, { type: 'number', minimum: 0, maximum: 1 }])),
              },
            },
          },
        },
      },
    }),
  });

  if (!response.ok) throw new Error(`OPENAI_REQUEST_FAILED_${response.status}`);

  const text = readOutputText(await response.json());
  if (!text) throw new Error('OPENAI_EMPTY_RESPONSE');

  try {
    const signals = parseVisualSignals(JSON.parse(text));
    if (signals) return signals;
  } catch {
    // The generic error below intentionally keeps provider output private.
  }
  throw new Error('OPENAI_INVALID_RESPONSE');
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function getOwnedReport(
  serviceClient: ReturnType<typeof createClient>,
  userId: string,
  analysisId: string,
) {
  const { data: analysis, error: analysisError } = await serviceClient
    .from('visual_match_analyses')
    .select('id,order_id,status,input_snapshot,visual_signal_snapshot,report_snapshot,image_bucket,image_object_key,created_at,completed_at')
    .eq('id', analysisId)
    .eq('user_id', userId)
    .maybeSingle();
  if (analysisError) return fail('REPORT_LOOKUP_FAILED', 500);
  if (!analysis) return fail('REPORT_NOT_FOUND', 404);
  if (!analysis.order_id) return fail('REPORT_PAYMENT_REQUIRED', 403);

  const { data: order, error: orderError } = await serviceClient
    .from('visual_match_orders')
    .select('status')
    .eq('id', analysis.order_id)
    .eq('user_id', userId)
    .maybeSingle();
  if (orderError) return fail('REPORT_PAYMENT_LOOKUP_FAILED', 500);
  if (!order || order.status !== 'paid') return fail('REPORT_PAYMENT_REQUIRED', 403);
  if (analysis.status !== 'completed' || !analysis.report_snapshot) return fail('REPORT_NOT_READY', 409);

  const { data: rows, error: resultError } = await serviceClient
    .from('visual_match_results')
    .select('rank,score,scoring_snapshot,company:companies!inner(name_ko,name_en,slug)')
    .eq('analysis_id', analysisId)
    .order('rank', { ascending: true });
  if (resultError || !rows || rows.length !== 20) return fail('REPORT_RESULTS_UNAVAILABLE', 503);

  const { data: signedImage, error: signedImageError } = await serviceClient.storage
    .from(analysis.image_bucket)
    .createSignedUrl(analysis.image_object_key, 60 * 10);
  if (signedImageError || !signedImage?.signedUrl) return fail('REPORT_IMAGE_UNAVAILABLE', 503);

  return json({
    analysisId: analysis.id,
    status: analysis.status,
    createdAt: analysis.created_at,
    completedAt: analysis.completed_at,
    input: analysis.input_snapshot,
    visualSignals: analysis.visual_signal_snapshot,
    report: analysis.report_snapshot,
    imageUrl: signedImage.signedUrl,
    matches: rows,
  });
}

serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'access-control-allow-origin': ALLOWED_ORIGIN,
        'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
        'access-control-allow-methods': 'POST, OPTIONS',
        vary: 'origin',
      },
    });
  }
  if (request.method !== 'POST') return fail('METHOD_NOT_ALLOWED', 405);
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) return fail('SERVICE_NOT_CONFIGURED', 503);

  const auth = await authenticateRequest(request);
  if (!auth) return fail('UNAUTHORIZED', 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail('INVALID_REQUEST', 400);
  }

  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  if (isRecord(body) && body.action === 'report') {
    if (!isUuid(body.analysisId)) return fail('INVALID_REPORT_REQUEST', 400);
    return getOwnedReport(serviceClient, auth.user.id, body.analysisId);
  }

  const clientInput = sanitizeRequest(body);
  if (!clientInput || !belongsToUser(clientInput.imageObjectKey, auth.user.id)) return fail('INVALID_REQUEST', 400);

  const { data: order, error: orderError } = await serviceClient
    .from('visual_match_orders')
    .select('id,status,request_snapshot,analysis_id')
    .eq('id', clientInput.orderId)
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (orderError) return fail('ORDER_LOOKUP_FAILED', 500);
  if (!order) return fail('ORDER_NOT_FOUND', 404);
  if (order.status !== 'paid') return fail('PAYMENT_NOT_CONFIRMED', 402);

  const orderInput = sanitizeVisualMatchOrderRequest(order.request_snapshot);
  if (!orderInput) return fail('ORDER_SNAPSHOT_INVALID', 500);

  // The paid snapshot is authoritative. The browser can only provide the
  // post-payment image object key and MIME type needed for this run.
  const input: AnalysisRequest = {
    ...orderInput,
    orderId: order.id,
    imageObjectKey: clientInput.imageObjectKey,
    imageMimeType: clientInput.imageMimeType,
  };

  const { data: existingAnalysis, error: existingAnalysisError } = await serviceClient
    .from('visual_match_analyses')
    .select('id,status,report_snapshot')
    .eq('order_id', order.id)
    .maybeSingle();
  if (existingAnalysisError) return fail('ANALYSIS_LOOKUP_FAILED', 500);
  if (existingAnalysis?.status === 'completed' && existingAnalysis.report_snapshot) {
    return json({ analysisId: existingAnalysis.id, status: 'completed' });
  }
  if (existingAnalysis?.status === 'analyzing') return fail('ANALYSIS_IN_PROGRESS', 409);

  const { data: profiles, error: profileError } = await serviceClient
    .from('visual_match_company_profiles')
    .select('company_id, concept_weights, discipline_weights, style_keywords, company:companies!inner(id,name_ko,name_en,slug,league_tier,parent_company_id,deleted_at)')
    .eq('profile_version', COMPANY_PROFILE_VERSION)
    .eq('is_active', true);

  const activeProfiles = ((profiles ?? []) as unknown as CompanyProfile[]).filter((profile) =>
    profile.company.league_tier !== null && profile.company.parent_company_id === null && profile.company.deleted_at === null,
  );
  if (profileError || activeProfiles.length !== 20) return fail('COMPANY_PROFILE_UNAVAILABLE', 503);

  let analysis: { id: string };
  const inputSnapshot = {
    age: input.age,
    gender: input.gender,
    height: input.height,
    country: input.country,
    primary_field: input.primaryField,
    interests: input.interests,
    concepts: input.concepts,
    custom_concept: input.customConcept ?? null,
    report_language: input.reportLanguage,
  };

  if (existingAnalysis) {
    const { error: cleanupError } = await serviceClient
      .from('visual_match_results')
      .delete()
      .eq('analysis_id', existingAnalysis.id);
    if (cleanupError) return fail('ANALYSIS_RESET_FAILED', 500);

    const { data: resetAnalysis, error: resetError } = await serviceClient
      .from('visual_match_analyses')
      .update({
        status: 'analyzing',
        input_snapshot: inputSnapshot,
        image_bucket: BUCKET_ID,
        image_object_key: input.imageObjectKey,
        image_mime_type: input.imageMimeType,
        save_original: input.saveOriginal,
        model_version: OPENAI_MODEL,
        company_profile_version: COMPANY_PROFILE_VERSION,
        visual_signal_snapshot: null,
        report_snapshot: null,
        error_code: null,
        completed_at: null,
      })
      .eq('id', existingAnalysis.id)
      .select('id')
      .single();
    if (resetError || !resetAnalysis) return fail('ANALYSIS_RESET_FAILED', 500);
    analysis = resetAnalysis;
  } else {
    const { data: insertedAnalysis, error: analysisError } = await serviceClient
      .from('visual_match_analyses')
      .insert({
        user_id: auth.user.id,
        order_id: order.id,
        status: 'analyzing',
        input_snapshot: inputSnapshot,
        image_bucket: BUCKET_ID,
        image_object_key: input.imageObjectKey,
        image_mime_type: input.imageMimeType,
        save_original: input.saveOriginal,
        model_version: OPENAI_MODEL,
        company_profile_version: COMPANY_PROFILE_VERSION,
      })
      .select('id')
      .single();
    if (analysisError || !insertedAnalysis) return fail('ANALYSIS_CREATE_FAILED', 500);
    analysis = insertedAnalysis;
  }

  const { error: orderLinkError } = await serviceClient
    .from('visual_match_orders')
    .update({ analysis_id: analysis.id, updated_at: new Date().toISOString() })
    .eq('id', order.id)
    .eq('user_id', auth.user.id);
  if (orderLinkError) return fail('ANALYSIS_ORDER_LINK_FAILED', 500);

  try {
    const { data: image, error: imageError } = await serviceClient.storage.from(BUCKET_ID).download(input.imageObjectKey);
    if (imageError || !image) throw new Error('IMAGE_UNAVAILABLE');

    const visualSignals = await inferVisualSignals(image, input.imageMimeType);
    const selectedConcepts = selectionVector(CONCEPTS, input.concepts ?? []);
    const selectedDisciplines = selectionVector(DISCIPLINES, input.interests ?? [], input.primaryField);

    const rankedCandidates = activeProfiles
      .map((profile) => {
        const visual = cosineSimilarity(visualSignals.concept_signals, profile.concept_weights, CONCEPTS);
        const concept = (input.concepts?.length ?? 0) > 0
          ? cosineSimilarity(selectedConcepts, profile.concept_weights, CONCEPTS)
          : 0.5;
        const discipline = cosineSimilarity(selectedDisciplines, profile.discipline_weights, DISCIPLINES);
        const similarity = (visual * 0.5) + (concept * 0.25) + (discipline * 0.25);

        return {
          company_id: profile.company_id,
          company: profile.company,
          score: Math.min(95, Math.max(35, Math.round((35 + (similarity * 60)) * 100) / 100)),
          scoring_snapshot: {
            formula_version: 'visual-match-v1',
            visual_similarity: Number(visual.toFixed(4)),
            concept_similarity: Number(concept.toFixed(4)),
            discipline_similarity: Number(discipline.toFixed(4)),
            company_style_keywords: profile.style_keywords,
          },
        };
      })
      .sort((left, right) => right.score - left.score || left.company.slug.localeCompare(right.company.slug))
      .map((result, index) => ({ ...result, rank: index + 1 }));

    const rankedResults = rankedCandidates
      .map((result) => ({
        analysis_id: analysis.id,
        company_id: result.company_id,
        company_profile_version: COMPANY_PROFILE_VERSION,
        rank: result.rank,
        score: result.score,
        scoring_snapshot: result.scoring_snapshot,
      }));

    const { error: resultError } = await serviceClient.from('visual_match_results').insert(rankedResults);
    if (resultError) throw new Error('RESULT_SAVE_FAILED');

    const reportNarrative = await inferReportNarrative(visualSignals, input, rankedCandidates);

    const { error: completeError } = await serviceClient
      .from('visual_match_analyses')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        visual_signal_snapshot: visualSignals,
        report_snapshot: reportNarrative,
      })
      .eq('id', analysis.id);
    if (completeError) throw new Error('ANALYSIS_COMPLETE_FAILED');

    return json({ analysisId: analysis.id, status: 'completed' }, 201);
  } catch (error) {
    const errorCode = error instanceof Error ? error.message : 'ANALYSIS_FAILED';
    await serviceClient
      .from('visual_match_analyses')
      .update({ status: 'failed', error_code: errorCode.slice(0, 80) })
      .eq('id', analysis.id);

    return fail(errorCode === 'OPENAI_NOT_CONFIGURED' ? 'ANALYSIS_UNAVAILABLE' : 'ANALYSIS_FAILED', 502);
  }
});

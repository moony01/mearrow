export const VISUAL_MATCH_CONCEPTS = ['fresh', 'dark', 'elegant', 'street', 'dreamy', 'powerful'] as const;
export const VISUAL_MATCH_DISCIPLINES = ['vocal', 'rap', 'dance', 'acting', 'model', 'songwriting'] as const;
export const VISUAL_MATCH_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export type VisualMatchConcept = (typeof VISUAL_MATCH_CONCEPTS)[number];
export type VisualMatchDiscipline = (typeof VISUAL_MATCH_DISCIPLINES)[number];

export interface VisualMatchOrderRequest {
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

export interface VisualMatchAnalysisImage {
  orderId: string;
  imageObjectKey: string;
  imageMimeType: 'image/jpeg' | 'image/png' | 'image/webp';
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function uniqueValues<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function isConcept(value: unknown): value is VisualMatchConcept {
  return typeof value === 'string' && VISUAL_MATCH_CONCEPTS.includes(value as VisualMatchConcept);
}

function isDiscipline(value: unknown): value is VisualMatchDiscipline {
  return typeof value === 'string' && VISUAL_MATCH_DISCIPLINES.includes(value as VisualMatchDiscipline);
}

export function sanitizeVisualMatchOrderRequest(value: unknown): VisualMatchOrderRequest | null {
  if (!isRecord(value)) return null;

  const interests = Array.isArray(value.interests)
    ? uniqueValues(value.interests.filter(isDiscipline))
    : [];
  const concepts = Array.isArray(value.concepts)
    ? uniqueValues(value.concepts.filter(isConcept))
    : [];
  const country = typeof value.country === 'string' ? value.country.trim().slice(0, 32) : '';
  const reportLanguage = typeof value.reportLanguage === 'string'
    ? value.reportLanguage.trim().slice(0, 32)
    : '';
  const customConcept = typeof value.customConcept === 'string'
    ? value.customConcept.trim().slice(0, 120)
    : '';

  if (
    typeof value.age !== 'number' || !Number.isInteger(value.age) || value.age < 1 || value.age > 100
    || (value.gender !== 'male' && value.gender !== 'female')
    || typeof value.height !== 'number' || !Number.isFinite(value.height) || value.height < 100 || value.height > 250
    || !country
    || !isDiscipline(value.primaryField)
    || !reportLanguage
    || typeof value.saveOriginal !== 'boolean'
  ) {
    return null;
  }

  return {
    age: value.age,
    gender: value.gender,
    height: value.height,
    country,
    primaryField: value.primaryField,
    interests,
    concepts,
    ...(customConcept ? { customConcept } : {}),
    reportLanguage,
    saveOriginal: value.saveOriginal,
  };
}

export function sanitizeVisualMatchAnalysisImage(value: unknown): VisualMatchAnalysisImage | null {
  if (!isRecord(value)) return null;
  if (!isUuid(value.orderId)) return null;
  if (typeof value.imageObjectKey !== 'string' || !value.imageObjectKey) return null;
  if (typeof value.imageMimeType !== 'string' || !VISUAL_MATCH_IMAGE_TYPES.has(value.imageMimeType)) return null;

  return {
    orderId: value.orderId,
    imageObjectKey: value.imageObjectKey,
    imageMimeType: value.imageMimeType as VisualMatchAnalysisImage['imageMimeType'],
  };
}

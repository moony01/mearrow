import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import {
  authenticateRequest,
  createServiceClient,
  fail,
  json,
  optionsResponse,
  SERVICE_CONFIGURED,
} from '../_shared/http.ts';
import { createTossOrderId, tossConfigured } from '../_shared/toss.ts';
import { isRecord, isUuid, sanitizeVisualMatchOrderRequest } from '../_shared/visual-match-request.ts';

const PRICE_KRW = 1900;
const ORDER_NAME = 'MEARROW Visual Match 개인 리포트';
const LOCALES = new Set(['ko', 'en', 'ja', 'zh', 'es', 'fr', 'de']);

function isIdempotencyKey(value: unknown): value is string {
  return typeof value === 'string'
    && value.length >= 16
    && value.length <= 128
    && /^[a-zA-Z0-9_-]+$/.test(value);
}

function checkoutResponse(order: Record<string, unknown>) {
  return {
    orderId: order.id,
    status: order.status,
    provider: order.payment_provider,
    providerOrderId: order.provider_order_id,
    orderName: ORDER_NAME,
    amount: order.amount,
    currency: order.currency,
  };
}

serve(async (request) => {
  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'POST') return fail('METHOD_NOT_ALLOWED', 405);
  if (!SERVICE_CONFIGURED) return fail('SERVICE_NOT_CONFIGURED', 503);
  if (!tossConfigured()) return fail('PAYMENT_NOT_CONFIGURED', 503);

  const auth = await authenticateRequest(request);
  if (!auth) return fail('UNAUTHORIZED', 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail('INVALID_REQUEST', 400);
  }
  if (!isRecord(body)) return fail('INVALID_REQUEST', 400);

  const requestSnapshot = sanitizeVisualMatchOrderRequest(body.request);
  const idempotencyKey = body.idempotencyKey;
  const locale = typeof body.locale === 'string' && LOCALES.has(body.locale) ? body.locale : 'ko';
  if (!requestSnapshot || !isIdempotencyKey(idempotencyKey)) return fail('INVALID_REQUEST', 400);

  const serviceClient = createServiceClient();
  if (!serviceClient) return fail('SERVICE_NOT_CONFIGURED', 503);

  const selectOrder = 'id,status,payment_provider,provider_order_id,amount,currency';
  const { data: existingOrder, error: lookupError } = await serviceClient
    .from('visual_match_orders')
    .select(selectOrder)
    .eq('user_id', auth.user.id)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();
  if (lookupError) return fail('ORDER_LOOKUP_FAILED', 500);

  if (existingOrder) {
    if (existingOrder.payment_provider !== 'toss') return fail('PAYMENT_PROVIDER_MISMATCH', 409);
    if (existingOrder.status === 'paid' || typeof existingOrder.provider_order_id === 'string') {
      return json(checkoutResponse(existingOrder as Record<string, unknown>));
    }
  }

  let order = existingOrder as Record<string, unknown> | null;
  if (!order) {
    const { data: insertedOrder, error: insertError } = await serviceClient
      .from('visual_match_orders')
      .insert({
        user_id: auth.user.id,
        status: 'checkout_pending',
        idempotency_key: idempotencyKey,
        payment_provider: 'toss',
        provider_order_id: createTossOrderId(),
        amount: PRICE_KRW,
        currency: 'krw',
        locale,
        request_snapshot: requestSnapshot,
      })
      .select(selectOrder)
      .single();

    if (insertError || !insertedOrder) {
      const { data: racedOrder } = await serviceClient
        .from('visual_match_orders')
        .select(selectOrder)
        .eq('user_id', auth.user.id)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();
      if (!racedOrder) return fail('ORDER_CREATE_FAILED', 500);
      if (racedOrder.payment_provider !== 'toss') return fail('PAYMENT_PROVIDER_MISMATCH', 409);
      order = racedOrder as Record<string, unknown>;
    } else {
      order = insertedOrder as Record<string, unknown>;
    }
  }

  if (!order || typeof order.id !== 'string' || !isUuid(order.id) || typeof order.provider_order_id !== 'string') {
    return fail('ORDER_CREATE_FAILED', 500);
  }
  return json(checkoutResponse(order));
});

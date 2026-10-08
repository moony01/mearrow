import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import {
  authenticateRequest,
  createServiceClient,
  fail,
  json,
  optionsResponse,
  SERVICE_CONFIGURED,
} from '../_shared/http.ts';
import { tossClientKey } from '../_shared/toss.ts';
import { isRecord, isUuid } from '../_shared/visual-match-request.ts';

type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'canceled';

function toPaymentStatus(status: unknown): PaymentStatus {
  if (status === 'paid') return 'paid';
  if (status === 'failed') return 'failed';
  if (status === 'refunded') return 'refunded';
  if (status === 'canceled') return 'canceled';
  return 'pending';
}

serve(async (request) => {
  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'POST') return fail('METHOD_NOT_ALLOWED', 405);
  if (!SERVICE_CONFIGURED) return fail('SERVICE_NOT_CONFIGURED', 503);

  const auth = await authenticateRequest(request);
  if (!auth) return fail('UNAUTHORIZED', 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail('INVALID_REQUEST', 400);
  }
  if (!isRecord(body) || !isUuid(body.orderId)) return fail('INVALID_REQUEST', 400);

  const serviceClient = createServiceClient();
  if (!serviceClient) return fail('SERVICE_NOT_CONFIGURED', 503);

  const { data: order, error } = await serviceClient
    .from('visual_match_orders')
    .select('id,status,analysis_id,paid_at,refunded_at,payment_provider,provider_order_id,amount,currency')
    .eq('id', body.orderId)
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (error) return fail('ORDER_LOOKUP_FAILED', 500);
  if (!order) return fail('ORDER_NOT_FOUND', 404);

  return json({
    orderId: order.id,
    status: toPaymentStatus(order.status),
    analysisId: typeof order.analysis_id === 'string' ? order.analysis_id : null,
    paidAt: order.paid_at,
    refundedAt: order.refunded_at,
    provider: order.payment_provider,
    providerOrderId: order.provider_order_id,
    amount: order.amount,
    currency: order.currency,
    clientKey: order.payment_provider === 'toss' ? tossClientKey() : null,
  });
});

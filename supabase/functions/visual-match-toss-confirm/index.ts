import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import {
  authenticateRequest,
  createServiceClient,
  fail,
  json,
  optionsResponse,
  SERVICE_CONFIGURED,
} from '../_shared/http.ts';
import { confirmTossPayment, isTossOrderId, TossApiError, tossConfigured } from '../_shared/toss.ts';
import { isRecord, isUuid } from '../_shared/visual-match-request.ts';

function validPaymentKey(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 1 && value.length <= 200;
}

function completedResponse(order: Record<string, unknown>) {
  return {
    orderId: order.id,
    status: order.status,
    paidAt: order.paid_at ?? null,
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

  const orderId = body.orderId;
  const providerOrderId = body.providerOrderId;
  const paymentKey = body.paymentKey;
  const amount = body.amount;
  if (!isUuid(orderId) || !isTossOrderId(providerOrderId) || !validPaymentKey(paymentKey) || !Number.isInteger(amount)) {
    return fail('INVALID_REQUEST', 400);
  }

  const serviceClient = createServiceClient();
  if (!serviceClient) return fail('SERVICE_NOT_CONFIGURED', 503);

  const { data: order, error: lookupError } = await serviceClient
    .from('visual_match_orders')
    .select('id,status,user_id,payment_provider,provider_order_id,provider_payment_key,amount,currency,paid_at')
    .eq('id', orderId)
    .eq('user_id', auth.user.id)
    .maybeSingle();
  if (lookupError) return fail('ORDER_LOOKUP_FAILED', 500);
  if (!order) return fail('ORDER_NOT_FOUND', 404);
  if (order.payment_provider !== 'toss' || order.provider_order_id !== providerOrderId || order.currency !== 'krw') {
    return fail('ORDER_PROVIDER_MISMATCH', 409);
  }
  if (order.status === 'paid') {
    if (order.provider_payment_key && order.provider_payment_key !== paymentKey) return fail('PAYMENT_KEY_MISMATCH', 409);
    return json(completedResponse(order as Record<string, unknown>));
  }
  if (order.status === 'refunded' || order.status === 'canceled') return fail('ORDER_NOT_PAYABLE', 409);
  if (amount !== order.amount) return fail('AMOUNT_MISMATCH', 409);

  try {
    const payment = await confirmTossPayment({
      paymentKey,
      providerOrderId,
      amount: order.amount,
      idempotencyKey: order.id,
    });
    if (payment.status !== 'DONE' || payment.orderId !== order.provider_order_id || payment.amount !== order.amount) {
      return fail('PAYMENT_NOT_CONFIRMED', 409);
    }

    const { data: updatedOrder, error: updateError } = await serviceClient
      .from('visual_match_orders')
      .update({
        status: 'paid',
        provider_payment_key: payment.paymentKey,
        provider_payment_method: payment.method,
        provider_payment_status: payment.status,
        paid_at: payment.approvedAt ?? new Date().toISOString(),
        failure_code: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .eq('user_id', auth.user.id)
      .select('id,status,paid_at')
      .single();
    if (updateError || !updatedOrder) return fail('ORDER_UPDATE_FAILED', 500);
    return json(completedResponse(updatedOrder as Record<string, unknown>));
  } catch (error) {
    const code = error instanceof TossApiError ? error.code : 'PAYMENT_CONFIRM_FAILED';
    console.error('[visual-match-toss-confirm]', code);
    return fail(code === 'PAYMENT_NOT_CONFIGURED' ? code : 'PAYMENT_CONFIRM_FAILED', code === 'PAYMENT_NOT_CONFIGURED' ? 503 : 502);
  }
});

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import {
  createServiceClient,
  fail,
  json,
  optionsResponse,
  SERVICE_CONFIGURED,
} from '../_shared/http.ts';
import { getTossPayment, isTossOrderId, TossApiError, tossConfigured } from '../_shared/toss.ts';
import { isRecord } from '../_shared/visual-match-request.ts';

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function paymentStatusUpdate(status: string) {
  if (status === 'CANCELED' || status === 'PARTIAL_CANCELED') return { status: 'refunded', refunded_at: new Date().toISOString() };
  if (status === 'ABORTED' || status === 'EXPIRED') return { status: 'failed' };
  return null;
}

serve(async (request) => {
  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'POST') return fail('METHOD_NOT_ALLOWED', 405);
  if (!SERVICE_CONFIGURED) return fail('SERVICE_NOT_CONFIGURED', 503);
  if (!tossConfigured()) return fail('PAYMENT_NOT_CONFIGURED', 503);

  const transmissionId = request.headers.get('tosspayments-webhook-transmission-id');
  if (!transmissionId || transmissionId.length > 200) return fail('INVALID_WEBHOOK_REQUEST', 400);

  let event: unknown;
  try {
    event = await request.json();
  } catch {
    return fail('INVALID_WEBHOOK_PAYLOAD', 400);
  }
  if (!isRecord(event) || typeof event.eventType !== 'string') return fail('INVALID_WEBHOOK_PAYLOAD', 400);

  const data = isRecord(event.data) ? event.data : null;
  const providerOrderId = data ? stringValue(data.orderId) : null;
  const providerPaymentKey = data ? stringValue(data.paymentKey) : null;
  const serviceClient = createServiceClient();
  if (!serviceClient) return fail('SERVICE_NOT_CONFIGURED', 503);

  const { error: insertError } = await serviceClient
    .from('visual_match_toss_webhook_events')
    .insert({
      transmission_id: transmissionId,
      event_type: event.eventType,
      provider_order_id: providerOrderId,
      provider_payment_key: providerPaymentKey,
      payload: event,
    });
  if (insertError) {
    if (insertError.code === '23505') return json({ received: true, duplicate: true });
    return fail('EVENT_LOG_FAILED', 500);
  }

  try {
    if (event.eventType !== 'PAYMENT_STATUS_CHANGED' || !providerOrderId || !providerPaymentKey || !isTossOrderId(providerOrderId)) {
      return json({ received: true });
    }

    // Payment-status webhooks do not carry a signature. Re-querying Toss with
    // the server secret prevents a forged payload from changing an order.
    const payment = await getTossPayment(providerPaymentKey);
    if (payment.orderId !== providerOrderId) throw new TossApiError('PAYMENT_REFERENCE_MISMATCH');

    const update: Record<string, unknown> = {
      provider_payment_key: payment.paymentKey,
      provider_payment_method: payment.method,
      provider_payment_status: payment.status,
      updated_at: new Date().toISOString(),
    };
    const terminalUpdate = paymentStatusUpdate(payment.status);
    if (terminalUpdate) Object.assign(update, terminalUpdate);

    await serviceClient
      .from('visual_match_orders')
      .update(update)
      .eq('payment_provider', 'toss')
      .eq('provider_order_id', providerOrderId);

    await serviceClient
      .from('visual_match_toss_webhook_events')
      .update({ processed_at: new Date().toISOString(), error_code: null })
      .eq('transmission_id', transmissionId);
    return json({ received: true });
  } catch (error) {
    const code = error instanceof TossApiError ? error.code : 'WEBHOOK_PROCESSING_FAILED';
    await serviceClient
      .from('visual_match_toss_webhook_events')
      .update({ error_code: code.slice(0, 80) })
      .eq('transmission_id', transmissionId);
    console.error('[visual-match-toss-webhook]', code);
    return fail('WEBHOOK_PROCESSING_FAILED', 500);
  }
});

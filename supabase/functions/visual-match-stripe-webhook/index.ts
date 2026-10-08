import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import {
  createServiceClient,
  fail,
  json,
  optionsResponse,
  SERVICE_CONFIGURED,
} from '../_shared/http.ts';
import { verifyStripeSignature } from '../_shared/stripe.ts';
import { isRecord, isUuid } from '../_shared/visual-match-request.ts';

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function metadataValue(object: Record<string, unknown>, key: string) {
  const metadata = isRecord(object.metadata) ? object.metadata : null;
  return metadata ? stringValue(metadata[key]) : null;
}

function orderIdFromObject(object: Record<string, unknown>) {
  const metadataOrderId = metadataValue(object, 'order_id');
  if (metadataOrderId && isUuid(metadataOrderId)) return metadataOrderId;
  const clientReferenceId = stringValue(object.client_reference_id);
  return clientReferenceId && isUuid(clientReferenceId) ? clientReferenceId : null;
}

function paymentIntentIdFromObject(object: Record<string, unknown>) {
  if (typeof object.payment_intent === 'string') return object.payment_intent;
  return null;
}

async function updateOrderForEvent(
  serviceClient: NonNullable<ReturnType<typeof createServiceClient>>,
  eventType: string,
  object: Record<string, unknown>,
) {
  let orderId = orderIdFromObject(object);
  const paymentIntentId = paymentIntentIdFromObject(object);

  if (!orderId && paymentIntentId) {
    const { data: order } = await serviceClient
      .from('visual_match_orders')
      .select('id')
      .eq('stripe_payment_intent_id', paymentIntentId)
      .maybeSingle();
    orderId = order?.id ?? null;
  }

  // Events unrelated to this product may be delivered if the endpoint is
  // configured broadly. Record them as processed without changing an order.
  if (!orderId) return;

  let update: Record<string, unknown> | null = null;
  if (eventType === 'checkout.session.completed') {
    const paymentStatus = stringValue(object.payment_status);
    update = paymentStatus === 'paid'
      ? {
        status: 'paid',
        stripe_payment_intent_id: paymentIntentId,
        stripe_customer_id: stringValue(object.customer),
        paid_at: new Date().toISOString(),
        failure_code: null,
        updated_at: new Date().toISOString(),
      }
      : { updated_at: new Date().toISOString() };
  } else if (eventType === 'checkout.session.async_payment_succeeded') {
    update = {
      status: 'paid',
      stripe_payment_intent_id: paymentIntentId,
      stripe_customer_id: stringValue(object.customer),
      paid_at: new Date().toISOString(),
      failure_code: null,
      updated_at: new Date().toISOString(),
    };
  } else if (eventType === 'checkout.session.async_payment_failed' || eventType === 'payment_intent.payment_failed') {
    const paymentError = isRecord(object.last_payment_error) ? stringValue(object.last_payment_error.code) : null;
    update = {
      status: 'failed',
      stripe_payment_intent_id: paymentIntentId,
      failure_code: paymentError ?? 'PAYMENT_FAILED',
      updated_at: new Date().toISOString(),
    };
  } else if (eventType === 'charge.refunded' || eventType === 'refund.created') {
    update = {
      status: 'refunded',
      stripe_payment_intent_id: paymentIntentId,
      refunded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  if (!update) return;
  const { error } = await serviceClient
    .from('visual_match_orders')
    .update(update)
    .eq('id', orderId);
  if (error) throw new Error('ORDER_UPDATE_FAILED');
}

serve(async (request) => {
  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'POST') return fail('METHOD_NOT_ALLOWED', 405);
  if (!SERVICE_CONFIGURED) return fail('SERVICE_NOT_CONFIGURED', 503);

  const signature = request.headers.get('stripe-signature');
  const payload = await request.text();
  if (!signature || !(await verifyStripeSignature(
    payload,
    signature,
    Number(Deno.env.get('STRIPE_WEBHOOK_TOLERANCE_SECONDS') ?? 300),
  ))) {
    return fail('INVALID_WEBHOOK_SIGNATURE', 400);
  }

  let event: unknown;
  try {
    event = JSON.parse(payload);
  } catch {
    return fail('INVALID_WEBHOOK_PAYLOAD', 400);
  }
  if (!isRecord(event) || typeof event.id !== 'string' || typeof event.type !== 'string' || !isRecord(event.data)) {
    return fail('INVALID_WEBHOOK_PAYLOAD', 400);
  }
  const eventObject = isRecord(event.data.object) ? event.data.object : null;
  if (!eventObject) return fail('INVALID_WEBHOOK_PAYLOAD', 400);

  const serviceClient = createServiceClient();
  if (!serviceClient) return fail('SERVICE_NOT_CONFIGURED', 503);

  const { error: eventInsertError } = await serviceClient
    .from('visual_match_payment_events')
    .insert({
      stripe_event_id: event.id,
      event_type: event.type,
      payload: event,
    });
  if (eventInsertError) {
    if (eventInsertError.code === '23505') return json({ received: true, duplicate: true });
    return fail('EVENT_LOG_FAILED', 500);
  }

  try {
    await updateOrderForEvent(serviceClient, event.type, eventObject);
    await serviceClient
      .from('visual_match_payment_events')
      .update({ processed_at: new Date().toISOString(), error_code: null })
      .eq('stripe_event_id', event.id);
    return json({ received: true });
  } catch (error) {
    const errorCode = error instanceof Error ? error.message : 'WEBHOOK_PROCESSING_FAILED';
    await serviceClient
      .from('visual_match_payment_events')
      .update({ error_code: errorCode.slice(0, 80) })
      .eq('stripe_event_id', event.id);
    console.error('[visual-match-stripe-webhook]', errorCode);
    return fail('WEBHOOK_PROCESSING_FAILED', 500);
  }
});

const STRIPE_API_URL = 'https://api.stripe.com/v1';

function stripeSecret() {
  return Deno.env.get('STRIPE_SECRET_KEY') ?? '';
}

function toHex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export function stripeConfigured() {
  return Boolean(stripeSecret() && Deno.env.get('STRIPE_PRICE_ID'));
}

export async function createStripeCheckoutSession({
  orderId,
  userId,
  locale,
  appUrl,
  idempotencyKey,
}: {
  orderId: string;
  userId: string;
  locale: string;
  appUrl: string;
  idempotencyKey: string;
}) {
  const secret = stripeSecret();
  const priceId = Deno.env.get('STRIPE_PRICE_ID');
  if (!secret || !priceId) throw new Error('STRIPE_NOT_CONFIGURED');

  const baseUrl = appUrl.replace(/\/+$/, '');
  const params = new URLSearchParams();
  params.set('mode', 'payment');
  params.set('line_items[0][price]', priceId);
  params.set('line_items[0][quantity]', '1');
  params.set('success_url', `${baseUrl}/${locale}/ai/visual-match/analyzing?order_id=${encodeURIComponent(orderId)}&checkout_session_id={CHECKOUT_SESSION_ID}`);
  params.set('cancel_url', `${baseUrl}/${locale}/ai/visual-match/payment?checkout=canceled&order_id=${encodeURIComponent(orderId)}`);
  params.set('client_reference_id', orderId);
  params.set('metadata[order_id]', orderId);
  params.set('metadata[user_id]', userId);
  params.set('metadata[product]', 'mearrow_visual_match_report');
  params.set('payment_intent_data[metadata][order_id]', orderId);
  params.set('payment_intent_data[metadata][user_id]', userId);

  const response = await fetch(`${STRIPE_API_URL}/checkout/sessions`, {
    method: 'POST',
    headers: {
      authorization: `Basic ${btoa(`${secret}:`)}`,
      'content-type': 'application/x-www-form-urlencoded',
      'idempotency-key': idempotencyKey,
    },
    body: params,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload || typeof payload !== 'object') {
    throw new Error(`STRIPE_CHECKOUT_FAILED_${response.status}`);
  }

  const session = payload as { id?: unknown; url?: unknown; payment_intent?: unknown; customer?: unknown };
  if (typeof session.id !== 'string' || typeof session.url !== 'string') {
    throw new Error('STRIPE_CHECKOUT_RESPONSE_INVALID');
  }

  return {
    id: session.id,
    url: session.url,
    paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
    customerId: typeof session.customer === 'string' ? session.customer : null,
    priceId,
  };
}

export async function verifyStripeSignature(payload: string, signatureHeader: string, toleranceSeconds = 300) {
  const secret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!secret) return false;

  const parts = signatureHeader.split(',').reduce<Record<string, string[]>>((result, part) => {
    const [key, value] = part.split('=', 2);
    if (key && value) result[key] = [...(result[key] ?? []), value];
    return result;
  }, {});
  const timestamp = Number(parts.t?.[0]);
  if (!Number.isInteger(timestamp)) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > toleranceSeconds) return false;

  const expectedInput = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const expected = toHex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(expectedInput)));
  return (parts.v1 ?? []).some((candidate) => constantTimeEqual(expected, candidate));
}

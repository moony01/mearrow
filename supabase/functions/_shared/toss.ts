const TOSS_API_URL = 'https://api.tosspayments.com/v1';

export interface TossPayment {
  paymentKey: string;
  orderId: string;
  amount: number;
  status: string;
  method: string | null;
  approvedAt: string | null;
}

export class TossApiError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

function secret() {
  const value = Deno.env.get('TOSS_SECRET_KEY')?.trim();
  return value || null;
}

export function tossClientKey() {
  const value = Deno.env.get('TOSS_CLIENT_KEY')?.trim();
  return value || null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function parsePayment(value: unknown): TossPayment {
  const payment = asRecord(value);
  const paymentKey = payment ? stringValue(payment.paymentKey) : null;
  const orderId = payment ? stringValue(payment.orderId) : null;
  const amount = payment?.totalAmount;
  const status = payment ? stringValue(payment.status) : null;

  if (!paymentKey || !orderId || typeof amount !== 'number' || !Number.isInteger(amount) || !status) {
    throw new TossApiError('TOSS_INVALID_RESPONSE');
  }

  return {
    paymentKey,
    orderId,
    amount,
    status,
    method: stringValue(payment.method),
    approvedAt: stringValue(payment.approvedAt),
  };
}

async function tossFetch(path: string, init: RequestInit) {
  const apiSecret = secret();
  if (!apiSecret) throw new TossApiError('PAYMENT_NOT_CONFIGURED');

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Basic ${btoa(`${apiSecret}:`)}`);
  headers.set('Content-Type', 'application/json');

  const response = await fetch(`${TOSS_API_URL}${path}`, { ...init, headers });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = asRecord(body);
    throw new TossApiError(stringValue(error?.code) ?? 'TOSS_API_REQUEST_FAILED');
  }
  return parsePayment(body);
}

export function tossConfigured() {
  return Boolean(secret() && tossClientKey());
}

export function createTossOrderId() {
  return `vm_${crypto.randomUUID().replaceAll('-', '')}`;
}

export function isTossOrderId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{6,64}$/.test(value);
}

export async function confirmTossPayment(input: {
  paymentKey: string;
  providerOrderId: string;
  amount: number;
  idempotencyKey: string;
}) {
  return tossFetch('/payments/confirm', {
    method: 'POST',
    headers: { 'Idempotency-Key': input.idempotencyKey },
    body: JSON.stringify({
      paymentKey: input.paymentKey,
      orderId: input.providerOrderId,
      amount: input.amount,
    }),
  });
}

export async function getTossPayment(paymentKey: string) {
  return tossFetch(`/payments/${encodeURIComponent(paymentKey)}`, { method: 'GET' });
}

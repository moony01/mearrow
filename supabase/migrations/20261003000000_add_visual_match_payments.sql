-- Server-authoritative payment records for MEARROW Visual Match.
-- Stripe webhook events are the source of truth; the browser never grants access.

CREATE TABLE public.visual_match_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'checkout_pending'
    CHECK (status IN ('checkout_pending', 'paid', 'failed', 'refunded', 'canceled')),
  idempotency_key text NOT NULL,
  stripe_checkout_session_id text UNIQUE,
  stripe_checkout_url text,
  stripe_payment_intent_id text,
  stripe_customer_id text,
  stripe_price_id text NOT NULL,
  amount integer NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'krw' CHECK (currency = 'krw'),
  locale text NOT NULL DEFAULT 'ko',
  request_snapshot jsonb NOT NULL,
  failure_code text,
  paid_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key),
  CHECK (jsonb_typeof(request_snapshot) = 'object')
);

CREATE INDEX visual_match_orders_user_created_idx
  ON public.visual_match_orders (user_id, created_at DESC);

CREATE INDEX visual_match_orders_status_idx
  ON public.visual_match_orders (status, created_at DESC);

ALTER TABLE public.visual_match_analyses
  ADD COLUMN IF NOT EXISTS order_id uuid
    REFERENCES public.visual_match_orders(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX visual_match_analyses_order_id_idx
  ON public.visual_match_analyses (order_id)
  WHERE order_id IS NOT NULL;

ALTER TABLE public.visual_match_orders
  ADD COLUMN analysis_id uuid
    REFERENCES public.visual_match_analyses(id) ON DELETE SET NULL;

CREATE INDEX visual_match_orders_analysis_id_idx
  ON public.visual_match_orders (analysis_id)
  WHERE analysis_id IS NOT NULL;

CREATE TABLE public.visual_match_payment_events (
  stripe_event_id text PRIMARY KEY,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed_at timestamptz,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(payload) = 'object')
);

ALTER TABLE public.visual_match_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visual_match_payment_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.visual_match_orders FROM anon, authenticated;
REVOKE ALL ON public.visual_match_payment_events FROM anon, authenticated;

COMMENT ON TABLE public.visual_match_orders IS
  'Server-authoritative Stripe checkout and entitlement records for Visual Match reports.';
COMMENT ON COLUMN public.visual_match_orders.request_snapshot IS
  'Validated, non-image survey input captured before checkout; never contains the uploaded image.';
COMMENT ON TABLE public.visual_match_payment_events IS
  'Stripe webhook event log used for idempotent payment state transitions.';

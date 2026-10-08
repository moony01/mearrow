-- Keep existing Stripe history intact while making new Visual Match orders
-- provider-neutral. New checkouts use Toss Payments.

ALTER TABLE public.visual_match_orders
  ALTER COLUMN stripe_price_id DROP NOT NULL;

ALTER TABLE public.visual_match_orders
  ADD COLUMN IF NOT EXISTS payment_provider text NOT NULL DEFAULT 'stripe'
    CHECK (payment_provider IN ('stripe', 'toss')),
  ADD COLUMN IF NOT EXISTS provider_order_id text,
  ADD COLUMN IF NOT EXISTS provider_payment_key text,
  ADD COLUMN IF NOT EXISTS provider_payment_method text,
  ADD COLUMN IF NOT EXISTS provider_payment_status text;

CREATE UNIQUE INDEX IF NOT EXISTS visual_match_orders_provider_order_id_idx
  ON public.visual_match_orders (payment_provider, provider_order_id)
  WHERE provider_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS visual_match_orders_provider_payment_key_idx
  ON public.visual_match_orders (payment_provider, provider_payment_key)
  WHERE provider_payment_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.visual_match_toss_webhook_events (
  transmission_id text PRIMARY KEY,
  event_type text NOT NULL,
  provider_order_id text,
  provider_payment_key text,
  payload jsonb NOT NULL,
  processed_at timestamptz,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (jsonb_typeof(payload) = 'object')
);

ALTER TABLE public.visual_match_toss_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.visual_match_toss_webhook_events FROM anon, authenticated;

COMMENT ON COLUMN public.visual_match_orders.payment_provider IS
  'Payment provider that produced the entitlement. New orders use Toss Payments; historic Stripe rows remain readable.';
COMMENT ON TABLE public.visual_match_toss_webhook_events IS
  'Toss Payments status notifications. The server re-queries Toss before changing entitlement state.';

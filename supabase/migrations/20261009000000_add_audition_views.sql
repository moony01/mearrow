-- Persist view counts for static audition content independently from news.
-- Public readers may see counts; only the narrowly scoped RPC can increment them.

BEGIN;

CREATE TABLE IF NOT EXISTS public.audition_views (
  slug text PRIMARY KEY CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  view_count integer NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.audition_views ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.audition_views FROM anon, authenticated;
GRANT SELECT ON TABLE public.audition_views TO anon, authenticated;

DROP POLICY IF EXISTS "audition_views_select_public" ON public.audition_views;
CREATE POLICY "audition_views_select_public"
  ON public.audition_views
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.increment_audition_view(p_slug text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  next_view_count integer;
BEGIN
  IF p_slug IS NULL OR p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' THEN
    RAISE EXCEPTION 'Invalid audition slug';
  END IF;

  INSERT INTO public.audition_views (slug, view_count)
  VALUES (p_slug, 1)
  ON CONFLICT (slug) DO UPDATE
    SET view_count = public.audition_views.view_count + 1,
        updated_at = timezone('utc', now())
  RETURNING view_count INTO next_view_count;

  RETURN next_view_count;
END;
$function$;

REVOKE ALL ON FUNCTION public.increment_audition_view(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_audition_view(text) TO anon, authenticated;

COMMIT;

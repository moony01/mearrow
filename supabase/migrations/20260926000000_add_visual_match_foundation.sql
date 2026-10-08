-- MEARROW AI Visual Match: private source images, versioned company profiles,
-- reproducible analysis runs, and server-only result rows.

CREATE TABLE public.visual_match_company_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  profile_version integer NOT NULL DEFAULT 1 CHECK (profile_version > 0),
  is_active boolean NOT NULL DEFAULT true,
  concept_weights jsonb NOT NULL,
  discipline_weights jsonb NOT NULL,
  style_keywords text[] NOT NULL DEFAULT '{}',
  editorial_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, profile_version),
  CHECK (jsonb_typeof(concept_weights) = 'object'),
  CHECK (jsonb_typeof(discipline_weights) = 'object')
);

CREATE INDEX visual_match_company_profiles_active_version_idx
  ON public.visual_match_company_profiles (profile_version, company_id)
  WHERE is_active = true;

CREATE TABLE public.visual_match_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'analyzing', 'completed', 'failed')),
  input_snapshot jsonb NOT NULL,
  image_bucket text NOT NULL DEFAULT 'visual-match-inputs',
  image_object_key text NOT NULL,
  image_mime_type text NOT NULL CHECK (image_mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
  save_original boolean NOT NULL DEFAULT false,
  model_version text,
  company_profile_version integer NOT NULL,
  visual_signal_snapshot jsonb,
  report_snapshot jsonb,
  error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CHECK (jsonb_typeof(input_snapshot) = 'object'),
  CHECK (visual_signal_snapshot IS NULL OR jsonb_typeof(visual_signal_snapshot) = 'object'),
  CHECK (report_snapshot IS NULL OR jsonb_typeof(report_snapshot) = 'object')
);

CREATE INDEX visual_match_analyses_user_created_idx
  ON public.visual_match_analyses (user_id, created_at DESC);

CREATE TABLE public.visual_match_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES public.visual_match_analyses(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  company_profile_version integer NOT NULL,
  rank integer NOT NULL CHECK (rank BETWEEN 1 AND 20),
  score numeric(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  scoring_snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (analysis_id, company_id),
  UNIQUE (analysis_id, rank),
  CHECK (jsonb_typeof(scoring_snapshot) = 'object')
);

CREATE INDEX visual_match_results_analysis_rank_idx
  ON public.visual_match_results (analysis_id, rank);

-- Input images are private. The client may only place, read, or remove objects
-- under inputs/<its-auth-user-id>/; the Edge Function is the only service that
-- reads them to call an AI provider.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'visual-match-inputs',
  'visual-match-inputs',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

ALTER TABLE public.visual_match_company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visual_match_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visual_match_results ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.visual_match_company_profiles FROM anon, authenticated;
REVOKE ALL ON public.visual_match_results FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.visual_match_analyses FROM anon, authenticated;
GRANT SELECT ON public.visual_match_analyses TO authenticated;

CREATE POLICY visual_match_analyses_select_own
  ON public.visual_match_analyses
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY visual_match_input_images_insert_own
  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'visual-match-inputs'
    AND (storage.foldername(name))[1] = 'inputs'
    AND (storage.foldername(name))[2] = (SELECT auth.uid()::text)
  );

CREATE POLICY visual_match_input_images_select_own
  ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'visual-match-inputs'
    AND (storage.foldername(name))[1] = 'inputs'
    AND (storage.foldername(name))[2] = (SELECT auth.uid()::text)
  );

CREATE POLICY visual_match_input_images_delete_own
  ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'visual-match-inputs'
    AND (storage.foldername(name))[1] = 'inputs'
    AND (storage.foldername(name))[2] = (SELECT auth.uid()::text)
  );

-- Initial editorial baseline. These values are creative style descriptors, not
-- recruitment requirements, appearance scores, or eligibility filters.
WITH seed (slug, concept_weights, discipline_weights, style_keywords, editorial_note) AS (
  VALUES
    ('asnd-entertainment', '{"fresh":0.85,"dark":0.30,"elegant":0.60,"street":0.35,"dreamy":0.55,"powerful":0.45}'::jsonb, '{"vocal":0.70,"rap":0.35,"dance":0.70,"acting":0.45,"model":0.55,"songwriting":0.40}'::jsonb, ARRAY['bright','polished','youthful'], 'Editorial baseline; review before production ranking.'),
    ('attrakt', '{"fresh":0.80,"dark":0.35,"elegant":0.60,"street":0.45,"dreamy":0.55,"powerful":0.60}'::jsonb, '{"vocal":0.65,"rap":0.40,"dance":0.75,"acting":0.40,"model":0.60,"songwriting":0.35}'::jsonb, ARRAY['hook-driven','confident','clean'], 'Editorial baseline; review before production ranking.'),
    ('cube-entertainment', '{"fresh":0.40,"dark":0.70,"elegant":0.55,"street":0.75,"dreamy":0.35,"powerful":0.85}'::jsonb, '{"vocal":0.70,"rap":0.75,"dance":0.75,"acting":0.55,"model":0.55,"songwriting":0.80}'::jsonb, ARRAY['self-directed','bold','performance'], 'Editorial baseline; review before production ranking.'),
    ('fantagio', '{"fresh":0.65,"dark":0.35,"elegant":0.85,"street":0.30,"dreamy":0.70,"powerful":0.45}'::jsonb, '{"vocal":0.60,"rap":0.30,"dance":0.60,"acting":0.80,"model":0.80,"songwriting":0.40}'::jsonb, ARRAY['refined','visual','soft'], 'Editorial baseline; review before production ranking.'),
    ('highup-entertainment', '{"fresh":0.85,"dark":0.25,"elegant":0.70,"street":0.35,"dreamy":0.75,"powerful":0.50}'::jsonb, '{"vocal":0.70,"rap":0.35,"dance":0.70,"acting":0.35,"model":0.65,"songwriting":0.55}'::jsonb, ARRAY['melodic','bright','stylish'], 'Editorial baseline; review before production ranking.'),
    ('hybe', '{"fresh":0.65,"dark":0.60,"elegant":0.65,"street":0.60,"dreamy":0.55,"powerful":0.70}'::jsonb, '{"vocal":0.70,"rap":0.65,"dance":0.75,"acting":0.45,"model":0.60,"songwriting":0.70}'::jsonb, ARRAY['global','story-led','performance'], 'Parent-company baseline; labels require future separated editorial profiles.'),
    ('jyp-entertainment', '{"fresh":0.75,"dark":0.35,"elegant":0.55,"street":0.55,"dreamy":0.45,"powerful":0.80}'::jsonb, '{"vocal":0.70,"rap":0.55,"dance":0.85,"acting":0.35,"model":0.55,"songwriting":0.55}'::jsonb, ARRAY['energetic','precise','stage-ready'], 'Editorial baseline; review before production ranking.'),
    ('kq-entertainment', '{"fresh":0.30,"dark":0.80,"elegant":0.40,"street":0.75,"dreamy":0.30,"powerful":0.90}'::jsonb, '{"vocal":0.60,"rap":0.80,"dance":0.90,"acting":0.30,"model":0.55,"songwriting":0.55}'::jsonb, ARRAY['intense','street','performance'], 'Editorial baseline; review before production ranking.'),
    ('modhaus', '{"fresh":0.55,"dark":0.45,"elegant":0.75,"street":0.45,"dreamy":0.85,"powerful":0.45}'::jsonb, '{"vocal":0.65,"rap":0.40,"dance":0.65,"acting":0.40,"model":0.75,"songwriting":0.70}'::jsonb, ARRAY['experimental','conceptual','digital'], 'Editorial baseline; review before production ranking.'),
    ('mystic-story', '{"fresh":0.55,"dark":0.45,"elegant":0.85,"street":0.30,"dreamy":0.75,"powerful":0.45}'::jsonb, '{"vocal":0.85,"rap":0.35,"dance":0.55,"acting":0.75,"model":0.65,"songwriting":0.75}'::jsonb, ARRAY['artistic','vocal-led','refined'], 'Editorial baseline; review before production ranking.'),
    ('p-nation', '{"fresh":0.45,"dark":0.70,"elegant":0.35,"street":0.85,"dreamy":0.25,"powerful":0.85}'::jsonb, '{"vocal":0.60,"rap":0.90,"dance":0.80,"acting":0.35,"model":0.55,"songwriting":0.75}'::jsonb, ARRAY['individual','urban','high-energy'], 'Editorial baseline; review before production ranking.'),
    ('rbw', '{"fresh":0.55,"dark":0.40,"elegant":0.80,"street":0.35,"dreamy":0.65,"powerful":0.65}'::jsonb, '{"vocal":0.90,"rap":0.50,"dance":0.65,"acting":0.45,"model":0.60,"songwriting":0.80}'::jsonb, ARRAY['vocal-led','musical','polished'], 'Editorial baseline; review before production ranking.'),
    ('s2-entertainment', '{"fresh":0.80,"dark":0.30,"elegant":0.65,"street":0.45,"dreamy":0.65,"powerful":0.65}'::jsonb, '{"vocal":0.65,"rap":0.40,"dance":0.80,"acting":0.30,"model":0.65,"songwriting":0.45}'::jsonb, ARRAY['fresh','choreographic','clean'], 'Editorial baseline; review before production ranking.'),
    ('sm-entertainment', '{"fresh":0.60,"dark":0.55,"elegant":0.85,"street":0.50,"dreamy":0.75,"powerful":0.70}'::jsonb, '{"vocal":0.85,"rap":0.55,"dance":0.80,"acting":0.55,"model":0.75,"songwriting":0.65}'::jsonb, ARRAY['conceptual','polished','vocal'], 'Editorial baseline; review before production ranking.'),
    ('starship-entertainment', '{"fresh":0.75,"dark":0.35,"elegant":0.85,"street":0.40,"dreamy":0.55,"powerful":0.65}'::jsonb, '{"vocal":0.70,"rap":0.45,"dance":0.75,"acting":0.50,"model":0.80,"songwriting":0.50}'::jsonb, ARRAY['confident','elegant','pop'], 'Editorial baseline; review before production ranking.'),
    ('the-muze', '{"fresh":0.60,"dark":0.45,"elegant":0.60,"street":0.50,"dreamy":0.55,"powerful":0.55}'::jsonb, '{"vocal":0.60,"rap":0.50,"dance":0.65,"acting":0.50,"model":0.60,"songwriting":0.55}'::jsonb, ARRAY['balanced','contemporary','emerging'], 'Conservative placeholder pending editorial company review.'),
    ('wakeone', '{"fresh":0.70,"dark":0.45,"elegant":0.60,"street":0.50,"dreamy":0.50,"powerful":0.80}'::jsonb, '{"vocal":0.70,"rap":0.55,"dance":0.85,"acting":0.45,"model":0.60,"songwriting":0.45}'::jsonb, ARRAY['competitive','performance','versatile'], 'Editorial baseline; review before production ranking.'),
    ('wm-entertainment', '{"fresh":0.80,"dark":0.30,"elegant":0.70,"street":0.35,"dreamy":0.75,"powerful":0.50}'::jsonb, '{"vocal":0.75,"rap":0.35,"dance":0.70,"acting":0.45,"model":0.65,"songwriting":0.55}'::jsonb, ARRAY['melodic','bright','warm'], 'Editorial baseline; review before production ranking.'),
    ('woollim-entertainment', '{"fresh":0.50,"dark":0.55,"elegant":0.75,"street":0.35,"dreamy":0.80,"powerful":0.55}'::jsonb, '{"vocal":0.80,"rap":0.45,"dance":0.65,"acting":0.40,"model":0.60,"songwriting":0.65}'::jsonb, ARRAY['emotive','dreamy','vocal'], 'Editorial baseline; review before production ranking.'),
    ('yg-entertainment', '{"fresh":0.35,"dark":0.80,"elegant":0.45,"street":0.90,"dreamy":0.25,"powerful":0.90}'::jsonb, '{"vocal":0.65,"rap":0.95,"dance":0.80,"acting":0.35,"model":0.65,"songwriting":0.80}'::jsonb, ARRAY['urban','individual','bold'], 'Editorial baseline; review before production ranking.')
)
INSERT INTO public.visual_match_company_profiles (
  company_id,
  profile_version,
  concept_weights,
  discipline_weights,
  style_keywords,
  editorial_note
)
SELECT
  companies.id,
  1,
  seed.concept_weights,
  seed.discipline_weights,
  seed.style_keywords,
  seed.editorial_note
FROM seed
JOIN public.companies ON companies.slug = seed.slug
WHERE companies.deleted_at IS NULL
  AND companies.parent_company_id IS NULL
  AND companies.league_tier IS NOT NULL
ON CONFLICT (company_id, profile_version) DO NOTHING;

DO $$
DECLARE
  profile_count integer;
BEGIN
  SELECT count(*) INTO profile_count
  FROM public.visual_match_company_profiles
  WHERE profile_version = 1
    AND is_active = true;

  IF profile_count <> 20 THEN
    RAISE EXCEPTION 'Visual Match profile seed requires exactly 20 active companies; found %', profile_count;
  END IF;
END;
$$;

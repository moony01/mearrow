-- Replace Mystic Story in the active company set with A2O Entertainment.
-- A2O's neutral profile keeps the fixed 20-company Visual Match contract intact
-- until its descriptors receive editorial review.
BEGIN;

DO $$
DECLARE
  mystic_id uuid;
  a2o_id uuid;
  active_company_count integer;
  active_profile_count integer;
BEGIN
  SELECT id
  INTO mystic_id
  FROM public.companies
  WHERE slug = 'mystic-story'
  ORDER BY created_at
  LIMIT 1;

  IF mystic_id IS NOT NULL THEN
    UPDATE public.companies
    SET deleted_at = COALESCE(deleted_at, now()),
        updated_at = now()
    WHERE id = mystic_id
      AND deleted_at IS NULL;

    UPDATE public.visual_match_company_profiles
    SET is_active = false,
        updated_at = now()
    WHERE company_id = mystic_id
      AND is_active = true;
  END IF;

  SELECT id
  INTO a2o_id
  FROM public.companies
  WHERE slug = 'a2o-entertainment'
  ORDER BY created_at
  LIMIT 1;

  IF a2o_id IS NULL THEN
    INSERT INTO public.companies (
      name_ko,
      name_en,
      slug,
      logo_url,
      rank,
      firepower,
      league_tier,
      previous_season_rank,
      parent_company_id,
      deleted_at
    ) VALUES (
      '에이투오엔터테인먼트',
      'A2O Entertainment',
      'a2o-entertainment',
      '/images/company-logos/a2o.svg',
      20,
      0,
      'challengers',
      20,
      NULL,
      NULL
    )
    RETURNING id INTO a2o_id;
  ELSE
    UPDATE public.companies
    SET name_ko = '에이투오엔터테인먼트',
        name_en = 'A2O Entertainment',
        logo_url = '/images/company-logos/a2o.svg',
        rank = 20,
        league_tier = 'challengers',
        previous_season_rank = 20,
        parent_company_id = NULL,
        deleted_at = NULL,
        updated_at = now()
    WHERE id = a2o_id;
  END IF;

  INSERT INTO public.visual_match_company_profiles (
    company_id,
    profile_version,
    is_active,
    concept_weights,
    discipline_weights,
    style_keywords,
    editorial_note
  ) VALUES (
    a2o_id,
    1,
    true,
    '{"fresh":0.5,"dark":0.5,"elegant":0.5,"street":0.5,"dreamy":0.5,"powerful":0.5}'::jsonb,
    '{"vocal":0.5,"rap":0.5,"dance":0.5,"acting":0.5,"model":0.5,"songwriting":0.5}'::jsonb,
    ARRAY['neutral baseline', 'pending editorial review'],
    'Neutral placeholder; editorial review pending. Weights are not recruitment or eligibility judgments.'
  )
  ON CONFLICT (company_id, profile_version) DO UPDATE
  SET is_active = true,
      concept_weights = EXCLUDED.concept_weights,
      discipline_weights = EXCLUDED.discipline_weights,
      style_keywords = EXCLUDED.style_keywords,
      editorial_note = EXCLUDED.editorial_note,
      updated_at = now();

  SELECT count(*)
  INTO active_company_count
  FROM public.companies
  WHERE deleted_at IS NULL
    AND parent_company_id IS NULL
    AND league_tier IS NOT NULL;

  SELECT count(*)
  INTO active_profile_count
  FROM public.visual_match_company_profiles profiles
  JOIN public.companies companies ON companies.id = profiles.company_id
  WHERE profiles.profile_version = 1
    AND profiles.is_active = true
    AND companies.deleted_at IS NULL
    AND companies.parent_company_id IS NULL
    AND companies.league_tier IS NOT NULL;

  IF active_company_count <> 20 OR active_profile_count <> 20 THEN
    RAISE EXCEPTION
      'A2O replacement requires 20 active ranked companies and profiles; found companies=%, profiles=%',
      active_company_count,
      active_profile_count;
  END IF;
END;
$$;

COMMIT;

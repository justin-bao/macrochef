-- Rebuild the recipe catalog as a lean searchable index.
--
-- Full recipe payloads should be written to Supabase Storage (or another object
-- store) under recipe-details/<source>/<source_id>.json.gz and referenced from
-- public.recipe_detail_objects. This keeps the Postgres database small enough
-- for low-cost Supabase tiers while preserving fast macro/title search.

BEGIN;

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

ALTER TABLE IF EXISTS public.recipes RENAME TO recipes_legacy_full_payload;

CREATE TABLE public.recipes (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  source_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  total_minutes INTEGER,
  servings NUMERIC,
  ingredients JSONB NOT NULL DEFAULT '[]'::jsonb,
  instructions JSONB NOT NULL DEFAULT '[]'::jsonb,
  ingredient_names TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  kcal NUMERIC,
  protein_g NUMERIC,
  carbs_g NUMERIC,
  fat_g NUMERIC,
  detail_bucket_id TEXT NOT NULL DEFAULT 'recipe-details',
  detail_object_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  search_vector TSVECTOR GENERATED ALWAYS AS (
    to_tsvector(
      'english'::regconfig,
      coalesce(title, '') || ' ' || coalesce(description, '')
    )
  ) STORED,
  UNIQUE (source, source_id)
);

COMMENT ON TABLE public.recipes IS
  'Lean searchable recipe catalog. Full recipe details live in object storage.';
COMMENT ON COLUMN public.recipes.ingredients IS
  'Lean ingredient strings for search and previews. Keep full parsed details in recipe-details storage.';
COMMENT ON COLUMN public.recipes.instructions IS
  'Compatibility placeholder. Prefer full instructions from recipe_detail_objects/storage.';
COMMENT ON COLUMN public.recipes.detail_object_path IS
  'Object path in detail_bucket_id for the full recipe JSON payload, usually <source>/<source_id>.json.gz.';

INSERT INTO public.recipes (
  id,
  source,
  source_id,
  title,
  description,
  image_url,
  total_minutes,
  servings,
  ingredients,
  instructions,
  ingredient_names,
  kcal,
  protein_g,
  carbs_g,
  fat_g,
  detail_bucket_id,
  detail_object_path,
  created_at
)
SELECT
  r.id,
  r.source,
  r.source_id,
  r.title,
  NULLIF(left(coalesce(r.description, ''), 300), ''),
  r.image_url,
  r.total_minutes,
  r.servings,
  CASE
    WHEN jsonb_typeof(r.ingredients) = 'array' THEN r.ingredients
    ELSE '[]'::jsonb
  END,
  '[]'::jsonb,
  ARRAY(
    SELECT ingredient_name
    FROM jsonb_array_elements_text(
      CASE
        WHEN jsonb_typeof(r.ingredients) = 'array' THEN r.ingredients
        ELSE '[]'::jsonb
      END
    ) AS ingredient_name
  ),
  r.kcal,
  r.protein_g,
  r.carbs_g,
  r.fat_g,
  'recipe-details',
  r.source || '/' || regexp_replace(r.source_id, '[^A-Za-z0-9._-]+', '_', 'g') || '.json.gz',
  r.created_at
FROM public.recipes_legacy_full_payload AS r;

SELECT setval(
  pg_get_serial_sequence('public.recipes', 'id'),
  coalesce((SELECT max(id) FROM public.recipes), 1),
  (SELECT count(*) > 0 FROM public.recipes)
);

DROP TABLE IF EXISTS public.recipes_legacy_full_payload CASCADE;

CREATE TABLE public.recipe_detail_objects (
  recipe_id BIGINT PRIMARY KEY REFERENCES public.recipes(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  source_id TEXT NOT NULL,
  bucket_id TEXT NOT NULL DEFAULT 'recipe-details',
  object_path TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'application/json',
  content_encoding TEXT NOT NULL DEFAULT 'gzip',
  byte_size BIGINT,
  content_sha256 TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source, source_id),
  UNIQUE (bucket_id, object_path)
);

COMMENT ON TABLE public.recipe_detail_objects IS
  'Maps lean recipe catalog rows to full recipe detail payloads stored outside Postgres.';

INSERT INTO public.recipe_detail_objects (
  recipe_id,
  source,
  source_id,
  bucket_id,
  object_path
)
SELECT
  id,
  source,
  source_id,
  detail_bucket_id,
  detail_object_path
FROM public.recipes
WHERE detail_object_path IS NOT NULL
ON CONFLICT (recipe_id) DO NOTHING;

CREATE INDEX idx_recipe_catalog_kcal ON public.recipes (kcal);
CREATE INDEX idx_recipe_catalog_protein ON public.recipes (protein_g);
CREATE INDEX idx_recipe_catalog_carbs ON public.recipes (carbs_g);
CREATE INDEX idx_recipe_catalog_fat ON public.recipes (fat_g);
CREATE INDEX idx_recipe_catalog_minutes ON public.recipes (total_minutes);
CREATE INDEX idx_recipe_catalog_title_trgm ON public.recipes USING GIN (title extensions.gin_trgm_ops);
CREATE INDEX idx_recipe_catalog_search ON public.recipes USING GIN (search_vector);
CREATE INDEX idx_recipe_catalog_ingredient_names ON public.recipes USING GIN (ingredient_names);
CREATE INDEX idx_recipe_detail_objects_source ON public.recipe_detail_objects (source, source_id);

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_detail_objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recipe catalog is publicly readable"
  ON public.recipes
  FOR SELECT
  USING (true);

CREATE POLICY "Recipe detail object metadata is publicly readable"
  ON public.recipe_detail_objects
  FOR SELECT
  USING (true);

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON TABLE public.recipes TO anon, authenticated;
GRANT SELECT ON TABLE public.recipe_detail_objects TO anon, authenticated;

DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    EXECUTE $storage$
      INSERT INTO storage.buckets (
        id,
        name,
        public,
        file_size_limit,
        allowed_mime_types
      )
      VALUES (
        'recipe-details',
        'recipe-details',
        true,
        1048576,
        ARRAY[
          'application/json',
          'application/gzip',
          'application/octet-stream'
        ]
      )
      ON CONFLICT (id) DO UPDATE SET
        public = EXCLUDED.public,
        file_size_limit = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types
    $storage$;
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('storage.objects') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname = 'Recipe detail files are publicly readable'
    )
  THEN
    EXECUTE $storage_policy$
      CREATE POLICY "Recipe detail files are publicly readable"
        ON storage.objects
        FOR SELECT
        TO anon, authenticated
        USING (bucket_id = 'recipe-details')
    $storage_policy$;
  END IF;
END
$$;

COMMIT;

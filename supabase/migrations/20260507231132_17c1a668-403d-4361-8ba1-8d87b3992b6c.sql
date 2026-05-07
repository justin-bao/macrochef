CREATE EXTENSION IF NOT EXISTS pg_trgm;

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
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  kcal NUMERIC,
  protein_g NUMERIC,
  carbs_g NUMERIC,
  fat_g NUMERIC,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source, source_id)
);

CREATE INDEX idx_recipes_kcal       ON public.recipes (kcal);
CREATE INDEX idx_recipes_protein    ON public.recipes (protein_g);
CREATE INDEX idx_recipes_carbs      ON public.recipes (carbs_g);
CREATE INDEX idx_recipes_fat        ON public.recipes (fat_g);
CREATE INDEX idx_recipes_minutes    ON public.recipes (total_minutes);
CREATE INDEX idx_recipes_title_trgm ON public.recipes USING GIN (title gin_trgm_ops);
CREATE INDEX idx_recipes_fts ON public.recipes
  USING GIN (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'')));

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recipes are publicly readable"
  ON public.recipes
  FOR SELECT
  USING (true);

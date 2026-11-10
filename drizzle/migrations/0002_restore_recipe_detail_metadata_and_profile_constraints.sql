ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS detail_bucket_id text NOT NULL DEFAULT 'recipe-details';
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS detail_object_path text;
CREATE TABLE IF NOT EXISTS public.recipe_detail_objects (
 recipe_id bigint PRIMARY KEY REFERENCES public.recipes(id) ON DELETE CASCADE,
 source text NOT NULL,
 source_id text NOT NULL,
 bucket_id text NOT NULL DEFAULT 'recipe-details',
 object_path text NOT NULL,
 content_type text NOT NULL DEFAULT 'application/json',
 content_encoding text NOT NULL DEFAULT 'gzip',
 byte_size bigint,
 content_sha256 text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(source, source_id), UNIQUE(bucket_id, object_path)
);
GRANT SELECT ON public.recipe_detail_objects TO anon, authenticated;
GRANT ALL ON public.recipe_detail_objects TO service_role;
ALTER TABLE public.recipe_detail_objects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public restored recipe detail metadata" ON public.recipe_detail_objects;
CREATE POLICY "Public restored recipe detail metadata" ON public.recipe_detail_objects FOR SELECT TO anon, authenticated USING (true);
ALTER TABLE public.user_profiles ADD CONSTRAINT restored_profile_goal_valid CHECK (goal IN ('lose_body_fat','build_muscle','maintain_weight','fuel_runs','general_nutrition'));
ALTER TABLE public.user_profiles ADD CONSTRAINT restored_unit_system_valid CHECK (unit_system IN ('imperial','metric'));
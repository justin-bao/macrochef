ALTER TABLE public.user_profiles
  ADD COLUMN goal TEXT NOT NULL DEFAULT 'maintain_weight'
  CHECK (goal IN ('lose_body_fat', 'build_muscle', 'maintain_weight', 'fuel_runs', 'general_nutrition'));

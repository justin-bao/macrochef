
-- Macro goals (default targets per user)
CREATE TABLE public.macro_goals (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  kcal INTEGER NOT NULL DEFAULT 2000,
  protein_g INTEGER NOT NULL DEFAULT 150,
  carbs_g INTEGER NOT NULL DEFAULT 200,
  fat_g INTEGER NOT NULL DEFAULT 65,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.macro_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own goals" ON public.macro_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own goals" ON public.macro_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own goals" ON public.macro_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own goals" ON public.macro_goals FOR DELETE USING (auth.uid() = user_id);

-- Saved tuned recipes
CREATE TABLE public.saved_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  spoonacular_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  image TEXT,
  servings NUMERIC,
  target_macros JSONB,
  applied_swaps JSONB DEFAULT '[]'::jsonb,
  scaled_ingredients JSONB,
  computed_macros JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own saved recipes" ON public.saved_recipes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own saved recipes" ON public.saved_recipes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own saved recipes" ON public.saved_recipes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own saved recipes" ON public.saved_recipes FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_saved_recipes_user ON public.saved_recipes(user_id, created_at DESC);

CREATE TABLE public.meal_goals (
 user_id uuid NOT NULL,
 meal text NOT NULL CHECK (meal IN ('breakfast','lunch','dinner','snacks')),
 kcal numeric CHECK (kcal >= 0),
 protein_g numeric CHECK (protein_g >= 0),
 carbs_g numeric CHECK (carbs_g >= 0),
 fat_g numeric CHECK (fat_g >= 0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (user_id, meal)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_goals TO authenticated;
GRANT ALL ON public.meal_goals TO service_role;
ALTER TABLE public.meal_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own meal goals" ON public.meal_goals FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
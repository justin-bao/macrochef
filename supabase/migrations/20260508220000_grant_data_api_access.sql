GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON TABLE public.recipes TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.macro_goals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.saved_recipes TO authenticated;

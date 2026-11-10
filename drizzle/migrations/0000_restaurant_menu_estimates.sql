CREATE TABLE public.restaurant_menu_estimates (
 user_id uuid NOT NULL,
 place_id text NOT NULL,
 dishes jsonb NOT NULL DEFAULT '[]'::jsonb,
 source_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
 status text NOT NULL DEFAULT 'ready',
 error_message text,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (user_id, place_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_menu_estimates TO authenticated;
GRANT ALL ON public.restaurant_menu_estimates TO service_role;
ALTER TABLE public.restaurant_menu_estimates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own menu estimate cache" ON public.restaurant_menu_estimates FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
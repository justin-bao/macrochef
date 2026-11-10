DO $$ BEGIN CREATE TYPE public.profile_sex AS ENUM ('female', 'male', 'unspecified'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.activity_connection_provider AS ENUM ('strava'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS public.user_profiles (
 user_id uuid PRIMARY KEY,
 weight numeric NOT NULL DEFAULT 180,
 height numeric NOT NULL DEFAULT 70,
 age integer NOT NULL DEFAULT 35,
 sex public.profile_sex NOT NULL DEFAULT 'unspecified',
 unit_system text NOT NULL DEFAULT 'imperial',
 goal text NOT NULL DEFAULT 'maintain_weight',
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_profiles TO service_role;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Own restored profile" ON public.user_profiles;
CREATE POLICY "Own restored profile" ON public.user_profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TABLE IF NOT EXISTS public.activity_connections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL,
 provider public.activity_connection_provider NOT NULL,
 provider_user_id text,
 provider_username text,
 access_token text,
 refresh_token text,
 expires_at timestamptz,
 scopes text[] NOT NULL DEFAULT '{}',
 connected_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id, provider)
);
GRANT SELECT, DELETE ON public.activity_connections TO authenticated;
GRANT ALL ON public.activity_connections TO service_role;
ALTER TABLE public.activity_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Own restored activity reads" ON public.activity_connections;
CREATE POLICY "Own restored activity reads" ON public.activity_connections FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Own restored activity deletes" ON public.activity_connections;
CREATE POLICY "Own restored activity deletes" ON public.activity_connections FOR DELETE TO authenticated USING (auth.uid() = user_id);
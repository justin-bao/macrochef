CREATE TYPE public.activity_connection_provider AS ENUM ('strava');

CREATE TABLE public.activity_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider public.activity_connection_provider NOT NULL,
  provider_user_id TEXT,
  provider_username TEXT,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);

ALTER TABLE public.activity_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own activity connections"
  ON public.activity_connections
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own activity connections"
  ON public.activity_connections
  FOR DELETE
  USING (auth.uid() = user_id);

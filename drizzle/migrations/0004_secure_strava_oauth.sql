CREATE TABLE public.strava_oauth_connections (
 user_id uuid PRIMARY KEY,
 token_ciphertext text NOT NULL,
 provider_username text,
 connected_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.strava_oauth_connections TO service_role;
ALTER TABLE public.strava_oauth_connections ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.strava_oauth_attempts (
 state_hash text PRIMARY KEY,
 user_id uuid NOT NULL,
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.strava_oauth_attempts TO service_role;
ALTER TABLE public.strava_oauth_attempts ENABLE ROW LEVEL SECURITY;
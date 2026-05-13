import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { ImportedActivity } from "@/lib/activity-imports";

const STRAVA_API = "https://www.strava.com/api/v3";
const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
const STRAVA_RUN_TYPES = new Set(["Run", "TrailRun", "VirtualRun"]);

type Provider = "strava";

type ConnectionSummary = {
  provider: Provider;
  connected: boolean;
  providerUsername?: string;
  connectedAt?: string;
  expiresAt?: string | null;
};

type StravaTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  scope?: string;
  athlete?: {
    id?: number;
    username?: string | null;
    firstname?: string | null;
    lastname?: string | null;
  };
};

type ActivityConnectionRow = {
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  user_id: string;
};

function requireStravaClient() {
  const clientId = process.env.STRAVA_CLIENT_ID ?? process.env.VITE_STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Strava is not configured. Set STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET.");
  }

  return { clientId, clientSecret };
}

async function requireUser(accessToken: string) {
  const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
  if (error || !data.user) throw new Error("You must be signed in.");
  return data.user;
}

function stravaAthleteName(tokens: StravaTokenResponse) {
  const athlete = tokens.athlete;
  if (!athlete) return null;
  const fullName = [athlete.firstname, athlete.lastname].filter(Boolean).join(" ").trim();
  return (athlete.username ?? fullName) || null;
}

async function refreshStravaToken(connection: ActivityConnectionRow) {
  const { clientId, clientSecret } = requireStravaClient();
  if (!connection.refresh_token) throw new Error("Strava refresh token is missing.");

  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: connection.refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) throw new Error(`Strava token refresh failed (${res.status}).`);
  const tokens = (await res.json()) as StravaTokenResponse;
  const expiresAt = new Date(tokens.expires_at * 1000).toISOString();

  await supabaseAdmin
    .from("activity_connections")
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", connection.user_id)
    .eq("provider", "strava");

  return tokens.access_token;
}

async function getValidStravaToken(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("activity_connections")
    .select("user_id, access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .eq("provider", "strava")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data?.access_token) throw new Error("Strava is not connected.");

  const expiresAt = data.expires_at ? new Date(data.expires_at).getTime() : 0;
  if (Date.now() > expiresAt - 300_000) return refreshStravaToken(data);

  return data.access_token;
}

function normalizeStravaActivity(activity: Record<string, unknown>): ImportedActivity | null {
  const sport = String(activity.sport_type ?? activity.type ?? "");
  if (!STRAVA_RUN_TYPES.has(sport)) return null;

  const movingTime = Number(activity.moving_time ?? activity.elapsed_time ?? 0);
  if (!movingTime) return null;

  return {
    provider: "strava",
    providerActivityId: String(activity.id),
    kind: "run",
    name: String(activity.name ?? "Run"),
    startedAt: String(activity.start_date_local ?? activity.start_date ?? new Date().toISOString()),
    durationMin: Math.max(1, Math.round(movingTime / 60)),
    distance: Math.round((Number(activity.distance ?? 0) / 1609.34) * 100) / 100,
    distanceUnit: "mi",
    caloriesBurned:
      activity.calories == null ? undefined : Math.round(Number(activity.calories) || 0),
  };
}

function deduplicateActivities(activities: ImportedActivity[]) {
  const seen = new Set<string>();
  const result: ImportedActivity[] = [];

  for (const activity of activities) {
    const date = activity.startedAt.slice(0, 10);
    const distanceBucket = Math.round(((activity.distance ?? 0) * 1609.34) / 100);
    const key = `${date}:${distanceBucket}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(activity);
  }

  return result;
}

export const getActivityConnections = createServerFn({ method: "POST" })
  .inputValidator(z.object({ accessToken: z.string().min(1) }).parse)
  .handler(async ({ data }) => {
    const user = await requireUser(data.accessToken);
    const { data: rows, error } = await supabaseAdmin
      .from("activity_connections")
      .select("provider, provider_username, connected_at, expires_at")
      .eq("user_id", user.id);

    if (error) throw new Error(error.message);

    const byProvider = new Map(
      (rows ?? []).map((row) => [
        row.provider as Provider,
        {
          provider: row.provider as Provider,
          connected: true,
          providerUsername: row.provider_username ?? undefined,
          connectedAt: row.connected_at,
          expiresAt: row.expires_at,
        },
      ]),
    );

    return {
      connections: (["strava"] as Provider[]).map(
        (provider): ConnectionSummary => byProvider.get(provider) ?? { provider, connected: false },
      ),
    };
  });

export const connectStrava = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accessToken: z.string().min(1),
      code: z.string().min(1),
      redirectUri: z.string().url(),
    }).parse,
  )
  .handler(async ({ data }) => {
    const user = await requireUser(data.accessToken);
    const { clientId, clientSecret } = requireStravaClient();
    const res = await fetch(STRAVA_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: data.code,
        grant_type: "authorization_code",
      }),
    });

    if (!res.ok) throw new Error(`Strava authorization failed (${res.status}).`);

    const tokens = (await res.json()) as StravaTokenResponse;
    const expiresAt = new Date(tokens.expires_at * 1000).toISOString();
    const scope = tokens.scope?.split(",").filter(Boolean) ?? [];

    const { error } = await supabaseAdmin.from("activity_connections").upsert({
      user_id: user.id,
      provider: "strava",
      provider_user_id: tokens.athlete?.id == null ? null : String(tokens.athlete.id),
      provider_username: stravaAthleteName(tokens),
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
      scopes: scope,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (error) throw new Error(error.message);

    return { connected: true };
  });

export const disconnectActivityProvider = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accessToken: z.string().min(1),
      provider: z.enum(["strava"]),
    }).parse,
  )
  .handler(async ({ data }) => {
    const user = await requireUser(data.accessToken);
    const { error } = await supabaseAdmin
      .from("activity_connections")
      .delete()
      .eq("user_id", user.id)
      .eq("provider", data.provider);

    if (error) throw new Error(error.message);
    return { disconnected: true };
  });

export const fetchConnectedActivities = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accessToken: z.string().min(1),
      days: z.number().int().min(1).max(365).default(30),
    }).parse,
  )
  .handler(async ({ data }) => {
    const user = await requireUser(data.accessToken);
    const token = await getValidStravaToken(user.id);
    const after = Math.floor((Date.now() - data.days * 24 * 60 * 60 * 1000) / 1000);
    const activities: ImportedActivity[] = [];

    for (let page = 1; page < 20; page += 1) {
      const params = new URLSearchParams({
        after: String(after),
        per_page: "100",
        page: String(page),
      });
      const res = await fetch(`${STRAVA_API}/athlete/activities?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(`Strava activity fetch failed (${res.status}).`);
      const batch = (await res.json()) as Record<string, unknown>[];
      if (!batch.length) break;

      for (const rawActivity of batch) {
        const activity = normalizeStravaActivity(rawActivity);
        if (activity) activities.push(activity);
      }

      if (batch.length < 100) break;
    }

    return { activities: deduplicateActivities(activities) };
  });

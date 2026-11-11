import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { decryptStravaTokens, encryptStravaTokens, hashOAuthState, normalizeStravaActivity, stravaRequest } from "./strava.server";
import type { ImportedActivity } from "./activity-imports";

const TOKEN_URL = "https://www.strava.com/oauth/token";

function config() {
  const clientId = process.env['STRAVA_CLIENT_ID'];
  const clientSecret = process.env['STRAVA_CLIENT_SECRET'];
  const encryptionSecret = process.env['STRAVA_TOKEN_ENCRYPTION_SECRET'];
  if (!clientId || !clientSecret || !encryptionSecret) throw new Error("Strava setup is incomplete.");
  return { clientId, clientSecret, encryptionSecret };
}

export const getActivityConnections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const configured = Boolean(process.env['STRAVA_CLIENT_ID'] && process.env['STRAVA_CLIENT_SECRET'] && process.env['STRAVA_TOKEN_ENCRYPTION_SECRET']);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("strava_oauth_connections").select("provider_username, connected_at").eq("user_id", context.userId).maybeSingle();
    if (error) throw new Error("Could not check Strava connection.");
    return { configured, connections: [{ provider: "strava" as const, connected: Boolean(data), providerUsername: data?.provider_username ?? undefined, connectedAt: data?.connected_at }] };
  });

export const startStravaConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ origin: z.string().url() }).parse)
  .handler(async ({ data, context }) => {
    const { clientId } = config();
    const origin = new URL(data.origin);
    const { getRequest } = await import("@tanstack/react-start/server");
    const request = getRequest();
    const requestOrigin = request.headers.get("origin") ?? new URL(request.url).origin;
    if (origin.origin !== requestOrigin || (origin.protocol !== "https:" && origin.hostname !== "localhost")) throw new Error("Invalid Strava return address.");
    const state = crypto.randomUUID();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("strava_oauth_attempts").insert({ state_hash: await hashOAuthState(state), user_id: context.userId, expires_at: new Date(Date.now() + 10 * 60_000).toISOString() });
    if (error) throw new Error("Could not start Strava connection.");
    const params = new URLSearchParams({ client_id: clientId, redirect_uri: `${origin.origin}/api/public/strava/return`, response_type: "code", approval_prompt: "force", scope: "activity:read_all", state });
    return { authorizationUrl: `https://www.strava.com/oauth/authorize?${params}`, state };
  });

export const connectStrava = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ code: z.string().min(1).max(1024), state: z.string().uuid(), scope: z.string().max(512) }).parse)
  .handler(async ({ data, context }) => {
    const { clientId, clientSecret, encryptionSecret } = config();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: attempt, error } = await supabaseAdmin.from("strava_oauth_attempts").delete().eq("state_hash", await hashOAuthState(data.state)).eq("user_id", context.userId).gt("expires_at", new Date().toISOString()).select("user_id").maybeSingle();
    if (error || !attempt) throw new Error("Strava authorization expired or could not be verified. Try connecting again.");
    if (!data.scope.split(/[ ,]+/).includes("activity:read_all")) throw new Error("Allow workout access in Strava to import your activities.");
    const tokens = await stravaRequest(TOKEN_URL, { method: "POST", body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code: data.code, grant_type: "authorization_code" }) });
    if (!tokens.access_token || !tokens.refresh_token || !Number.isFinite(tokens.expires_at)) throw new Error("Strava returned an incomplete connection.");
    const athlete = tokens.athlete;
    const username = athlete?.username || [athlete?.firstname, athlete?.lastname].filter(Boolean).join(" ") || null;
    const { error: saveError } = await supabaseAdmin.from("strava_oauth_connections").upsert({ user_id: context.userId, token_ciphertext: await encryptStravaTokens({ access_token: tokens.access_token, refresh_token: tokens.refresh_token, expires_at: tokens.expires_at }, encryptionSecret), provider_username: username, updated_at: new Date().toISOString() });
    if (saveError) throw new Error("Could not save Strava connection.");
    return { connected: true };
  });

export const disconnectActivityProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.from("strava_oauth_connections").select("token_ciphertext").eq("user_id", context.userId).maybeSingle();
    if (error) throw new Error("Could not check Strava connection.");
    if (data) {
      const tokens = await decryptStravaTokens(data.token_ciphertext, config().encryptionSecret);
      await stravaRequest("https://www.strava.com/oauth/deauthorize", { method: "POST", headers: { Authorization: `Bearer ${tokens.access_token}` } });
    }
    const { error: deleteError } = await supabaseAdmin.from("strava_oauth_connections").delete().eq("user_id", context.userId);
    if (deleteError) throw new Error("Could not disconnect Strava.");
    return { disconnected: true };
  });

export const fetchConnectedActivities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ days: z.number().int().min(1).max(365).default(30) }).parse)
  .handler(async ({ data, context }) => {
    const { clientId, clientSecret, encryptionSecret } = config();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: connection, error } = await supabaseAdmin.from("strava_oauth_connections").select("token_ciphertext").eq("user_id", context.userId).maybeSingle();
    if (error || !connection) throw new Error("Strava is not connected.");
    let tokens = await decryptStravaTokens(connection.token_ciphertext, encryptionSecret);
    if (Date.now() >= tokens.expires_at * 1000 - 300_000) {
      tokens = await stravaRequest(TOKEN_URL, { method: "POST", body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: tokens.refresh_token, grant_type: "refresh_token" }) });
      if (!tokens.access_token || !tokens.refresh_token || !Number.isFinite(tokens.expires_at)) throw new Error("Reconnect Strava to renew access.");
      const { error: refreshError } = await supabaseAdmin.from("strava_oauth_connections").update({ token_ciphertext: await encryptStravaTokens(tokens, encryptionSecret), updated_at: new Date().toISOString() }).eq("user_id", context.userId);
      if (refreshError) throw new Error("Could not save renewed Strava access.");
    }
    const after = Math.floor((Date.now() - data.days * 86_400_000) / 1000);
    const activities = new Map<string, ImportedActivity>();
    for (let page = 1; page <= 10; page++) {
      const batch = await stravaRequest(`/athlete/activities?${new URLSearchParams({ after: String(after), per_page: "100", page: String(page) })}`, { headers: { Authorization: `Bearer ${tokens.access_token}` } }) as Record<string, unknown>[];
      for (const raw of batch) {
        const activity = normalizeStravaActivity(raw);
        if (activity) activities.set(activity.providerActivityId, activity);
      }
      if (batch.length < 100) return { activities: [...activities.values()], truncated: false };
    }
    return { activities: [...activities.values()], truncated: true };
  });
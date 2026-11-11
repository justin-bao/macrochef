import type { ImportedActivity } from "./activity-imports";
import type { ActivityKind } from "./tracking";

const API = "https://www.strava.com/api/v3";

export async function hashOAuthState(state: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(state));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

async function encryptionKey(secret: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptStravaTokens(tokens: unknown, secret: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await encryptionKey(secret), new TextEncoder().encode(JSON.stringify(tokens)));
  return btoa(String.fromCharCode(...iv, ...new Uint8Array(encrypted)));
}

export async function decryptStravaTokens(ciphertext: string, secret: string): Promise<{ access_token: string; refresh_token: string; expires_at: number }> {
  const bytes = Uint8Array.from(atob(ciphertext), char => char.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.slice(0, 12) }, await encryptionKey(secret), bytes.slice(12));
  return JSON.parse(new TextDecoder().decode(decrypted));
}

export async function stravaRequest(path: string, init: RequestInit) {
  const res = await fetch(path.startsWith("/") ? `${API}${path}` : path, init);
  if (!res.ok) {
    // Provider bodies can contain credentials or athlete data: log status only.
    console.error("Strava request failed", res.status);
    throw new Error(res.status === 401 ? "Strava access expired. Reconnect your account." : res.status === 429 ? "Strava is rate-limited. Try again later." : `Strava request failed (${res.status}).`);
  }
  return res.json();
}

export function normalizeStravaActivity(activity: Record<string, unknown>): ImportedActivity | null {
  const sport = String(activity.sport_type ?? activity.type ?? "Workout");
  const seconds = Number(activity.moving_time || activity.elapsed_time || 0);
  if (!activity.id || !Number.isFinite(seconds) || seconds <= 0 || !activity.start_date) return null;
  const kind: ActivityKind = /Run/i.test(sport) ? "run" : /Walk|Hike/i.test(sport) ? "walk" : /Ride|Bike/i.test(sport) ? "bike" : /Weight|Strength/i.test(sport) ? "strength" : /Stair/i.test(sport) ? "stairmaster" : "other";
  const meters = Number(activity.distance ?? 0);
  return {
    provider: "strava",
    providerActivityId: String(activity.id),
    kind,
    name: String(activity.name ?? sport),
    // Actual UTC instant; never parse Strava's pseudo-UTC start_date_local as an instant.
    startedAt: String(activity.start_date),
    durationMin: seconds / 60,
    distance: Number.isFinite(meters) && meters > 0 ? meters / 1000 : undefined,
    distanceUnit: "km",
    // Strava's generic calories field has no documented active-vs-total contract.
    // Estimate net activity energy locally rather than claiming that field is active.
  };
}
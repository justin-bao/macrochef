import { describe, expect, it } from "vitest";
import { encryptStravaTokens, decryptStravaTokens, normalizeStravaActivity, hashOAuthState } from "./strava.server";

describe("Strava import safety", () => {
  it("imports different workout sports and ignores ambiguous reported calorie totals", () => {
    const base = { id: 123, sport_type: "Ride", moving_time: 1800, distance: 10000, start_date: "2026-11-11T15:00:00Z", start_date_local: "2026-11-11T10:00:00Z", calories: 999 };
    const ride = normalizeStravaActivity(base);
    expect(ride?.kind).toBe("bike"); expect(ride?.distance).toBe(10);
    expect(ride?.startedAt).toBe("2026-11-11T15:00:00Z");
    expect(ride?.caloriesBurned).toBeUndefined();
    expect(normalizeStravaActivity({ ...base, sport_type: "WeightTraining" })?.kind).toBe("strength");
    expect(normalizeStravaActivity({ ...base, sport_type: "Swim" })?.kind).toBe("other");
  });
  it("encrypts saved tokens and rejects tampering or another encryption key", async () => {
    const tokens = { access_token: "test-access", refresh_token: "test-refresh", expires_at: 123 };
    const encrypted = await encryptStravaTokens(tokens, "test-key");
    expect(encrypted).not.toContain("test-access");
    expect(await decryptStravaTokens(encrypted, "test-key")).toEqual(tokens);
    await expect(decryptStravaTokens(encrypted, "another-key")).rejects.toThrow();
    expect(await encryptStravaTokens(tokens, "test-key")).not.toBe(encrypted);
  });
  it("hashes OAuth state deterministically and distinguishes different attempts", async () => {
    expect(await hashOAuthState("attempt-one")).toBe(await hashOAuthState("attempt-one"));
    expect(await hashOAuthState("attempt-one")).not.toBe(await hashOAuthState("attempt-two"));
  });
});
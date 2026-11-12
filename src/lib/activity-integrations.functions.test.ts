import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ finish: vi.fn(), request: vi.fn(), incomingRequest: vi.fn(), admin: { from: vi.fn() } }));
vi.mock("@tanstack/react-start/server", () => ({ getRequest: mocks.incomingRequest }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  let validate = (data: unknown) => data;
  const builder = { middleware: () => builder, inputValidator: (fn: typeof validate) => { validate = fn; return builder; }, handler: (handler: (input: unknown) => unknown) => async (input: { data?: unknown } = {}) => handler({ data: validate(input.data), context: { userId: "owner-id" } }) };
  return builder;
} }));
vi.mock("../integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("../integrations/supabase/client.server", () => ({ supabaseAdmin: mocks.admin }));
vi.mock("./strava.server", () => ({ hashOAuthState: async () => "state-hash", encryptStravaTokens: async () => "ciphertext", decryptStravaTokens: vi.fn(), normalizeStravaActivity: vi.fn(), stravaRequest: mocks.request }));
import { connectStrava, fetchConnectedActivities, startStravaConnect } from "./activity-integrations.functions";

const attempt = "d9c32c68-76dc-476c-a3d8-feb2f10f4bfb";
beforeEach(() => {
  vi.stubEnv("STRAVA_CLIENT_ID", "test-client"); vi.stubEnv("STRAVA_CLIENT_SECRET", "test-secret"); vi.stubEnv("STRAVA_TOKEN_ENCRYPTION_SECRET", "test-encryption");
  mocks.request.mockReset(); mocks.admin.from.mockReset();
});
afterEach(() => vi.unstubAllEnvs());

describe("Strava authorization boundary", () => {
  it("starts owner-bound OAuth with the exact Preview callback when the proxy rewrites Origin", async () => {
    const origin = "https://id-preview--6f660207-75ae-47ef-a0bf-fcf248999604.lovable.app";
    mocks.incomingRequest.mockReturnValue(new Request("http://localhost:8080/_serverFn/connect", { headers: { origin: "http://localhost:8080" } }));
    const insert = vi.fn().mockResolvedValue({ error: null });
    mocks.admin.from.mockReturnValue({ insert });
    const result = await startStravaConnect({ data: { origin } });
    expect(new URL(result.authorizationUrl).searchParams.get("redirect_uri")).toBe(`${origin}/api/public/strava/return`);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: "owner-id", state_hash: "state-hash" }));
  });
  it("rejects an unrelated return host before creating OAuth state", async () => {
    mocks.incomingRequest.mockReturnValue(new Request("http://localhost:8080/_serverFn/connect"));
    await expect(startStravaConnect({ data: { origin: "https://other.lovable.app" } })).rejects.toThrow("Invalid Strava return address");
    expect(mocks.admin.from).not.toHaveBeenCalled();
  });
  it("rejects expired or wrong-owner state before exchanging a provider code", async () => {
    const chain = { delete: vi.fn(), eq: vi.fn(), gt: vi.fn(), select: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) };
    for (const name of ["delete", "eq", "gt", "select"] as const) chain[name].mockReturnValue(chain);
    mocks.admin.from.mockReturnValue(chain);
    await expect(connectStrava({ data: { state: attempt, code: "test-code", scope: "activity:read_all" } })).rejects.toThrow("could not be verified");
    expect(chain.eq).toHaveBeenCalledWith("user_id", "owner-id");
    expect(chain.gt).toHaveBeenCalledWith("expires_at", expect.any(String));
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it("requires workout scope before exchanging an authorized state", async () => {
    const chain = { delete: vi.fn(), eq: vi.fn(), gt: vi.fn(), select: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ data: { user_id: "owner-id" }, error: null }) };
    for (const name of ["delete", "eq", "gt", "select"] as const) chain[name].mockReturnValue(chain);
    mocks.admin.from.mockReturnValue(chain);
    await expect(connectStrava({ data: { state: attempt, code: "test-code", scope: "read" } })).rejects.toThrow("Allow workout access");
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it("bounds workout import lookback before any database or provider request", async () => {
    await expect(fetchConnectedActivities({ data: { days: 366 } })).rejects.toThrow();
    expect(mocks.admin.from).not.toHaveBeenCalled(); expect(mocks.request).not.toHaveBeenCalled();
  });
});
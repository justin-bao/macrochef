import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ finish: vi.fn(), request: vi.fn(), admin: { from: vi.fn() } }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  let validate = (data: unknown) => data;
  const builder = { middleware: () => builder, inputValidator: (fn: typeof validate) => { validate = fn; return builder; }, handler: (handler: (input: unknown) => unknown) => async (input: { data?: unknown } = {}) => handler({ data: validate(input.data), context: { userId: "owner-id" } }) };
  return builder;
} }));
vi.mock("../integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("../integrations/supabase/client.server", () => ({ supabaseAdmin: mocks.admin }));
vi.mock("./strava.server", () => ({ hashOAuthState: async () => "state-hash", encryptStravaTokens: async () => "ciphertext", decryptStravaTokens: vi.fn(), normalizeStravaActivity: vi.fn(), stravaRequest: mocks.request }));
import { connectStrava, fetchConnectedActivities } from "./activity-integrations.functions";

const attempt = "d9c32c68-76dc-476c-a3d8-feb2f10f4bfb";
beforeEach(() => {
  vi.stubEnv("STRAVA_CLIENT_ID", "test-client"); vi.stubEnv("STRAVA_CLIENT_SECRET", "test-secret"); vi.stubEnv("STRAVA_TOKEN_ENCRYPTION_SECRET", "test-encryption");
  mocks.request.mockReset(); mocks.admin.from.mockReset();
});
afterEach(() => vi.unstubAllEnvs());

describe("Strava authorization boundary", () => {
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
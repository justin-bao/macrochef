import { describe, expect, it } from "vitest";
import { publicAuthDefines } from "../../scripts/public-auth-env";

describe("public sign-in build configuration", () => {
  it("embeds only the public connection values", () => {
    expect(publicAuthDefines({
      VITE_SUPABASE_URL: "https://auth.example.test",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
      SUPABASE_SERVICE_ROLE_KEY: "private-test-value",
    })).toEqual({
      "import.meta.env.VITE_SUPABASE_URL": '"https://auth.example.test"',
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": '"sb_publishable_test"',
    });
  });
  it("supports the legacy anonymous key", () => {
    expect(publicAuthDefines({ VITE_SUPABASE_URL: "https://auth.example.test", VITE_SUPABASE_ANON_KEY: "legacy-key" })["import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY"]).toBe('"legacy-key"');
  });
  it("rejects missing configuration instead of publishing a runtime crash", () => {
    expect(() => publicAuthDefines({})).toThrow("Public sign-in configuration is missing");
  });
  it("rejects private keys", () => {
    expect(() => publicAuthDefines({ VITE_SUPABASE_URL: "https://auth.example.test", VITE_SUPABASE_PUBLISHABLE_KEY: "sb_secret_test" })).toThrow("private key");
  });
});
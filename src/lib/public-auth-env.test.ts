import { describe, expect, it } from "vitest";
import { publicAuthDefines } from "../../scripts/public-auth-env";
import { publicAuthConfigurationPlugin } from "../../scripts/public-auth-env";
import { resolveConfig } from "vite";

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
  it("accepts managed preview values without a local environment", () => {
    const injected = {
      "import.meta.env.VITE_SUPABASE_URL": '"https://preview.example.test"',
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": '"sb_publishable_preview"',
    };
    expect(publicAuthDefines({}, injected)).toEqual(injected);
  });
  it("preserves preview overrides instead of replacing them with local values", () => {
    expect(publicAuthDefines({
      VITE_SUPABASE_URL: "https://local.example.test",
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_local",
    }, {
      "import.meta.env.VITE_SUPABASE_URL": '"https://preview.example.test"',
      "import.meta.env.VITE_SUPABASE_ANON_KEY": '"preview-legacy-key"',
    })).toEqual({
      "import.meta.env.VITE_SUPABASE_URL": '"https://preview.example.test"',
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": '"preview-legacy-key"',
    });
  });
  it("rejects private keys supplied by a wrapper too", () => {
    expect(() => publicAuthDefines({}, {
      "import.meta.env.VITE_SUPABASE_URL": '"https://preview.example.test"',
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": '"sb_secret_test"',
    })).toThrow("private key");
  });
});

describe("isolated preview configuration resolution", () => {
  const defaults = {
    VITE_SUPABASE_URL: "https://default.example.test",
    VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_default",
  };

  async function resolveIsolated(define: Record<string, string> = {}, plugins: import("vite").Plugin[] = []) {
    // No env files or VITE_ variables: reproduce the deployed build, not localhost.
    return resolveConfig({
      configFile: false,
      envFile: false,
      envPrefix: "ISOLATED_TEST_",
      define,
      plugins: [publicAuthConfigurationPlugin(defaults), ...plugins],
    }, "build", "development");
  }

  it("uses public defaults when the isolated build has no local settings", async () => {
    const config = await resolveIsolated();
    expect(config.define).toEqual(publicAuthDefines(defaults));
    expect(config.environments.client.define).toMatchObject(publicAuthDefines(defaults));
    expect(config.environments.ssr.define).toMatchObject(publicAuthDefines(defaults));
  });

  it("preserves wrapper settings injected by a later config hook", async () => {
    const config = await resolveIsolated({}, [{
      name: "managed-preview-injection",
      enforce: "post",
      config: () => ({ define: {
        "import.meta.env.VITE_SUPABASE_URL": '"https://injected.example.test"',
        "import.meta.env.VITE_SUPABASE_ANON_KEY": '"injected-legacy-key"',
      } }),
    }]);
    expect(config.define["import.meta.env.VITE_SUPABASE_URL"]).toBe('"https://injected.example.test"');
    expect(config.define["import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY"]).toBe('"injected-legacy-key"');
    expect(config.environments.client.define).toMatchObject(config.define);
    expect(config.environments.ssr.define).toMatchObject(config.define);
  });

  it("rejects private wrapper keys even with valid public defaults", async () => {
    await expect(resolveIsolated({
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": '"sb_secret_test"',
    })).rejects.toThrow("private key");
  });
});
import type { Plugin } from "vite";

// Build-time allowlist: never serialize the complete environment into the browser.
export function publicAuthDefines(
  env: Record<string, string | undefined>,
  injected: Record<string, unknown> = {},
) {
  const readInjected = (name: string): string | undefined => {
    const value = injected[`import.meta.env.${name}`];
    if (typeof value !== "string") return undefined;
    try {
      const parsed: unknown = JSON.parse(value);
      return typeof parsed === "string" && parsed ? parsed : undefined;
    } catch {
      return undefined;
    }
  };
  // The managed preview injects these after evaluating the base config.
  // Its values must take precedence over local settings.
  const url = readInjected("VITE_SUPABASE_URL") || env.VITE_SUPABASE_URL;
  const key = readInjected("VITE_SUPABASE_PUBLISHABLE_KEY") ||
    readInjected("VITE_SUPABASE_ANON_KEY") ||
    env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Public sign-in configuration is missing; refusing to publish a broken sign-in page.");
  }
  if (key.startsWith("sb_secret_")) {
    throw new Error("A private key cannot be used for browser sign-in.");
  }
  return {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(url),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(key),
  };
}

export function publicAuthConfigurationPlugin(defaults: Record<string, string>): Plugin {
  return {
    name: "public-auth-configuration",
    config: () => ({ define: {} }),
    configResolved: {
      order: "post",
      handler(config) {
        // Vite loads env files after config hooks. Resolve the final values here,
        // using public defaults when the isolated build has no local env file.
        const env = { ...defaults, ...config.env };
        const define = config.define;
        if (!define) throw new Error("Public sign-in define map was not initialized.");
        Object.assign(define, publicAuthDefines(env, define));
        // Environment options are already resolved; keep client and SSR aligned.
        for (const environment of Object.values(config.environments)) {
          environment.define = {
            ...environment.define,
            ...publicAuthDefines(env, { ...config.define, ...environment.define }),
          };
        }
      },
    },
  };
}
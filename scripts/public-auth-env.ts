// Build-time allowlist: never serialize the complete environment into the browser.
export function publicAuthDefines(env: Record<string, string | undefined>) {
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;
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
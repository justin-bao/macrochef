// Names only: Wrangler loads values directly into the local worker, never Vite defines.
const serverVariableNames = [
  "AI_API_KEY", "AI_BASE_URL", "AI_MODEL",
  "SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SERVICE_ROLE_KEY",
  "FOODDATA_CENTRAL_API_KEY", "USDA_FDC_API_KEY", "SPOONACULAR_API_KEY",
  "FIRECRAWL_API_KEY", "GOOGLE_MAPS_API_KEY", "LOVABLE_API_KEY",
  "STRAVA_CLIENT_ID", "STRAVA_CLIENT_SECRET", "FATSECRET_CLIENT_ID", "FATSECRET_CLIENT_SECRET",
] as const;

export function previewServerSecretNames(env: Record<string, string | undefined>, existing: string[] = []) {
  return [...new Set([...existing, ...serverVariableNames.filter(name => Boolean(env[name]))])];
}
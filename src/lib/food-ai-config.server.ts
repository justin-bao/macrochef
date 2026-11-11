// Read credentials at request time only; never return this object across RPC.
export function readFoodAiConfig() {
  const key = process.env.AI_API_KEY?.trim();
  const baseUrl = (process.env.AI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  let validEndpoint = false;
  try { const url = new URL(baseUrl); validEndpoint = url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash; } catch { /* Invalid configuration is a setup state. */ }
  return { key, baseUrl, model: process.env.AI_MODEL ?? "gpt-4.1-mini", validEndpoint };
}

export function foodAiSetupState() {
  const config = readFoodAiConfig();
  return { state: !config.key ? "missing_key" as const : !config.validEndpoint ? "invalid_endpoint" as const : "configured" as const };
}
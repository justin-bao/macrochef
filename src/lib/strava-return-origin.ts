// Exact app-owned Preview origin: Preview's RPC proxy can rewrite Origin/URL.
// Never accept an arbitrary *.lovable.app host or forwarded-host header.
const PREVIEW_ORIGIN = "https://id-preview--6f660207-75ae-47ef-a0bf-fcf248999604.lovable.app";

export function validateStravaReturnOrigin(value: string, request: Request): string {
  const origin = new URL(value);
  if (origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash ||
      (origin.protocol !== "https:" && !(origin.protocol === "http:" && origin.hostname === "localhost"))) {
    // Only the origin is reported: never include codes, query strings or credentials.
    throw new Error(`Invalid Strava return address: ${origin.origin}. Use a secure page address without a path (check v2).`);
  }
  const requestOrigin = request.headers.get("origin") ?? new URL(request.url).origin;
  if (origin.origin !== requestOrigin && origin.origin !== PREVIEW_ORIGIN) {
    throw new Error(`Invalid Strava return address: ${origin.origin}. Open this app at ${PREVIEW_ORIGIN}/profile and reconnect (check v2).`);
  }
  return origin.origin;
}
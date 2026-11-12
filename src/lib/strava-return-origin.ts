// Exact app-owned Preview origin: Preview's RPC proxy can rewrite Origin/URL.
// Never accept an arbitrary *.lovable.app host or forwarded-host header.
const PREVIEW_ORIGIN = "https://id-preview--6f660207-75ae-47ef-a0bf-fcf248999604.lovable.app";

export function validateStravaReturnOrigin(value: string, request: Request): string {
  const origin = new URL(value);
  console.info("Strava origin validation", { returnOrigin: origin.origin, path: origin.pathname, requestOrigin: request.headers.get("origin") });
  if (origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash ||
      (origin.protocol !== "https:" && !(origin.protocol === "http:" && origin.hostname === "localhost"))) {
    throw new Error("Invalid Strava return address.");
  }
  const requestOrigin = request.headers.get("origin") ?? new URL(request.url).origin;
  if (origin.origin !== requestOrigin && origin.origin !== PREVIEW_ORIGIN) {
    console.warn("Strava return origin rejected", { returnOrigin: origin.origin, requestOrigin });
    throw new Error("Invalid Strava return address.");
  }
  return origin.origin;
}
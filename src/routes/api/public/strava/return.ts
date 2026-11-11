import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/strava/return")({
  server: { handlers: { GET: ({ request }) => {
    const url = new URL(request.url);
    const result = { type: "strava-oauth-result", code: url.searchParams.get("code"), state: url.searchParams.get("state"), scope: url.searchParams.get("scope") ?? "", error: url.searchParams.get("error") };
    const json = JSON.stringify(result).replace(/</g, "\\u003c");
    // No credential exchange here: the signed-in opener verifies state and completes it.
    return new Response(`<!doctype html><html><head><title>Strava — MacroChef</title></head><body><p>Returning to MacroChef…</p><script>const result=${json};history.replaceState(null,'',location.pathname);if(window.opener){window.opener.postMessage(result,location.origin);window.close();}else{document.querySelector('p').textContent='Return to MacroChef and try connecting again with popups allowed.';}</script></body></html>`, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  } } },
});
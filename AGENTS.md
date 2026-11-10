# Architecture
- Build with the Cloudflare Vite plugin and its `ssr` environment, not Nitro's Vercel preset, so Lovable receives the deployable `dist/` output.
- Keep map restaurant discovery separate from the existing chain-combo search so each retains its single-dish or multi-item ranking contract.
- Call Google Places and menu scraping only from authenticated server functions; keep credentials server-side and cap restaurant search to 12 results and menu retrieval to two pages per explicit action.
- Cache only website-derived menu estimates in an owner-scoped table, not Google place content; this avoids repeated paid estimates while preserving Google attribution.
- Rank restaurant dishes at their standard serving size by summed normalized absolute distance over supplied targets; never scale restaurant portions or combine dishes in this flow.
- Register browser bearer attachment in src/start.ts so protected server functions validate signed-in callers.
- Use request-scoped Responses AI SDK calls with streaming, strict output schemas and gateway run IDs; provider denials remain durably paused until service access is restored.
// Edamam Recipe Search API v2 — used as a secondary source to broaden the
// recipe pool beyond Spoonacular. Returns results normalized into the same
// SearchResult shape used by the Spoonacular path so the ranker can interleave
// them. Edamam recipes don't have a stable numeric Spoonacular ID, so we mark
// them with `source: "edamam"` and keep an `externalUrl` for the UI to link
// out to the original recipe page.

const BASE = "https://api.edamam.com/api/recipes/v2";

type EdamamMacros = {
  kcal?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
};

export type EdamamResult = {
  id: number; // synthetic, derived from URI hash; negative to avoid Spoonacular collisions
  source: "edamam";
  externalUrl: string;
  title: string;
  image: string;
  servings: number;
  ingredientNames: string[];
} & EdamamMacros;

function hashId(uri: string): number {
  // Simple deterministic hash → negative int (so it never collides with
  // Spoonacular's positive recipe IDs).
  let h = 0;
  for (let i = 0; i < uri.length; i++) h = (h * 31 + uri.charCodeAt(i)) | 0;
  return -Math.abs(h || 1);
}

export async function searchEdamamRecipes(opts: {
  query: string;
  // Per-serving macro targets — used to set Edamam's nutrient range filters
  // when present, otherwise omitted (Edamam ignores empty filters).
  kcal?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  number: number;
  allowSubs: boolean;
}): Promise<EdamamResult[]> {
  const appId = process.env.EDAMAM_APP_ID;
  const appKey = process.env.EDAMAM_APP_KEY;
  if (!appId || !appKey) return [];

  const params = new URLSearchParams({
    type: "public",
    app_id: appId,
    app_key: appKey,
    // Edamam requires a non-empty `q` — fall back to a generic term when the
    // user only specified macros.
    q: opts.query?.trim() || "healthy",
    random: "true",
  });

  // Loose ranges when subs allowed (we re-rank on the merged side anyway),
  // tighter ranges in must-fit mode.
  const tight = !opts.allowSubs;
  const range = (target: number, mode: "two" | "cap" | "floor") => {
    if (tight) {
      const lo = Math.max(0, Math.round(target * 0.75));
      const hi = Math.round(target * 1.25);
      return `${lo}-${hi}`;
    }
    if (mode === "cap") return `0-${Math.round(target * 1.6)}`;
    if (mode === "floor") return `${Math.max(0, Math.round(target * 0.4))}+`;
    return `${Math.max(0, Math.round(target * 0.4))}-${Math.round(target * 1.6)}`;
  };
  if (opts.kcal != null) params.append("nutrients[ENERC_KCAL]", range(opts.kcal, "cap"));
  if (opts.protein_g != null) params.append("nutrients[PROCNT]", range(opts.protein_g, "floor"));
  if (opts.carbs_g != null) params.append("nutrients[CHOCDF]", range(opts.carbs_g, "cap"));
  if (opts.fat_g != null) params.append("nutrients[FAT]", range(opts.fat_g, "cap"));

  try {
    const res = await fetch(`${BASE}?${params}`, {
      headers: {
        // Edamam v2 requires a per-user identifier header. We use a static
        // value because we don't have per-user accounts on their side.
        "Edamam-Account-User": "macrochef-app",
      },
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("Edamam search failed", res.status, text.slice(0, 200));
      return [];
    }
    const json = (await res.json()) as { hits?: { recipe: any }[] };
    const hits = (json.hits ?? []).slice(0, opts.number);
    return hits
      .map((h): EdamamResult | null => {
        const r = h.recipe;
        if (!r?.uri || !r?.label) return null;
        const servings = Math.max(1, Number(r.yield) || 1);
        const tn = r.totalNutrients ?? {};
        const per = (k: string) => {
          const v = tn[k]?.quantity;
          return typeof v === "number" ? Math.round((v / servings) * 10) / 10 : undefined;
        };
        const ingredientNames: string[] = (r.ingredients ?? [])
          .map((i: any) => String(i?.food || "").trim())
          .filter(Boolean);
        return {
          id: hashId(r.uri),
          source: "edamam",
          externalUrl: r.url,
          title: r.label,
          image: r.image,
          servings,
          ingredientNames,
          kcal: per("ENERC_KCAL"),
          protein_g: per("PROCNT"),
          carbs_g: per("CHOCDF"),
          fat_g: per("FAT"),
        };
      })
      .filter((x): x is EdamamResult => x !== null);
  } catch (e) {
    console.error("Edamam search error", e);
    return [];
  }
}

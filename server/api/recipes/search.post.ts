import { defineEventHandler, readBody, createError } from "h3";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const SPOON_BASE = "https://api.spoonacular.com";

const InputSchema = z.object({
  query: z.string().trim().max(120).optional().default(""),
  diet: z.string().optional(),
  cuisine: z.string().optional(),
  maxReadyTime: z.number().int().positive().max(360).optional(),
  number: z.number().int().min(1).max(24).optional().default(12),
  kcal: z.number().positive().nullable().optional(),
  protein_g: z.number().positive().nullable().optional(),
  carbs_g: z.number().positive().nullable().optional(),
  fat_g: z.number().positive().nullable().optional(),
});

type SearchResult = {
  id: number;
  source: "spoonacular" | "kaggle";
  title: string;
  image: string;
  servings?: number;
  kcal?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
};

// ── Supabase / Kaggle search ──────────────────────────────────────────────────

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function searchKaggle(params: z.infer<typeof InputSchema>): Promise<SearchResult[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  try {
    const fetchCount = Math.min(100, params.number * 4);
    let q = supabase
      .from("recipes")
      .select("id, title, image_url, servings, kcal, protein_g, carbs_g, fat_g")
      .not("kcal", "is", null)
      .limit(fetchCount);

    if (params.query?.trim()) q = q.ilike("title", `%${params.query.trim()}%`);
    if (params.maxReadyTime) q = q.lte("total_minutes", params.maxReadyTime);

    const applyRange = (
      col: "kcal" | "protein_g" | "carbs_g" | "fat_g",
      target: number | null | undefined,
      mode: "cap" | "floor",
    ) => {
      if (target == null) return;
      if (mode === "cap") q = q.lte(col, target * 1.6);
      else q = q.gte(col, Math.max(0, target * 0.4));
    };
    applyRange("kcal", params.kcal, "cap");
    applyRange("protein_g", params.protein_g, "floor");
    applyRange("carbs_g", params.carbs_g, "cap");
    applyRange("fat_g", params.fat_g, "cap");

    const { data, error } = await q;
    if (error) { console.error("Kaggle search failed", error); return []; }

    const rows = data ?? [];
    // Shuffle when no query so repeat visits surface different recipes.
    if (!params.query?.trim()) shuffle(rows);

    return rows.map((r) => ({
      id: Number(r.id),
      source: "kaggle" as const,
      title: r.title,
      image: r.image_url ?? "",
      servings: r.servings != null ? Number(r.servings) : 1,
      kcal: r.kcal != null ? Math.round(Number(r.kcal) * 10) / 10 : undefined,
      protein_g: r.protein_g != null ? Math.round(Number(r.protein_g) * 10) / 10 : undefined,
      carbs_g: r.carbs_g != null ? Math.round(Number(r.carbs_g) * 10) / 10 : undefined,
      fat_g: r.fat_g != null ? Math.round(Number(r.fat_g) * 10) / 10 : undefined,
    }));
  } catch (err) {
    console.error("Kaggle search error", err);
    return [];
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Fisher-Yates in-place shuffle. Mutates and returns the array. */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message });

  const data = parsed.data;
  const spoonKey = process.env.SPOONACULAR_API_KEY;
  const round1 = (v: number | undefined) => (v == null ? undefined : Math.round(v * 10) / 10);

  // ── Spoonacular ────────────────────────────────────────────────────────────
  const spoonPromise: Promise<SearchResult[]> = spoonKey
    ? (async () => {
        const params = new URLSearchParams({
          apiKey: spoonKey,
          number: String(data.number),
          addRecipeNutrition: "true",
          instructionsRequired: "true",
          // When there's no user query, randomize so the default grid isn't
          // always the same ranked popularity list.
          sort: data.query?.trim() ? "popularity" : "random",
        });
        if (data.query) params.set("query", data.query);
        if (data.diet) params.set("diet", data.diet);
        if (data.cuisine) params.set("cuisine", data.cuisine);
        if (data.maxReadyTime) params.set("maxReadyTime", String(data.maxReadyTime));

        const setRange = (minKey: string, maxKey: string, target: number | null | undefined) => {
          if (target == null) return;
          params.set(minKey, String(Math.max(0, Math.round(target * 0.4))));
          params.set(maxKey, String(Math.round(target * 1.6)));
        };
        setRange("minCalories", "maxCalories", data.kcal);
        setRange("minProtein", "maxProtein", data.protein_g);
        setRange("minCarbs", "maxCarbs", data.carbs_g);
        setRange("minFat", "maxFat", data.fat_g);

        const res = await fetch(`${SPOON_BASE}/recipes/complexSearch?${params}`);
        if (!res.ok) return [];
        const json = (await res.json()) as {
          results?: Array<{
            id: number; title: string; image?: string; servings?: number;
            nutrition?: { nutrients?: Array<{ name?: string; amount?: number }> };
          }>;
        };
        return (json.results ?? []).map((r) => {
          const nut = r.nutrition?.nutrients ?? [];
          const find = (name: string) => nut.find((x) => x.name === name)?.amount;
          return {
            id: r.id, source: "spoonacular" as const,
            title: r.title, image: r.image ?? "",
            servings: r.servings,
            kcal: round1(find("Calories")),
            protein_g: round1(find("Protein")),
            carbs_g: round1(find("Carbohydrates")),
            fat_g: round1(find("Fat")),
          };
        });
      })()
    : Promise.resolve([]);

  // ── Kaggle / Supabase ──────────────────────────────────────────────────────
  const [spoonResults, kaggleResults] = await Promise.all([spoonPromise, searchKaggle(data)]);

  // Dedupe by lowercased title; Spoonacular wins ties
  const seen = new Set<string>();
  const combined: SearchResult[] = [];
  for (const r of [...spoonResults, ...kaggleResults]) {
    const key = r.title.toLowerCase().trim();
    if (!seen.has(key)) { seen.add(key); combined.push(r); }
  }

  // Interleave sources up to `number` results
  const spoon = combined.filter((r) => r.source === "spoonacular");
  const kaggle = combined.filter((r) => r.source === "kaggle");
  const results: SearchResult[] = [];
  const max = Math.max(spoon.length, kaggle.length);
  for (let i = 0; i < max && results.length < data.number; i++) {
    if (spoon[i]) results.push(spoon[i]);
    if (kaggle[i] && results.length < data.number) results.push(kaggle[i]);
  }

  return { results, error: null };
});

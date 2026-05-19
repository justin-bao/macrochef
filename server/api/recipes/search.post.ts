import { defineEventHandler, readBody, createError } from "h3";
import { z } from "zod";

const BASE = "https://api.spoonacular.com";

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
  source: "spoonacular";
  title: string;
  image: string;
  servings?: number;
  kcal?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
};

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.message });
  }

  const data = parsed.data;
  const key = process.env.SPOONACULAR_API_KEY;
  if (!key) {
    throw createError({ statusCode: 503, message: "Recipe search is not configured" });
  }

  const round1 = (v: number | undefined) =>
    v == null ? undefined : Math.round(v * 10) / 10;

  const params = new URLSearchParams({
    apiKey: key,
    number: String(data.number),
    addRecipeNutrition: "true",
    instructionsRequired: "true",
    sort: "popularity",
  });

  if (data.query) params.set("query", data.query);
  if (data.diet) params.set("diet", data.diet);
  if (data.cuisine) params.set("cuisine", data.cuisine);
  if (data.maxReadyTime) params.set("maxReadyTime", String(data.maxReadyTime));

  // Macro range filters (broad ±60% window so iOS can show relevant results)
  const setRange = (minKey: string, maxKey: string, target: number | null | undefined) => {
    if (target == null) return;
    params.set(minKey, String(Math.max(0, Math.round(target * 0.4))));
    params.set(maxKey, String(Math.round(target * 1.6)));
  };
  setRange("minCalories", "maxCalories", data.kcal);
  setRange("minProtein", "maxProtein", data.protein_g);
  setRange("minCarbs", "maxCarbs", data.carbs_g);
  setRange("minFat", "maxFat", data.fat_g);

  const res = await fetch(`${BASE}/recipes/complexSearch?${params}`);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw createError({ statusCode: 502, message: `Spoonacular error (${res.status}): ${text.slice(0, 200)}` });
  }

  const json = (await res.json()) as {
    results?: Array<{
      id: number;
      title: string;
      image?: string;
      servings?: number;
      nutrition?: { nutrients?: Array<{ name?: string; amount?: number }> };
    }>;
  };

  const results: SearchResult[] = (json.results ?? []).map((r) => {
    const nut = r.nutrition?.nutrients ?? [];
    const find = (name: string) => nut.find((x) => x.name === name)?.amount;
    return {
      id: r.id,
      source: "spoonacular",
      title: r.title,
      image: r.image ?? "",
      servings: r.servings,
      kcal: round1(find("Calories")),
      protein_g: round1(find("Protein")),
      carbs_g: round1(find("Carbohydrates")),
      fat_g: round1(find("Fat")),
    };
  });

  return { results, error: null };
});

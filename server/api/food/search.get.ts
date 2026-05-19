import { defineEventHandler, getQuery } from "h3";
import { z } from "zod";

const FDC_BASE = "https://api.nal.usda.gov/fdc/v1";
const ENERGY_NUTRIENT_IDS = new Set([1008, 2047, 2048]);

type FdcNutrient = { nutrientId?: number; nutrientName?: string; value?: number };
type FdcFood = {
  fdcId: number;
  description?: string;
  dataType?: string;
  brandOwner?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
  foodNutrients?: FdcNutrient[];
};

const InputSchema = z.object({ query: z.string().trim().min(1).max(200) });

function fdcApiKey() {
  return process.env.FOODDATA_CENTRAL_API_KEY ?? process.env.USDA_FDC_API_KEY ?? "DEMO_KEY";
}

function nutrientValue(food: FdcFood, kind: "kcal" | "protein" | "carbs" | "fat") {
  const ns = food.foodNutrients ?? [];
  const byId = (ids: number[]) =>
    ns.find((n) => n.nutrientId != null && ids.includes(n.nutrientId))?.value;
  const byName = (pats: RegExp[]) =>
    ns.find((n) => pats.some((p) => p.test(n.nutrientName ?? "")))?.value;
  if (kind === "kcal")
    return (
      ns.find((n) => n.nutrientId != null && ENERGY_NUTRIENT_IDS.has(n.nutrientId))?.value ??
      byName([/energy/i])
    );
  if (kind === "protein") return byId([1003]) ?? byName([/protein/i]);
  if (kind === "fat") return byId([1004]) ?? byName([/^total lipid/i, /^total fat/i, /^fat$/i]);
  return byId([1005]) ?? byName([/carbohydrate.*difference/i, /^carbohydrate/i]);
}

function rankFood(food: FdcFood, query: string) {
  const desc = (food.description ?? "").toLowerCase();
  const queryWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const descWords = desc.split(/[\s,]+/).filter((w) => w.length > 2);

  // How many query words appear in the description
  const matchCount = queryWords.filter((w) => desc.includes(w)).length;
  // Coverage: fraction of query words matched (rewards completeness)
  const coverage = queryWords.length > 0 ? matchCount / queryWords.length : 0;
  // Precision: penalise overly long descriptions (extra words = less precise match)
  const extraWords = Math.max(0, descWords.length - queryWords.length);
  const precisionPenalty = extraWords * 0.3;

  const sourceBoost =
    food.dataType === "Survey (FNDDS)" ? 3 : food.dataType === "Foundation" ? 2 : food.dataType === "SR Legacy" ? 1 : 0;
  const hasMacros =
    nutrientValue(food, "kcal") != null &&
    nutrientValue(food, "protein") != null &&
    nutrientValue(food, "carbs") != null &&
    nutrientValue(food, "fat") != null;

  return coverage * 10 + matchCount * 2 - precisionPenalty + sourceBoost + (hasMacros ? 5 : 0);
}

type FoodResult = {
  fdcId: number;
  name: string;
  brandOwner?: string;
  dataType?: string;
  servingDescription?: string;
  kcal_per_100g: number;
  protein_g_per_100g: number;
  carbs_g_per_100g: number;
  fat_g_per_100g: number;
};

async function searchUsda(query: string): Promise<FoodResult[]> {
  const params = new URLSearchParams({ api_key: fdcApiKey() });
  const res = await fetch(`${FDC_BASE}/foods/search?${params}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, pageSize: 25, requireAllWords: false }),
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { foods?: FdcFood[] };
  const ranked = [...(json.foods ?? [])].sort((a, b) => rankFood(b, query) - rankFood(a, query));
  return ranked.slice(0, 8).map((food) => {
    const kcal = nutrientValue(food, "kcal");
    const protein = nutrientValue(food, "protein");
    const carbs = nutrientValue(food, "carbs");
    const fat = nutrientValue(food, "fat");
    if (kcal == null || protein == null || carbs == null || fat == null) return null;
    return {
      fdcId: food.fdcId,
      name: food.description ?? query,
      brandOwner: food.brandOwner,
      dataType: food.dataType,
      servingDescription: food.householdServingFullText,
      kcal_per_100g: Math.round(kcal),
      protein_g_per_100g: Math.round(protein * 10) / 10,
      carbs_g_per_100g: Math.round(carbs * 10) / 10,
      fat_g_per_100g: Math.round(fat * 10) / 10,
    } as FoodResult;
  }).filter((x): x is FoodResult => x != null);
}

async function searchOpenFoodFacts(query: string): Promise<FoodResult[]> {
  try {
    const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
    url.searchParams.set("search_terms", query);
    url.searchParams.set("search_simple", "1");
    url.searchParams.set("action", "process");
    url.searchParams.set("json", "1");
    url.searchParams.set("fields", "product_name,brands,nutriments,serving_size");
    url.searchParams.set("page_size", "6");
    const res = await fetch(url.toString(), { headers: { "User-Agent": "MacroChef/1.0" } });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      products?: Array<{
        product_name?: string;
        brands?: string;
        nutriments?: { "energy-kcal_100g"?: number; proteins_100g?: number; carbohydrates_100g?: number; fat_100g?: number };
        serving_size?: string;
      }>;
    };
    return (json.products ?? []).map((p, i) => {
      const kcal = p.nutriments?.["energy-kcal_100g"];
      const protein = p.nutriments?.proteins_100g;
      const carbs = p.nutriments?.carbohydrates_100g;
      const fat = p.nutriments?.fat_100g;
      if (kcal == null || protein == null || carbs == null || fat == null) return null;
      const name = [p.product_name, p.brands].filter(Boolean).join(" — ") || query;
      return {
        fdcId: -(i + 1),
        name,
        dataType: "Open Food Facts",
        servingDescription: p.serving_size,
        kcal_per_100g: Math.round(kcal),
        protein_g_per_100g: Math.round(protein * 10) / 10,
        carbs_g_per_100g: Math.round(carbs * 10) / 10,
        fat_g_per_100g: Math.round(fat * 10) / 10,
      } as FoodResult;
    }).filter((x): x is FoodResult => x != null);
  } catch {
    return [];
  }
}

export default defineEventHandler(async (event) => {
  const { q = "" } = getQuery(event) as { q?: string };
  if (!q.trim()) return { results: [] };

  const parsed = InputSchema.safeParse({ query: q });
  if (!parsed.success) return { results: [] };

  const [usda, off] = await Promise.all([
    searchUsda(parsed.data.query),
    searchOpenFoodFacts(parsed.data.query),
  ]);

  const seen = new Set<string>();
  const results: FoodResult[] = [];
  for (const item of [...usda, ...off]) {
    const key = item.name.toLowerCase().trim();
    if (!seen.has(key)) { seen.add(key); results.push(item); }
    if (results.length >= 12) break;
  }

  return { results };
});

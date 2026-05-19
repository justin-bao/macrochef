import { defineEventHandler, getRouterParam, getQuery, createError } from "h3";

const BASE = "https://api.spoonacular.com";

type SpoonacularIngredient = {
  id?: number;
  name?: string;
  nameClean?: string;
  original?: string;
  amount?: number;
  unit?: string;
  measures?: { metric?: { amount?: number; unitShort?: string } };
  nutrients?: Array<{ name?: string; amount?: number }>;
};

type RecipeDetail = {
  id: number;
  source: "spoonacular";
  title: string;
  image: string;
  servings: number;
  readyInMinutes: number;
  sourceUrl?: string;
  summary?: string;
  instructions: string[];
  ingredients: {
    id: number;
    name: string;
    original: string;
    amount: number;
    unit: string;
    kcal?: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
  }[];
  macros: { kcal: number; protein_g: number; carbs_g: number; fat_g: number };
};

export default defineEventHandler(async (event) => {
  const rawId = getRouterParam(event, "id");
  const id = parseInt(rawId ?? "", 10);
  if (isNaN(id) || id <= 0) {
    throw createError({ statusCode: 400, message: "Invalid recipe id" });
  }

  const key = process.env.SPOONACULAR_API_KEY;
  if (!key) {
    throw createError({ statusCode: 503, message: "Recipe detail is not configured" });
  }

  const params = new URLSearchParams({
    apiKey: key,
    includeNutrition: "true",
  });

  const res = await fetch(`${BASE}/recipes/${id}/information?${params}`);
  if (!res.ok) {
    if (res.status === 404) return { recipe: null, error: "Recipe not found" };
    const text = await res.text().catch(() => "");
    throw createError({ statusCode: 502, message: `Spoonacular error (${res.status}): ${text.slice(0, 200)}` });
  }

  const r = (await res.json()) as {
    id: number;
    title?: string;
    image?: string;
    servings?: number;
    readyInMinutes?: number;
    sourceUrl?: string;
    summary?: string;
    analyzedInstructions?: Array<{ steps?: Array<{ step?: string }> }>;
    extendedIngredients?: SpoonacularIngredient[];
    nutrition?: {
      nutrients?: Array<{ name?: string; amount?: number }>;
      ingredients?: SpoonacularIngredient[];
    };
  };

  const nut = r.nutrition?.nutrients ?? [];
  const findNutrient = (name: string) =>
    Math.round((nut.find((x) => x.name === name)?.amount ?? 0) * 10) / 10;

  const instructions: string[] = (r.analyzedInstructions ?? []).flatMap(
    (block) => (block.steps ?? []).map((s) => s.step ?? "").filter(Boolean),
  );

  const ingSource = r.extendedIngredients ?? r.nutrition?.ingredients ?? [];
  const ingredients = ingSource.map((ing, i) => {
    const ingNut = ing.nutrients ?? [];
    const findIng = (name: string) => ingNut.find((x) => x.name === name)?.amount;
    return {
      id: ing.id ?? i,
      name: ing.nameClean ?? ing.name ?? "",
      original: ing.original ?? "",
      amount: ing.measures?.metric?.amount ?? ing.amount ?? 0,
      unit: ing.measures?.metric?.unitShort ?? ing.unit ?? "",
      kcal: findIng("Calories"),
      protein_g: findIng("Protein"),
      carbs_g: findIng("Carbohydrates"),
      fat_g: findIng("Fat"),
    };
  });

  const recipe: RecipeDetail = {
    id: r.id,
    source: "spoonacular",
    title: r.title ?? "",
    image: r.image ?? "",
    servings: Math.max(1, Number(r.servings) || 1),
    readyInMinutes: Number(r.readyInMinutes) || 0,
    sourceUrl: r.sourceUrl,
    summary: r.summary,
    instructions,
    ingredients,
    macros: {
      kcal: findNutrient("Calories"),
      protein_g: findNutrient("Protein"),
      carbs_g: findNutrient("Carbohydrates"),
      fat_g: findNutrient("Fat"),
    },
  };

  return { recipe, error: null };
});

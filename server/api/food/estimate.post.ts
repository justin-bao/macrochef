import { defineEventHandler, readBody, createError } from "h3";
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

const InputSchema = z.object({
  name: z.string().trim().min(1).max(160),
  quantity: z.number().positive().max(10000),
  unit: z.string().trim().min(1).max(40),
});

function fdcApiKey() {
  return process.env.FOODDATA_CENTRAL_API_KEY ?? process.env.USDA_FDC_API_KEY ?? "DEMO_KEY";
}

function nutrientAmount(food: FdcFood, kind: "kcal" | "protein" | "carbs" | "fat") {
  const nutrients = food.foodNutrients ?? [];
  const byId = (ids: number[]) =>
    nutrients.find((n) => n.nutrientId != null && ids.includes(n.nutrientId))?.value;
  const byName = (patterns: RegExp[]) =>
    nutrients.find((n) => patterns.some((p) => p.test(n.nutrientName ?? "")))?.value;
  if (kind === "kcal")
    return nutrients.find((n) => n.nutrientId != null && ENERGY_NUTRIENT_IDS.has(n.nutrientId))?.value ?? byName([/energy/i]);
  if (kind === "protein") return byId([1003]) ?? byName([/protein/i]);
  if (kind === "fat") return byId([1004]) ?? byName([/^total lipid/i, /^total fat/i, /^fat$/i]);
  return byId([1005]) ?? byName([/carbohydrate.*difference/i, /^carbohydrate/i]);
}

function amountToGrams(quantity: number, unit: string, food: FdcFood) {
  const u = unit.trim().toLowerCase();
  if (["g", "gram", "grams"].includes(u)) return quantity;
  if (["kg", "kilogram", "kilograms"].includes(u)) return quantity * 1000;
  if (["oz", "ounce", "ounces"].includes(u)) return quantity * 28.3495;
  if (["lb", "lbs", "pound", "pounds"].includes(u)) return quantity * 453.592;
  if (["ml", "milliliter", "milliliters"].includes(u)) return quantity;
  if (["l", "liter", "liters"].includes(u)) return quantity * 1000;
  const su = food.servingSizeUnit?.toLowerCase();
  if (food.servingSize && (!su || ["g", "gram", "grams"].includes(su)))
    return quantity * food.servingSize;
  return quantity * 100;
}

function rankFood(food: FdcFood, query: string) {
  const desc = (food.description ?? "").toLowerCase();
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const matches = words.filter((w) => desc.includes(w)).length;
  const sourceBoost =
    food.dataType === "Survey (FNDDS)" ? 3 : food.dataType === "Foundation" ? 2 : food.dataType === "SR Legacy" ? 1 : 0;
  const hasMacros =
    nutrientAmount(food, "kcal") != null &&
    nutrientAmount(food, "protein") != null &&
    nutrientAmount(food, "carbs") != null &&
    nutrientAmount(food, "fat") != null;
  return matches * 4 + sourceBoost + (hasMacros ? 10 : 0);
}

function buildEstimate(food: FdcFood, name: string, quantity: number, unit: string) {
  const kcal = nutrientAmount(food, "kcal");
  const protein = nutrientAmount(food, "protein");
  const carbs = nutrientAmount(food, "carbs");
  const fat = nutrientAmount(food, "fat");
  if (kcal == null || protein == null || carbs == null || fat == null) return null;
  const grams = amountToGrams(quantity, unit, food);
  const factor = grams / 100;
  const matchedName = food.brandOwner
    ? `${food.description ?? name} (${food.brandOwner})`
    : (food.description ?? name);
  const servingBasis = food.householdServingFullText
    ? `${quantity} ${unit}; USDA serving: ${food.householdServingFullText}`
    : `${Math.round(grams)}g estimated from ${quantity} ${unit}`;
  const confidence: "high" | "medium" | "low" =
    unit.toLowerCase().startsWith("serv") && !food.servingSize ? "medium" : "high";
  return {
    name, quantity, unit, matchedName,
    sourceLabel: `USDA FoodData Central${food.dataType ? `: ${food.dataType}` : ""}`,
    servingBasis,
    kcal: Math.round(kcal * factor),
    protein_g: Math.round(protein * factor * 10) / 10,
    carbs_g: Math.round(carbs * factor * 10) / 10,
    fat_g: Math.round(fat * factor * 10) / 10,
    confidence,
  };
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    throw createError({ statusCode: 400, message: parsed.error.message });
  }
  const { name, quantity, unit } = parsed.data;

  const params = new URLSearchParams({ api_key: fdcApiKey() });
  const res = await fetch(`${FDC_BASE}/foods/search?${params}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: name, pageSize: 12, requireAllWords: false }),
  });

  if (!res.ok) {
    throw createError({ statusCode: 502, message: `USDA lookup failed (${res.status})` });
  }

  const json = (await res.json()) as { foods?: FdcFood[] };
  const food = [...(json.foods ?? [])]
    .sort((a, b) => rankFood(b, name) - rankFood(a, name))
    .find((c) => buildEstimate(c, name, quantity, unit) != null);

  if (!food) return { estimate: null, error: "No USDA nutrition match found." };
  return { estimate: buildEstimate(food, name, quantity, unit), error: null };
});

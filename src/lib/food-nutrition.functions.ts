import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const FDC_BASE = "https://api.nal.usda.gov/fdc/v1";
const ENERGY_NUTRIENT_IDS = new Set([1008, 2047, 2048]);

type FdcNutrient = {
  nutrientId?: number;
  nutrientName?: string;
  nutrientNumber?: string;
  unitName?: string;
  value?: number;
};

type FdcFood = {
  fdcId: number;
  description?: string;
  dataType?: string;
  brandOwner?: string;
  brandName?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
  foodNutrients?: FdcNutrient[];
};

type FdcSearchResponse = {
  foods?: FdcFood[];
};

export type FoodNutritionEstimate = {
  name: string;
  quantity: number;
  unit: string;
  matchedName: string;
  sourceLabel: string;
  servingBasis: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: "high" | "medium" | "low";
};

export type ImageFoodEstimate = {
  name: string;
  quantity: number;
  unit: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: "high" | "medium" | "low";
  note?: string;
};

function fdcApiKey() {
  return process.env.FOODDATA_CENTRAL_API_KEY || process.env.USDA_FDC_API_KEY || "DEMO_KEY";
}

function nutrientAmount(food: FdcFood, kind: "kcal" | "protein" | "carbs" | "fat") {
  const nutrients = food.foodNutrients ?? [];
  const byId = (ids: number[]) =>
    nutrients.find((n) => n.nutrientId != null && ids.includes(n.nutrientId))?.value;
  const byName = (patterns: RegExp[]) =>
    nutrients.find((n) => patterns.some((p) => p.test(n.nutrientName ?? "")))?.value;

  if (kind === "kcal") {
    return (
      nutrients.find((n) => n.nutrientId != null && ENERGY_NUTRIENT_IDS.has(n.nutrientId))?.value ??
      byName([/energy/i])
    );
  }
  if (kind === "protein") return byId([1003]) ?? byName([/protein/i]);
  if (kind === "fat") return byId([1004]) ?? byName([/^total lipid/i, /^total fat/i, /^fat$/i]);
  return byId([1005]) ?? byName([/carbohydrate.*difference/i, /^carbohydrate/i]);
}

function amountToGrams(quantity: number, unit: string, food: FdcFood) {
  const normalized = unit.trim().toLowerCase();
  if (["g", "gram", "grams"].includes(normalized)) return quantity;
  if (["kg", "kilogram", "kilograms"].includes(normalized)) return quantity * 1000;
  if (["oz", "ounce", "ounces"].includes(normalized)) return quantity * 28.3495;
  if (["lb", "lbs", "pound", "pounds"].includes(normalized)) return quantity * 453.592;
  if (["ml", "milliliter", "milliliters"].includes(normalized)) return quantity;
  if (["l", "liter", "liters"].includes(normalized)) return quantity * 1000;

  const servingUnit = food.servingSizeUnit?.toLowerCase();
  if (food.servingSize && (!servingUnit || ["g", "gram", "grams"].includes(servingUnit))) {
    return quantity * food.servingSize;
  }
  if (food.servingSize && ["ml", "milliliter", "milliliters"].includes(servingUnit ?? "")) {
    return quantity * food.servingSize;
  }

  return quantity * 100;
}

function rankFood(food: FdcFood, query: string) {
  const description = (food.description ?? "").toLowerCase();
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);
  const matches = words.filter((w) => description.includes(w)).length;
  const sourceBoost =
    food.dataType === "Survey (FNDDS)"
      ? 3
      : food.dataType === "Foundation"
        ? 2
        : food.dataType === "SR Legacy"
          ? 1
          : 0;
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
  const confidence: FoodNutritionEstimate["confidence"] =
    unit.toLowerCase().startsWith("serv") && !food.servingSize ? "medium" : "high";

  return {
    name,
    quantity,
    unit,
    matchedName,
    sourceLabel: `USDA FoodData Central${food.dataType ? `: ${food.dataType}` : ""}`,
    servingBasis,
    kcal: Math.round(kcal * factor),
    protein_g: Math.round(protein * factor * 10) / 10,
    carbs_g: Math.round(carbs * factor * 10) / 10,
    fat_g: Math.round(fat * factor * 10) / 10,
    confidence,
  };
}

export const estimateFoodNutrition = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string().trim().min(1).max(160),
      quantity: z.number().positive().max(10000),
      unit: z.string().trim().min(1).max(40),
    }).parse,
  )
  .handler(
    async ({ data }): Promise<{ estimate: FoodNutritionEstimate | null; error: string | null }> => {
      const params = new URLSearchParams({ api_key: fdcApiKey() });
      const res = await fetch(`${FDC_BASE}/foods/search?${params}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: data.name,
          pageSize: 12,
          requireAllWords: false,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("USDA FDC search failed", res.status, text);
        return { estimate: null, error: `USDA nutrition lookup failed (${res.status})` };
      }

      const json = (await res.json()) as FdcSearchResponse;
      const food = [...(json.foods ?? [])]
        .sort((a, b) => rankFood(b, data.name) - rankFood(a, data.name))
        .find((candidate) => buildEstimate(candidate, data.name, data.quantity, data.unit) != null);

      if (!food) {
        return {
          estimate: null,
          error: "No USDA nutrition match found. You can enter macros manually.",
        };
      }

      return { estimate: buildEstimate(food, data.name, data.quantity, data.unit), error: null };
    },
  );

function extractJsonObject(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const raw = fenced ?? text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("AI response was not JSON.");
  return JSON.parse(raw.slice(start, end + 1)) as { items?: ImageFoodEstimate[] };
}

export const estimateFoodFromImage = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      imageDataUrl: z.string().startsWith("data:image/").max(8_000_000),
      mode: z.enum(["meal_photo", "nutrition_label"]),
    }).parse,
  )
  .handler(async ({ data }): Promise<{ items: ImageFoodEstimate[]; error: string | null }> => {
    const aiKey = process.env.AI_API_KEY;
    const aiBaseUrl = process.env.AI_BASE_URL ?? "https://api.openai.com/v1";
    const aiModel = process.env.AI_MODEL ?? "gpt-4.1-mini";

    if (!aiKey) return { items: [], error: "AI_API_KEY is not configured." };

    const instruction =
      data.mode === "nutrition_label"
        ? "Read the nutrition facts label. Return one food item using the label's per-serving macros. Include serving size as quantity and unit when visible."
        : "Estimate the visible meal's food items and portions. Return reasonable macro estimates with confidence.";

    const res = await fetch(`${aiBaseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${aiKey}`,
      },
      body: JSON.stringify({
        model: aiModel,
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content:
              "You estimate food nutrition for a macro tracking app. Return only JSON with an items array. Each item must include name, quantity, unit, kcal, protein_g, carbs_g, fat_g, confidence, and optional note. Confidence is high, medium, or low.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: instruction },
              { type: "image_url", image_url: { url: data.imageDataUrl } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("AI image nutrition failed", res.status, text);
      return { items: [], error: `Image nutrition estimate failed (${res.status})` };
    }

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = json.choices?.[0]?.message?.content ?? "";

    try {
      const parsed = extractJsonObject(content);
      const items = (parsed.items ?? [])
        .map((item) => ({
          name: String(item.name ?? "Food"),
          quantity: Number(item.quantity) || 1,
          unit: String(item.unit ?? "serving"),
          kcal: Math.max(0, Math.round(Number(item.kcal) || 0)),
          protein_g: Math.max(0, Math.round((Number(item.protein_g) || 0) * 10) / 10),
          carbs_g: Math.max(0, Math.round((Number(item.carbs_g) || 0) * 10) / 10),
          fat_g: Math.max(0, Math.round((Number(item.fat_g) || 0) * 10) / 10),
          confidence:
            item.confidence === "high" || item.confidence === "medium" ? item.confidence : "low",
          note: item.note ? String(item.note) : undefined,
        }))
        .filter((item) => item.name.trim() && item.kcal > 0);

      return { items, error: items.length ? null : "No usable nutrition estimate found." };
    } catch (error) {
      return {
        items: [],
        error: error instanceof Error ? error.message : "Could not parse AI nutrition estimate.",
      };
    }
  });

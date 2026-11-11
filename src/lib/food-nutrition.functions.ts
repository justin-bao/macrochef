import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "../integrations/supabase/auth-middleware";
import { readFoodAiConfig, foodAiSetupState } from "./food-ai-config.server";
import { assessNutritionEvidence, confidenceLabel, resolveNutritionSources, aiNutritionSource, type NutritionEvidence, type NutritionSource } from "./nutrition-evidence";

import { resolveIngredients, ingredientTotals, ingredientMealEvidence, type MealIngredient } from "./meal-ingredients";

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

type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

type ChatMessage =
  | { role: "system"; content: string }
  | {
      role: "user";
      content:
        | string
        | Array<
            | { type: "text"; text: string }
            | { type: "image_url"; image_url: { url: string } }
          >;
    }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

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
  evidence?: NutritionEvidence;
};

export type ImageFoodEstimate = {
  ingredients?: MealIngredient[];
  name: string;
  quantity: number;
  unit: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: "high" | "medium" | "low";
  evidence?: NutritionEvidence;
  note?: string;
};

function fdcApiKey() {
  return process.env.FOODDATA_CENTRAL_API_KEY?.trim() || process.env.USDA_FDC_API_KEY?.trim() || "DEMO_KEY";
}

export const getUsdaSetup = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => ({ state: fdcApiKey() === "DEMO_KEY" ? "shared_access" as const : "personal_key" as const }));

function nutrientAmount(food: FdcFood, kind: "kcal" | "protein" | "carbs" | "fat") {
  const nutrients = food.foodNutrients ?? [];
  const byId = (ids: number[]) =>
    nutrients.find((n) => n.nutrientId != null && ids.includes(n.nutrientId))?.value;
  const byName = (patterns: RegExp[]) =>
    nutrients.find((n) => patterns.some((p) => p.test(n.nutrientName ?? "")))?.value;

  if (kind === "kcal") {
    return (
      nutrients.find((n) => n.nutrientId != null && ENERGY_NUTRIENT_IDS.has(n.nutrientId))
        ?.value ?? byName([/energy/i])
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
  const evidence = assessNutritionEvidence({
    sources: [{ id: `fdc-${food.fdcId}`, label: `USDA FoodData Central: ${matchedName}`, url: `https://fdc.nal.usda.gov/food-details/${food.fdcId}/nutrients`, kind: "database" }],
    portionKnown: /^(g|grams?|kg|kilograms?|oz|ounces?|lb|lbs|pounds?)$/i.test(unit.trim()),
  });
  const confidence = confidenceLabel(evidence.score);

  return {
    name,
    quantity,
    unit,
    matchedName,
    evidence,
    sourceLabel: `USDA FoodData Central${food.dataType ? `: ${food.dataType}` : ""}`,
    servingBasis,
    kcal: Math.round(kcal * factor),
    protein_g: Math.round(protein * factor * 10) / 10,
    carbs_g: Math.round(carbs * factor * 10) / 10,
    fat_g: Math.round(fat * factor * 10) / 10,
    confidence,
  };
}

// Used by the manual tab's "Fill macros from USDA" button.
export const estimateFoodNutrition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      name: z.string().trim().min(1).max(160),
      quantity: z.number().positive().max(10000),
      unit: z.string().trim().min(1).max(40),
    }).parse,
  )
  .handler(
    async ({ data }): Promise<{ estimate: FoodNutritionEstimate | null; error: string | null }> => {
      let res: Response;
      try { res = await fetch(`${FDC_BASE}/foods/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Api-Key": fdcApiKey() },
        body: JSON.stringify({
          query: data.name,
          pageSize: 12,
          requireAllWords: false,
        }),
      }); } catch {
        return { estimate: null, error: "USDA cannot be reached right now. Try again later or enter macros manually." };
      }

      if (!res.ok) {
        console.error("USDA FDC search failed", res.status);
        return { estimate: null, error: res.status === 429
          ? fdcApiKey() === "DEMO_KEY"
            ? "USDA's lookup limit has been reached. Try again later or use a personal USDA API key for higher limits. You can still enter macros manually."
            : "Your USDA quota is currently rate-limited. Try again later or enter macros manually."
          : res.status === 401 || res.status === 403
          ? "USDA rejected the configured access. Check your saved USDA API key or enter macros manually."
          : `USDA nutrition lookup is unavailable (${res.status}). Try again later or enter macros manually.` };
      }

      const json = (await res.json()) as FdcSearchResponse;
      const food = [...(json.foods ?? [])]
        .sort((a, b) => rankFood(b, data.name) - rankFood(a, data.name))
        .find(
          (candidate) => buildEstimate(candidate, data.name, data.quantity, data.unit) != null,
        );

      if (!food) {
        return {
          estimate: null,
          error: "No USDA nutrition match found. You can enter macros manually.",
        };
      }

      return { estimate: buildEstimate(food, data.name, data.quantity, data.unit), error: null };
    },
  );

// Returns top Open Food Facts matches for a query in compact per-100g format.
// No API key or rate limit — preferred over FatSecret for branded/packaged products.
async function searchOpenFoodFactsForTool(query: string) {
  try {
    const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
    url.searchParams.set("search_terms", query);
    url.searchParams.set("search_simple", "1");
    url.searchParams.set("action", "process");
    url.searchParams.set("json", "1");
    url.searchParams.set("fields", "code,product_name,brands,nutriments,serving_size");
    url.searchParams.set("page_size", "5");

    const res = await fetch(url.toString(), {
      headers: { "User-Agent": "MacroChef/1.0" },
    });
    if (!res.ok) { console.error("Packaged food search status", res.status); return { matches: [] }; }

    const json = (await res.json()) as {
      products?: Array<{
        code?: string;
        product_name?: string;
        brands?: string;
        nutriments?: {
          "energy-kcal_100g"?: number;
          proteins_100g?: number;
          carbohydrates_100g?: number;
          fat_100g?: number;
        };
        serving_size?: string;
      }>;
    };

    const matches = (json.products ?? [])
      .map((p) => {
        const kcal = p.nutriments?.["energy-kcal_100g"];
        const protein = p.nutriments?.proteins_100g;
        const carbs = p.nutriments?.carbohydrates_100g;
        const fat = p.nutriments?.fat_100g;
        if (kcal == null || protein == null || carbs == null || fat == null) return null;
        const name = [p.product_name, p.brands].filter(Boolean).join(" — ");
        return {
          source: { id: `off-${p.code ?? "unknown"}`, label: `Open Food Facts: ${name || query}`, url: p.code && /^\d+$/.test(p.code) ? `https://world.openfoodfacts.org/product/${p.code}` : null, kind: "database" as const },
          name: name || query,
          kcal_per_100g: Math.round(kcal),
          protein_g_per_100g: Math.round(protein * 10) / 10,
          carbs_g_per_100g: Math.round(carbs * 10) / 10,
          fat_g_per_100g: Math.round(fat * 10) / 10,
          serving: p.serving_size,
        };
      })
      .filter(Boolean);

    return { matches };
  } catch {
    return { matches: [] };
  }
}

// Returns the top USDA matches for a query in a compact per-100g format for AI tool use.
async function searchUsdaForTool(query: string) {
  try {
    const res = await fetch(`${FDC_BASE}/foods/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Api-Key": fdcApiKey() },
      body: JSON.stringify({ query, pageSize: 8, requireAllWords: false }),
    });
    if (!res.ok) { console.error("USDA food search status", res.status); return { matches: [] }; }
    const json = (await res.json()) as FdcSearchResponse;
    const ranked = [...(json.foods ?? [])].sort((a, b) => rankFood(b, query) - rankFood(a, query));
    const matches = ranked
      .slice(0, 5)
      .map((food) => {
        const kcal = nutrientAmount(food, "kcal");
        const protein = nutrientAmount(food, "protein");
        const carbs = nutrientAmount(food, "carbs");
        const fat = nutrientAmount(food, "fat");
        if (kcal == null || protein == null || carbs == null || fat == null) return null;
        return {
          source: { id: `fdc-${food.fdcId}`, label: `USDA FoodData Central: ${food.description ?? query}`, url: `https://fdc.nal.usda.gov/food-details/${food.fdcId}/nutrients`, kind: "database" as const },
          name: food.description ?? query,
          dataType: food.dataType,
          kcal_per_100g: Math.round(kcal),
          protein_g_per_100g: Math.round(protein * 10) / 10,
          carbs_g_per_100g: Math.round(carbs * 10) / 10,
          fat_g_per_100g: Math.round(fat * 10) / 10,
          serving: food.householdServingFullText,
        };
      })
      .filter(Boolean);
    return { matches };
  } catch {
    return { matches: [] };
  }
}

// Deterministic database-only search; no AI request and no automatic food selection.
export const searchSingleFoods = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ query: z.string().trim().min(1).max(200) }).parse(input))
  .handler(async ({ data }) => {
    const [usda, packaged] = await Promise.all([searchUsdaForTool(data.query), searchOpenFoodFactsForTool(data.query)]);
    const seen = new Set<string>();
    return { matches: [...usda.matches, ...packaged.matches].flatMap(match => {
      if (!match || seen.has(match.source.id)) return [];
      seen.add(match.source.id);
      return [match];
    }) };
  });

function extractJsonObject(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const raw = fenced ?? text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("AI response was not JSON.");
  return JSON.parse(raw.slice(start, end + 1)) as { items?: Array<ImageFoodEstimate & { sourceIds?: string[]; uncertainties?: string[]; ingredients?: unknown }> };
}

function parseItemsFromContent(
  content: string, available: NutritionSource[] = [], isLabel = false, complex = false,
): { items: ImageFoodEstimate[]; error: string | null } {
  try {
    const parsed = extractJsonObject(content);
    const items = (parsed.items ?? [])
      .map((item) => {
        const ingredients = isLabel ? [] : resolveIngredients(item.ingredients, available);
        if (complex && !isLabel && !ingredients.length) throw new Error("The meal estimate did not include a valid ingredient breakdown. No opaque estimate was logged.");
        const totals = ingredients.length ? ingredientTotals(ingredients) : null;
        return ({
        ingredients,
        name: String(item.name ?? "Food"),
        quantity: Number(item.quantity) || 1,
        unit: String(item.unit ?? "serving"),
        kcal: Math.max(0, Math.round(Number(item.kcal) || 0)),
        protein_g: Math.max(0, Math.round((Number(item.protein_g) || 0) * 10) / 10),
        carbs_g: Math.max(0, Math.round((Number(item.carbs_g) || 0) * 10) / 10),
        fat_g: Math.max(0, Math.round((Number(item.fat_g) || 0) * 10) / 10),
        confidence:
          item.confidence === "high" || item.confidence === "medium"
            ? item.confidence
            : ("low" as const),
        evidence: assessNutritionEvidence({
          sources: isLabel ? [{ id: "uploaded-label", label: "Uploaded nutrition facts label (AI transcription)", url: null, kind: "label" }] : (() => { const verified = resolveNutritionSources(item.sourceIds, available); return verified.length ? verified : [aiNutritionSource]; })(),
          portionKnown: /^(g|grams?|kg|kilograms?|oz|ounces?|lb|lbs|pounds?)$/i.test(String(item.unit)),
          complex,
          uncertainties: isLabel ? ["Label transcription and serving size need review."] : Array.isArray(item.uncertainties) ? item.uncertainties.filter((u): u is string => typeof u === "string").slice(0, 5) : [],
        }),
        note: item.note ? String(item.note) : undefined,
        ...(totals ?? {}),
        ...(ingredients.length ? { evidence: ingredientMealEvidence(ingredients) } : {}),
      }); })
      .filter((item) => item.name.trim() && item.kcal > 0);
    return { items: items.map((item) => ({ ...item, confidence: confidenceLabel(item.evidence.score) })), error: items.length ? null : "No usable nutrition estimate found." };
  } catch (err) {
    return {
      items: [],
      error: err instanceof Error ? err.message : "Could not parse AI nutrition estimate.",
    };
  }
}

const SEARCH_USDA_TOOL = {
  type: "function" as const,
  function: {
    name: "search_usda",
    description:
      "Search USDA FoodData Central for whole or unprocessed foods (meats, grains, vegetables, dairy). Returns the top 5 matches with per-100g macros. Prefer this over search_open_food_facts for unbranded ingredients.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Food name to search, e.g. 'wheat noodles cooked' or 'ground pork 80 lean'.",
        },
      },
      required: ["query"],
    },
  },
};

const SEARCH_OFF_TOOL = {
  type: "function" as const,
  function: {
    name: "search_open_food_facts",
    description:
      "Search Open Food Facts for packaged or branded food products. Prefer this over search_usda for anything with a brand name (e.g. 'Cheerios', 'Chobani Greek yogurt', 'Trader Joe's hummus'). Returns the top 5 matches with per-100g macros.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Brand or product name to search, e.g. 'Chobani plain greek yogurt' or 'General Mills Cheerios'.",
        },
      },
      required: ["query"],
    },
  },
};

// Unified AI estimation used by both the text tab and the image tabs.
// Sends the description or image to the AI along with a search_usda tool.
// The AI identifies the dish, breaks it into ingredients, calls search_usda
// for each, then returns parent meals with nested ingredient evidence.
// Falls back to an error when AI_API_KEY is not configured so the caller
// can fall back to the regex + USDA path.
export const getFoodAiSetup = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => foodAiSetupState());

export const estimateFoodWithTools = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      description: z.string().trim().max(500).optional(),
      imageDataUrl: z.string().startsWith("data:image/").max(8_000_000).optional(),
      mode: z.enum(["meal_photo", "nutrition_label"]).optional(),
      context: z
        .object({
          setting: z.enum(["homemade", "restaurant", "packaged"]).optional(),
          notes: z.string().trim().max(200).optional(),
        })
        .optional(),
      useToolCalling: z.boolean().optional(),
    }).parse,
  )
  .handler(async ({ data }): Promise<{ items: ImageFoodEstimate[]; error: string | null }> => {
    const { key: aiKey, baseUrl: aiBaseUrl, model: aiModel, validEndpoint } = readFoodAiConfig();

    if (!aiKey) return { items: [], error: "AI_API_KEY is not configured." };
    if (!validEndpoint) return { items: [], error: "AI service address must be a valid HTTPS address." };

    const contextParts: string[] = [];
    if (data.context?.setting === "homemade")
      contextParts.push("This is a homemade meal — use typical home-cooking portion sizes.");
    else if (data.context?.setting === "restaurant")
      contextParts.push("This is a restaurant meal — use typical restaurant portion sizes.");
    else if (data.context?.setting === "packaged")
      contextParts.push("This is a packaged or branded food product.");
    if (data.context?.notes) contextParts.push(data.context.notes);
    const contextStr = contextParts.length ? `\n\n${contextParts.join(" ")}` : "";

    const isLabel = data.mode === "nutrition_label";
    const withTools = data.useToolCalling !== false && !isLabel;

    const systemMessage = isLabel
      ? `You are a nutrition expert for a macro tracking app.${contextStr}\n\nRead the nutrition facts label carefully. Return one food item using the label's per-serving macros. Use the label's serving size as quantity and unit. Return only JSON with an items array: name, quantity, unit, kcal, protein_g, carbs_g, fat_g, confidence (high), note (optional).`
      : withTools
        ? `You are a nutrition expert for a macro tracking app.${contextStr}

When given a food description or image:
1. Identify the dish and estimate the overall portion size.
2. Break it into its likely constituent ingredients with realistic portion sizes.
3. For each ingredient, call the appropriate tool (max 10 calls total):
   - search_usda for whole/unprocessed foods (meats, grains, vegetables, dairy).
   - search_open_food_facts for branded or packaged products.
4. Return each meal as ONE parent item with a nested ingredients array. Keep ingredients with uncertain or missing database matches in the breakdown, marked as estimates; do not collapse them into an opaque dish. Never return both a parent meal and its ingredients as sibling items.
Return only JSON with an items array: name, quantity, unit, kcal, protein_g, carbs_g, fat_g, confidence (high/medium/low), note (optional).`
        : `You are a nutrition expert for a macro tracking app.${contextStr}

Identify the dish and estimate macros from your own knowledge. Return ONE parent item per meal with a nested ingredients array, including uncertain ingredients, oils and sauces as inferred estimates. Never return the parent and ingredients as sibling items.
Return only JSON with an items array: name, quantity, unit, kcal, protein_g, carbs_g, fat_g, confidence (high/medium/low), note (optional).`;

    const userMessage: ChatMessage = data.imageDataUrl
      ? {
          role: "user",
          content: [
            {
              type: "text",
              text: isLabel
                ? "Read this nutrition facts label and return the food item."
                : "Identify this meal, break it into ingredients, and call search_usda for each.",
            },
            { type: "image_url", image_url: { url: data.imageDataUrl } },
          ],
        }
      : { role: "user", content: data.description ?? "" };

    const complex = !isLabel && (Boolean(data.imageDataUrl) || data.context?.setting === "restaurant" || !/^\s*\d+(?:\.\d+)?\s*(?:g|grams?|oz|ounces?|kg|lb)\s+[\w ]+$/i.test(data.description ?? ""));
    const availableSources: NutritionSource[] = [];
    const provenanceInstruction = " For every non-label meal include ingredients: [{name, quantity, unit, kcal, protein_g, carbs_g, fat_g, portionAssumption, portionConfirmed, sourceIds, uncertainties}]. Set portionConfirmed true ONLY when the user explicitly supplied this ingredient quantity; quantities inferred from a photo, dish name or typical recipe are never confirmed, even in grams. Use ingredient sourceIds only for retrieved records actually used; empty when inferred. Explain likely versus explicitly supplied ingredients in portionAssumption. Parent macros must equal the sum of ingredient contributions. For each returned item include sourceIds (only source.id values from tool results actually used, empty if none) and uncertainties (specific unknowns about ingredient weights, oil, sauces, or preparation). Never invent citations. A database match does not verify the portion or the complete dish.";
    const messages: ChatMessage[] = [
      { role: "system", content: systemMessage + provenanceInstruction },
      userMessage,
    ];

    const callAI = async (msgs: ChatMessage[], enableTools: boolean) => {
      const res = await fetch(`${aiBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${aiKey}`,
        },
        body: JSON.stringify({
          model: aiModel,
          temperature: 0.1,
          messages: msgs,
          ...(enableTools
            ? { tools: [SEARCH_USDA_TOOL, SEARCH_OFF_TOOL], tool_choice: "auto" }
            : {}),
        }),
      });
      return res;
    };

    // Round 0: let the AI make tool calls (or go direct if tools are disabled).
    const res0 = await callAI(messages, withTools);
    if (!res0.ok) {
      await res0.text();
      console.error("AI estimation failed (round 0)", res0.status);
      return { items: [], error: `AI estimation failed (${res0.status})` };
    }

    const json0 = (await res0.json()) as {
      choices?: Array<{
        message?: { role?: string; content?: string | null; tool_calls?: ToolCall[] };
      }>;
    };
    const msg0 = json0.choices?.[0]?.message;
    if (!msg0) return { items: [], error: "Empty AI response." };

    // No tool calls (label mode, tools disabled, or AI skipped tools): parse directly.
    if (!msg0.tool_calls?.length) {
      return parseItemsFromContent(msg0.content ?? "", availableSources, isLabel, complex);
    }

    // Execute all tool calls in parallel (cap at 10).
    messages.push({
      role: "assistant",
      content: msg0.content ?? null,
      tool_calls: msg0.tool_calls,
    });

    const toolResults = await Promise.all(
      msg0.tool_calls.slice(0, 10).map(async (tc) => {
        try {
          const args = JSON.parse(tc.function.arguments) as { query?: string };
          const query = args.query ?? "";
          const result =
            tc.function.name === "search_open_food_facts"
              ? await searchOpenFoodFactsForTool(query)
              : await searchUsdaForTool(query);
          for (const match of result.matches) { if (match?.source) availableSources.push(match.source); }
          return { role: "tool" as const, tool_call_id: tc.id, content: JSON.stringify(result) };
        } catch {
          return {
            role: "tool" as const,
            tool_call_id: tc.id,
            content: JSON.stringify({ matches: [] }),
          };
        }
      }),
    );
    messages.push(...toolResults);

    // Round 1: get the final JSON answer with no further tool calls.
    const res1 = await callAI(messages, false);
    if (!res1.ok) {
      await res1.text();
      console.error("AI estimation failed (round 1)", res1.status);
      return { items: [], error: `AI estimation failed (${res1.status})` };
    }

    const json1 = (await res1.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    return parseItemsFromContent(json1.choices?.[0]?.message?.content ?? "", availableSources, isLabel, complex);
  });

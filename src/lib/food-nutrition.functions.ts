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

// Used by the manual tab's "Fill macros from USDA" button.
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

// Returns the top USDA matches for a query in a compact per-100g format for AI tool use.
async function searchUsdaForTool(query: string) {
  const params = new URLSearchParams({ api_key: fdcApiKey() });
  try {
    const res = await fetch(`${FDC_BASE}/foods/search?${params}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, pageSize: 8, requireAllWords: false }),
    });
    if (!res.ok) return { matches: [] };
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

function extractJsonObject(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const raw = fenced ?? text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("AI response was not JSON.");
  return JSON.parse(raw.slice(start, end + 1)) as { items?: ImageFoodEstimate[] };
}

function parseItemsFromContent(
  content: string,
): { items: ImageFoodEstimate[]; error: string | null } {
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
          item.confidence === "high" || item.confidence === "medium"
            ? item.confidence
            : ("low" as const),
        note: item.note ? String(item.note) : undefined,
      }))
      .filter((item) => item.name.trim() && item.kcal > 0);
    return { items, error: items.length ? null : "No usable nutrition estimate found." };
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
      "Search USDA FoodData Central for a food item. Returns the top 5 matches with per-100g macros. Call this for each constituent ingredient.",
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

// Unified AI estimation used by both the text tab and the image tabs.
// Sends the description or image to the AI along with a search_usda tool.
// The AI identifies the dish, breaks it into ingredients, calls search_usda
// for each, then returns either per-ingredient items (when USDA matches are
// clear) or a single overall estimate (when they are not).
// Falls back to an error when AI_API_KEY is not configured so the caller
// can fall back to the regex + USDA path.
export const estimateFoodWithTools = createServerFn({ method: "POST" })
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
    }).parse,
  )
  .handler(async ({ data }): Promise<{ items: ImageFoodEstimate[]; error: string | null }> => {
    const aiKey = process.env.AI_API_KEY;
    const aiBaseUrl = (process.env.AI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
    const aiModel = process.env.AI_MODEL ?? "gpt-4.1-mini";

    if (!aiKey) return { items: [], error: "AI_API_KEY is not configured." };

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
    const systemMessage = isLabel
      ? `You are a nutrition expert for a macro tracking app.${contextStr}\n\nRead the nutrition facts label carefully. Return one food item using the label's per-serving macros. Use the label's serving size as quantity and unit. Return only JSON with an items array: name, quantity, unit, kcal, protein_g, carbs_g, fat_g, confidence (high), note (optional).`
      : `You are a nutrition expert for a macro tracking app.${contextStr}

When given a food description or image:
1. Identify the dish and estimate the overall portion size.
2. Break it into its likely constituent ingredients with realistic portion sizes.
3. Call search_usda for each ingredient (max 10 calls).
4. After reviewing USDA results, decide:
   - If the USDA matches are clearly correct for the ingredients, return each ingredient as a separate item, scaling the USDA per-100g data to the portion size. In each note, cite the matched USDA food name.
   - If USDA results are poor or absent for most ingredients, return a single item for the whole dish with your overall macro estimate and confidence "low".
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

    const messages: ChatMessage[] = [
      { role: "system", content: systemMessage },
      userMessage,
    ];

    const callAI = async (msgs: ChatMessage[], withTools: boolean) => {
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
          ...(withTools ? { tools: [SEARCH_USDA_TOOL], tool_choice: "auto" } : {}),
        }),
      });
      return res;
    };

    // Round 0: let the AI make tool calls.
    const res0 = await callAI(messages, !isLabel);
    if (!res0.ok) {
      const text = await res0.text();
      console.error("AI estimation failed (round 0)", res0.status, text);
      return { items: [], error: `AI estimation failed (${res0.status})` };
    }

    const json0 = (await res0.json()) as {
      choices?: Array<{
        message?: { role?: string; content?: string | null; tool_calls?: ToolCall[] };
      }>;
    };
    const msg0 = json0.choices?.[0]?.message;
    if (!msg0) return { items: [], error: "Empty AI response." };

    // No tool calls (or label mode): parse the JSON directly.
    if (!msg0.tool_calls?.length) {
      return parseItemsFromContent(msg0.content ?? "");
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
          const result = await searchUsdaForTool(args.query ?? "");
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
      const text = await res1.text();
      console.error("AI estimation failed (round 1)", res1.status, text);
      return { items: [], error: `AI estimation failed (${res1.status})` };
    }

    const json1 = (await res1.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    return parseItemsFromContent(json1.choices?.[0]?.message?.content ?? "");
  });

import { defineEventHandler, readBody, createError } from "h3";
import { z } from "zod";

// ── Shared types ──────────────────────────────────────────────────────────────

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

type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };
type ChatMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export type AIFoodItem = {
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

// ── Input schema ──────────────────────────────────────────────────────────────

const InputSchema = z.object({
  description: z.string().trim().min(1).max(500),
  context: z
    .object({
      setting: z.enum(["homemade", "restaurant", "packaged"]).optional(),
      notes: z.string().trim().max(200).optional(),
    })
    .optional(),
  useToolCalling: z.boolean().optional().default(true),
});

// ── USDA helpers ──────────────────────────────────────────────────────────────

function fdcApiKey() {
  return process.env.FOODDATA_CENTRAL_API_KEY ?? process.env.USDA_FDC_API_KEY ?? "DEMO_KEY";
}

function nutrientAmount(food: FdcFood, kind: "kcal" | "protein" | "carbs" | "fat") {
  const ns = food.foodNutrients ?? [];
  const byId = (ids: number[]) =>
    ns.find((n) => n.nutrientId != null && ids.includes(n.nutrientId))?.value;
  const byName = (pats: RegExp[]) =>
    ns.find((n) => pats.some((p) => p.test(n.nutrientName ?? "")))?.value;
  if (kind === "kcal")
    return ns.find((n) => n.nutrientId != null && ENERGY_NUTRIENT_IDS.has(n.nutrientId))?.value ?? byName([/energy/i]);
  if (kind === "protein") return byId([1003]) ?? byName([/protein/i]);
  if (kind === "fat") return byId([1004]) ?? byName([/^total lipid/i, /^total fat/i, /^fat$/i]);
  return byId([1005]) ?? byName([/carbohydrate.*difference/i, /^carbohydrate/i]);
}

function rankFood(food: FdcFood, query: string) {
  const desc = (food.description ?? "").toLowerCase();
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const matches = words.filter((w) => desc.includes(w)).length;
  const sourceBoost =
    food.dataType === "Survey (FNDDS)" ? 3 : food.dataType === "Foundation" ? 2 : food.dataType === "SR Legacy" ? 1 : 0;
  const hasMacros =
    nutrientAmount(food, "kcal") != null && nutrientAmount(food, "protein") != null &&
    nutrientAmount(food, "carbs") != null && nutrientAmount(food, "fat") != null;
  return matches * 4 + sourceBoost + (hasMacros ? 10 : 0);
}

async function searchUsdaForTool(query: string) {
  try {
    const params = new URLSearchParams({ api_key: fdcApiKey() });
    const res = await fetch(`${FDC_BASE}/foods/search?${params}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, pageSize: 8, requireAllWords: false }),
    });
    if (!res.ok) return { matches: [] };
    const json = (await res.json()) as { foods?: FdcFood[] };
    const ranked = [...(json.foods ?? [])].sort((a, b) => rankFood(b, query) - rankFood(a, query));
    const matches = ranked.slice(0, 5).map((food) => {
      const kcal = nutrientAmount(food, "kcal");
      const protein = nutrientAmount(food, "protein");
      const carbs = nutrientAmount(food, "carbs");
      const fat = nutrientAmount(food, "fat");
      if (kcal == null || protein == null || carbs == null || fat == null) return null;
      return {
        name: food.description ?? query, dataType: food.dataType,
        kcal_per_100g: Math.round(kcal),
        protein_g_per_100g: Math.round(protein * 10) / 10,
        carbs_g_per_100g: Math.round(carbs * 10) / 10,
        fat_g_per_100g: Math.round(fat * 10) / 10,
        serving: food.householdServingFullText,
      };
    }).filter(Boolean);
    return { matches };
  } catch { return { matches: [] }; }
}

async function searchOpenFoodFactsForTool(query: string) {
  try {
    const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
    url.searchParams.set("search_terms", query);
    url.searchParams.set("search_simple", "1");
    url.searchParams.set("action", "process");
    url.searchParams.set("json", "1");
    url.searchParams.set("fields", "product_name,brands,nutriments,serving_size");
    url.searchParams.set("page_size", "5");
    const res = await fetch(url.toString(), { headers: { "User-Agent": "MacroChef/1.0" } });
    if (!res.ok) return { matches: [] };
    const json = (await res.json()) as {
      products?: Array<{
        product_name?: string; brands?: string; serving_size?: string;
        nutriments?: { "energy-kcal_100g"?: number; proteins_100g?: number; carbohydrates_100g?: number; fat_100g?: number };
      }>;
    };
    const matches = (json.products ?? []).map((p) => {
      const kcal = p.nutriments?.["energy-kcal_100g"];
      const protein = p.nutriments?.proteins_100g;
      const carbs = p.nutriments?.carbohydrates_100g;
      const fat = p.nutriments?.fat_100g;
      if (kcal == null || protein == null || carbs == null || fat == null) return null;
      return {
        name: [p.product_name, p.brands].filter(Boolean).join(" — ") || query,
        kcal_per_100g: Math.round(kcal),
        protein_g_per_100g: Math.round(protein * 10) / 10,
        carbs_g_per_100g: Math.round(carbs * 10) / 10,
        fat_g_per_100g: Math.round(fat * 10) / 10,
        serving: p.serving_size,
      };
    }).filter(Boolean);
    return { matches };
  } catch { return { matches: [] }; }
}

// ── AI helpers ────────────────────────────────────────────────────────────────

const SEARCH_USDA_TOOL = {
  type: "function" as const,
  function: {
    name: "search_usda",
    description: "Search USDA FoodData Central for whole or unprocessed foods (meats, grains, vegetables, dairy). Returns top 5 matches with per-100g macros. Prefer over search_open_food_facts for unbranded ingredients.",
    parameters: { type: "object", properties: { query: { type: "string", description: "Food name to search." } }, required: ["query"] },
  },
};

const SEARCH_OFF_TOOL = {
  type: "function" as const,
  function: {
    name: "search_open_food_facts",
    description: "Search Open Food Facts for packaged or branded food products. Prefer over search_usda for anything with a brand name.",
    parameters: { type: "object", properties: { query: { type: "string", description: "Brand or product name to search." } }, required: ["query"] },
  },
};

function extractJsonObject(text: string): { items?: AIFoodItem[] } {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const raw = fenced ?? text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) throw new Error("AI response was not JSON.");
  return JSON.parse(raw.slice(start, end + 1)) as { items?: AIFoodItem[] };
}

function parseItemsFromContent(content: string): { items: AIFoodItem[]; error: string | null } {
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
        confidence: (["high", "medium"].includes(item.confidence) ? item.confidence : "low") as AIFoodItem["confidence"],
        note: item.note ? String(item.note) : undefined,
      }))
      .filter((item) => item.name.trim() && item.kcal > 0);
    return { items, error: items.length ? null : "No usable nutrition estimate found." };
  } catch (err) {
    return { items: [], error: err instanceof Error ? err.message : "Could not parse AI response." };
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) throw createError({ statusCode: 400, message: parsed.error.message });

  const { description, context, useToolCalling } = parsed.data;
  const aiKey = process.env.AI_API_KEY;
  if (!aiKey) throw createError({ statusCode: 503, message: "AI_API_KEY is not configured." });

  const aiBaseUrl = (process.env.AI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const aiModel = process.env.AI_MODEL ?? "gpt-4.1-mini";

  // Build context string
  const contextParts: string[] = [];
  if (context?.setting === "homemade") contextParts.push("This is a homemade meal — use typical home-cooking portion sizes.");
  else if (context?.setting === "restaurant") contextParts.push("This is a restaurant meal — use typical restaurant portion sizes.");
  else if (context?.setting === "packaged") contextParts.push("This is a packaged or branded food product.");
  if (context?.notes) contextParts.push(context.notes);
  const contextStr = contextParts.length ? `\n\n${contextParts.join(" ")}` : "";

  const withTools = useToolCalling !== false;

  const systemPrompt = withTools
    ? `You are a nutrition expert for a macro tracking app.${contextStr}

When given a food description:
1. Identify the dish and estimate the overall portion size.
2. Break it into its likely constituent ingredients with realistic portion sizes.
3. For each ingredient, call the appropriate tool (max 10 calls total):
   - search_usda for whole/unprocessed foods (meats, grains, vegetables, dairy).
   - search_open_food_facts for branded or packaged products.
4. After reviewing results, decide:
   - If matches are clearly correct, return each ingredient as a separate item scaled to its portion. Cite the matched food name in note.
   - If results are poor or absent for most ingredients, return a single item for the whole dish with your overall estimate and confidence "low".
Return only JSON with an items array: name, quantity, unit, kcal, protein_g, carbs_g, fat_g, confidence (high/medium/low), note (optional).`
    : `You are a nutrition expert for a macro tracking app.${contextStr}

Identify the dish and estimate macros from your own knowledge. Break into constituent ingredients with realistic portions and estimate each. If uncertain, return a single item for the whole dish with confidence "low".
Return only JSON with an items array: name, quantity, unit, kcal, protein_g, carbs_g, fat_g, confidence (high/medium/low), note (optional).`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: description },
  ];

  const callAI = async (msgs: ChatMessage[], enableTools: boolean) =>
    fetch(`${aiBaseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${aiKey}` },
      body: JSON.stringify({
        model: aiModel, temperature: 0.1, messages: msgs,
        ...(enableTools ? { tools: [SEARCH_USDA_TOOL, SEARCH_OFF_TOOL], tool_choice: "auto" } : {}),
      }),
    });

  // Round 0
  const res0 = await callAI(messages, withTools);
  if (!res0.ok) {
    const text = await res0.text().catch(() => "");
    throw createError({ statusCode: 502, message: `AI estimation failed (${res0.status}): ${text.slice(0, 200)}` });
  }
  const json0 = (await res0.json()) as {
    choices?: Array<{ message?: { content?: string | null; tool_calls?: ToolCall[] } }>;
  };
  const msg0 = json0.choices?.[0]?.message;
  if (!msg0) return { items: [], error: "Empty AI response." };

  if (!msg0.tool_calls?.length) return parseItemsFromContent(msg0.content ?? "");

  // Execute tool calls
  messages.push({ role: "assistant", content: msg0.content ?? null, tool_calls: msg0.tool_calls });
  const toolResults = await Promise.all(
    msg0.tool_calls.slice(0, 10).map(async (tc) => {
      try {
        const args = JSON.parse(tc.function.arguments) as { query?: string };
        const q = args.query ?? "";
        const result = tc.function.name === "search_open_food_facts"
          ? await searchOpenFoodFactsForTool(q)
          : await searchUsdaForTool(q);
        return { role: "tool" as const, tool_call_id: tc.id, content: JSON.stringify(result) };
      } catch {
        return { role: "tool" as const, tool_call_id: tc.id, content: JSON.stringify({ matches: [] }) };
      }
    }),
  );
  messages.push(...toolResults);

  // Round 1
  const res1 = await callAI(messages, false);
  if (!res1.ok) {
    const text = await res1.text().catch(() => "");
    throw createError({ statusCode: 502, message: `AI estimation failed (${res1.status}): ${text.slice(0, 200)}` });
  }
  const json1 = (await res1.json()) as { choices?: Array<{ message?: { content?: string | null } }> };
  return parseItemsFromContent(json1.choices?.[0]?.message?.content ?? "");
});

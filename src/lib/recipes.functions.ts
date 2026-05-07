import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { classifyFit, estimateSwapImpact } from "./swap-heuristics";

const KEY = () => process.env.SPOONACULAR_API_KEY;
const BASE = "https://api.spoonacular.com";

function requireKey() {
  const k = KEY();
  if (!k) throw new Error("SPOONACULAR_API_KEY is not configured");
  return k;
}

export type SearchSwap = {
  from: string;
  to: string;
  delta: { kcal: number; protein_g: number; carbs_g: number; fat_g: number };
};

export type SearchResult = {
  id: number;
  title: string;
  image: string;
  servings?: number;
  // Source provenance — Spoonacular results are tunable on the recipe detail
  // page; Edamam results link out to the original publisher.
  source?: "spoonacular" | "edamam";
  externalUrl?: string;
  kcal?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  // Search-time swap heuristic output (only set when allowSubs && targets given).
  fitKind?: "fits" | "swaps" | "close";
  swapCount?: number;
  swaps?: SearchSwap[];
  adjustedKcal?: number;
  adjustedProtein_g?: number;
  adjustedCarbs_g?: number;
  adjustedFat_g?: number;
};

export const searchRecipes = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      query: z.string().trim().max(120).optional().default(""),
      diet: z.string().optional(),
      cuisine: z.string().optional(),
      maxReadyTime: z.number().int().positive().max(360).optional(),
      number: z.number().int().min(1).max(24).default(12),
      // Per-serving macro targets — any may be omitted (null/undefined = ignore).
      kcal: z.number().positive().nullable().optional(),
      protein_g: z.number().positive().nullable().optional(),
      carbs_g: z.number().positive().nullable().optional(),
      fat_g: z.number().positive().nullable().optional(),
      // When true, recipes only need to be in the ballpark (they can be tuned via swaps/scaling).
      // When false, recipes must already fit within a tight window (±15%).
      allowSubs: z.boolean().default(true),
    }).parse,
  )
  .handler(async ({ data }) => {
    const key = requireKey();
    // Fetch a wider candidate pool so we can rank by closeness rather than
    // just filter. Spoonacular caps `number` at 100.
    const anyTarget =
      data.kcal != null || data.protein_g != null || data.carbs_g != null || data.fat_g != null;
    const fetchCount = anyTarget ? Math.min(100, Math.max(data.number * 4, 40)) : data.number;
    const params = new URLSearchParams({
      apiKey: key,
      number: String(fetchCount),
      addRecipeNutrition: "true",
      fillIngredients: "true",
      instructionsRequired: "true",
      sort: "popularity",
    });
    if (data.query) params.set("query", data.query);
    if (data.diet) params.set("diet", data.diet);
    if (data.cuisine) params.set("cuisine", data.cuisine);
    if (data.maxReadyTime) params.set("maxReadyTime", String(data.maxReadyTime));

    // Loose pre-filter so we don't waste the candidate pool on wildly off recipes.
    // Tight mode (no subs) uses ±25%; loose mode (subs allowed) uses ±60% one-sided
    // depending on macro direction. Final ordering is by distance below.
    const tight = !data.allowSubs;
    const setRange = (
      minKey: string,
      maxKey: string,
      target: number | null | undefined,
      mode: "two-sided" | "cap" | "floor",
    ) => {
      if (target == null) return;
      if (tight) {
        params.set(minKey, String(Math.max(0, Math.round(target * 0.75))));
        params.set(maxKey, String(Math.round(target * 1.25)));
      } else if (mode === "cap") {
        params.set(maxKey, String(Math.round(target * 1.6)));
      } else if (mode === "floor") {
        params.set(minKey, String(Math.max(0, Math.round(target * 0.4))));
      } else {
        params.set(minKey, String(Math.max(0, Math.round(target * 0.4))));
        params.set(maxKey, String(Math.round(target * 1.6)));
      }
    };
    setRange("minCalories", "maxCalories", data.kcal, "cap");
    setRange("minProtein", "maxProtein", data.protein_g, "floor");
    setRange("minCarbs", "maxCarbs", data.carbs_g, "cap");
    setRange("minFat", "maxFat", data.fat_g, "cap");

    const spoonRes = await fetch(`${BASE}/recipes/complexSearch?${params}`);
    if (!spoonRes.ok) {
      const text = await spoonRes.text();
      console.error("Spoonacular search failed", spoonRes.status, text);
      return {
        results: [] as SearchResult[],
        error: `Spoonacular search failed (${spoonRes.status})`,
      };
    }
    const spoonJson = (await spoonRes.json()) as { results: any[] };

    // Spoonacular's complexSearch with addRecipeNutrition returns per-serving
    // nutrients. We capture servings + ingredient names so swap heuristics can
    // estimate adjusted macros at search time without extra API calls.
    type Candidate = SearchResult & { _ingredientNames: string[] };
    const round1 = (v: number | undefined) =>
      v == null ? undefined : Math.round(v * 10) / 10;

    let results: Candidate[] = (spoonJson.results ?? []).map((r) => {
      const nut = r.nutrition?.nutrients ?? [];
      const find = (n: string) => nut.find((x: any) => x.name === n)?.amount;
      const servings = Math.max(1, Number(r.servings) || 1);
      const ingredientNames: string[] = (r.extendedIngredients ?? r.nutrition?.ingredients ?? [])
        .map((i: any) => String(i.nameClean || i.name || "").trim())
        .filter(Boolean);
      return {
        id: r.id,
        source: "spoonacular",
        title: r.title,
        image: r.image,
        servings,
        kcal: round1(find("Calories")),
        protein_g: round1(find("Protein")),
        carbs_g: round1(find("Carbohydrates")),
        fat_g: round1(find("Fat")),
        _ingredientNames: ingredientNames,
      };
    });

    // Rank by per-serving distance to targets. When subs are allowed, also
    // try heuristic swaps and rank by the BETTER of original vs swap-adjusted
    // distance — interleaving fits-as-is and swap-adjusted recipes by score.
    if (anyTarget) {
      const targets = {
        kcal: data.kcal ?? null,
        protein_g: data.protein_g ?? null,
        carbs_g: data.carbs_g ?? null,
        fat_g: data.fat_g ?? null,
      };
      const targetCount = [data.kcal, data.protein_g, data.carbs_g, data.fat_g].filter(
        (v) => v != null,
      ).length;

      const enriched = results.map((r) => {
        const baseMacros = {
          kcal: r.kcal,
          protein_g: r.protein_g,
          carbs_g: r.carbs_g,
          fat_g: r.fat_g,
        };
        if (!data.allowSubs) {
          const { baselineDistance } = estimateSwapImpact(
            baseMacros,
            [],
            targets,
            r.servings ?? 1,
          );
          return {
            r,
            score: baselineDistance,
            fitKind: classifyFit(baselineDistance, baselineDistance, targetCount),
            swaps: [] as ReturnType<typeof estimateSwapImpact>["swaps"],
            adjusted: baseMacros,
          };
        }
        const est = estimateSwapImpact(
          baseMacros,
          r._ingredientNames,
          targets,
          r.servings ?? 1,
        );
        const useAdjusted = est.adjustedDistance < est.baselineDistance;
        return {
          r,
          score: Math.min(est.baselineDistance, est.adjustedDistance),
          fitKind: classifyFit(est.baselineDistance, est.adjustedDistance, targetCount),
          swaps: useAdjusted ? est.swaps : [],
          adjusted: useAdjusted ? est.adjusted : baseMacros,
        };
      });

      results = enriched
        .sort((a, b) => a.score - b.score)
        .slice(0, data.number)
        .map(({ r, fitKind, swaps, adjusted }) => ({
          ...r,
          fitKind,
          swapCount: swaps.length,
          swaps: swaps.length
            ? swaps.map((s) => ({ from: s.from, to: s.to, delta: s.delta }))
            : undefined,
          adjustedKcal: swaps.length ? adjusted.kcal : undefined,
          adjustedProtein_g: swaps.length ? adjusted.protein_g : undefined,
          adjustedCarbs_g: swaps.length ? adjusted.carbs_g : undefined,
          adjustedFat_g: swaps.length ? adjusted.fat_g : undefined,
        }));
    }

    // Strip the internal field before returning to the client.
    const cleanResults: SearchResult[] = results.map(({ _ingredientNames, ...rest }) => rest);
    return { results: cleanResults, error: null };
  });

export type RecipeDetail = {
  id: number;
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

export const getRecipe = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.number().int().positive() }).parse)
  .handler(async ({ data }): Promise<{ recipe: RecipeDetail | null; error: string | null }> => {
    const key = requireKey();
    const url = `${BASE}/recipes/${data.id}/information?apiKey=${key}&includeNutrition=true`;
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      console.error("Spoonacular getRecipe failed", res.status, text);
      return { recipe: null, error: `Recipe load failed (${res.status})` };
    }
    const r: any = await res.json();
    const nut = r.nutrition?.nutrients ?? [];
    const find = (n: string) => nut.find((x: any) => x.name === n)?.amount ?? 0;

    const ingredients = (r.extendedIngredients ?? []).map((ing: any) => {
      const ingNut = r.nutrition?.ingredients?.find((x: any) => x.id === ing.id)?.nutrients ?? [];
      const inFind = (n: string) => ingNut.find((x: any) => x.name === n)?.amount;
      return {
        id: ing.id,
        name: ing.nameClean || ing.name,
        original: ing.original,
        amount: ing.measures?.metric?.amount ?? ing.amount,
        unit: ing.measures?.metric?.unitShort ?? ing.unit ?? "",
        kcal: inFind("Calories"),
        protein_g: inFind("Protein"),
        carbs_g: inFind("Carbohydrates"),
        fat_g: inFind("Fat"),
      };
    });

    const instructions: string[] =
      r.analyzedInstructions?.[0]?.steps?.map((s: any) => s.step) ?? [];

    return {
      recipe: {
        id: r.id,
        title: r.title,
        image: r.image,
        servings: r.servings,
        readyInMinutes: r.readyInMinutes,
        sourceUrl: r.sourceUrl,
        summary: r.summary,
        instructions,
        ingredients,
        macros: {
          kcal: Math.round(find("Calories")),
          protein_g: Math.round(find("Protein") * 10) / 10,
          carbs_g: Math.round(find("Carbohydrates") * 10) / 10,
          fat_g: Math.round(find("Fat") * 10) / 10,
        },
      },
      error: null,
    };
  });

// AI substitutions, then re-priced via Spoonacular ingredient search
export const suggestSwaps = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      title: z.string().min(1).max(200),
      ingredients: z
        .array(z.object({ name: z.string(), amount: z.number(), unit: z.string() }))
        .min(1)
        .max(40),
      current: z.object({
        kcal: z.number(),
        protein_g: z.number(),
        carbs_g: z.number(),
        fat_g: z.number(),
      }),
      target: z.object({
        kcal: z.number().nullable().optional(),
        protein_g: z.number().nullable().optional(),
        carbs_g: z.number().nullable().optional(),
        fat_g: z.number().nullable().optional(),
      }),
      servings: z.number().positive(),
    }).parse,
  )
  .handler(async ({ data }) => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    if (!lovableKey) throw new Error("LOVABLE_API_KEY is not configured");
    const spoonKey = requireKey();

    const perServing = (m: typeof data.current) => ({
      kcal: m.kcal / data.servings,
      protein_g: m.protein_g / data.servings,
      carbs_g: m.carbs_g / data.servings,
      fat_g: m.fat_g / data.servings,
    });
    const cur = perServing(data.current);
    const tgt = data.target;
    const tgtLine = [
      tgt.kcal != null ? `${tgt.kcal} kcal` : null,
      tgt.protein_g != null ? `${tgt.protein_g}g protein` : null,
      tgt.carbs_g != null ? `${tgt.carbs_g}g carbs` : null,
      tgt.fat_g != null ? `${tgt.fat_g}g fat` : null,
    ].filter(Boolean).join(", ") || "no specific targets — just generally healthier";

    const prompt = `Recipe: ${data.title}
Ingredients (per recipe):
${data.ingredients.map((i) => `- ${i.amount} ${i.unit} ${i.name}`).join("\n")}

Current macros per serving: ${Math.round(cur.kcal)} kcal, ${cur.protein_g.toFixed(1)}g protein, ${cur.carbs_g.toFixed(1)}g carbs, ${cur.fat_g.toFixed(1)}g fat.
Target macros per serving: ${tgtLine}.

Suggest 3-5 ingredient substitutions that move this recipe toward the target. Be specific (e.g. "sour cream" -> "non-fat Greek yogurt"). For each: estimate per-recipe macro delta (negative = reduces).`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a nutrition-aware recipe coach. Always call the provided tool." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_swaps",
              description: "Suggest ingredient substitutions to move the recipe toward target macros.",
              parameters: {
                type: "object",
                properties: {
                  swaps: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        from: { type: "string", description: "Original ingredient name (must match one above)." },
                        to: { type: "string", description: "Substitute ingredient name." },
                        reason: { type: "string" },
                        delta_kcal: { type: "number" },
                        delta_protein_g: { type: "number" },
                        delta_carbs_g: { type: "number" },
                        delta_fat_g: { type: "number" },
                      },
                      required: ["from", "to", "reason", "delta_kcal", "delta_protein_g", "delta_carbs_g", "delta_fat_g"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["swaps"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_swaps" } },
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) return { swaps: [], error: "AI is rate-limited. Please wait a moment." };
      if (aiRes.status === 402) return { swaps: [], error: "AI credits exhausted. Please add credits in workspace settings." };
      const text = await aiRes.text();
      console.error("AI gateway error", aiRes.status, text);
      return { swaps: [], error: "AI suggestion failed." };
    }

    const aiJson: any = await aiRes.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    let aiSwaps: any[] = [];
    try {
      aiSwaps = JSON.parse(toolCall?.function?.arguments ?? "{}").swaps ?? [];
    } catch {
      aiSwaps = [];
    }

    const repriced = await Promise.all(
      aiSwaps.slice(0, 5).map(async (s) => {
        const aiDelta = {
          kcal: Math.round(s.delta_kcal),
          protein_g: Math.round(s.delta_protein_g * 10) / 10,
          carbs_g: Math.round(s.delta_carbs_g * 10) / 10,
          fat_g: Math.round(s.delta_fat_g * 10) / 10,
        };
        try {
          const orig = data.ingredients.find((i) =>
            i.name.toLowerCase().includes(String(s.from).toLowerCase()) ||
            String(s.from).toLowerCase().includes(i.name.toLowerCase()),
          );
          if (!orig) return { ...s, ...aiDelta, verified: false };

          const [origInfo, subInfo] = await Promise.all([
            fetchIngredientPer100g(orig.name, spoonKey),
            fetchIngredientPer100g(s.to, spoonKey),
          ]);
          if (!origInfo || !subInfo) return { ...s, ...aiDelta, verified: false };

          const grams = orig.unit === "g" || orig.unit === "gram" ? orig.amount : 100;
          const factor = grams / 100;
          const delta = {
            kcal: Math.round((subInfo.kcal - origInfo.kcal) * factor),
            protein_g: Math.round((subInfo.protein_g - origInfo.protein_g) * factor * 10) / 10,
            carbs_g: Math.round((subInfo.carbs_g - origInfo.carbs_g) * factor * 10) / 10,
            fat_g: Math.round((subInfo.fat_g - origInfo.fat_g) * factor * 10) / 10,
          };
          return { ...s, ...delta, verified: true };
        } catch (e) {
          console.error("re-price failed", e);
          return { ...s, ...aiDelta, verified: false };
        }
      }),
    );

    return {
      swaps: repriced.map((r) => ({
        from: r.from,
        to: r.to,
        reason: r.reason,
        verified: r.verified ?? false,
        delta: { kcal: r.kcal, protein_g: r.protein_g, carbs_g: r.carbs_g, fat_g: r.fat_g },
      })),
      error: null,
    };
  });

async function fetchIngredientPer100g(
  name: string,
  apiKey: string,
): Promise<{ kcal: number; protein_g: number; carbs_g: number; fat_g: number } | null> {
  const search = await fetch(
    `${BASE}/food/ingredients/search?apiKey=${apiKey}&query=${encodeURIComponent(name)}&number=1`,
  );
  if (!search.ok) return null;
  const sJson: any = await search.json();
  const id = sJson.results?.[0]?.id;
  if (!id) return null;
  const info = await fetch(
    `${BASE}/food/ingredients/${id}/information?apiKey=${apiKey}&amount=100&unit=grams`,
  );
  if (!info.ok) return null;
  const iJson: any = await info.json();
  const nut = iJson.nutrition?.nutrients ?? [];
  const find = (n: string) => nut.find((x: any) => x.name === n)?.amount ?? 0;
  return {
    kcal: find("Calories"),
    protein_g: find("Protein"),
    carbs_g: find("Carbohydrates"),
    fat_g: find("Fat"),
  };
}

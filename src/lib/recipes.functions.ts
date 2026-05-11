import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { classifyFit, estimateSwapImpact } from "./swap-heuristics";
import { searchDbRecipes } from "./recipes-db.server";

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
  // Source provenance — "spoonacular" is live API; "kaggle" is our imported
  // dataset (Food.com); both render in the same in-app detail page.
  source?: "spoonacular" | "kaggle";
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

type SpoonacularNutrient = {
  name?: string;
  amount?: number;
};

type SpoonacularIngredient = {
  id?: number;
  name?: string;
  nameClean?: string;
  original?: string;
  amount?: number;
  unit?: string;
  measures?: {
    metric?: {
      amount?: number;
      unitShort?: string;
    };
  };
  nutrients?: SpoonacularNutrient[];
};

type SpoonacularSearchRecipe = {
  id: number;
  title: string;
  image?: string;
  servings?: number;
  extendedIngredients?: SpoonacularIngredient[];
  nutrition?: {
    nutrients?: SpoonacularNutrient[];
    ingredients?: SpoonacularIngredient[];
  };
};

type SpoonacularRecipeDetail = SpoonacularSearchRecipe & {
  sourceUrl?: string;
  readyInMinutes?: number;
  summary?: string;
  analyzedInstructions?: Array<{ steps?: Array<{ step?: string }> }>;
};

type AiSwap = {
  from: string;
  to: string;
  reason: string;
  delta_kcal: number;
  delta_protein_g: number;
  delta_carbs_g: number;
  delta_fat_g: number;
};

type RepricedSwap = AiSwap & {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  verified: boolean;
};

type ChatCompletionsResponse = {
  choices?: Array<{
    message?: {
      tool_calls?: Array<{
        function?: {
          arguments?: string;
        };
      }>;
    };
  }>;
};

type KaggleDetailPayload = {
  title?: string;
  description?: string | null;
  image_url?: string | null;
  total_minutes?: number | null;
  servings?: number | null;
  ingredients?: unknown;
  instructions?: unknown;
  macros?: {
    kcal?: number | null;
    protein_g?: number | null;
    carbs_g?: number | null;
    fat_g?: number | null;
  };
};

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((x) => String(x)).filter(Boolean) : [];
}

function toOptionalNumber(value: unknown): number | undefined {
  if (value == null) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

async function decodeRecipeDetailBlob(blob: Blob, encoding?: string | null): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const isGzip = encoding === "gzip" || (bytes[0] === 0x1f && bytes[1] === 0x8b);

  if (!isGzip) return new TextDecoder().decode(bytes);

  if (typeof DecompressionStream !== "undefined") {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    return new Response(stream).text();
  }

  const { gunzipSync } = await import("node:zlib");
  return gunzipSync(bytes).toString("utf-8");
}

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
    const key = KEY(); // Spoonacular is optional once DB has data
    const anyTarget =
      data.kcal != null || data.protein_g != null || data.carbs_g != null || data.fat_g != null;
    const fetchCount = anyTarget ? Math.min(100, Math.max(data.number * 4, 40)) : data.number;
    const tight = !data.allowSubs;

    type Candidate = SearchResult & { _ingredientNames: string[] };
    const round1 = (v: number | undefined) => (v == null ? undefined : Math.round(v * 10) / 10);

    // ---- Spoonacular fetch (only if key present) -------------------------
    const spoonPromise: Promise<{ candidates: Candidate[]; error: string | null }> = key
      ? (async () => {
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

          const res = await fetch(`${BASE}/recipes/complexSearch?${params}`);
          if (!res.ok) {
            const text = await res.text();
            console.error("Spoonacular search failed", res.status, text);
            return {
              candidates: [],
              error: `Spoonacular search failed (${res.status})`,
            };
          }
          const json = (await res.json()) as { results?: SpoonacularSearchRecipe[] };
          const candidates: Candidate[] = (json.results ?? []).map((r) => {
            const nut = r.nutrition?.nutrients ?? [];
            const find = (n: string) => nut.find((x) => x.name === n)?.amount;
            const servings = Math.max(1, Number(r.servings) || 1);
            const ingredientNames: string[] = (
              r.extendedIngredients ??
              r.nutrition?.ingredients ??
              []
            )
              .map((i) => String(i.nameClean || i.name || "").trim())
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
          return { candidates, error: null };
        })()
      : Promise.resolve({ candidates: [], error: null });

    // ---- DB (Kaggle/Food.com) fetch -------------------------------------
    const dbPromise: Promise<Candidate[]> = searchDbRecipes({
      query: data.query,
      kcal: data.kcal ?? null,
      protein_g: data.protein_g ?? null,
      carbs_g: data.carbs_g ?? null,
      fat_g: data.fat_g ?? null,
      maxReadyTime: data.maxReadyTime,
      tight,
      fetchCount,
    }).then((rows) =>
      rows.map((r) => ({
        id: r.id,
        source: "kaggle" as const,
        title: r.title,
        image: r.image,
        servings: r.servings,
        kcal: round1(r.kcal),
        protein_g: round1(r.protein_g),
        carbs_g: round1(r.carbs_g),
        fat_g: round1(r.fat_g),
        _ingredientNames: r.ingredientNames,
      })),
    );

    const [spoon, dbCands] = await Promise.all([spoonPromise, dbPromise]);

    // Dedupe by lowercased title across sources (Spoonacular wins ties).
    const seen = new Set<string>();
    let results: Candidate[] = [];
    for (const c of [...spoon.candidates, ...dbCands]) {
      const k = c.title.toLowerCase().trim();
      if (seen.has(k)) continue;
      seen.add(k);
      results.push(c);
    }

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
          const { baselineDistance } = estimateSwapImpact(baseMacros, [], targets, r.servings ?? 1);
          return {
            r,
            score: baselineDistance,
            fitKind: classifyFit(baselineDistance, baselineDistance, targetCount),
            swaps: [] as ReturnType<typeof estimateSwapImpact>["swaps"],
            adjusted: baseMacros,
          };
        }
        const est = estimateSwapImpact(baseMacros, r._ingredientNames, targets, r.servings ?? 1);
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
    } else {
      // No macro targets — just trim to requested count, interleaving sources.
      const interleaved: Candidate[] = [];
      const spoonOnly = results.filter((r) => r.source === "spoonacular");
      const dbOnly = results.filter((r) => r.source === "kaggle");
      const max = Math.max(spoonOnly.length, dbOnly.length);
      for (let i = 0; i < max && interleaved.length < data.number; i++) {
        if (spoonOnly[i]) interleaved.push(spoonOnly[i]);
        if (dbOnly[i] && interleaved.length < data.number) interleaved.push(dbOnly[i]);
      }
      results = interleaved;
    }

    // Strip the internal field before returning to the client.
    const cleanResults: SearchResult[] = results.map(({ _ingredientNames, ...rest }) => rest);
    const error = cleanResults.length === 0 ? spoon.error : null;
    return { results: cleanResults, error };
  });

export type RecipeDetail = {
  id: number;
  source: "spoonacular" | "kaggle";
  title: string;
  image: string;
  servings: number;
  readyInMinutes: number;
  sourceUrl?: string;
  summary?: string;
  instructions: string[];
  // For Spoonacular each ingredient is parsed (amount/unit/macros).
  // For Kaggle each ingredient is just a string from the dataset; amount/unit
  // may be embedded in `original` and per-ingredient macros are unavailable.
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
  .inputValidator(
    z.object({
      id: z.number().int().positive(),
      source: z.enum(["spoonacular", "kaggle"]).default("spoonacular"),
    }).parse,
  )
  .handler(async ({ data }): Promise<{ recipe: RecipeDetail | null; error: string | null }> => {
    if (data.source === "kaggle") {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: row, error } = await supabaseAdmin
        .from("recipes")
        .select(
          "id, source_id, title, description, image_url, servings, total_minutes, kcal, protein_g, carbs_g, fat_g, ingredients, instructions, detail_bucket_id, detail_object_path",
        )
        .eq("id", data.id)
        .maybeSingle();
      if (error || !row) {
        return { recipe: null, error: error?.message ?? "Recipe not found" };
      }

      let detail: KaggleDetailPayload | null = null;
      const { data: detailObject, error: detailObjectError } = await supabaseAdmin
        .from("recipe_detail_objects")
        .select("bucket_id, object_path, content_encoding")
        .eq("recipe_id", data.id)
        .maybeSingle();

      if (detailObjectError) {
        console.error("Kaggle recipe detail metadata lookup failed", detailObjectError);
      }

      const detailBucket = detailObject?.bucket_id ?? row.detail_bucket_id;
      const detailPath = detailObject?.object_path ?? row.detail_object_path;
      const detailEncoding = detailObject?.content_encoding ?? "gzip";

      if (detailBucket && detailPath) {
        const { data: blob, error: downloadError } = await supabaseAdmin.storage
          .from(detailBucket)
          .download(detailPath);
        if (downloadError) {
          console.error("Kaggle recipe detail download failed", downloadError);
        } else if (blob) {
          try {
            detail = JSON.parse(
              await decodeRecipeDetailBlob(blob, detailEncoding),
            ) as KaggleDetailPayload;
          } catch (e) {
            console.error("Kaggle recipe detail parse failed", e);
          }
        }
      }

      const detailMacros = detail?.macros ?? {};
      const ingArr = asStringArray(detail?.ingredients).length
        ? asStringArray(detail?.ingredients)
        : asStringArray(row.ingredients);
      const stepArr = asStringArray(detail?.instructions).length
        ? asStringArray(detail?.instructions)
        : asStringArray(row.instructions);
      const servings = Math.max(1, Number(detail?.servings ?? row.servings ?? 1));
      const kcal = toOptionalNumber(detailMacros.kcal) ?? Number(row.kcal ?? 0);
      const proteinG = toOptionalNumber(detailMacros.protein_g) ?? Number(row.protein_g ?? 0);
      const carbsG = toOptionalNumber(detailMacros.carbs_g) ?? Number(row.carbs_g ?? 0);
      const fatG = toOptionalNumber(detailMacros.fat_g) ?? Number(row.fat_g ?? 0);

      // The dataset stores ingredients as plain strings ("2 cups flour");
      // we have no parsed amounts/units, so we represent each as amount=1
      // unit="" with a per-ingredient macro fraction = total / count. This
      // lets the existing scaling/swap UI keep working — totals stay correct.
      const count = Math.max(1, ingArr.length);
      const ingredients = ingArr.map((s, i) => ({
        id: i,
        name: s,
        original: s,
        amount: 1,
        unit: "",
        kcal: kcal ? (kcal * servings) / count : undefined,
        protein_g: proteinG ? (proteinG * servings) / count : undefined,
        carbs_g: carbsG ? (carbsG * servings) / count : undefined,
        fat_g: fatG ? (fatG * servings) / count : undefined,
      }));
      return {
        recipe: {
          id: Number(row.id),
          source: "kaggle",
          title: detail?.title ?? row.title,
          image: detail?.image_url ?? row.image_url ?? "",
          servings,
          readyInMinutes: detail?.total_minutes ?? row.total_minutes ?? 0,
          summary: detail?.description ?? row.description ?? undefined,
          instructions: stepArr,
          ingredients,
          macros: {
            kcal: Math.round(kcal * servings),
            protein_g: Math.round(proteinG * servings * 10) / 10,
            carbs_g: Math.round(carbsG * servings * 10) / 10,
            fat_g: Math.round(fatG * servings * 10) / 10,
          },
        },
        error: null,
      };
    }

    const key = requireKey();
    const url = `${BASE}/recipes/${data.id}/information?apiKey=${key}&includeNutrition=true`;
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      console.error("Spoonacular getRecipe failed", res.status, text);
      return { recipe: null, error: `Recipe load failed (${res.status})` };
    }
    const r = (await res.json()) as SpoonacularRecipeDetail;
    const nut = r.nutrition?.nutrients ?? [];
    const find = (n: string) => nut.find((x) => x.name === n)?.amount ?? 0;

    const ingredients = (r.extendedIngredients ?? []).map((ing) => {
      const ingNut = r.nutrition?.ingredients?.find((x) => x.id === ing.id)?.nutrients ?? [];
      const inFind = (n: string) => ingNut.find((x) => x.name === n)?.amount;
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
      r.analyzedInstructions?.[0]?.steps?.map((s) => s.step ?? "") ?? [];

    return {
      recipe: {
        id: r.id,
        source: "spoonacular",
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
    const aiKey = process.env.AI_API_KEY;
    const aiBaseUrl = process.env.AI_BASE_URL ?? "https://api.openai.com/v1";
    const aiModel = process.env.AI_MODEL ?? "gpt-4.1-mini";
    if (!aiKey) throw new Error("AI_API_KEY is not configured");
    const spoonKey = requireKey();

    const perServing = (m: typeof data.current) => ({
      kcal: m.kcal / data.servings,
      protein_g: m.protein_g / data.servings,
      carbs_g: m.carbs_g / data.servings,
      fat_g: m.fat_g / data.servings,
    });
    const cur = perServing(data.current);
    const tgt = data.target;
    const tgtLine =
      [
        tgt.kcal != null ? `${tgt.kcal} kcal` : null,
        tgt.protein_g != null ? `${tgt.protein_g}g protein` : null,
        tgt.carbs_g != null ? `${tgt.carbs_g}g carbs` : null,
        tgt.fat_g != null ? `${tgt.fat_g}g fat` : null,
      ]
        .filter(Boolean)
        .join(", ") || "no specific targets — just generally healthier";

    const prompt = `Recipe: ${data.title}
Ingredients (per recipe):
${data.ingredients.map((i) => `- ${i.amount} ${i.unit} ${i.name}`).join("\n")}

Current macros per serving: ${Math.round(cur.kcal)} kcal, ${cur.protein_g.toFixed(1)}g protein, ${cur.carbs_g.toFixed(1)}g carbs, ${cur.fat_g.toFixed(1)}g fat.
Target macros per serving: ${tgtLine}.

Suggest 3-5 ingredient substitutions that move this recipe toward the target. Be specific (e.g. "sour cream" -> "non-fat Greek yogurt"). For each: estimate per-recipe macro delta (negative = reduces).`;

    const aiRes = await fetch(`${aiBaseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${aiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          {
            role: "system",
            content: "You are a nutrition-aware recipe coach. Always call the provided tool.",
          },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_swaps",
              description:
                "Suggest ingredient substitutions to move the recipe toward target macros.",
              parameters: {
                type: "object",
                properties: {
                  swaps: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        from: {
                          type: "string",
                          description: "Original ingredient name (must match one above).",
                        },
                        to: { type: "string", description: "Substitute ingredient name." },
                        reason: { type: "string" },
                        delta_kcal: { type: "number" },
                        delta_protein_g: { type: "number" },
                        delta_carbs_g: { type: "number" },
                        delta_fat_g: { type: "number" },
                      },
                      required: [
                        "from",
                        "to",
                        "reason",
                        "delta_kcal",
                        "delta_protein_g",
                        "delta_carbs_g",
                        "delta_fat_g",
                      ],
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
      if (aiRes.status === 429)
        return { swaps: [], error: "AI is rate-limited. Please wait a moment." };
      if (aiRes.status === 402) return { swaps: [], error: "AI credits exhausted." };
      const text = await aiRes.text();
      console.error("AI provider error", aiRes.status, text);
      return { swaps: [], error: "AI suggestion failed." };
    }

    const aiJson = (await aiRes.json()) as ChatCompletionsResponse;
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    let aiSwaps: AiSwap[] = [];
    try {
      aiSwaps = ((JSON.parse(toolCall?.function?.arguments ?? "{}") as { swaps?: AiSwap[] })
        .swaps ?? []) as AiSwap[];
    } catch {
      aiSwaps = [];
    }

    const repriced = await Promise.all(
      aiSwaps.slice(0, 5).map(async (s): Promise<RepricedSwap> => {
        const aiDelta = {
          kcal: Math.round(s.delta_kcal),
          protein_g: Math.round(s.delta_protein_g * 10) / 10,
          carbs_g: Math.round(s.delta_carbs_g * 10) / 10,
          fat_g: Math.round(s.delta_fat_g * 10) / 10,
        };
        try {
          const orig = data.ingredients.find(
            (i) =>
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
  const sJson = (await search.json()) as { results?: Array<{ id?: number }> };
  const id = sJson.results?.[0]?.id;
  if (!id) return null;
  const info = await fetch(
    `${BASE}/food/ingredients/${id}/information?apiKey=${apiKey}&amount=100&unit=grams`,
  );
  if (!info.ok) return null;
  const iJson = (await info.json()) as { nutrition?: { nutrients?: SpoonacularNutrient[] } };
  const nut = iJson.nutrition?.nutrients ?? [];
  const find = (n: string) => nut.find((x) => x.name === n)?.amount ?? 0;
  return {
    kcal: find("Calories"),
    protein_g: find("Protein"),
    carbs_g: find("Carbohydrates"),
    fat_g: find("Fat"),
  };
}

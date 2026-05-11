import { c as createServerRpc } from "./createServerRpc-wV0Vk4NU.mjs";
import { c as createClient } from "../_libs/supabase__supabase-js.mjs";
import { c as createServerFn } from "./index.mjs";
import "../_libs/seroval.mjs";
import "../_libs/react.mjs";
import { o as objectType, b as booleanType, n as numberType, s as stringType, e as enumType, a as arrayType } from "../_libs/zod.mjs";
import "../_libs/supabase__postgrest-js.mjs";
import "../_libs/supabase__realtime-js.mjs";
import "../_libs/supabase__phoenix.mjs";
import "../_libs/supabase__storage-js.mjs";
import "../_libs/iceberg-js.mjs";
import "../_libs/supabase__auth-js.mjs";
import "tslib";
import "../_libs/supabase__functions-js.mjs";
import "node:async_hooks";
import "../_libs/h3-v2.mjs";
import "../_libs/rou3.mjs";
import "../_libs/srvx.mjs";
import "node:stream";
import "../_libs/tanstack__router-core.mjs";
import "../_libs/tanstack__history.mjs";
import "../_libs/cookie-es.mjs";
import "../_libs/seroval-plugins.mjs";
import "node:stream/web";
import "../_libs/tanstack__react-router.mjs";
import "../_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "../_libs/isbot.mjs";
const COMMON_SWAPS = [
  {
    match: ["sour cream"],
    to: "non-fat Greek yogurt",
    delta: { kcal: -120, protein_g: 12, carbs_g: 2, fat_g: -16 }
  },
  {
    match: ["heavy cream", "double cream"],
    to: "evaporated skim milk",
    delta: { kcal: -200, protein_g: 6, carbs_g: 4, fat_g: -22 }
  },
  {
    match: ["mayonnaise", "mayo"],
    to: "Greek yogurt",
    delta: { kcal: -180, protein_g: 8, carbs_g: 2, fat_g: -22 }
  },
  {
    match: ["white rice"],
    to: "cauliflower rice",
    delta: { kcal: -180, protein_g: -2, carbs_g: -38, fat_g: 0 }
  },
  {
    match: ["sugar", "granulated sugar", "white sugar"],
    to: "stevia / erythritol blend",
    delta: { kcal: -120, protein_g: 0, carbs_g: -32, fat_g: 0 }
  },
  {
    match: ["butter"],
    to: "olive oil (reduced)",
    delta: { kcal: -60, protein_g: 0, carbs_g: 0, fat_g: -6 }
  },
  {
    match: ["all-purpose flour", "white flour"],
    to: "almond flour",
    delta: { kcal: -40, protein_g: 6, carbs_g: -22, fat_g: 14 }
  },
  {
    match: ["pasta", "spaghetti", "fettuccine"],
    to: "zucchini noodles",
    delta: { kcal: -200, protein_g: -6, carbs_g: -42, fat_g: 0 }
  },
  {
    match: ["bread crumb", "breadcrumb", "panko"],
    to: "almond meal",
    delta: { kcal: -30, protein_g: 4, carbs_g: -14, fat_g: 8 }
  },
  {
    match: ["ground beef", "minced beef"],
    to: "ground turkey breast",
    delta: { kcal: -120, protein_g: 4, carbs_g: 0, fat_g: -14 }
  }
];
const MACRO_KEYS = ["kcal", "protein_g", "carbs_g", "fat_g"];
function distance(macros, targets) {
  let sum = 0;
  for (const k of MACRO_KEYS) {
    const t = targets[k];
    if (t == null) continue;
    const a = macros[k];
    if (a == null) {
      sum += 1;
      continue;
    }
    sum += Math.abs(a - t) / Math.max(1, t);
  }
  return sum;
}
function estimateSwapImpact(perServingMacros, ingredientNames, targets, servings) {
  const lower = ingredientNames.map((n) => n.toLowerCase());
  const baselineDistance = distance(perServingMacros, targets);
  let current = { ...perServingMacros };
  let currentDistance = baselineDistance;
  const used = [];
  const usedKeys = /* @__PURE__ */ new Set();
  for (const swap of COMMON_SWAPS) {
    const key = swap.to;
    if (usedKeys.has(key)) continue;
    let matchedIdx = -1;
    for (const m of swap.match) {
      const idx = lower.findIndex((ing) => ing.includes(m));
      if (idx >= 0) {
        matchedIdx = idx;
        break;
      }
    }
    if (matchedIdx < 0) continue;
    const perServDelta = {
      kcal: swap.delta.kcal / Math.max(1, servings),
      protein_g: swap.delta.protein_g / Math.max(1, servings),
      carbs_g: swap.delta.carbs_g / Math.max(1, servings),
      fat_g: swap.delta.fat_g / Math.max(1, servings)
    };
    const trial = {
      kcal: current.kcal != null ? Math.max(0, current.kcal + perServDelta.kcal) : current.kcal,
      protein_g: current.protein_g != null ? Math.max(0, current.protein_g + perServDelta.protein_g) : current.protein_g,
      carbs_g: current.carbs_g != null ? Math.max(0, current.carbs_g + perServDelta.carbs_g) : current.carbs_g,
      fat_g: current.fat_g != null ? Math.max(0, current.fat_g + perServDelta.fat_g) : current.fat_g
    };
    const trialDistance = distance(trial, targets);
    if (trialDistance + 1e-6 < currentDistance) {
      current = trial;
      currentDistance = trialDistance;
      used.push({
        from: ingredientNames[matchedIdx],
        to: swap.to,
        delta: {
          kcal: Math.round(perServDelta.kcal),
          protein_g: Math.round(perServDelta.protein_g * 10) / 10,
          carbs_g: Math.round(perServDelta.carbs_g * 10) / 10,
          fat_g: Math.round(perServDelta.fat_g * 10) / 10
        }
      });
      usedKeys.add(key);
    }
  }
  return {
    adjusted: current,
    swaps: used,
    baselineDistance,
    adjustedDistance: currentDistance
  };
}
function classifyFit(baselineDistance, adjustedDistance, targetCount) {
  if (targetCount === 0) return "fits";
  const baseAvg = baselineDistance / targetCount;
  const adjAvg = adjustedDistance / targetCount;
  if (baseAvg <= 0.15) return "fits";
  if (adjAvg <= 0.2 && adjustedDistance < baselineDistance) return "swaps";
  return "close";
}
function createSupabaseAdminClient() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Missing Supabase server environment variables. Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set."
    );
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      storage: void 0,
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
let _supabaseAdmin;
const supabaseAdmin = new Proxy({}, {
  get(_, prop, receiver) {
    if (!_supabaseAdmin) _supabaseAdmin = createSupabaseAdminClient();
    return Reflect.get(_supabaseAdmin, prop, receiver);
  }
});
const client_server = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  supabaseAdmin
}, Symbol.toStringTag, { value: "Module" }));
async function searchDbRecipes(params) {
  let q = supabaseAdmin.from("recipes").select(
    "id, source, source_id, title, image_url, servings, total_minutes, kcal, protein_g, carbs_g, fat_g, ingredients"
  ).not("kcal", "is", null).limit(params.fetchCount);
  if (params.query && params.query.trim()) {
    q = q.ilike("title", `%${params.query.trim()}%`);
  }
  if (params.maxReadyTime) {
    q = q.lte("total_minutes", params.maxReadyTime);
  }
  const applyRange = (col, target, mode) => {
    if (target == null) return;
    if (params.tight) {
      q = q.gte(col, Math.max(0, target * 0.75)).lte(col, target * 1.25);
    } else if (mode === "cap") {
      q = q.lte(col, target * 1.6);
    } else if (mode === "floor") {
      q = q.gte(col, Math.max(0, target * 0.4));
    } else {
      q = q.gte(col, Math.max(0, target * 0.4)).lte(col, target * 1.6);
    }
  };
  applyRange("kcal", params.kcal, "cap");
  applyRange("protein_g", params.protein_g, "floor");
  applyRange("carbs_g", params.carbs_g, "cap");
  applyRange("fat_g", params.fat_g, "cap");
  const { data, error } = await q;
  if (error) {
    console.error("searchDbRecipes failed", error);
    return [];
  }
  return (data ?? []).map((r) => {
    const ingNames = Array.isArray(r.ingredients) ? r.ingredients.map((x) => typeof x === "string" ? x : "").filter(Boolean) : [];
    return {
      id: Number(r.id),
      source: "kaggle",
      source_id: r.source_id,
      title: r.title,
      image: r.image_url ?? "",
      // The Food.com dataset's `nutrition` is per serving; servings count is
      // not in the source, so we treat each row as 1 serving by default.
      servings: r.servings != null ? Number(r.servings) : 1,
      kcal: r.kcal != null ? Number(r.kcal) : void 0,
      protein_g: r.protein_g != null ? Number(r.protein_g) : void 0,
      carbs_g: r.carbs_g != null ? Number(r.carbs_g) : void 0,
      fat_g: r.fat_g != null ? Number(r.fat_g) : void 0,
      ingredientNames: ingNames,
      totalMinutes: r.total_minutes ?? void 0
    };
  });
}
const KEY = () => process.env.SPOONACULAR_API_KEY;
const BASE = "https://api.spoonacular.com";
function requireKey() {
  const k = KEY();
  if (!k) throw new Error("SPOONACULAR_API_KEY is not configured");
  return k;
}
function asStringArray(value) {
  return Array.isArray(value) ? value.map((x) => String(x)).filter(Boolean) : [];
}
function toOptionalNumber(value) {
  if (value == null) return void 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : void 0;
}
async function decodeRecipeDetailBlob(blob, encoding) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const isGzip = encoding === "gzip" || bytes[0] === 31 && bytes[1] === 139;
  if (!isGzip) return new TextDecoder().decode(bytes);
  if (typeof DecompressionStream !== "undefined") {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    return new Response(stream).text();
  }
  const {
    gunzipSync
  } = await import("node:zlib");
  return gunzipSync(bytes).toString("utf-8");
}
const searchRecipes_createServerFn_handler = createServerRpc({
  id: "f0df7c6b91b1822e23adc964756d450bf82859ef741634cb9943e5362666af8d",
  name: "searchRecipes",
  filename: "src/lib/recipes.functions.ts"
}, (opts) => searchRecipes.__executeServer(opts));
const searchRecipes = createServerFn({
  method: "POST"
}).inputValidator(objectType({
  query: stringType().trim().max(120).optional().default(""),
  diet: stringType().optional(),
  cuisine: stringType().optional(),
  maxReadyTime: numberType().int().positive().max(360).optional(),
  number: numberType().int().min(1).max(24).default(12),
  // Per-serving macro targets — any may be omitted (null/undefined = ignore).
  kcal: numberType().positive().nullable().optional(),
  protein_g: numberType().positive().nullable().optional(),
  carbs_g: numberType().positive().nullable().optional(),
  fat_g: numberType().positive().nullable().optional(),
  // When true, recipes only need to be in the ballpark (they can be tuned via swaps/scaling).
  // When false, recipes must already fit within a tight window (±15%).
  allowSubs: booleanType().default(true)
}).parse).handler(searchRecipes_createServerFn_handler, async ({
  data
}) => {
  const key = KEY();
  const anyTarget = data.kcal != null || data.protein_g != null || data.carbs_g != null || data.fat_g != null;
  const fetchCount = anyTarget ? Math.min(100, Math.max(data.number * 4, 40)) : data.number;
  const tight = !data.allowSubs;
  const round1 = (v) => v == null ? void 0 : Math.round(v * 10) / 10;
  const spoonPromise = key ? (async () => {
    const params = new URLSearchParams({
      apiKey: key,
      number: String(fetchCount),
      addRecipeNutrition: "true",
      fillIngredients: "true",
      instructionsRequired: "true",
      sort: "popularity"
    });
    if (data.query) params.set("query", data.query);
    if (data.diet) params.set("diet", data.diet);
    if (data.cuisine) params.set("cuisine", data.cuisine);
    if (data.maxReadyTime) params.set("maxReadyTime", String(data.maxReadyTime));
    const setRange = (minKey, maxKey, target, mode) => {
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
        error: `Spoonacular search failed (${res.status})`
      };
    }
    const json = await res.json();
    const candidates = (json.results ?? []).map((r) => {
      const nut = r.nutrition?.nutrients ?? [];
      const find = (n) => nut.find((x) => x.name === n)?.amount;
      const servings = Math.max(1, Number(r.servings) || 1);
      const ingredientNames = (r.extendedIngredients ?? r.nutrition?.ingredients ?? []).map((i) => String(i.nameClean || i.name || "").trim()).filter(Boolean);
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
        _ingredientNames: ingredientNames
      };
    });
    return {
      candidates,
      error: null
    };
  })() : Promise.resolve({
    candidates: [],
    error: null
  });
  const dbPromise = searchDbRecipes({
    query: data.query,
    kcal: data.kcal ?? null,
    protein_g: data.protein_g ?? null,
    carbs_g: data.carbs_g ?? null,
    fat_g: data.fat_g ?? null,
    maxReadyTime: data.maxReadyTime,
    tight,
    fetchCount
  }).then((rows) => rows.map((r) => ({
    id: r.id,
    source: "kaggle",
    title: r.title,
    image: r.image,
    servings: r.servings,
    kcal: round1(r.kcal),
    protein_g: round1(r.protein_g),
    carbs_g: round1(r.carbs_g),
    fat_g: round1(r.fat_g),
    _ingredientNames: r.ingredientNames
  })));
  const [spoon, dbCands] = await Promise.all([spoonPromise, dbPromise]);
  const seen = /* @__PURE__ */ new Set();
  let results = [];
  for (const c of [...spoon.candidates, ...dbCands]) {
    const k = c.title.toLowerCase().trim();
    if (seen.has(k)) continue;
    seen.add(k);
    results.push(c);
  }
  if (anyTarget) {
    const targets = {
      kcal: data.kcal ?? null,
      protein_g: data.protein_g ?? null,
      carbs_g: data.carbs_g ?? null,
      fat_g: data.fat_g ?? null
    };
    const targetCount = [data.kcal, data.protein_g, data.carbs_g, data.fat_g].filter((v) => v != null).length;
    const enriched = results.map((r) => {
      const baseMacros = {
        kcal: r.kcal,
        protein_g: r.protein_g,
        carbs_g: r.carbs_g,
        fat_g: r.fat_g
      };
      if (!data.allowSubs) {
        const {
          baselineDistance
        } = estimateSwapImpact(baseMacros, [], targets, r.servings ?? 1);
        return {
          r,
          score: baselineDistance,
          fitKind: classifyFit(baselineDistance, baselineDistance, targetCount),
          swaps: [],
          adjusted: baseMacros
        };
      }
      const est = estimateSwapImpact(baseMacros, r._ingredientNames, targets, r.servings ?? 1);
      const useAdjusted = est.adjustedDistance < est.baselineDistance;
      return {
        r,
        score: Math.min(est.baselineDistance, est.adjustedDistance),
        fitKind: classifyFit(est.baselineDistance, est.adjustedDistance, targetCount),
        swaps: useAdjusted ? est.swaps : [],
        adjusted: useAdjusted ? est.adjusted : baseMacros
      };
    });
    results = enriched.sort((a, b) => a.score - b.score).slice(0, data.number).map(({
      r,
      fitKind,
      swaps,
      adjusted
    }) => ({
      ...r,
      fitKind,
      swapCount: swaps.length,
      swaps: swaps.length ? swaps.map((s) => ({
        from: s.from,
        to: s.to,
        delta: s.delta
      })) : void 0,
      adjustedKcal: swaps.length ? adjusted.kcal : void 0,
      adjustedProtein_g: swaps.length ? adjusted.protein_g : void 0,
      adjustedCarbs_g: swaps.length ? adjusted.carbs_g : void 0,
      adjustedFat_g: swaps.length ? adjusted.fat_g : void 0
    }));
  } else {
    const interleaved = [];
    const spoonOnly = results.filter((r) => r.source === "spoonacular");
    const dbOnly = results.filter((r) => r.source === "kaggle");
    const max = Math.max(spoonOnly.length, dbOnly.length);
    for (let i = 0; i < max && interleaved.length < data.number; i++) {
      if (spoonOnly[i]) interleaved.push(spoonOnly[i]);
      if (dbOnly[i] && interleaved.length < data.number) interleaved.push(dbOnly[i]);
    }
    results = interleaved;
  }
  const cleanResults = results.map(({
    _ingredientNames,
    ...rest
  }) => rest);
  const error = cleanResults.length === 0 ? spoon.error : null;
  return {
    results: cleanResults,
    error
  };
});
const getRecipe_createServerFn_handler = createServerRpc({
  id: "9f394f51468093d245e6074870259b6978a63991de20049b16afcba538132c41",
  name: "getRecipe",
  filename: "src/lib/recipes.functions.ts"
}, (opts) => getRecipe.__executeServer(opts));
const getRecipe = createServerFn({
  method: "POST"
}).inputValidator(objectType({
  id: numberType().int().positive(),
  source: enumType(["spoonacular", "kaggle"]).default("spoonacular")
}).parse).handler(getRecipe_createServerFn_handler, async ({
  data
}) => {
  if (data.source === "kaggle") {
    const {
      supabaseAdmin: supabaseAdmin2
    } = await Promise.resolve().then(() => client_server);
    const {
      data: row,
      error
    } = await supabaseAdmin2.from("recipes").select("id, source_id, title, description, image_url, servings, total_minutes, kcal, protein_g, carbs_g, fat_g, ingredients, instructions, detail_bucket_id, detail_object_path").eq("id", data.id).maybeSingle();
    if (error || !row) {
      return {
        recipe: null,
        error: error?.message ?? "Recipe not found"
      };
    }
    let detail = null;
    const {
      data: detailObject,
      error: detailObjectError
    } = await supabaseAdmin2.from("recipe_detail_objects").select("bucket_id, object_path, content_encoding").eq("recipe_id", data.id).maybeSingle();
    if (detailObjectError) {
      console.error("Kaggle recipe detail metadata lookup failed", detailObjectError);
    }
    const detailBucket = detailObject?.bucket_id ?? row.detail_bucket_id;
    const detailPath = detailObject?.object_path ?? row.detail_object_path;
    const detailEncoding = detailObject?.content_encoding ?? "gzip";
    if (detailBucket && detailPath) {
      const {
        data: blob,
        error: downloadError
      } = await supabaseAdmin2.storage.from(detailBucket).download(detailPath);
      if (downloadError) {
        console.error("Kaggle recipe detail download failed", downloadError);
      } else if (blob) {
        try {
          detail = JSON.parse(await decodeRecipeDetailBlob(blob, detailEncoding));
        } catch (e) {
          console.error("Kaggle recipe detail parse failed", e);
        }
      }
    }
    const detailMacros = detail?.macros ?? {};
    const ingArr = asStringArray(detail?.ingredients).length ? asStringArray(detail?.ingredients) : asStringArray(row.ingredients);
    const stepArr = asStringArray(detail?.instructions).length ? asStringArray(detail?.instructions) : asStringArray(row.instructions);
    const servings = Math.max(1, Number(detail?.servings ?? row.servings ?? 1));
    const kcal = toOptionalNumber(detailMacros.kcal) ?? Number(row.kcal ?? 0);
    const proteinG = toOptionalNumber(detailMacros.protein_g) ?? Number(row.protein_g ?? 0);
    const carbsG = toOptionalNumber(detailMacros.carbs_g) ?? Number(row.carbs_g ?? 0);
    const fatG = toOptionalNumber(detailMacros.fat_g) ?? Number(row.fat_g ?? 0);
    const count = Math.max(1, ingArr.length);
    const ingredients2 = ingArr.map((s, i) => ({
      id: i,
      name: s,
      original: s,
      amount: 1,
      unit: "",
      kcal: kcal ? kcal * servings / count : void 0,
      protein_g: proteinG ? proteinG * servings / count : void 0,
      carbs_g: carbsG ? carbsG * servings / count : void 0,
      fat_g: fatG ? fatG * servings / count : void 0
    }));
    return {
      recipe: {
        id: Number(row.id),
        source: "kaggle",
        title: detail?.title ?? row.title,
        image: detail?.image_url ?? row.image_url ?? "",
        servings,
        readyInMinutes: detail?.total_minutes ?? row.total_minutes ?? 0,
        summary: detail?.description ?? row.description ?? void 0,
        instructions: stepArr,
        ingredients: ingredients2,
        macros: {
          kcal: Math.round(kcal * servings),
          protein_g: Math.round(proteinG * servings * 10) / 10,
          carbs_g: Math.round(carbsG * servings * 10) / 10,
          fat_g: Math.round(fatG * servings * 10) / 10
        }
      },
      error: null
    };
  }
  const key = requireKey();
  const url = `${BASE}/recipes/${data.id}/information?apiKey=${key}&includeNutrition=true`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    console.error("Spoonacular getRecipe failed", res.status, text);
    return {
      recipe: null,
      error: `Recipe load failed (${res.status})`
    };
  }
  const r = await res.json();
  const nut = r.nutrition?.nutrients ?? [];
  const find = (n) => nut.find((x) => x.name === n)?.amount ?? 0;
  const ingredients = (r.extendedIngredients ?? []).map((ing) => {
    const ingNut = r.nutrition?.ingredients?.find((x) => x.id === ing.id)?.nutrients ?? [];
    const inFind = (n) => ingNut.find((x) => x.name === n)?.amount;
    return {
      id: ing.id,
      name: ing.nameClean || ing.name,
      original: ing.original,
      amount: ing.measures?.metric?.amount ?? ing.amount,
      unit: ing.measures?.metric?.unitShort ?? ing.unit ?? "",
      kcal: inFind("Calories"),
      protein_g: inFind("Protein"),
      carbs_g: inFind("Carbohydrates"),
      fat_g: inFind("Fat")
    };
  });
  const instructions = r.analyzedInstructions?.[0]?.steps?.map((s) => s.step ?? "") ?? [];
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
        fat_g: Math.round(find("Fat") * 10) / 10
      }
    },
    error: null
  };
});
const suggestSwaps_createServerFn_handler = createServerRpc({
  id: "d759022b5d95e7bf38101f3cfee55a82392c640a288def3367f16897089490d3",
  name: "suggestSwaps",
  filename: "src/lib/recipes.functions.ts"
}, (opts) => suggestSwaps.__executeServer(opts));
const suggestSwaps = createServerFn({
  method: "POST"
}).inputValidator(objectType({
  title: stringType().min(1).max(200),
  ingredients: arrayType(objectType({
    name: stringType(),
    amount: numberType(),
    unit: stringType()
  })).min(1).max(40),
  current: objectType({
    kcal: numberType(),
    protein_g: numberType(),
    carbs_g: numberType(),
    fat_g: numberType()
  }),
  target: objectType({
    kcal: numberType().nullable().optional(),
    protein_g: numberType().nullable().optional(),
    carbs_g: numberType().nullable().optional(),
    fat_g: numberType().nullable().optional()
  }),
  servings: numberType().positive()
}).parse).handler(suggestSwaps_createServerFn_handler, async ({
  data
}) => {
  const aiKey = process.env.AI_API_KEY;
  const aiBaseUrl = process.env.AI_BASE_URL ?? "https://api.openai.com/v1";
  const aiModel = process.env.AI_MODEL ?? "gpt-4.1-mini";
  if (!aiKey) throw new Error("AI_API_KEY is not configured");
  const spoonKey = requireKey();
  const perServing = (m) => ({
    kcal: m.kcal / data.servings,
    protein_g: m.protein_g / data.servings,
    carbs_g: m.carbs_g / data.servings,
    fat_g: m.fat_g / data.servings
  });
  const cur = perServing(data.current);
  const tgt = data.target;
  const tgtLine = [tgt.kcal != null ? `${tgt.kcal} kcal` : null, tgt.protein_g != null ? `${tgt.protein_g}g protein` : null, tgt.carbs_g != null ? `${tgt.carbs_g}g carbs` : null, tgt.fat_g != null ? `${tgt.fat_g}g fat` : null].filter(Boolean).join(", ") || "no specific targets — just generally healthier";
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
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: aiModel,
      messages: [{
        role: "system",
        content: "You are a nutrition-aware recipe coach. Always call the provided tool."
      }, {
        role: "user",
        content: prompt
      }],
      tools: [{
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
                    from: {
                      type: "string",
                      description: "Original ingredient name (must match one above)."
                    },
                    to: {
                      type: "string",
                      description: "Substitute ingredient name."
                    },
                    reason: {
                      type: "string"
                    },
                    delta_kcal: {
                      type: "number"
                    },
                    delta_protein_g: {
                      type: "number"
                    },
                    delta_carbs_g: {
                      type: "number"
                    },
                    delta_fat_g: {
                      type: "number"
                    }
                  },
                  required: ["from", "to", "reason", "delta_kcal", "delta_protein_g", "delta_carbs_g", "delta_fat_g"],
                  additionalProperties: false
                }
              }
            },
            required: ["swaps"],
            additionalProperties: false
          }
        }
      }],
      tool_choice: {
        type: "function",
        function: {
          name: "suggest_swaps"
        }
      }
    })
  });
  if (!aiRes.ok) {
    if (aiRes.status === 429) return {
      swaps: [],
      error: "AI is rate-limited. Please wait a moment."
    };
    if (aiRes.status === 402) return {
      swaps: [],
      error: "AI credits exhausted."
    };
    const text = await aiRes.text();
    console.error("AI provider error", aiRes.status, text);
    return {
      swaps: [],
      error: "AI suggestion failed."
    };
  }
  const aiJson = await aiRes.json();
  const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
  let aiSwaps = [];
  try {
    aiSwaps = JSON.parse(toolCall?.function?.arguments ?? "{}").swaps ?? [];
  } catch {
    aiSwaps = [];
  }
  const repriced = await Promise.all(aiSwaps.slice(0, 5).map(async (s) => {
    const aiDelta = {
      kcal: Math.round(s.delta_kcal),
      protein_g: Math.round(s.delta_protein_g * 10) / 10,
      carbs_g: Math.round(s.delta_carbs_g * 10) / 10,
      fat_g: Math.round(s.delta_fat_g * 10) / 10
    };
    try {
      const orig = data.ingredients.find((i) => i.name.toLowerCase().includes(String(s.from).toLowerCase()) || String(s.from).toLowerCase().includes(i.name.toLowerCase()));
      if (!orig) return {
        ...s,
        ...aiDelta,
        verified: false
      };
      const [origInfo, subInfo] = await Promise.all([fetchIngredientPer100g(orig.name, spoonKey), fetchIngredientPer100g(s.to, spoonKey)]);
      if (!origInfo || !subInfo) return {
        ...s,
        ...aiDelta,
        verified: false
      };
      const grams = orig.unit === "g" || orig.unit === "gram" ? orig.amount : 100;
      const factor = grams / 100;
      const delta = {
        kcal: Math.round((subInfo.kcal - origInfo.kcal) * factor),
        protein_g: Math.round((subInfo.protein_g - origInfo.protein_g) * factor * 10) / 10,
        carbs_g: Math.round((subInfo.carbs_g - origInfo.carbs_g) * factor * 10) / 10,
        fat_g: Math.round((subInfo.fat_g - origInfo.fat_g) * factor * 10) / 10
      };
      return {
        ...s,
        ...delta,
        verified: true
      };
    } catch (e) {
      console.error("re-price failed", e);
      return {
        ...s,
        ...aiDelta,
        verified: false
      };
    }
  }));
  return {
    swaps: repriced.map((r) => ({
      from: r.from,
      to: r.to,
      reason: r.reason,
      verified: r.verified ?? false,
      delta: {
        kcal: r.kcal,
        protein_g: r.protein_g,
        carbs_g: r.carbs_g,
        fat_g: r.fat_g
      }
    })),
    error: null
  };
});
async function fetchIngredientPer100g(name, apiKey) {
  const search = await fetch(`${BASE}/food/ingredients/search?apiKey=${apiKey}&query=${encodeURIComponent(name)}&number=1`);
  if (!search.ok) return null;
  const sJson = await search.json();
  const id = sJson.results?.[0]?.id;
  if (!id) return null;
  const info = await fetch(`${BASE}/food/ingredients/${id}/information?apiKey=${apiKey}&amount=100&unit=grams`);
  if (!info.ok) return null;
  const iJson = await info.json();
  const nut = iJson.nutrition?.nutrients ?? [];
  const find = (n) => nut.find((x) => x.name === n)?.amount ?? 0;
  return {
    kcal: find("Calories"),
    protein_g: find("Protein"),
    carbs_g: find("Carbohydrates"),
    fat_g: find("Fat")
  };
}
export {
  getRecipe_createServerFn_handler,
  searchRecipes_createServerFn_handler,
  suggestSwaps_createServerFn_handler
};

// Conservative, high-confidence ingredient swaps used for SEARCH-TIME ranking.
// These are deterministic estimates — the AI + Spoonacular re-pricing on the
// recipe detail page remains the source of truth for actual swap deltas.
//
// Each delta is expressed PER INGREDIENT OCCURRENCE in a recipe (rough average
// serving impact across the whole recipe, not per 100g). This keeps the
// heuristic fast and avoids needing precise gram amounts at search time.

export type MacroDelta = {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type CommonSwap = {
  // Lowercase substring matched against ingredient names.
  match: string[];
  to: string;
  // Approximate per-recipe macro impact (sub minus original) assuming a
  // typical serving usage of the ingredient across the dish.
  delta: MacroDelta;
};

export const COMMON_SWAPS: CommonSwap[] = [
  {
    match: ["sour cream"],
    to: "non-fat Greek yogurt",
    delta: { kcal: -120, protein_g: 12, carbs_g: 2, fat_g: -16 },
  },
  {
    match: ["heavy cream", "double cream"],
    to: "evaporated skim milk",
    delta: { kcal: -200, protein_g: 6, carbs_g: 4, fat_g: -22 },
  },
  {
    match: ["mayonnaise", "mayo"],
    to: "Greek yogurt",
    delta: { kcal: -180, protein_g: 8, carbs_g: 2, fat_g: -22 },
  },
  {
    match: ["white rice"],
    to: "cauliflower rice",
    delta: { kcal: -180, protein_g: -2, carbs_g: -38, fat_g: 0 },
  },
  {
    match: ["sugar", "granulated sugar", "white sugar"],
    to: "stevia / erythritol blend",
    delta: { kcal: -120, protein_g: 0, carbs_g: -32, fat_g: 0 },
  },
  {
    match: ["butter"],
    to: "olive oil (reduced)",
    delta: { kcal: -60, protein_g: 0, carbs_g: 0, fat_g: -6 },
  },
  {
    match: ["all-purpose flour", "white flour"],
    to: "almond flour",
    delta: { kcal: -40, protein_g: 6, carbs_g: -22, fat_g: 14 },
  },
  {
    match: ["pasta", "spaghetti", "fettuccine"],
    to: "zucchini noodles",
    delta: { kcal: -200, protein_g: -6, carbs_g: -42, fat_g: 0 },
  },
  {
    match: ["bread crumb", "breadcrumb", "panko"],
    to: "almond meal",
    delta: { kcal: -30, protein_g: 4, carbs_g: -14, fat_g: 8 },
  },
  {
    match: ["ground beef", "minced beef"],
    to: "ground turkey breast",
    delta: { kcal: -120, protein_g: 4, carbs_g: 0, fat_g: -14 },
  },
];

export type Macros = { kcal?: number; protein_g?: number; carbs_g?: number; fat_g?: number };
export type Targets = {
  kcal?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
};

const MACRO_KEYS = ["kcal", "protein_g", "carbs_g", "fat_g"] as const;

function distance(macros: Macros, targets: Targets): number {
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

export type AppliedSwap = {
  from: string; // actual ingredient name from the recipe that matched
  to: string;
  // Per-serving macro delta (negative = reduced).
  delta: MacroDelta;
};

/**
 * Greedy estimator: try each swap whose ingredient appears in the recipe; keep
 * any swap that strictly improves the per-serving distance to target. Returns
 * the adjusted per-serving macros, the swaps used (with the ingredient name
 * actually matched), and the baseline/adjusted distance scores.
 */
export function estimateSwapImpact(
  perServingMacros: Macros,
  ingredientNames: string[],
  targets: Targets,
  servings: number,
): {
  adjusted: Macros;
  swaps: AppliedSwap[];
  baselineDistance: number;
  adjustedDistance: number;
} {
  const lower = ingredientNames.map((n) => n.toLowerCase());
  const baselineDistance = distance(perServingMacros, targets);
  let current: Macros = { ...perServingMacros };
  let currentDistance = baselineDistance;
  const used: AppliedSwap[] = [];
  const usedKeys = new Set<string>();

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

    // Per-serving delta — swap deltas above are stated per recipe.
    const perServDelta: MacroDelta = {
      kcal: swap.delta.kcal / Math.max(1, servings),
      protein_g: swap.delta.protein_g / Math.max(1, servings),
      carbs_g: swap.delta.carbs_g / Math.max(1, servings),
      fat_g: swap.delta.fat_g / Math.max(1, servings),
    };

    const trial: Macros = {
      kcal: current.kcal != null ? Math.max(0, current.kcal + perServDelta.kcal) : current.kcal,
      protein_g:
        current.protein_g != null ? Math.max(0, current.protein_g + perServDelta.protein_g) : current.protein_g,
      carbs_g:
        current.carbs_g != null ? Math.max(0, current.carbs_g + perServDelta.carbs_g) : current.carbs_g,
      fat_g: current.fat_g != null ? Math.max(0, current.fat_g + perServDelta.fat_g) : current.fat_g,
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
          fat_g: Math.round(perServDelta.fat_g * 10) / 10,
        },
      });
      usedKeys.add(key);
    }
  }

  return {
    adjusted: current,
    swaps: used,
    baselineDistance,
    adjustedDistance: currentDistance,
  };
}

export function classifyFit(
  baselineDistance: number,
  adjustedDistance: number,
  targetCount: number,
): "fits" | "swaps" | "close" {
  if (targetCount === 0) return "fits";
  // Average normalized distance per target macro.
  const baseAvg = baselineDistance / targetCount;
  const adjAvg = adjustedDistance / targetCount;
  if (baseAvg <= 0.15) return "fits";
  if (adjAvg <= 0.2 && adjustedDistance < baselineDistance) return "swaps";
  return "close";
}

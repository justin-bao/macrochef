// DB-backed recipe search against public.recipes (Kaggle/Food.com import).
// Server-only — uses the admin client to bypass RLS for read efficiency
// (the table is publicly readable anyway, but admin avoids per-request auth).

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type DbRecipeCandidate = {
  id: number;
  source: "kaggle";
  source_id: string;
  title: string;
  image: string;
  servings: number;
  kcal?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  ingredientNames: string[];
  totalMinutes?: number;
};

export type DbSearchParams = {
  query?: string;
  kcal?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  maxReadyTime?: number;
  // Tight filter window (no swaps) vs loose (allow swap-tunable candidates).
  tight: boolean;
  // How many candidates to pull for ranking (the caller will trim to `number`).
  fetchCount: number;
};

/**
 * Pull a candidate pool from public.recipes. We do macro pre-filtering at the
 * DB level (with one-sided caps/floors matching the Spoonacular logic) and let
 * the caller do final distance ranking + swap heuristics.
 */
export async function searchDbRecipes(
  params: DbSearchParams,
): Promise<DbRecipeCandidate[]> {
  let q = supabaseAdmin
    .from("recipes")
    .select(
      "id, source, source_id, title, image_url, servings, total_minutes, kcal, protein_g, carbs_g, fat_g, ingredients",
    )
    .not("kcal", "is", null)
    .limit(params.fetchCount);

  if (params.query && params.query.trim()) {
    // Trigram-friendly ILIKE on title — a full FTS index also exists on
    // (title, description) for richer queries later.
    q = q.ilike("title", `%${params.query.trim()}%`);
  }
  if (params.maxReadyTime) {
    q = q.lte("total_minutes", params.maxReadyTime);
  }

  // Macro pre-filter — same shape as the Spoonacular complexSearch ranges.
  const applyRange = (
    col: "kcal" | "protein_g" | "carbs_g" | "fat_g",
    target: number | null | undefined,
    mode: "two-sided" | "cap" | "floor",
  ) => {
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
    const ingNames: string[] = Array.isArray(r.ingredients)
      ? (r.ingredients as unknown[])
          .map((x) => (typeof x === "string" ? x : ""))
          .filter(Boolean)
      : [];
    return {
      id: Number(r.id),
      source: "kaggle" as const,
      source_id: r.source_id,
      title: r.title,
      image: r.image_url ?? "",
      // The Food.com dataset's `nutrition` is per serving; servings count is
      // not in the source, so we treat each row as 1 serving by default.
      servings: r.servings != null ? Number(r.servings) : 1,
      kcal: r.kcal != null ? Number(r.kcal) : undefined,
      protein_g: r.protein_g != null ? Number(r.protein_g) : undefined,
      carbs_g: r.carbs_g != null ? Number(r.carbs_g) : undefined,
      fat_g: r.fat_g != null ? Number(r.fat_g) : undefined,
      ingredientNames: ingNames,
      totalMinutes: r.total_minutes ?? undefined,
    };
  });
}

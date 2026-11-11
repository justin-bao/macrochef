import { z } from "zod";

export const nutritionSourceSchema = z.object({
  id: z.string(), label: z.string(), url: z.string().url().refine((url) => url.startsWith("https://")).nullable(),
  kind: z.enum(["database", "label", "menu", "ai"]),
}).strict();
export const nutritionEvidenceSchema = z.object({
  score: z.number().int().min(0).max(100),
  reason: z.string(), sources: z.array(nutritionSourceSchema),
  uncertainties: z.array(z.string()),
}).strict();
export type NutritionSource = z.infer<typeof nutritionSourceSchema>;
export type NutritionEvidence = z.infer<typeof nutritionEvidenceSchema>;

// Evidence score, not a statistically calibrated probability of accuracy.
export function assessNutritionEvidence({ sources, portionKnown = false, complex = false, uncertainties = [] }: {
  sources: NutritionSource[]; portionKnown?: boolean; complex?: boolean; uncertainties?: string[];
}): NutritionEvidence {
  const published = sources.some((s) => s.kind === "label");
  const database = sources.some((s) => s.kind === "database");
  const base = published ? 90 : database ? (portionKnown ? 80 : 60) : 45;
  const score = Math.max(15, base - (complex && !published ? 15 : 0) - Math.min(20, uncertainties.length * 5));
  return {
    score, sources,
    reason: published ? "Published nutrition or an uploaded label; verify the serving size." : database
      ? portionKnown ? "Retrieved nutrition record with a specified weight; the food match still needs review." : "Retrieved nutrition record; portion weight is estimated."
      : "AI estimate, not measured nutrition; ingredients and preparation may vary.",
    uncertainties: [...new Set([...uncertainties, ...(!portionKnown && !published ? ["Portion size is assumed."] : []), ...(complex && !published ? ["Hidden oils, sauces, and ingredient proportions can change the totals."] : [])])],
  };
}

export function confidenceLabel(score: number): "high" | "medium" | "low" {
  return score >= 80 ? "high" : score >= 50 ? "medium" : "low";
}

// Display categories only; retain existing stored evidence and legacy enums.
export function confidenceLevel(score: number) {
  return score >= 85 ? "very-high" as const : score >= 70 ? "high" as const : score >= 50 ? "moderate" as const : score >= 30 ? "low" as const : "very-low" as const;
}

export function resolveNutritionSources(ids: unknown, available: NutritionSource[]) {
  const requested = z.array(z.string()).safeParse(ids);
  return requested.success ? available.filter((s, index) => requested.data.includes(s.id) && available.findIndex((other) => other.id === s.id) === index) : [];
}

export const aiNutritionSource: NutritionSource = { id: "ai", label: "AI nutrition estimate (no verified nutrition record)", url: null, kind: "ai" };
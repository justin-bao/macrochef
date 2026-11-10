import { z } from "zod";
import { aiNutritionSource, assessNutritionEvidence, confidenceLabel, nutritionEvidenceSchema, resolveNutritionSources, type NutritionSource } from "./nutrition-evidence";

export const ingredientInputSchema = z.object({
  name: z.string().min(1), quantity: z.number().positive(), unit: z.string().min(1),
  kcal: z.number().nonnegative(), protein_g: z.number().nonnegative(),
  carbs_g: z.number().nonnegative(), fat_g: z.number().nonnegative(),
  portionAssumption: z.string(), portionConfirmed: z.boolean(),
  sourceIds: z.array(z.string()), uncertainties: z.array(z.string()),
}).strict();
export const ingredientSchema = ingredientInputSchema.omit({ sourceIds: true, uncertainties: true }).extend({
  evidence: nutritionEvidenceSchema, confidence: z.enum(["low", "medium", "high"]),
}).strict();
export type MealIngredient = z.infer<typeof ingredientSchema>;

export function resolveIngredients(input: unknown, available: NutritionSource[] = []): MealIngredient[] {
  const parsed = z.array(ingredientInputSchema).max(20).safeParse(input);
  if (!parsed.success) return [];
  return parsed.data.map(({ sourceIds, uncertainties, ...ingredient }) => {
    const sources = resolveNutritionSources(sourceIds, available);
    const evidence = assessNutritionEvidence({
      sources: sources.length ? sources : [aiNutritionSource],
      portionKnown: ingredient.portionConfirmed, uncertainties: [...uncertainties, ...(!ingredient.portionConfirmed ? [ingredient.portionAssumption || "Ingredient quantity is inferred."] : [])],
    });
    return { ...ingredient, evidence, confidence: confidenceLabel(evidence.score) };
  });
}

export function ingredientTotals(ingredients: MealIngredient[]) {
  const total = ingredients.reduce((t, i) => ({ kcal: t.kcal + i.kcal, protein_g: t.protein_g + i.protein_g, carbs_g: t.carbs_g + i.carbs_g, fat_g: t.fat_g + i.fat_g }), { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
  return { kcal: Math.round(total.kcal), protein_g: Math.round(total.protein_g * 10) / 10, carbs_g: Math.round(total.carbs_g * 10) / 10, fat_g: Math.round(total.fat_g * 10) / 10 };
}

export function ingredientMealEvidence(ingredients: MealIngredient[]) {
  if (!ingredients.length) return assessNutritionEvidence({ sources: [aiNutritionSource], uncertainties: ["No ingredient breakdown is available."] });
  const sources = ingredients.flatMap((i) => i.evidence.sources).filter((s, index, all) => all.findIndex((other) => other.id === s.id) === index);
  return {
    score: Math.min(...ingredients.map((i) => i.evidence.score)), sources,
    reason: "Meal totals are summed from the ingredient estimates; confidence is limited by the least certain ingredient.",
    uncertainties: ingredients.flatMap((i) => i.evidence.uncertainties.map((u) => `${i.name}: ${u}`)),
  };
}
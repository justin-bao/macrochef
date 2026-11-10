import { z } from "zod";
import { nutritionEvidenceSchema } from "./nutrition-evidence";

export const mealTargetsSchema = z.object({
  kcal: z.number().nonnegative().max(10000).nullable(),
  protein_g: z.number().nonnegative().max(1000).nullable(),
  carbs_g: z.number().nonnegative().max(1000).nullable(),
  fat_g: z.number().nonnegative().max(1000).nullable(),
});
export type MealTargets = z.infer<typeof mealTargetsSchema>;
export const dishSchema = z.object({
  name: z.string(), description: z.string(), portion: z.string(),
  kcal: z.number().nonnegative(), protein_g: z.number().nonnegative(),
  carbs_g: z.number().nonnegative(), fat_g: z.number().nonnegative(),
  evidence: nutritionEvidenceSchema.optional(),
  confidence: z.enum(["low", "medium", "high"]), assumptions: z.string(),
}).strict();
export type EstimatedDish = z.infer<typeof dishSchema>;
const keys = ["kcal", "protein_g", "carbs_g", "fat_g"] as const;
// Equal-weight absolute percentage distance; natural-unit floors support zero targets.
export function mealDistance(dish: EstimatedDish, targets: MealTargets) {
  return keys.reduce((sum, key) => {
    const target = targets[key];
    return target === null ? sum : sum + Math.abs(dish[key] - target) / Math.max(target, key === "kcal" ? 100 : 10);
  }, 0);
}
export function rankMeals(dishes: EstimatedDish[], targets: MealTargets) {
  return [...dishes].sort((a, b) => mealDistance(a, targets) - mealDistance(b, targets)).slice(0, 3);
}
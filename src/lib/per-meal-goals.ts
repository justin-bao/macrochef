import { z } from "zod";
import type { MacrosOptional } from "@/components/MacroInputs";

export const MEALS = ["breakfast", "lunch", "dinner", "snacks"] as const;
export type GoalMeal = typeof MEALS[number];
export const MEAL_LABELS: Record<GoalMeal, string> = {
  breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snacks: "Snacks",
};
export const optionalMealMacrosSchema = z.object({
  kcal: z.number().finite().nonnegative().nullable(),
  protein_g: z.number().finite().nonnegative().nullable(),
  carbs_g: z.number().finite().nonnegative().nullable(),
  fat_g: z.number().finite().nonnegative().nullable(),
});
export const emptyMealMacros = (): MacrosOptional => ({ kcal: null, protein_g: null, carbs_g: null, fat_g: null });
export type PerMealGoals = Record<GoalMeal, MacrosOptional>;
export function goalsFromRows(rows: Array<{ meal: string } & MacrosOptional>): PerMealGoals {
  const goals: PerMealGoals = { breakfast: emptyMealMacros(), lunch: emptyMealMacros(), dinner: emptyMealMacros(), snacks: emptyMealMacros() };
  for (const row of rows) {
    const meal = MEALS.find((meal) => meal === row.meal);
    if (meal) goals[meal] = optionalMealMacrosSchema.parse(row);
  }
  return goals;
}
export function goalForMeal(goals: PerMealGoals, meal: GoalMeal): MacrosOptional {
  return { ...goals[meal] };
}
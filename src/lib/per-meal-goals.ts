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
export const MEAL_SHARES: Record<GoalMeal, number> = {
  breakfast: 0.2, lunch: 0.3, dinner: 0.4, snacks: 0.1,
};
export function goalsFromRows(rows: Array<{ meal: string } & MacrosOptional>, daily: MacrosOptional = emptyMealMacros()): PerMealGoals {
  const portion = (meal: GoalMeal): MacrosOptional => {
    const scale = (value: number | null) => value === null ? null : Math.round(Math.max(0, value) * MEAL_SHARES[meal] * 10) / 10;
    return { kcal: scale(daily.kcal), protein_g: scale(daily.protein_g), carbs_g: scale(daily.carbs_g), fat_g: scale(daily.fat_g) };
  };
  const goals: PerMealGoals = { breakfast: portion("breakfast"), lunch: portion("lunch"), dinner: portion("dinner"), snacks: portion("snacks") };
  for (const row of rows) {
    const meal = MEALS.find((meal) => meal === row.meal);
    if (meal) goals[meal] = optionalMealMacrosSchema.parse(row);
  }
  return goals;
}
export function goalForMeal(goals: PerMealGoals, meal: GoalMeal): MacrosOptional {
  return { ...goals[meal] };
}
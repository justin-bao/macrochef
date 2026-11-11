import { ingredientMealEvidence, ingredientTotals, type MealIngredient } from "./meal-ingredients";
import { confidenceLabel, type NutritionEvidence } from "./nutrition-evidence";
import type { FoodLogItem, MealType, TrackingDay } from "./tracking";

const macroKeys = ["kcal", "protein_g", "carbs_g", "fat_g"] as const;
export function scalePortion<T extends { quantity: number; kcal: number; protein_g: number; carbs_g: number; fat_g: number }>(item: T, quantity: number): T {
  if (!Number.isFinite(quantity) || quantity <= 0 || item.quantity <= 0) return item;
  const ratio = quantity / item.quantity;
  const next = { ...item, quantity };
  for (const key of macroKeys) next[key] = Math.round(item[key] * ratio * 100) / 100;
  return next;
}

export function resizeLoggedFood(item: FoodLogItem, quantity: number): FoodLogItem {
  const next = scalePortion(item, quantity);
  if (next === item) return item;
  const ratio = quantity / item.quantity;
  return { ...next, ingredients: item.ingredients?.map(i => scalePortion(i, i.quantity * ratio)) };
}

export function replaceLoggedIngredients(item: FoodLogItem, ingredients: MealIngredient[]): FoodLogItem {
  const totals = ingredientTotals(ingredients);
  // Retain the published total's offset rather than silently replacing it with inferred totals.
  if (item.evidence?.sources.some(s => s.kind === "label" || s.kind === "menu")) {
    const before = ingredientTotals(item.ingredients ?? []);
    for (const key of macroKeys) totals[key] = Math.max(0, Math.round((item[key] + totals[key] - before[key]) * 100) / 100);
  }
  const evidence = ingredientMealEvidence(ingredients);
  return { ...item, ...totals, ingredients, evidence, confidence: confidenceLabel(evidence.score) };
}

export function manualFoodEvidence(): NutritionEvidence {
  return { score: 15, sources: [], reason: "Manually edited nutrition; no verified record for these values.", uncertainties: ["Review the entered nutrition and portion."] };
}

export function saveLoggedFood(day: TrackingDay, from: MealType, to: MealType, item: FoodLogItem): TrackingDay {
  if (!day.meals.find(m => m.type === from)?.items.some(i => i.id === item.id)) return day;
  return { ...day, meals: day.meals.map(meal => {
    if (from === to && meal.type === from) return { ...meal, items: meal.items.map(i => i.id === item.id ? item : i) };
    if (meal.type === from) return { ...meal, items: meal.items.filter(i => i.id !== item.id) };
    if (meal.type === to) return { ...meal, items: [...meal.items.filter(i => i.id !== item.id), item] };
    return meal;
  }) };
}
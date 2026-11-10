import { describe, expect, it } from "vitest";
import { goalsFromRows, goalForMeal, MEALS, optionalMealMacrosSchema } from "./per-meal-goals";
import { macroDistance } from "./meal-matching";

describe("saved per-meal goals", () => {
  it("supports separate breakfast, lunch, dinner, and snacks goals", () => {
    expect(MEALS).toEqual(["breakfast", "lunch", "dinner", "snacks"]);
    const goals = goalsFromRows([{ meal: "lunch", kcal: 650, protein_g: 45, carbs_g: null, fat_g: 20 }]);
    expect(goalForMeal(goals, "lunch")).toEqual({ kcal: 650, protein_g: 45, carbs_g: null, fat_g: 20 });
    expect(goals.breakfast.kcal).toBeNull();
  });
  it("leaves every unsaved nutrient optional", () => {
    expect(goalsFromRows([]).dinner).toEqual({ kcal: null, protein_g: null, carbs_g: null, fat_g: null });
  });
  it("ignores blank nutrient goals in matching", () => {
    const targets = goalsFromRows([{ meal: "breakfast", kcal: 500, protein_g: null, carbs_g: null, fat_g: null }]).breakfast;
    expect(macroDistance({ kcal: 500, protein_g: 200, carbs_g: 900, fat_g: 100 }, targets)).toBe(0);
  });
  it("allows custom edits without changing saved goals", () => {
    const goals = goalsFromRows([{ meal: "snacks", kcal: 200, protein_g: null, carbs_g: null, fat_g: null }]);
    const selected = goalForMeal(goals, "snacks"); selected.kcal = 300;
    expect(goals.snacks.kcal).toBe(200);
  });
  it("validates meal calories independently of daily net-calorie goals", () => {
    expect(optionalMealMacrosSchema.safeParse({ kcal: -500, protein_g: null, carbs_g: null, fat_g: null }).success).toBe(false);
    expect(optionalMealMacrosSchema.safeParse({ kcal: 0, protein_g: null, carbs_g: null, fat_g: null }).success).toBe(true);
  });
});
import { describe, expect, it } from "vitest";
import { goalsFromRows, goalForMeal, MEALS, optionalMealMacrosSchema } from "./per-meal-goals";
import { mealDistance } from "./meal-matching";

describe("saved per-meal goals", () => {
  const daily = { kcal: 2000, protein_g: 150, carbs_g: 250, fat_g: 80 };
  it("defaults breakfast to 20% of every daily target", () => {
    expect(goalsFromRows([], daily).breakfast).toEqual({ kcal: 400, protein_g: 30, carbs_g: 50, fat_g: 16 });
  });
  it("defaults lunch to 30% of every daily target", () => {
    expect(goalsFromRows([], daily).lunch).toEqual({ kcal: 600, protein_g: 45, carbs_g: 75, fat_g: 24 });
  });
  it("defaults dinner to 40% of every daily target", () => {
    expect(goalsFromRows([], daily).dinner).toEqual({ kcal: 800, protein_g: 60, carbs_g: 100, fat_g: 32 });
  });
  it("defaults snacks to 10% of every daily target", () => {
    expect(goalsFromRows([], daily).snacks).toEqual({ kcal: 200, protein_g: 15, carbs_g: 25, fat_g: 8 });
  });
  it("preserves explicit overrides and blanks even when daily targets change", () => {
    const row = { meal: "lunch", kcal: 700, protein_g: null, carbs_g: 80, fat_g: null };
    expect(goalsFromRows([row], { ...daily, kcal: 2500 }).lunch).toEqual({ kcal: 700, protein_g: null, carbs_g: 80, fat_g: null });
    expect(goalsFromRows([row], { ...daily, kcal: 2500 }).dinner.kcal).toBe(1000);
  });
  it("keeps missing daily nutrients unset", () => {
    expect(goalsFromRows([], { ...daily, protein_g: null }).breakfast.protein_g).toBeNull();
  });
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
    expect(mealDistance({ name: "Meal", description: "", portion: "1 serving", confidence: "low", assumptions: "", kcal: 500, protein_g: 200, carbs_g: 900, fat_g: 100 }, targets)).toBe(0);
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
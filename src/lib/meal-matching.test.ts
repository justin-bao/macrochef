import { describe, it, expect } from "vitest";
import { rankMeals, mealDistance, type EstimatedDish } from "./meal-matching";
const dish = (name: string, kcal: number, protein_g: number, carbs_g: number, fat_g: number): EstimatedDish => ({ name, kcal, protein_g, carbs_g, fat_g, description: "", portion: "one", confidence: "low", assumptions: "" });
const empty = { kcal: null, protein_g: null, carbs_g: null, fat_g: null };
describe("optional single-meal targets", () => {
  it.each(["kcal", "protein_g", "carbs_g", "fat_g"] as const)("ranks only supplied %s and ignores the other three", (key) => {
    const a = { ...dish("A", 9999, 999, 999, 999), [key]: 50 };
    const b = { ...dish("B", 0, 0, 0, 0), [key]: 60 };
    expect(rankMeals([b, a], { ...empty, [key]: 50 })[0].name).toBe("A");
    expect(mealDistance(a, { ...empty, [key]: 50 })).toBe(0);
  });
  it("combines absolute normalized distances across supplied goals", () => {
    expect(mealDistance(dish("A", 600, 40, 70, 20), { ...empty, kcal: 500, protein_g: 50 })).toBeCloseTo(0.4);
  });
  it("returns three individual dishes without calorie scaling or combinations", () => {
    const results = rankMeals([dish("A", 450, 30, 30, 10), dish("B", 500, 20, 20, 10), dish("C", 550, 50, 50, 15), dish("D", 1000, 90, 90, 30)], { ...empty, kcal: 500 });
    expect(results.map((r) => r.name)).toEqual(["B", "A", "C"]);
    expect(results[1].kcal).toBe(450);
  });
  it("allows no targets and preserves menu order", () => {
    const dishes = [dish("B", 700, 20, 60, 20), dish("A", 400, 30, 40, 10)];
    expect(rankMeals(dishes, empty)).toEqual(dishes);
  });
  it("honors an explicit zero target", () => {
    expect(rankMeals([dish("A", 500, 30, 40, 10), dish("B", 700, 30, 0, 20)], { ...empty, carbs_g: 0 })[0].name).toBe("B");
  });
});
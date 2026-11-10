import { describe, expect, it } from "vitest";
import { ingredientTotals, resolveIngredients } from "./meal-ingredients";
import type { NutritionSource } from "./nutrition-evidence";
const source: NutritionSource = { id: "rice-record", kind: "database", label: "Retrieved rice record", url: "https://fdc.nal.usda.gov/food-details/1/nutrients" };
const rice = { name: "Rice", quantity: 150, unit: "g", kcal: 195, protein_g: 4, carbs_g: 42, fat_g: 0.5, portionAssumption: "150g inferred from photo", portionConfirmed: false, sourceIds: ["rice-record"], uncertainties: [] };
describe("ingredient-level meal estimates", () => {
  it("assigns each ingredient its own retrieved sources and confidence", () => {
    const items = resolveIngredients([rice, { ...rice, name: "Sauce", sourceIds: ["invented"], kcal: 80 }], [source]);
    expect(items[0].evidence.sources).toEqual([source]);
    expect(items[1].evidence.sources[0].kind).toBe("ai");
    expect(items[0].evidence.score).toBeGreaterThan(items[1].evidence.score);
  });
  it("does not treat an AI-generated gram quantity as a measured portion", () => {
    expect(resolveIngredients([rice], [source])[0].evidence.score).toBe(55);
    expect(resolveIngredients([{ ...rice, portionConfirmed: true }], [source])[0].evidence.score).toBe(80);
  });
  it("sums ingredient contributions once without counting the parent meal twice", () => {
    expect(ingredientTotals(resolveIngredients([rice, { ...rice, name: "Sauce", kcal: 80, protein_g: 1, carbs_g: 2, fat_g: 8 }]))).toEqual({ kcal: 275, protein_g: 5, carbs_g: 44, fat_g: 8.5 });
  });
  it("retains valid zero-calorie ingredients", () => {
    expect(resolveIngredients([{ ...rice, name: "Water", kcal: 0 }])).toHaveLength(1);
  });
});
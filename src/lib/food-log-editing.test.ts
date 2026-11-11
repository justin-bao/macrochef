import { describe, expect, it } from "vitest";
import { replaceLoggedIngredients, resizeLoggedFood, saveLoggedFood } from "./food-log-editing";
import { resolveIngredients } from "./meal-ingredients";
import { createEmptyTrackingDay, getDayTotals, type FoodLogItem } from "./tracking";

const ingredients = resolveIngredients([{ name: "Rice", quantity: 100, unit: "g", kcal: 130, protein_g: 3, carbs_g: 28, fat_g: 1, portionAssumption: "Weighed", portionConfirmed: true, sourceIds: [], uncertainties: [] }]);
const food: FoodLogItem = { id: "meal-1", name: "Rice bowl", quantity: 1, unit: "bowl", kcal: 130, protein_g: 3, carbs_g: 28, fat_g: 1, source: "ai", loggedAt: "2026-11-11", ingredients };
describe("logged food editing", () => {
  it("scales serving macros and constituent quantities together", () => {
    const edited = resizeLoggedFood(food, 2);
    expect(edited.kcal).toBe(260); expect(edited.ingredients?.[0].quantity).toBe(200); expect(edited.ingredients?.[0].kcal).toBe(260);
  });
  it("rejects zero and negative serving sizes", () => { expect(resizeLoggedFood(food, 0)).toBe(food); expect(resizeLoggedFood(food, -1)).toBe(food); });
  it("updates inferred parent totals once after ingredient edits", () => { expect(replaceLoggedIngredients(food, [{ ...ingredients[0], kcal: 200 }]).kcal).toBe(200); });
  it("preserves published total offsets when ingredients change", () => {
    const published = { ...food, kcal: 180, evidence: { score: 90, sources: [{ id: "label", kind: "label" as const, label: "Label", url: null }], reason: "Published", uncertainties: [] } };
    expect(replaceLoggedIngredients(published, [{ ...ingredients[0], kcal: 200 }]).kcal).toBe(250);
  });
  it("moves a food to another meal without duplicates or changed daily totals", () => {
    const day = createEmptyTrackingDay(); day.meals[0].items = [food];
    const moved = saveLoggedFood(day, "breakfast", "dinner", food);
    expect(moved.meals.find(m => m.type === "breakfast")?.items).toEqual([]);
    expect(moved.meals.find(m => m.type === "dinner")?.items).toEqual([food]);
    expect(getDayTotals(moved)).toEqual(getDayTotals(day));
  });
  it("replaces an edited food in the same meal and survives serialization", () => {
    const day = createEmptyTrackingDay(); day.meals[0].items = [food];
    const edited = resizeLoggedFood(food, 2);
    const saved = JSON.parse(JSON.stringify(saveLoggedFood(day, "breakfast", "breakfast", edited)));
    expect(saved.meals[0].items).toEqual([edited]); expect(getDayTotals(saved).kcal).toBe(260);
  });
});
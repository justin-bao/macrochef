import { describe, expect, it } from "vitest";
import { assessNutritionEvidence, resolveNutritionSources, aiNutritionSource, type NutritionSource } from "./nutrition-evidence";
const usda: NutritionSource = { id: "fdc-1", label: "USDA record", kind: "database", url: "https://fdc.nal.usda.gov/food-details/1/nutrients" };
describe("meal estimate accuracy evidence", () => {
  it("only cites records actually retrieved, not invented AI citations", () => {
    expect(resolveNutritionSources(["fdc-1", "invented"], [usda])).toEqual([usda]);
    expect(resolveNutritionSources(["invented"], [usda])).toEqual([]);
  });
  it("lowers confidence for complex dishes with inferred proportions", () => {
    expect(assessNutritionEvidence({ sources: [usda], complex: true }).score).toBe(45);
    expect(assessNutritionEvidence({ sources: [usda], complex: false }).score).toBe(60);
  });
  it("does not rate AI-only estimates as high confidence", () => {
    expect(assessNutritionEvidence({ sources: [aiNutritionSource], portionKnown: true }).score).toBe(45);
  });
  it("distinguishes a weighed database portion from an assumed serving", () => {
    expect(assessNutritionEvidence({ sources: [usda], portionKnown: true }).score).toBe(80);
    expect(assessNutritionEvidence({ sources: [usda] }).score).toBe(60);
  });
  it("preserves higher evidence for complete published nutrition even for a complex dish", () => {
    expect(assessNutritionEvidence({ sources: [{ ...usda, kind: "label" }], complex: true }).score).toBe(90);
  });
});
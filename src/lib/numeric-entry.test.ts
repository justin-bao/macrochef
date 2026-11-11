import { describe, expect, it } from "vitest";
import { isCompleteNumber, matchesNumericValue } from "./numeric-entry";

describe("numeric entry", () => {
  it("accepts signed decimals without rewriting them", () => {
    expect(isCompleteNumber("-125.50")).toBe(true);
    expect(matchesNumericValue("-125.50", -125.5)).toBe(true);
  });
  it("keeps unfinished negative and decimal drafts out of numeric state", () => {
    expect(isCompleteNumber("-")).toBe(false);
    expect(isCompleteNumber("-.")).toBe(false);
    expect(isCompleteNumber(".")).toBe(false);
  });
  it("keeps an emptied field empty rather than displaying a zero", () => {
    expect(matchesNumericValue("", 0)).toBe(true);
    expect(matchesNumericValue("", null)).toBe(true);
  });
  it("preserves pasted decimals and leading zeroes", () => {
    expect(matchesNumericValue("0012.500", 12.5)).toBe(true);
    expect(matchesNumericValue("  -12.50  ", -12.5)).toBe(true);
  });
  it("rejects nonnumeric and infinite values", () => {
    expect(isCompleteNumber("12 kcal")).toBe(false);
    expect(isCompleteNumber("Infinity")).toBe(false);
    expect(isCompleteNumber("1e999")).toBe(false);
    expect(matchesNumericValue("12", 20)).toBe(false);
  });
});
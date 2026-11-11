import { describe, expect, it } from "vitest";
import { previewServerSecretNames } from "../../scripts/preview-server-secrets";

describe("preview worker secret declarations", () => {
  it("declares the saved AI key by name without serializing its value", () => {
    expect(previewServerSecretNames({ AI_API_KEY: "test-only-value" })).toEqual(["AI_API_KEY"]);
  });
  it("excludes unrelated supervisor credentials and missing optional settings", () => {
    expect(previewServerSecretNames({ UNRELATED_CREDENTIAL: "test-only-value", AI_API_KEY: "" })).toEqual([]);
  });
  it("preserves existing worker secret names and required application bindings", () => {
    expect(previewServerSecretNames({ AI_API_KEY: "test-only-value", SUPABASE_URL: "https://example.test" }, ["EXISTING", "AI_API_KEY"]))
      .toEqual(["EXISTING", "AI_API_KEY", "SUPABASE_URL"]);
  });
});
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptyTrackingDay, getDayTotals, type FoodLogItem } from "./tracking";

// Exercise the real validators and handlers without TanStack's build-time RPC transform.
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let validate: (data: unknown) => unknown = (data) => data;
    const builder = {
      inputValidator: (validator: typeof validate) => { validate = validator; return builder; },
      middleware: () => builder,
      handler: (handler: (input: { data: unknown }) => unknown) =>
        async ({ data }: { data: unknown }) => handler({ data: validate(data) }),
    };
    return builder;
  },
}));

vi.mock("../integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
import { estimateFoodNutrition, estimateFoodWithTools, getFoodAiSetup } from "./food-nutrition.functions";

const fetchMock = vi.fn<typeof fetch>();
const ingredient = {
  name: "Rice", quantity: 150, unit: "g", kcal: 195, protein_g: 4,
  carbs_g: 42, fat_g: 0.5, portionAssumption: "Estimated cooked weight",
  portionConfirmed: false, sourceIds: ["fdc-123"], uncertainties: [],
};
const meal = {
  name: "Rice bowl", quantity: 1, unit: "meal", kcal: 999, protein_g: 99,
  carbs_g: 99, fat_g: 99, confidence: "high", sourceIds: ["invented"],
  ingredients: [ingredient, { ...ingredient, name: "Sauce", kcal: 80,
    protein_g: 1, carbs_g: 2, fat_g: 8, sourceIds: [] }],
};
const food = {
  fdcId: 123, description: "Rice cooked", dataType: "Foundation",
  foodNutrients: [
    { nutrientId: 1008, value: 130 }, { nutrientId: 1003, value: 2.7 },
    { nutrientId: 1005, value: 28 }, { nutrientId: 1004, value: 0.3 },
  ],
};
const reply = (message: unknown) => new Response(JSON.stringify({ choices: [{ message }] }));
const contentReply = (items: unknown[]) => reply({ content: JSON.stringify({ items }) });
const toolCall = (id: string, name = "search_usda", args = '{"query":"rice"}') =>
  ({ id, type: "function", function: { name, arguments: args } });
function sentBody(index: number) {
  return JSON.parse(String(fetchMock.mock.calls[index]?.[1]?.body));
}

beforeEach(() => {
  vi.stubEnv("AI_API_KEY", "unit-test-key");
  vi.stubEnv("AI_BASE_URL", "https://food-ai.example/v1/");
  vi.stubEnv("AI_MODEL", "test-model");
  vi.stubGlobal("fetch", fetchMock);
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); fetchMock.mockReset(); });

describe("AI meal logging handlers", () => {
  it("returns only setup state, never credentials or configuration values", async () => {
    expect(await getFoodAiSetup()).toEqual({ state: "configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("distinguishes missing key from an invalid server address", async () => {
    vi.stubEnv("AI_API_KEY", "");
    expect(await getFoodAiSetup()).toEqual({ state: "missing_key" });
    vi.stubEnv("AI_API_KEY", "unit-test-key");
    vi.stubEnv("AI_BASE_URL", "http://insecure.example");
    expect(await getFoodAiSetup()).toEqual({ state: "invalid_endpoint" });
    expect((await estimateFoodWithTools({ data: { description: "Rice bowl" } })).items).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("reports a missing AI connection without making a request", async () => {
    vi.stubEnv("AI_API_KEY", "");
    expect(await estimateFoodWithTools({ data: { description: "Rice bowl" } })).toEqual({ items: [], error: "AI_API_KEY is not configured." });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("passes text, restaurant context and notes to the configured AI", async () => {
    fetchMock.mockResolvedValueOnce(contentReply([meal]));
    await estimateFoodWithTools({ data: { description: "Rice bowl", context: { setting: "restaurant", notes: "Extra sauce" } } });
    const body = sentBody(0);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://food-ai.example/v1/chat/completions");
    expect(body.model).toBe("test-model");
    expect(body.messages[1].content).toBe("Rice bowl");
    expect(body.messages[0].content).toContain("Extra sauce");
    expect(body.tools.map((tool: { function: { name: string } }) => tool.function.name)).toEqual(["search_usda", "search_open_food_facts"]);
  });
  it("uses ingredient totals rather than double counting the parent", async () => {
    fetchMock.mockResolvedValueOnce(contentReply([meal]));
    const result = await estimateFoodWithTools({ data: { description: "Rice bowl" } });
    expect(result.error).toBeNull();
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ kcal: 275, protein_g: 5, carbs_g: 44, fat_g: 8.5 });
    expect(result.items[0].ingredients).toHaveLength(2);
  });
  it("does not trust model confidence or invented sources", async () => {
    fetchMock.mockResolvedValueOnce(contentReply([meal]));
    const { items } = await estimateFoodWithTools({ data: { description: "Rice bowl" } });
    expect(items[0].confidence).toBe("low");
    expect(items[0].evidence?.score).toBe(40);
    expect(items[0].evidence?.sources.map((s) => s.id)).toEqual(["ai"]);
  });
  it("rejects an opaque complex dish instead of returning loggable items", async () => {
    fetchMock.mockResolvedValueOnce(contentReply([{ ...meal, ingredients: undefined }]));
    const result = await estimateFoodWithTools({ data: { description: "Rice bowl" } });
    expect(result.items).toEqual([]);
    expect(result.error).toContain("valid ingredient breakdown");
  });
  it("allows an explicitly weighed single food without a breakdown", async () => {
    fetchMock.mockResolvedValueOnce(contentReply([{ ...meal, ingredients: undefined }]));
    expect((await estimateFoodWithTools({ data: { description: "150g rice" } })).items).toHaveLength(1);
  });
  it("sends meal photos as image input and requires ingredient evidence", async () => {
    fetchMock.mockResolvedValueOnce(contentReply([meal]));
    const imageDataUrl = "data:image/png;base64,dGVzdA==";
    const result = await estimateFoodWithTools({ data: { imageDataUrl, mode: "meal_photo" } });
    expect(sentBody(0).messages[1].content[1]).toEqual({ type: "image_url", image_url: { url: imageDataUrl } });
    expect(result.items[0].ingredients).toHaveLength(2);
  });
  it("reads label per-serving totals without tool calls or inferred ingredients", async () => {
    fetchMock.mockResolvedValueOnce(contentReply([{ ...meal, kcal: 210, protein_g: 15, carbs_g: 20, fat_g: 8 }]));
    const { items } = await estimateFoodWithTools({ data: { imageDataUrl: "data:image/png;base64,dGVzdA==", mode: "nutrition_label" } });
    expect(sentBody(0).tools).toBeUndefined();
    expect(items[0].kcal).toBe(210);
    expect(items[0].ingredients).toEqual([]);
    expect(items[0].evidence?.sources[0].kind).toBe("label");
    expect(items[0].evidence?.uncertainties).toContain("Label transcription and serving size need review.");
  });
  it("respects disabled database tools while retaining decomposition", async () => {
    fetchMock.mockResolvedValueOnce(contentReply([meal]));
    const result = await estimateFoodWithTools({ data: { description: "Rice bowl", useToolCalling: false } });
    expect(sentBody(0).tools).toBeUndefined();
    expect(result.items[0].ingredients).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("completes USDA tool round-trip and attaches only retrieved citations", async () => {
    fetchMock.mockResolvedValueOnce(reply({ content: null, tool_calls: [toolCall("call-1")] }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ foods: [food] })))
      .mockResolvedValueOnce(contentReply([meal]));
    const { items, error } = await estimateFoodWithTools({ data: { description: "Rice bowl" } });
    expect(error).toBeNull();
    const body = sentBody(2);
    expect(body.tools).toBeUndefined();
    expect(body.messages[2].tool_calls[0].id).toBe("call-1");
    expect(body.messages[3].tool_call_id).toBe("call-1");
    expect(JSON.parse(body.messages[3].content).matches[0].kcal_per_100g).toBe(130);
    expect(items[0].ingredients?.[0].evidence.sources[0].id).toBe("fdc-123");
    expect(items[0].ingredients?.[1].evidence.sources[0].id).toBe("ai");
  });
  it("routes branded products to Open Food Facts", async () => {
    fetchMock.mockResolvedValueOnce(reply({ tool_calls: [toolCall("off-call", "search_open_food_facts")] }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ products: [{ code: "123456", product_name: "Rice", nutriments: { "energy-kcal_100g": 130, proteins_100g: 2.7, carbohydrates_100g: 28, fat_100g: 0.3 } }] })))
      .mockResolvedValueOnce(contentReply([{ ...meal, ingredients: [{ ...ingredient, sourceIds: ["off-123456"] }] }]));
    const { items } = await estimateFoodWithTools({ data: { description: "Branded rice" } });
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("world.openfoodfacts.org");
    expect(items[0].ingredients?.[0].evidence.sources[0].url).toBe("https://world.openfoodfacts.org/product/123456");
  });
  it("keeps unavailable database matches explicitly inferred", async () => {
    fetchMock.mockResolvedValueOnce(reply({ tool_calls: [toolCall("call-1")] }))
      .mockResolvedValueOnce(new Response("Unavailable", { status: 503 }))
      .mockResolvedValueOnce(contentReply([meal]));
    const result = await estimateFoodWithTools({ data: { description: "Rice bowl" } });
    expect(result.error).toBeNull();
    expect(result.items[0].ingredients?.[0].evidence.sources[0].kind).toBe("ai");
    expect(JSON.parse(sentBody(2).messages[3].content).matches).toEqual([]);
  });
  it("handles malformed tool arguments without issuing a database request", async () => {
    fetchMock.mockResolvedValueOnce(reply({ tool_calls: [toolCall("bad", "search_usda", "not JSON")] }))
      .mockResolvedValueOnce(contentReply([meal]));
    expect((await estimateFoodWithTools({ data: { description: "Rice bowl" } })).error).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it.each([401, 403, 429, 500])("returns no loggable item on initial AI HTTP %s without retries", async (status) => {
    fetchMock.mockResolvedValueOnce(new Response("Unavailable", { status }));
    expect(await estimateFoodWithTools({ data: { description: "Rice bowl" } })).toEqual({ items: [], error: `AI estimation failed (${status})` });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("returns no items when the final AI round fails", async () => {
    fetchMock.mockResolvedValueOnce(reply({ tool_calls: [toolCall("bad", "search_usda", "invalid")] }))
      .mockResolvedValueOnce(new Response("Unavailable", { status: 403 }));
    expect(await estimateFoodWithTools({ data: { description: "Rice bowl" } })).toEqual({ items: [], error: "AI estimation failed (403)" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it.each(["not JSON", '{"items":[]}', '{"items":[{"name":"Water","kcal":0}]}'])("rejects unusable AI output: %s", async (content) => {
    fetchMock.mockResolvedValueOnce(reply({ content }));
    const result = await estimateFoodWithTools({ data: { description: "100g water" } });
    expect(result.items).toEqual([]);
    expect(result.error).toBeTruthy();
  });
  it("reports empty AI responses", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ choices: [] })));
    expect((await estimateFoodWithTools({ data: { description: "Rice bowl" } })).error).toBe("Empty AI response.");
  });
  it("rejects non-image uploads before any request", async () => {
    await expect(estimateFoodWithTools({ data: { imageDataUrl: "https://example.com/not-an-upload" } })).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("accepts fenced JSON responses", async () => {
    fetchMock.mockResolvedValueOnce(reply({ content: `\`\`\`json\n${JSON.stringify({ items: [meal] })}\n\`\`\`` }));
    expect((await estimateFoodWithTools({ data: { description: "Rice bowl" } })).error).toBeNull();
  });
});

describe("other logging pathways and saved totals", () => {
  it("scales USDA per-100g macros to the logged weight", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ foods: [food] })));
    const result = await estimateFoodNutrition({ data: { name: "rice", quantity: 150, unit: "g" } });
    expect(result.error).toBeNull();
    expect(result.estimate).toMatchObject({ kcal: 195, protein_g: 4.1, carbs_g: 42, fat_g: 0.5 });
    expect(result.estimate?.evidence?.sources[0].id).toBe("fdc-123");
  });
  it("offers manual entry when USDA has no complete nutrient match", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ foods: [{ ...food, foodNutrients: [] }] })));
    const result = await estimateFoodNutrition({ data: { name: "rice", quantity: 150, unit: "g" } });
    expect(result.estimate).toBeNull();
    expect(result.error).toContain("enter macros manually");
  });
  it("does not treat a USDA HTTP failure as an estimate", async () => {
    fetchMock.mockResolvedValueOnce(new Response("Unavailable", { status: 429 }));
    expect(await estimateFoodNutrition({ data: { name: "rice", quantity: 1, unit: "g" } })).toEqual({ estimate: null, error: "USDA nutrition lookup failed (429)" });
  });
  it("rejects invalid USDA quantities", async () => {
    await expect(estimateFoodNutrition({ data: { name: "rice", quantity: -1, unit: "g" } })).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("preserves AI evidence and ingredients through diary serialization and counts only parents", async () => {
    fetchMock.mockResolvedValueOnce(contentReply([meal]));
    const { items } = await estimateFoodWithTools({ data: { description: "Rice bowl" } });
    const day = createEmptyTrackingDay();
    const logged: FoodLogItem = { ...items[0], id: "ai-meal", source: "ai", loggedAt: "2026-11-11T19:22:00Z" };
    day.meals[1].items.push(logged);
    day.meals[2].items.push({ ...logged, id: "manual", source: "manual", ingredients: undefined, evidence: undefined, kcal: 100, protein_g: 10, carbs_g: 0, fat_g: 0 });
    const restored = JSON.parse(JSON.stringify(day));
    expect(restored.meals[1].items[0]).toEqual(logged);
    expect(getDayTotals(restored)).toEqual({ kcal: 375, protein_g: 15, carbs_g: 44, fat_g: 8.5 });
    expect(restored.meals[0].items).toEqual([]);
  });
});
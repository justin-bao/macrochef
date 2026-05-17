# Food Macro Estimation Logic

This document describes how MacroChef estimates food macros from a text description or an image.
The pipeline has three steps:

1. **Identify** – determine what the dish is and its overall portion size.
2. **Decompose** – split the dish into constituent ingredients with individual weights/volumes.
3. **Log** – look up macros for each ingredient and write them to the food diary.

---

## Entry points

The user reaches macro estimation through four tabs in `FoodLogModal` (`src/components/tracking/FoodLogModal.tsx`):

| Tab | Input | How macros are obtained |
|-----|-------|------------------------|
| **Text** | Free-text description | `estimateFoodWithTools` (AI + USDA tool calls), fallback: regex + USDA |
| **Photo** | Meal photo | `estimateFoodWithTools` (AI vision + USDA tool calls) |
| **Label** | Nutrition-facts label photo | `estimateFoodWithTools` (AI vision, label-read mode, no decomposition) |
| **Manual** | Name + quantity/unit | Optionally `estimateFoodNutrition` (USDA only), otherwise manual entry |

A **context strip** above the tabs lets the user set the meal setting (Homemade / Restaurant / Packaged) and an optional free-text note. Both are passed to `estimateFoodWithTools` to make the prompt more precise.

---

## Unified estimation: `estimateFoodWithTools`

**File:** `src/lib/food-nutrition.functions.ts`

All AI-powered tabs share one server function. It runs a two-round AI conversation:

### Round 0 — Identify, decompose, call tools

The AI receives a system prompt (see below), the user input (text or image), and the `search_usda` tool definition. It is expected to:

1. Identify the dish and estimate the overall portion.
2. Break it into constituent ingredients with realistic weights.
3. Call `search_usda` for each ingredient (capped at 10 calls to bound cost).

All tool calls are executed in parallel against the USDA FoodData Central API and results are returned to the model.

### Round 1 — Decide and return JSON

With the USDA results in context, the AI decides per-ingredient:

- **Good USDA match** → scale the per-100g data to the portion size, set `source: "usda"`, cite the matched food name in `note`.
- **Poor or no USDA match** → use its own trained knowledge; if most ingredients failed, collapse into a single whole-dish estimate with `confidence: "low"`.

The final response is a JSON `items` array.

### System prompts

**Meal photo / text:**
```
You are a nutrition expert for a macro tracking app.
[context: homemade/restaurant/packaged + user notes if provided]

When given a food description or image:
1. Identify the dish and estimate the overall portion size.
2. Break it into its likely constituent ingredients with realistic portion sizes.
3. Call search_usda for each ingredient (max 10 calls).
4. After reviewing USDA results, decide:
   - If the USDA matches are clearly correct, return each ingredient as a
     separate item, scaling the per-100g data to the portion. Cite the
     matched USDA food name in note.
   - If USDA results are poor or absent for most ingredients, return a
     single item for the whole dish with your overall estimate and
     confidence "low".
Return only JSON: items array with name, quantity, unit, kcal,
protein_g, carbs_g, fat_g, confidence (high/medium/low), note (optional).
```

**Nutrition label:**
```
You are a nutrition expert for a macro tracking app.
[context if provided]

Read the nutrition facts label carefully. Return one food item using the
label's per-serving macros. Use the label's serving size as quantity and
unit. Return only JSON: items array with name, quantity, unit, kcal,
protein_g, carbs_g, fat_g, confidence (high), note (optional).
```

### `search_usda` tool

```json
{
  "name": "search_usda",
  "description": "Search USDA FoodData Central for a food item. Returns the top 5 matches with per-100g macros.",
  "parameters": {
    "query": "string — food name, e.g. 'wheat noodles cooked' or 'ground pork 80 lean'"
  }
}
```

`searchUsdaForTool` (internal helper) queries `POST /fdc/v1/foods/search` with `pageSize: 8`, ranks results with `rankFood`, and returns the top 5 that have complete macros in a compact per-100g format the AI can evaluate and scale.

### Fallback (no AI key)

When `AI_API_KEY` is not configured, `estimateFoodWithTools` returns `error: "AI_API_KEY is not configured."`. The text tab catches this and falls back to the legacy `parseFoodDescription` (regex split) + per-ingredient `applyUsdaEstimate` path. The image tabs show the error and require configuration.

---

## USDA ranking (`rankFood`)

Used by both the AI tool path and the manual-tab lookup:

```
score = (matching_query_words × 4)
      + source_boost           // Survey (FNDDS)=3, Foundation=2, SR Legacy=1
      + (has_all_four_macros ? 10 : 0)
```

Macros are extracted by nutrient ID:

| Macro | Nutrient IDs |
|-------|-------------|
| Calories | 1008, 2047, 2048 |
| Protein | 1003 |
| Fat | 1004 |
| Carbohydrates | 1005 |

Portion conversion (`amountToGrams`) handles g, kg, oz, lb, ml, l, and USDA serving sizes. Unknown units default to `quantity × 100 g`. Macros are scaled from per-100g values by `grams / 100`.

---

## Context inputs

The modal exposes two context signals above all tabs:

| Field | Values | Effect on prompt |
|-------|--------|-----------------|
| **Setting** | Homemade / Restaurant / Packaged | Informs typical portion sizes and preparation style |
| **Notes** | Free text (max 200 chars) | Appended verbatim to the system prompt, e.g. "grilled, no sauce" |

---

## Final `FoodLogItem` shape

```typescript
{
  id: string           // crypto.randomUUID()
  name: string
  quantity: number
  unit: string
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  source: "manual" | "usda" | "ai" | "recipe" | "restaurant"
  // "usda" when note contains "USDA"; "ai" otherwise
  confidence: "high" | "medium" | "low"
  note?: string        // USDA match citation or caveat
  loggedAt: string     // ISO 8601 timestamp
}
```

Items are written to the current diary date in `localStorage` via `useLocalTracking`, keyed by `"YYYY-MM-DD"`.

---

## Pipeline coverage

| Goal | State |
|------|-------|
| Identify dish and portion (text) | AI identifies in round 0 before calling tools |
| Identify dish and portion (image) | Vision model identifies in round 0 |
| Decompose into ingredients (text) | AI decomposes as part of the same round-0 response |
| Decompose into ingredients (image) | Vision model decomposes as part of round 0 |
| USDA lookup per ingredient | AI calls `search_usda` tool for each; results returned to model |
| Per-ingredient source decision | AI decides in round 1: USDA data or own estimate per item |
| Whole-dish fallback | AI returns single item when USDA matches are poor overall |
| Log to diary | Items written to localStorage after user review |

---

## Key files

| File | Role |
|------|------|
| `src/lib/food-nutrition.functions.ts` | `estimateFoodWithTools`, `estimateFoodNutrition` (manual tab), `searchUsdaForTool`, `rankFood` |
| `src/components/tracking/FoodLogModal.tsx` | UI + orchestration; context inputs; `parseFoodDescription` fallback |
| `src/lib/tracking.ts` | `FoodLogItem` and `FoodSource` types |
| `src/hooks/useLocalTracking.ts` | localStorage read/write for the food diary |

## Environment variables

```env
FOODDATA_CENTRAL_API_KEY=   # USDA FDC; falls back to "DEMO_KEY"
AI_API_KEY=                  # Required for all AI estimation paths
AI_BASE_URL=                 # Default: https://api.openai.com/v1
AI_MODEL=                    # Default: gpt-4.1-mini
```

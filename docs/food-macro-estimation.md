# Food Macro Estimation Logic

This document describes how MacroChef estimates food macros from a text description or an image.
The end goal is a three-step pipeline:

1. **Identify** – determine what the dish is and its overall portion size.
2. **Decompose** – split the dish into constituent ingredients with individual weights/volumes.
3. **Log** – look up macros for each ingredient and write them to the food diary.

---

## Entry points

The user reaches macro estimation through four tabs in `FoodLogModal` (`src/components/tracking/FoodLogModal.tsx`):

| Tab | Input | How macros are obtained |
|-----|-------|------------------------|
| **Text** | Free-text description | `parseFoodDescription` → USDA FDC lookup |
| **Photo** | Meal photo | AI vision (`meal_photo` mode) |
| **Label** | Nutrition-facts label photo | AI vision (`nutrition_label` mode) |
| **Manual** | Name + quantity/unit | Optionally USDA FDC lookup, otherwise manual entry |

---

## Step 1 — Identify the food

### Text path

`estimateQuickItems` (FoodLogModal.tsx) first calls `decomposeTextToIngredients` (food-nutrition.functions.ts), a server function that sends the raw description to the configured AI model and asks it to return a flat list of ingredients with quantities:

```
System: "You decompose food descriptions into individual ingredients for a
macro tracking app. Return only JSON with an items array. Each item must
include name (string), quantity (number), and unit (string such as oz, g,
cup, tbsp, or serving). If the input is already a list of specific
ingredients with quantities, return them as-is. Use realistic typical
portion sizes."

User: <the user's raw description>
```

For a description like "a bowl of zhajiangmian" the model returns something like:

```json
{ "items": [
    { "name": "wheat noodles",    "quantity": 5,   "unit": "oz"     },
    { "name": "ground pork",      "quantity": 3,   "unit": "oz"     },
    { "name": "black bean sauce", "quantity": 2,   "unit": "tbsp"   },
    { "name": "cucumber",         "quantity": 2,   "unit": "oz"     }
]}
```

If `AI_API_KEY` is not set, or the AI call fails, `decomposeTextToIngredients` returns an empty list and `estimateQuickItems` falls back to `parseFoodDescription`, which splits on newlines/commas/"and" and extracts `quantity`, `unit`, `name` via regex. For example:

```
"8 oz chicken breast, 1 cup rice, broccoli"
→ [{ quantity:8, unit:"oz",      name:"chicken breast" },
   { quantity:1, unit:"cup",     name:"rice" },
   { quantity:1, unit:"serving", name:"broccoli" }]
```

### Image path

`estimateFoodFromImage` (food-nutrition.functions.ts:208) sends the image to an OpenAI-compatible vision model. The model is asked to identify every visible food item and estimate its portion in the same response — identification and decomposition happen in one round-trip (see Step 2 below).

---

## Step 2 — Decompose into ingredients

### Text path

`decomposeTextToIngredients` handles decomposition as part of the Step 1 AI call. Each ingredient in the returned list is then sent individually to USDA for macro lookup.

### Image path

The AI prompt explicitly requests a flat list of food items per the system message:

```
System: "You estimate food nutrition for a macro tracking app. Return only JSON
with an items array. Each item must include name, quantity, unit, kcal,
protein_g, carbs_g, fat_g, confidence, and optional note. Confidence is
high, medium, or low."

User (meal_photo mode): "Estimate the visible meal's food items and portions.
Return reasonable macro estimates with confidence."
```

The model is expected to decompose the visible meal into individual components and estimate each one's portion. For example, a photo of zhajiangmian might return:

```json
{ "items": [
    { "name": "wheat noodles",    "quantity": 5,  "unit": "oz", "kcal": 200, ... },
    { "name": "ground pork",      "quantity": 3,  "unit": "oz", "kcal": 210, ... },
    { "name": "cucumber",         "quantity": 2,  "unit": "oz", "kcal": 10,  ... },
    { "name": "black bean sauce", "quantity": 2,  "unit": "tbsp","kcal": 40, ... }
]}
```

The AI provides macro estimates directly in its response; there is **no** subsequent USDA validation step for image-derived items.

**Response validation** (`extractJsonObject`, food-nutrition.functions.ts:199):
- Strips Markdown fences (`` ```json ... ``` ``) if present.
- Extracts the first `{...}` block.
- Filters out items with blank names or `kcal ≤ 0`.
- Clamps all numeric fields to `≥ 0`.

---

## Step 3 — Look up macros and log

### USDA FDC path (text input)

`estimateFoodNutrition` (food-nutrition.functions.ts:156) queries the USDA FoodData Central search endpoint:

```
POST https://api.nal.usda.gov/fdc/v1/foods/search
{ query, pageSize: 12, requireAllWords: false }
```

It ranks the returned candidates with `rankFood` (food-nutrition.functions.ts:99):

```
score = (matching_query_words × 4)
      + source_boost           // Survey=3, Foundation=2, SR Legacy=1
      + (has_all_four_macros ? 10 : 0)
```

The highest-scoring candidate that has all four macros is selected. Macros are extracted by nutrient ID:

| Macro | Nutrient IDs |
|-------|-------------|
| Calories | 1008, 2047, 2048 |
| Protein | 1003 |
| Fat | 1004 |
| Carbohydrates | 1005 |

Portion conversion (`amountToGrams`, food-nutrition.functions.ts:79) handles g, kg, oz, lb, ml, l, and USDA serving sizes. All other units default to `quantity × 100 g`. Macros are then scaled from per-100 g values by `grams / 100`.

Confidence is `"high"` unless the unit is `"serving"` and the USDA entry has no `servingSize`, in which case it is `"medium"`.

### AI vision path (image input)

Macros are returned directly by the model at temperature 0.1 (deterministic). No USDA validation is performed. Confidence is whatever the model reports (`"high"`, `"medium"`, or `"low"`).

### Final `FoodLogItem` shape

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
  confidence: "high" | "medium" | "low"
  note?: string        // source attribution or user-facing caveat
  loggedAt: string     // ISO 8601 timestamp
}
```

Items are appended to the current diary date in `localStorage` via `useLocalTracking` (`src/hooks/useLocalTracking.ts`), keyed by `"YYYY-MM-DD"`.

---

## Pipeline coverage

| Goal | State |
|------|-------|
| Identify dish and overall portion from text | Works — `decomposeTextToIngredients` identifies the dish and produces per-ingredient portions via AI. Falls back to regex when `AI_API_KEY` is absent. |
| Identify dish from image | Works — the vision model names the dish and sub-components. |
| Decompose dish into ingredients (text) | Works — same `decomposeTextToIngredients` call returns individual ingredients with quantities. |
| Decompose dish into ingredients (image) | Works — the vision model returns each visible component separately. |
| Look up macros per ingredient | Works via USDA FDC (text path) or directly from the AI estimate (image path). |
| Log foods to diary | Works — items written to localStorage after user review. |

---

## Key files

| File | Role |
|------|------|
| `src/lib/food-nutrition.functions.ts` | Server functions: USDA lookup (`estimateFoodNutrition`) and AI vision (`estimateFoodFromImage`) |
| `src/components/tracking/FoodLogModal.tsx` | UI + orchestration: `parseFoodDescription`, `applyUsdaEstimate`, `estimateImageItems` |
| `src/lib/tracking.ts` | `FoodLogItem` type and `TrackingData` shape |
| `src/hooks/useLocalTracking.ts` | localStorage read/write for the food diary |

## Environment variables

```env
FOODDATA_CENTRAL_API_KEY=   # USDA FDC; falls back to "DEMO_KEY"
AI_API_KEY=                  # Required for image estimation
AI_BASE_URL=                 # Default: https://api.openai.com/v1
AI_MODEL=                    # Default: gpt-4.1-mini
```

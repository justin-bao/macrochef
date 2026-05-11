# MacroChef — Recipes tuned to your macros

A clean, wellness-styled recipe portal that pulls real recipes from Spoonacular, lets users set macronutrient targets (calories, protein, carbs, fat), and uses a hybrid AI + nutrition-DB approach to suggest ingredient substitutions and scale ingredient amounts to hit caloric goals.

## Core user flows

**1. Search & target**

- Home page: search bar ("grilled chicken bowl", "pad thai"...) plus four macro inputs (calories, protein g, carbs g, fat g) and an optional servings field.
- Results grid of recipes from Spoonacular with image, title, and original macros per serving.

**2. Recipe detail — Tune to my macros**

- Full recipe (ingredients, steps, nutrition breakdown) with a macro comparison panel: _Original vs Your target_.
- **Substitution suggestions (hybrid):** AI proposes swaps that move the dish toward the target (e.g. "swap sour cream → Greek yogurt to +12g protein, -90 kcal"). Each AI suggestion is then re-priced against Spoonacular's nutrition data so the displayed macro deltas are accurate, not hallucinated. User can toggle each swap on/off and see the recipe's macros update live.
- **Scale to caloric goal:** a "Scale ingredients" action recomputes every ingredient amount so total calories match the target (with a per-serving vs total toggle). Shows the new ingredient list side-by-side with originals.

**3. Saved recipes & goals (accounts)**

- Email/password + Google sign-in.
- Profile page stores default macro goals (so they pre-fill on every search).
- "My recipes" — save tuned versions of recipes (with chosen substitutions and scaled amounts) and revisit them later.

## Pages

- `/` — Hero + search + macro target inputs + featured recipes
- `/search` — Results grid with filters (diet, cuisine, max prep time)
- `/recipe/$id` — Recipe detail with the tuning panel
- `/saved` — User's saved tuned recipes (auth required)
- `/goals` — Edit default macro targets (auth required)
- `/auth` — Sign in / sign up

## Design direction

Fresh & Clean palette: off-white background `#fafbfc`, soft surface `#e8ecf1`, sage `#7d9b76` for primary actions/healthy accents, teal `#2d8a9e` for data/macro highlights. Inter throughout. Generous whitespace, rounded cards, subtle shadows, macro values shown as colored progress rings and bars.

## Technical notes

- **Stack:** TanStack Start, Supabase Auth/Postgres, and an optional OpenAI-compatible AI provider for substitution reasoning.
- **Spoonacular:** API key stored as a server secret; all calls go through `createServerFn` (never expose key to browser). Endpoints used: `complexSearch`, `recipes/{id}/information`, `recipes/{id}/nutritionWidget.json`, `food/ingredients/search`, `food/ingredients/{id}/information` (for re-pricing AI swaps).
- **Substitution pipeline:** The configured AI provider receives the ingredient list + macro delta needed and returns structured JSON swaps. For each swap, server function looks up the substitute in Spoonacular's ingredient DB to get real per-100g macros, recomputes deltas, and returns verified suggestions to the client.
- **Scaling:** pure math on Spoonacular's per-ingredient nutrition — multiply each ingredient amount by `target_kcal / original_kcal`.
- **Database tables (Supabase):** `macro_goals` (user_id, kcal, protein_g, carbs_g, fat_g), `saved_recipes` (user_id, spoonacular_id, title, image, applied_swaps jsonb, target_macros jsonb), and optional imported `recipes`. RLS: users only see their own rows.
- **Secrets needed:** `SPOONACULAR_API_KEY`, Supabase URL/keys, and optional `AI_API_KEY`.

## What you'll need to provide

A Spoonacular API key (free, ~150 requests/day on the free plan — enough for development and light use). I'll request it via the secrets flow once the plan is approved.

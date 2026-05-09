# PRD — Tune to My Macros (Substitutions + Scaling)

## Problem

Even a "good fit" recipe rarely lands exactly on a user's macro target. Users either accept the miss, give up, or do tedious manual math: swap sour cream for Greek yogurt, halve the oil, scale the rice. The math is error-prone, and AI suggestions on their own can't be trusted because they hallucinate macro deltas.

## Goal

On every recipe detail page, give the user two trustworthy levers:

1. **Substitutions** — AI-proposed ingredient swaps that move the dish toward the target, each one re-priced against a real nutrition database so displayed deltas are accurate.
2. **Scale ingredients** — recompute every ingredient amount so the recipe's calories match the target, with a per-serving / whole-batch toggle.

The user can toggle swaps on/off and see updated macros live, then save the tuned version.

## User flows

**1. Compare**
- User opens a recipe.
- A macro panel shows *Original vs Your target* side-by-side.

**2. Suggest substitutions**
- User clicks "Suggest substitutions."
- AI returns structured swaps (e.g. `sour cream → Greek yogurt`).
- Server re-prices each swap against Spoonacular's ingredient nutrition data.
- Each swap is shown with the verified macro delta and a toggle.
- Toggling a swap updates the macro totals live.

**3. Scale ingredients**
- User clicks "Scale to target calories."
- Every ingredient amount is multiplied by `target_kcal / original_kcal`.
- Toggle: scale per-serving vs whole batch.
- New ingredient list shown side-by-side with originals.

**4. Save tuned version**
- Authenticated users can save the recipe with applied swaps + scaled amounts + target macros.
- Saved versions appear in `/saved`.

## Requirements

- AI swap suggestions must be re-priced against a real ingredient nutrition source before being displayed. No raw AI macro numbers in the UI.
- Swaps that fail re-pricing are dropped silently rather than shown with fake numbers.
- Scaling math operates per-ingredient on Spoonacular's nutrition fields; never re-asks the AI.
- Live macro recomputation must be pure client-side once the verified swaps are loaded — no round trip per toggle.
- Saving must persist: chosen swaps, scaled amounts, target macros, and source recipe id.

## Non-goals

- Replacing whole recipes ("you should make a different dish").
- Allergen / dietary substitution mode (swaps are macro-driven, not constraint-driven).
- Cooking-instruction rewrites to match swaps.

## Success signals

- Displayed macro deltas after a swap match what the user would compute by hand from the ingredient DB.
- A scaled recipe's reported total kcal lands within rounding error of the target.
- Users save tuned recipes and revisit them.

## Technical notes

- AI calls go through Lovable AI Gateway (Gemini); no user-supplied key.
- Swap re-pricing uses Spoonacular's `food/ingredients/search` + `food/ingredients/{id}/information`.
- Scaling and swap-application math lives in `src/lib/macros.ts`.
- Search-time substitution heuristics (used when "Allow substitutions" is on at search time) live in `src/lib/swap-heuristics.ts` and don't require an AI call.
- Saved tuned recipes persist in `saved_recipes` (custom_ingredients, applied_swaps, target_macros as JSONB), RLS-scoped to the owner.

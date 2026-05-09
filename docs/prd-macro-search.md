# PRD — Macro-Aware Recipe Search

## Problem

Recipe search engines rank by popularity, recency, or diet tags. None of those answer the user's actual question: *"What can I cook right now that fits my remaining macros?"* Users end up scrolling past dozens of recipes whose nutrition is wildly off-target, or fall back on the same handful of meals they've already memorized.

## Goal

Let the user describe a dish (or leave it blank) **and** specify any subset of calorie / protein / carb / fat targets, then return recipes ranked by how well they fit those targets — drawn from a corpus large enough that the user keeps finding new options.

## User flows

**1. Targeted search**
- User enters a query ("grilled chicken bowl") and/or macro targets on the home page.
- Submits → lands on `/search` with a results grid.
- Each card shows image, title, original macros per serving, and a fit indicator vs. the user's targets.

**2. Macro-only browse**
- User leaves the query blank and sets only macro targets.
- Returns a ranked feed of recipes that fit, regardless of cuisine.

**3. Allow-substitutions toggle**
- When enabled, the engine also surfaces recipes that don't fit *as-is* but can plausibly be tuned (via swaps) to fit. The fit indicator reflects post-swap macros.

## Requirements

- Any macro field is optional; empty fields are ignored in ranking.
- Results merge two sources in parallel:
  - **Spoonacular API** (fresh, image-rich, smaller).
  - **Local recipes archive** (`public.recipes`, imported from the Food.com Kaggle dataset, ~230k rows).
- Deduplicate by lowercased title across sources.
- Pre-filter the local archive on macros at the SQL layer (tight ±25% windows when targets are present, looser one-sided caps/floors otherwise) before ranking, so we don't pull 230k rows per request.
- When macro targets are present, rank by macro distance. With no targets, interleave 1:1 between sources to keep the feed varied.
- Results page must support deep links (query + macros + subs flag in the URL) so a search is shareable and survives refresh.
- Each result links to `/recipe/$id?src=spoonacular|kaggle` so the detail page knows which source to fetch from.

## Non-goals

- Faceted filtering on dietary labels (vegan, keto, etc.) beyond what the source data already encodes.
- Personalized ranking from user history.
- Pagination beyond an initial top-N — the goal is "find a good fit fast," not browse infinitely.

## Success signals

- A blank query with macro targets returns a recognizably diverse set of cuisines.
- The top 10 results' macros are visibly closer to the target than results 50–100.
- Local-archive results appear interleaved with Spoonacular results once the import has run.

## Technical notes

- Server functions: `searchRecipes` in `src/lib/recipes.functions.ts` orchestrates both sources via `Promise.all`.
- DB layer: `searchDbRecipes` in `src/lib/recipes-db.server.ts` issues the filtered query against `public.recipes` using the Supabase admin client (RLS-bypass for read).
- Spoonacular calls live behind `createServerFn` so the API key never reaches the browser.
- Detail-page fetch branches on `source`: Spoonacular hits the API; Kaggle parses the stored ingredient strings into the standard `RecipeDetail` shape.

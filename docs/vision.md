# MacroChef — Product Vision

## One-line thesis

**MacroChef helps people eat what they actually want to eat — and still hit their macro targets — by tuning real recipes and restaurant meals to their calorie and macronutrient goals.**

## Who it's for

MacroChef is built for people who track macros but don't want to live on chicken, rice, and broccoli:

- **Macro-tracking lifters and athletes** chasing a specific protein floor and calorie ceiling without giving up the foods they enjoy.
- **Cut/bulk dieters** who want recipes that actually fit today's remaining macros, not a generic "healthy" feed.
- **Home cooks with goals** — people who like to cook but need help adapting recipes to a target instead of eyeballing it.
- **Eaters out** — anyone trying to assemble a fast-food or restaurant order that lands inside their daily macros.

It is *not* a calorie-restriction app, a meal-plan generator, or a "clean eating" content site. The user already knows their numbers; we help them spend them well.

## The problem

Macro tracking apps tell you what you ate. Recipe sites give you recipes. Almost nothing bridges the two:

- Recipe search engines rank by popularity or diet tag, not by *fit to my remaining macros*.
- "Healthy" filters are a blunt instrument — they hide perfectly good recipes and surface bland ones.
- Adjusting a recipe to hit a target (swap an ingredient, scale portions, recompute macros) is manual math the user gives up on.
- Restaurants publish nutrition info, but combining items into a meal that hits a target is a spreadsheet exercise.

Result: people either eat the same five "safe" meals on repeat, or they stop tracking.

## The product

MacroChef is a recipe and restaurant-meal portal with three superpowers:

1. **Macro-aware search** — search by dish *and* by target macros across a hybrid corpus (Spoonacular API + a large imported recipe archive). Results are ranked by macro fit, not popularity.
2. **Tune to my macros** — on any recipe, AI proposes ingredient substitutions and the engine scales portions so the dish lands on the user's calorie and protein targets. Every swap is re-priced against a real nutrition database, not hallucinated.
3. **Restaurant combos** — assemble fast-food / chain orders that fit a macro target, from a curated set of chains.

Saved tuned recipes and default macro goals are stored per user so the workflow compounds over time.

## What success looks like

- A user types "pad thai" with a 600 kcal / 45g protein target and gets recipes that genuinely fit — or recipes that fit *after one or two suggested swaps*.
- The user trusts the macro numbers shown after a swap or scale, because they're computed from a real ingredient database, not guessed.
- The user comes back because the search corpus is broad enough (~hundreds of thousands of recipes) that they keep finding new things, not the same 20 hits.

## Non-goals

- Generating multi-day meal plans.
- Grocery delivery / shopping carts.
- Social feed, reviews, or UGC recipes.
- Medical or clinical nutrition advice.

## Feature PRDs

Each major feature has its own PRD in this folder:

- [Macro-aware recipe search](./prd-macro-search.md)
- [Tune to my macros (substitutions + scaling)](./prd-tune-to-macros.md)
- [Restaurant macro combos](./prd-restaurant-combos.md)
- [Accounts, goals, and saved recipes](./prd-accounts-and-saved.md)
- [Recipe corpus expansion (Kaggle import)](./prd-recipe-corpus.md)

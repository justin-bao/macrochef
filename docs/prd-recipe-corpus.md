# PRD — Recipe Corpus Expansion (Kaggle Import)

## Problem

Spoonacular alone is too small (and too rate-limited on the free tier) to make macro-aware browsing feel deep. With only a few hundred candidates per query, users see the same recipes repeatedly and macro-only browsing returns sparse results. Paid recipe APIs (e.g. Edamam) start at $0 of free quota and aren't viable for this product.

## Goal

Expand the searchable corpus to **~230k recipes** by importing the Food.com dataset (CC0, hosted on Kaggle) into a local `public.recipes` table, queried side-by-side with Spoonacular. Keep the import idempotent so it can be re-run.

## Requirements

- Source: Food.com `RAW_recipes.csv` from Kaggle (~230k rows, CC0-licensed).
- Storage: `public.recipes` table with:
  - `source` + `source_id` with a unique constraint (idempotency key).
  - Per-serving `kcal`, `protein_g`, `carbs_g`, `fat_g`.
  - `ingredients` (text), `instructions` (text), `tags`, `total_minutes`.
  - B-tree indexes on every macro column and `total_minutes` (powers the search pre-filter).
  - Trigram index on `title` and a tsvector full-text index on `title + description`.
  - RLS enabled with public read.
- Import script (`scripts/import_kaggle_recipes.py`):
  - Accepts `--csv <path>` or `--download` (uses Kaggle CLI).
  - Converts the dataset's % Daily Value nutrition fields back to grams using FDA reference values (e.g. protein basis 50g).
  - Upserts in batches of 500 via Supabase REST with `Prefer: resolution=merge-duplicates`.
  - Supports `--limit N` for smoke tests.
- Re-runnable: a second run refreshes existing rows in place; no duplicates.

## Known gaps in the source data

- No images. The detail UI must continue to render without an image.
- No servings count. Macros are stored per-serving as the source provides them; scaling math uses per-serving directly.
- Ingredient strings are unstructured (no parsed amounts/units). The detail page parses them into the standard ingredient shape on the fly so swap and scale UIs still function, with reduced precision compared to Spoonacular recipes.

## Non-goals

- Live sync with Kaggle (one-shot import; re-run when the dataset updates).
- Backfilling images via web scraping.
- Parsing free-text ingredient strings into structured amount/unit/food triples at import time. (Parsing happens lazily at recipe-detail render.)
- Importing additional datasets (e.g. RecipeNLG) — revisit if 230k still feels small.

## Success signals

- After import, `select count(*) from public.recipes` is on the order of 2.3 × 10⁵.
- Macro-only searches return diverse, non-Spoonacular results interleaved into the feed.
- Re-running the importer changes row count by zero and updates timestamps in place.

## Operational notes

- Run locally with `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS for the bulk write); never ship the service role key to the browser.
- Full import takes roughly 5–15 minutes depending on network and region.
- Setup and run instructions live in `scripts/README.md`.

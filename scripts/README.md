# Kaggle recipe importer

Imports the Food.com recipes dataset (~230k recipes, CC0) from Kaggle into the
`public.recipes` table.

## Quick start (local machine)

```bash
# 1. Install Kaggle CLI and add your API token
pip install kaggle
mkdir -p ~/.kaggle
# Drop your kaggle.json from https://www.kaggle.com/settings into ~/.kaggle/
chmod 600 ~/.kaggle/kaggle.json

# 2. Set Supabase env vars from your own Supabase project settings
export SUPABASE_URL="https://your-project-ref.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<service role key>"

# 3. Run
python scripts/import_kaggle_recipes.py --download

# Or, if you've already downloaded RAW_recipes.csv:
python scripts/import_kaggle_recipes.py --csv ~/Downloads/RAW_recipes.csv

# Smoke-test with 1k rows first:
python scripts/import_kaggle_recipes.py --csv ./RAW_recipes.csv --limit 1000
```

## What gets imported

- Per-serving macros (kcal, protein, carbs, fat) — the source stores % daily
  values, the script converts them back to grams.
- Ingredients list, step-by-step instructions, tags.
- `total_minutes` (cook + prep).
- The dataset has **no images and no servings count** — those columns stay
  NULL. The recipe detail UI already handles missing images and falls back to
  per-serving macros directly.

## Re-running

The table has a unique constraint on `(source, source_id)` and the script uses
upsert (`Prefer: resolution=merge-duplicates`) — running it twice is safe and
will refresh existing rows in place.

## Throughput

Default batch size is 500. ~230k rows takes roughly 5–15 minutes depending on
your network and the Supabase region.

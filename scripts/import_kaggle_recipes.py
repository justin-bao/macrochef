#!/usr/bin/env python3
"""
Import the Food.com recipes Kaggle dataset into the public.recipes table.

Dataset: shuyangli94/food-com-recipes-and-user-interactions
File used: RAW_recipes.csv  (~230k recipes)

Source columns:
    name, id, minutes, contributor_id, submitted, tags,
    nutrition, n_steps, steps, description, ingredients, n_ingredients

The `nutrition` column is a stringified Python list:
    [calories_kcal, total_fat_PDV, sugar_PDV, sodium_PDV,
     protein_PDV, sat_fat_PDV, carbs_PDV]

PDV = USDA % Daily Value on a 2000 kcal reference diet. We convert the
ones we care about to grams using FDA reference daily values:
    fat:     65 g    @ 100 PDV
    protein: 50 g    @ 100 PDV
    carbs:   300 g   @ 100 PDV
These are *per serving* in the source.

Usage:
    # Option A: download via the Kaggle CLI (needs ~/.kaggle/kaggle.json)
    python scripts/import_kaggle_recipes.py --download

    # Option B: point at an already-downloaded CSV
    python scripts/import_kaggle_recipes.py --csv /path/to/RAW_recipes.csv

    # Limit for a smoke-test
    python scripts/import_kaggle_recipes.py --csv ... --limit 1000

Required env vars:
    SUPABASE_URL              (already set on this project)
    SUPABASE_SERVICE_ROLE_KEY (server-only secret)
"""

from __future__ import annotations

import argparse
import ast
import csv
import json
import os
import sys
import time
import zipfile
from pathlib import Path
from typing import Any, Iterable, Iterator

import urllib.request
import urllib.error

SOURCE = "kaggle_food_com"
TABLE = "recipes"
BATCH_SIZE = 500  # rows per POST; Supabase REST handles this fine

# FDA reference daily values used by the dataset's PDV figures.
PDV_BASIS = {
    "fat_g": 65.0,
    "protein_g": 50.0,
    "carbs_g": 300.0,
}


# --------------------------------------------------------------------------- #
# Parsing
# --------------------------------------------------------------------------- #

def parse_list(cell: str) -> list[str]:
    """The CSV stores Python list literals like "['a', 'b']". Be forgiving."""
    if not cell:
        return []
    try:
        v = ast.literal_eval(cell)
        return [str(x).strip() for x in v if str(x).strip()]
    except (ValueError, SyntaxError):
        return []


def parse_nutrition(cell: str) -> dict[str, float | None]:
    """Returns per-serving kcal/protein/carbs/fat in grams (kcal already kcal)."""
    out: dict[str, float | None] = {
        "kcal": None, "protein_g": None, "carbs_g": None, "fat_g": None,
    }
    if not cell:
        return out
    try:
        v = ast.literal_eval(cell)
    except (ValueError, SyntaxError):
        return out
    if not isinstance(v, list) or len(v) < 7:
        return out
    try:
        kcal, fat_pdv, _sugar, _sodium, prot_pdv, _sat, carbs_pdv = (
            float(v[0]), float(v[1]), float(v[2]), float(v[3]),
            float(v[4]), float(v[5]), float(v[6]),
        )
    except (TypeError, ValueError):
        return out
    out["kcal"] = round(kcal, 1)
    out["fat_g"] = round(fat_pdv * PDV_BASIS["fat_g"] / 100, 1)
    out["protein_g"] = round(prot_pdv * PDV_BASIS["protein_g"] / 100, 1)
    out["carbs_g"] = round(carbs_pdv * PDV_BASIS["carbs_g"] / 100, 1)
    return out


def row_to_record(row: dict[str, str]) -> dict[str, Any] | None:
    name = (row.get("name") or "").strip()
    src_id = (row.get("id") or "").strip()
    if not name or not src_id:
        return None
    nutrition = parse_nutrition(row.get("nutrition", ""))
    minutes_raw = row.get("minutes", "").strip()
    try:
        minutes = int(minutes_raw) if minutes_raw else None
    except ValueError:
        minutes = None
    return {
        "source": SOURCE,
        "source_id": src_id,
        "title": name[:500],
        "description": (row.get("description") or "").strip() or None,
        "image_url": None,  # dataset has no images
        "total_minutes": minutes,
        "servings": None,   # not in this dataset; users can scale on detail page
        "ingredients": parse_list(row.get("ingredients", "")),
        "instructions": parse_list(row.get("steps", "")),
        "tags": parse_list(row.get("tags", "")),
        **nutrition,
        "raw": {
            "n_steps": row.get("n_steps"),
            "n_ingredients": row.get("n_ingredients"),
            "submitted": row.get("submitted"),
            "contributor_id": row.get("contributor_id"),
        },
    }


# --------------------------------------------------------------------------- #
# Download
# --------------------------------------------------------------------------- #

def kaggle_download(dest_dir: Path) -> Path:
    """Use the Kaggle CLI to fetch RAW_recipes.csv. Requires kaggle.json."""
    import subprocess
    dest_dir.mkdir(parents=True, exist_ok=True)
    print("Downloading Food.com recipes from Kaggle...", flush=True)
    subprocess.check_call([
        "kaggle", "datasets", "download",
        "-d", "shuyangli94/food-com-recipes-and-user-interactions",
        "-f", "RAW_recipes.csv",
        "-p", str(dest_dir),
    ])
    zip_path = dest_dir / "RAW_recipes.csv.zip"
    csv_path = dest_dir / "RAW_recipes.csv"
    if zip_path.exists():
        with zipfile.ZipFile(zip_path) as zf:
            zf.extractall(dest_dir)
        zip_path.unlink()
    if not csv_path.exists():
        raise SystemExit(f"Expected {csv_path} after download, not found.")
    print(f"Saved {csv_path} ({csv_path.stat().st_size / 1e6:.1f} MB)")
    return csv_path


# --------------------------------------------------------------------------- #
# Upload
# --------------------------------------------------------------------------- #

def chunked(it: Iterable[dict], n: int) -> Iterator[list[dict]]:
    buf: list[dict] = []
    for x in it:
        buf.append(x)
        if len(buf) >= n:
            yield buf
            buf = []
    if buf:
        yield buf


def upsert_batch(
    rows: list[dict],
    supabase_url: str,
    service_key: str,
) -> None:
    """POST a batch with on_conflict=source,source_id for idempotent re-runs."""
    url = (
        f"{supabase_url}/rest/v1/{TABLE}"
        f"?on_conflict=source,source_id"
    )
    body = json.dumps(rows).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal",
        },
    )
    backoff = 1.0
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                if resp.status >= 300:
                    raise RuntimeError(
                        f"Upsert failed: HTTP {resp.status}: {resp.read()[:300]!r}"
                    )
            return
        except urllib.error.HTTPError as e:
            msg = e.read()[:500].decode("utf-8", "replace")
            if e.code in (429, 502, 503, 504) and attempt < 4:
                time.sleep(backoff)
                backoff *= 2
                continue
            raise RuntimeError(f"HTTP {e.code} from Supabase: {msg}") from e
        except urllib.error.URLError as e:
            if attempt < 4:
                time.sleep(backoff)
                backoff *= 2
                continue
            raise RuntimeError(f"Network error: {e}") from e


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #

def main() -> int:
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--download", action="store_true",
                   help="Fetch RAW_recipes.csv via the Kaggle CLI")
    g.add_argument("--csv", type=Path, help="Path to an existing RAW_recipes.csv")
    ap.add_argument("--limit", type=int, default=0,
                    help="Stop after N rows (0 = all)")
    ap.add_argument("--dry-run", action="store_true",
                    help="Parse + count only; don't upload")
    args = ap.parse_args()

    supabase_url = os.environ.get("SUPABASE_URL")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not args.dry_run and (not supabase_url or not service_key):
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.",
              file=sys.stderr)
        return 2

    csv_path = (
        kaggle_download(Path("/tmp/kaggle_recipes")) if args.download
        else args.csv
    )
    if not csv_path or not csv_path.exists():
        print(f"CSV not found: {csv_path}", file=sys.stderr)
        return 2

    print(f"Reading {csv_path}...", flush=True)
    # Some rows have very long step lists; bump CSV's field size limit.
    csv.field_size_limit(sys.maxsize)

    parsed = 0
    skipped = 0
    uploaded = 0
    t0 = time.time()

    def records() -> Iterator[dict]:
        nonlocal parsed, skipped
        with csv_path.open(newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                rec = row_to_record(row)
                if rec is None:
                    skipped += 1
                    continue
                parsed += 1
                if args.limit and parsed > args.limit:
                    return
                yield rec

    for batch in chunked(records(), BATCH_SIZE):
        if not args.dry_run:
            upsert_batch(batch, supabase_url, service_key)
        uploaded += len(batch)
        if uploaded % (BATCH_SIZE * 10) == 0:
            rate = uploaded / max(time.time() - t0, 0.01)
            print(f"  ...{uploaded:,} rows ({rate:,.0f}/s)", flush=True)

    elapsed = time.time() - t0
    print(
        f"Done. parsed={parsed:,} skipped={skipped:,} "
        f"uploaded={uploaded:,} in {elapsed:.1f}s"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())

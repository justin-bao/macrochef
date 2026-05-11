#!/usr/bin/env python3
"""
Import the Food.com recipes Kaggle dataset into the public.recipes table.

Dataset: shuyangli94/food-com-recipes-and-user-interactions
File used: RAW_recipes.csv  (~230k recipes)

Source columns:
    name, id, minutes, contributor_id, submitted, tags,
    nutrition, n_steps, steps, description, ingredients, n_ingredients
or the newer Food.com CSV export:
    RecipeId, Name, AuthorId, CookTime, PrepTime, TotalTime, Description,
    Images, Keywords, Calories, FatContent, CarbohydrateContent,
    ProteinContent, RecipeServings, RecipeIngredientParts,
    RecipeInstructions

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
import concurrent.futures
import csv
import gzip
import hashlib
import json
import math
import os
import re
import ssl
import sys
import time
import zipfile
from pathlib import Path
from typing import Any, Iterable, Iterator

import urllib.request
import urllib.error
import urllib.parse

SOURCE = "kaggle_food_com"
TABLE = "recipes"
DETAIL_TABLE = "recipe_detail_objects"
DETAIL_BUCKET = "recipe-details"
BATCH_SIZE = 500  # rows per POST; Supabase REST handles this fine
MAX_UPLOAD_ATTEMPTS = 10

# FDA reference daily values used by the dataset's PDV figures.
PDV_BASIS = {
    "fat_g": 65.0,
    "protein_g": 50.0,
    "carbs_g": 300.0,
}


def ssl_context() -> ssl.SSLContext:
    try:
        import certifi

        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        return ssl.create_default_context()


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


def parse_r_vector(cell: str) -> list[str]:
    """Parse R-style vectors such as c("a", "b") and character(0)."""
    if not cell:
        return []
    s = cell.strip()
    if not s or s == "character(0)":
        return []
    if s.startswith("c(") and s.endswith(")"):
        s = s[2:-1]
    try:
        return [str(x).strip() for x in next(csv.reader([s], skipinitialspace=True)) if str(x).strip()]
    except csv.Error:
        return []


def parse_float(cell: str) -> float | None:
    if cell == "":
        return None
    try:
        value = float(cell)
        if not math.isfinite(value):
            return None
        return round(value, 1)
    except (TypeError, ValueError):
        return None


def parse_iso_duration_minutes(cell: str) -> int | None:
    """Parse simple ISO-8601 durations used in the recipes.csv export."""
    if not cell:
        return None
    m = re.fullmatch(
        r"P(?:(?P<days>\d+(?:\.\d+)?)D)?(?:T(?:(?P<hours>\d+(?:\.\d+)?)H)?(?:(?P<minutes>\d+(?:\.\d+)?)M)?(?:(?P<seconds>\d+(?:\.\d+)?)S)?)?",
        cell.strip(),
    )
    if not m:
        return None
    days = float(m.group("days") or 0)
    hours = float(m.group("hours") or 0)
    minutes = float(m.group("minutes") or 0)
    seconds = float(m.group("seconds") or 0)
    total = days * 24 * 60 + hours * 60 + minutes + seconds / 60
    return int(round(total))


def safe_object_part(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]+", "_", value.strip()) or "unknown"


def recipe_pk(source_id: str) -> int | None:
    return int(source_id) if source_id.isdigit() else None


def detail_object_path(source: str, source_id: str) -> str:
    return f"{source}/{safe_object_part(source_id)}.json.gz"


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


def raw_recipe_row_to_record(row: dict[str, str]) -> dict[str, Any] | None:
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
    source = SOURCE
    object_path = detail_object_path(source, src_id)
    return {
        "id": recipe_pk(src_id),
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
        "detail_bucket_id": DETAIL_BUCKET,
        "detail_object_path": object_path,
        "raw": {
            "n_steps": row.get("n_steps"),
            "n_ingredients": row.get("n_ingredients"),
            "submitted": row.get("submitted"),
            "contributor_id": row.get("contributor_id"),
            "format": "raw_recipes_csv",
        },
    }


def recipes_csv_row_to_record(row: dict[str, str]) -> dict[str, Any] | None:
    name = (row.get("Name") or "").strip()
    src_id = (row.get("RecipeId") or "").strip()
    if not name or not src_id:
        return None

    image_url = None
    images = parse_r_vector(row.get("Images", ""))
    if images:
        image_url = images[0]

    servings = parse_float(row.get("RecipeServings", ""))
    total_minutes = parse_iso_duration_minutes(row.get("TotalTime", ""))
    if total_minutes is None:
        parts = [
            parse_iso_duration_minutes(row.get("CookTime", "")),
            parse_iso_duration_minutes(row.get("PrepTime", "")),
        ]
        total_minutes = sum(x for x in parts if x is not None) or None

    ingredient_parts = parse_r_vector(row.get("RecipeIngredientParts", ""))
    ingredient_quantities = parse_r_vector(row.get("RecipeIngredientQuantities", ""))
    if ingredient_quantities and len(ingredient_quantities) == len(ingredient_parts):
        ingredients = [
            f"{quantity} {name}".strip()
            for quantity, name in zip(ingredient_quantities, ingredient_parts)
        ]
    else:
        ingredients = ingredient_parts

    source = SOURCE
    object_path = detail_object_path(source, src_id)
    return {
        "id": recipe_pk(src_id),
        "source": SOURCE,
        "source_id": src_id,
        "title": name[:500],
        "description": (row.get("Description") or "").strip() or None,
        "image_url": image_url,
        "total_minutes": total_minutes,
        "servings": servings,
        "ingredients": ingredients,
        "instructions": parse_r_vector(row.get("RecipeInstructions", "")),
        "tags": parse_r_vector(row.get("Keywords", "")),
        "kcal": parse_float(row.get("Calories", "")),
        "fat_g": parse_float(row.get("FatContent", "")),
        "protein_g": parse_float(row.get("ProteinContent", "")),
        "carbs_g": parse_float(row.get("CarbohydrateContent", "")),
        "detail_bucket_id": DETAIL_BUCKET,
        "detail_object_path": object_path,
        "raw": {
            "author_id": row.get("AuthorId"),
            "author_name": row.get("AuthorName"),
            "date_published": row.get("DatePublished"),
            "category": row.get("RecipeCategory"),
            "rating": row.get("AggregatedRating"),
            "review_count": row.get("ReviewCount"),
            "recipe_yield": row.get("RecipeYield"),
            "ingredient_parts": ingredient_parts,
            "ingredient_quantities": ingredient_quantities,
            "images": images,
            "format": "recipes_csv",
        },
    }


def row_to_record(row: dict[str, str]) -> dict[str, Any] | None:
    if "RecipeId" in row:
        return recipes_csv_row_to_record(row)
    return raw_recipe_row_to_record(row)


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


def catalog_row(record: dict[str, Any]) -> dict[str, Any]:
    ingredients = record.get("ingredients")
    if not isinstance(ingredients, list):
        ingredients = []
    source_id = str(record["source_id"])
    row = {
        "source": record["source"],
        "source_id": source_id,
        "title": record["title"],
        "description": (record.get("description") or "")[:300] or None,
        "image_url": record.get("image_url"),
        "total_minutes": record.get("total_minutes"),
        "servings": record.get("servings"),
        "ingredients": ingredients,
        "instructions": [],
        "ingredient_names": ingredients,
        "kcal": record.get("kcal"),
        "protein_g": record.get("protein_g"),
        "carbs_g": record.get("carbs_g"),
        "fat_g": record.get("fat_g"),
        "detail_bucket_id": DETAIL_BUCKET,
        "detail_object_path": record["detail_object_path"],
    }
    pk = record.get("id") or recipe_pk(source_id)
    if pk is not None:
        row["id"] = pk
    return row


def detail_payload(record: dict[str, Any]) -> dict[str, Any]:
    return {
        "source": record["source"],
        "source_id": record["source_id"],
        "title": record["title"],
        "description": record.get("description"),
        "image_url": record.get("image_url"),
        "total_minutes": record.get("total_minutes"),
        "servings": record.get("servings"),
        "ingredients": record.get("ingredients") or [],
        "instructions": record.get("instructions") or [],
        "tags": record.get("tags") or [],
        "macros": {
            "kcal": record.get("kcal"),
            "protein_g": record.get("protein_g"),
            "carbs_g": record.get("carbs_g"),
            "fat_g": record.get("fat_g"),
        },
        "raw": record.get("raw") or {},
    }


def detail_bytes(record: dict[str, Any]) -> bytes:
    body = json.dumps(detail_payload(record), ensure_ascii=False, allow_nan=False).encode("utf-8")
    return gzip.compress(body, compresslevel=6)


def detail_metadata_row(record: dict[str, Any], body: bytes) -> dict[str, Any]:
    source_id = str(record["source_id"])
    pk = record.get("id") or recipe_pk(source_id)
    if pk is None:
        raise ValueError(f"Cannot derive numeric recipe id for source_id={source_id!r}")
    return {
        "recipe_id": pk,
        "source": record["source"],
        "source_id": source_id,
        "bucket_id": DETAIL_BUCKET,
        "object_path": record["detail_object_path"],
        "content_type": "application/json",
        "content_encoding": "gzip",
        "byte_size": len(body),
        "content_sha256": hashlib.sha256(body).hexdigest(),
    }


def request_with_retries(req: urllib.request.Request, context: ssl.SSLContext) -> bytes:
    backoff = 1.0
    for attempt in range(MAX_UPLOAD_ATTEMPTS):
        try:
            with urllib.request.urlopen(req, timeout=60, context=context) as resp:
                data = resp.read()
                if resp.status >= 300:
                    raise RuntimeError(f"HTTP {resp.status}: {data[:300]!r}")
                return data
        except urllib.error.HTTPError as e:
            msg = e.read()[:500].decode("utf-8", "replace")
            if e.code in (429, 502, 503, 504) and attempt < MAX_UPLOAD_ATTEMPTS - 1:
                time.sleep(backoff)
                backoff = min(backoff * 2, 30)
                continue
            raise RuntimeError(f"HTTP {e.code} from Supabase: {msg}") from e
        except urllib.error.URLError as e:
            if attempt < MAX_UPLOAD_ATTEMPTS - 1:
                time.sleep(backoff)
                backoff = min(backoff * 2, 30)
                continue
            raise RuntimeError(f"Network error: {e}") from e
        except (ssl.SSLError, TimeoutError, OSError) as e:
            if attempt < MAX_UPLOAD_ATTEMPTS - 1:
                time.sleep(backoff)
                backoff = min(backoff * 2, 30)
                continue
            raise RuntimeError(f"Network error: {e}") from e
    raise RuntimeError("unreachable")


def upload_detail_object(
    record: dict[str, Any],
    body: bytes,
    supabase_url: str,
    service_key: str,
    context: ssl.SSLContext,
) -> None:
    object_path = urllib.parse.quote(record["detail_object_path"], safe="/")
    url = f"{supabase_url}/storage/v1/object/{DETAIL_BUCKET}/{object_path}"
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/gzip",
            "Cache-Control": "public, max-age=31536000, immutable",
            "x-upsert": "true",
        },
    )
    request_with_retries(req, context)


def upsert_table_batch(
    table: str,
    rows: list[dict],
    supabase_url: str,
    service_key: str,
    on_conflict: str,
) -> None:
    """POST a batch with on_conflict for idempotent re-runs."""
    url = f"{supabase_url}/rest/v1/{table}?on_conflict={urllib.parse.quote(on_conflict)}"
    body = json.dumps(rows, allow_nan=False).encode("utf-8")
    context = ssl_context()
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
    for attempt in range(MAX_UPLOAD_ATTEMPTS):
        try:
            with urllib.request.urlopen(req, timeout=60, context=context) as resp:
                if resp.status >= 300:
                    raise RuntimeError(
                        f"Upsert failed: HTTP {resp.status}: {resp.read()[:300]!r}"
                    )
            return
        except urllib.error.HTTPError as e:
            msg = e.read()[:500].decode("utf-8", "replace")
            if e.code == 400 and len(rows) > 1:
                mid = len(rows) // 2
                upsert_table_batch(table, rows[:mid], supabase_url, service_key, on_conflict)
                upsert_table_batch(table, rows[mid:], supabase_url, service_key, on_conflict)
                return
            if e.code == 400 and len(rows) == 1:
                row = rows[0]
                print(
                    "WARNING: skipping row rejected by Supabase "
                    f"source_id={row.get('source_id')} title={row.get('title')!r}: {msg}",
                    file=sys.stderr,
                    flush=True,
                )
                return
            if e.code in (429, 502, 503, 504) and attempt < MAX_UPLOAD_ATTEMPTS - 1:
                time.sleep(backoff)
                backoff = min(backoff * 2, 30)
                continue
            raise RuntimeError(f"HTTP {e.code} from Supabase: {msg}") from e
        except urllib.error.URLError as e:
            if attempt < MAX_UPLOAD_ATTEMPTS - 1:
                time.sleep(backoff)
                backoff = min(backoff * 2, 30)
                continue
            raise RuntimeError(f"Network error: {e}") from e
        except (ssl.SSLError, TimeoutError, OSError) as e:
            if attempt < MAX_UPLOAD_ATTEMPTS - 1:
                time.sleep(backoff)
                backoff = min(backoff * 2, 30)
                continue
            raise RuntimeError(f"Network error: {e}") from e


def upsert_catalog_batch(
    records: list[dict],
    supabase_url: str,
    service_key: str,
    upload_details: bool,
    detail_workers: int,
) -> None:
    context = ssl_context()
    bodies: list[tuple[dict[str, Any], bytes]] = [(record, detail_bytes(record)) for record in records]
    if upload_details:
        if detail_workers <= 1:
            for record, body in bodies:
                upload_detail_object(record, body, supabase_url, service_key, context)
        else:
            with concurrent.futures.ThreadPoolExecutor(max_workers=detail_workers) as executor:
                futures = [
                    executor.submit(
                        upload_detail_object,
                        record,
                        body,
                        supabase_url,
                        service_key,
                        context,
                    )
                    for record, body in bodies
                ]
                for future in concurrent.futures.as_completed(futures):
                    future.result()
    upsert_table_batch(
        TABLE,
        [catalog_row(record) for record in records],
        supabase_url,
        service_key,
        "source,source_id",
    )
    if upload_details:
        upsert_table_batch(
            DETAIL_TABLE,
            [detail_metadata_row(record, body) for record, body in bodies],
            supabase_url,
            service_key,
            "source,source_id",
        )


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
    ap.add_argument("--offset", type=int, default=0,
                    help="Skip the first N parsed rows before uploading")
    ap.add_argument("--no-details", action="store_true",
                    help="Only import the lean recipes table; skip Storage detail objects")
    ap.add_argument("--details-workers", type=int, default=1,
                    help="Parallel Storage uploads for full recipe details (try 8-16)")
    ap.add_argument("--dry-run", action="store_true",
                    help="Parse + count only; don't upload")
    args = ap.parse_args()

    env_path = Path(".env")
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key, value.strip().strip('"').strip("'"))

    supabase_url = os.environ.get("SUPABASE_URL")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not args.dry_run and (not supabase_url or not service_key):
        print(
            "ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.",
            file=sys.stderr,
        )
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
    offset_skipped = 0
    uploaded = 0
    t0 = time.time()

    def log_progress(force: bool = False) -> None:
        if not force and uploaded % BATCH_SIZE != 0:
            return
        elapsed = time.time() - t0
        rate = uploaded / max(elapsed, 0.01)
        resume_offset = max(parsed, args.offset)
        print(
            "  checkpoint "
            f"source_row={parsed:,} "
            f"resume_offset={resume_offset:,} "
            f"uploaded_this_run={uploaded:,} "
            f"skipped={skipped:,} "
            f"rate={rate:,.0f}/s",
            flush=True,
        )
        print(
            "  resume with: "
            f"python3 scripts/import_kaggle_recipes.py --csv {csv_path} --offset {resume_offset}"
            f"{' --no-details' if args.no_details else ''}"
            f"{f' --details-workers {args.details_workers}' if args.details_workers != 1 else ''}",
            flush=True,
        )

    def records() -> Iterator[dict]:
        nonlocal parsed, skipped, offset_skipped
        with csv_path.open(newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                rec = row_to_record(row)
                if rec is None:
                    skipped += 1
                    continue
                parsed += 1
                if args.offset and parsed <= args.offset:
                    offset_skipped += 1
                    continue
                if args.limit and parsed > args.limit:
                    return
                yield rec

    for batch in chunked(records(), BATCH_SIZE):
        if not args.dry_run:
            upsert_catalog_batch(
                batch,
                supabase_url,
                service_key,
                upload_details=not args.no_details,
                detail_workers=max(1, args.details_workers),
            )
        uploaded += len(batch)
        log_progress()

    elapsed = time.time() - t0
    print(
        f"Done. parsed={parsed:,} skipped={skipped:,} "
        f"offset_skipped={offset_skipped:,} uploaded={uploaded:,} in {elapsed:.1f}s"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())

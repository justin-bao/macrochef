import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const NUTRITIONIX_BASE = "https://trackapi.nutritionix.com/v2";

function nutritionixHeaders() {
  const appId = process.env.NUTRITIONIX_APP_ID;
  const appKey = process.env.NUTRITIONIX_APP_KEY;
  if (!appId || !appKey) {
    throw new Error("NUTRITIONIX_APP_ID and NUTRITIONIX_APP_KEY are not configured");
  }
  return {
    "Content-Type": "application/json",
    "x-app-id": appId,
    "x-app-key": appKey,
  };
}

export type MenuItem = {
  id: string;
  title: string;
  restaurantChain: string;
  image?: string;
  servings?: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type Macros = { kcal: number; protein_g: number; carbs_g: number; fat_g: number };

export type Combo = {
  items: MenuItem[];
  totals: Macros;
  score: number;
};

type NutriItem = {
  nix_item_id?: string;
  food_name?: string;
  brand_name?: string;
  serving_qty?: number;
  serving_unit?: string;
  nf_calories?: number;
  nf_total_fat?: number;
  nf_total_carbohydrate?: number;
  nf_protein?: number;
  photo?: { thumb?: string };
};

type NutriSearchResponse = {
  branded?: NutriItem[];
};

// List the chains we expose to users.
export const SUPPORTED_CHAINS = [
  "McDonald's",
  "Chipotle",
  "Taco Bell",
  "Subway",
  "Chick-fil-A",
  "Wendy's",
  "Burger King",
  "Starbucks",
  "Panera Bread",
  "Domino's Pizza",
  "Pizza Hut",
  "KFC",
  "Five Guys",
  "Shake Shack",
  "Sweetgreen",
] as const;

export type Chain = (typeof SUPPORTED_CHAINS)[number];

export const searchRestaurantCombos = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      chain: z.string().min(1).max(60),
      query: z.string().trim().max(120).optional().default(""),
      kcal: z.number().positive().nullable().optional(),
      protein_g: z.number().positive().nullable().optional(),
      carbs_g: z.number().positive().nullable().optional(),
      fat_g: z.number().positive().nullable().optional(),
      // Max number of items per combo (1 = single item, 4 = up to a meal of 4).
      maxItems: z.number().int().min(1).max(4).default(3),
      // How many top combos to return.
      number: z.number().int().min(1).max(20).default(8),
    }).parse,
  )
  .handler(async ({ data }) => {
    let headers: Record<string, string>;
    try {
      headers = nutritionixHeaders();
    } catch (err) {
      return {
        combos: [] as Combo[],
        items: [] as MenuItem[],
        error: err instanceof Error ? err.message : "Nutritionix is not configured.",
      };
    }

    const searchQuery = data.query ? `${data.chain} ${data.query}` : data.chain;
    const res = await fetch(`${NUTRITIONIX_BASE}/search/instant`, {
      method: "POST",
      headers,
      body: JSON.stringify({ query: searchQuery, branded: true, self: false, common: false }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Nutritionix search failed", res.status, text);
      return {
        combos: [] as Combo[],
        items: [] as MenuItem[],
        error: `Search failed (${res.status})`,
      };
    }

    const json = (await res.json()) as NutriSearchResponse;
    const branded = json.branded ?? [];

    const chainLower = data.chain.toLowerCase();
    const items: MenuItem[] = branded
      .map((item): MenuItem | null => {
        const kcal = item.nf_calories;
        if (!kcal || kcal <= 0) return null;

        const brand = item.brand_name ?? "";
        const searchable = `${item.food_name ?? ""} ${brand}`.toLowerCase();
        if (!searchable.includes(chainLower) && !chainLower.includes(brand.toLowerCase())) {
          return null;
        }

        return {
          id: item.nix_item_id ?? `${item.food_name}-${item.brand_name}`,
          title:
            brand && !(item.food_name ?? "").toLowerCase().includes(brand.toLowerCase())
              ? `${brand} ${item.food_name ?? ""}`
              : (item.food_name ?? "Untitled"),
          restaurantChain: brand || data.chain,
          image: item.photo?.thumb,
          servings: item.serving_qty ?? 1,
          kcal: Math.round(kcal),
          protein_g: Math.round((item.nf_protein ?? 0) * 10) / 10,
          carbs_g: Math.round((item.nf_total_carbohydrate ?? 0) * 10) / 10,
          fat_g: Math.round((item.nf_total_fat ?? 0) * 10) / 10,
        };
      })
      .filter((m): m is MenuItem => m !== null);

    // De-dupe by id.
    const seen = new Set<string>();
    const uniqueItems = items.filter((i) => {
      if (seen.has(i.id)) return false;
      seen.add(i.id);
      return true;
    });

    const targets = {
      kcal: data.kcal ?? null,
      protein_g: data.protein_g ?? null,
      carbs_g: data.carbs_g ?? null,
      fat_g: data.fat_g ?? null,
    };
    const anyTarget =
      targets.kcal != null ||
      targets.protein_g != null ||
      targets.carbs_g != null ||
      targets.fat_g != null;

    // If no targets, return individual items as single-item combos.
    if (!anyTarget) {
      return {
        combos: uniqueItems.slice(0, data.number).map((it) => ({
          items: [it],
          totals: {
            kcal: it.kcal,
            protein_g: it.protein_g,
            carbs_g: it.carbs_g,
            fat_g: it.fat_g,
          },
          score: 0,
        })),
        items: uniqueItems,
        error: null,
      };
    }

    // Prune candidate pool, then enumerate combos up to maxItems in size.
    const POOL_SIZE = 20;
    const itemScore = (m: MenuItem) => macroDistance(m, targets);
    const pool = [...uniqueItems].sort((a, b) => itemScore(a) - itemScore(b)).slice(0, POOL_SIZE);

    const combos: Combo[] = [];
    const enumerate = (start: number, picked: MenuItem[]) => {
      if (picked.length >= 1) {
        const totals = sumMacros(picked);
        combos.push({ items: picked.slice(), totals, score: macroDistance(totals, targets) });
      }
      if (picked.length >= data.maxItems) return;
      for (let i = start; i < pool.length; i++) {
        picked.push(pool[i]);
        enumerate(i + 1, picked);
        picked.pop();
      }
    };
    enumerate(0, []);

    combos.sort((a, b) => a.score - b.score);
    return {
      combos: combos.slice(0, data.number),
      items: uniqueItems,
      error: null,
    };
  });

function sumMacros(items: MenuItem[]): Macros {
  return items.reduce(
    (acc, it) => ({
      kcal: acc.kcal + it.kcal,
      protein_g: Math.round((acc.protein_g + it.protein_g) * 10) / 10,
      carbs_g: Math.round((acc.carbs_g + it.carbs_g) * 10) / 10,
      fat_g: Math.round((acc.fat_g + it.fat_g) * 10) / 10,
    }),
    { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
}

function macroDistance(
  m: Macros,
  t: {
    kcal: number | null;
    protein_g: number | null;
    carbs_g: number | null;
    fat_g: number | null;
  },
): number {
  const parts: number[] = [];
  const push = (actual: number, target: number | null) => {
    if (target == null || target <= 0) return;
    parts.push(((actual - target) / target) ** 2);
  };
  push(m.kcal, t.kcal);
  push(m.protein_g, t.protein_g);
  push(m.carbs_g, t.carbs_g);
  push(m.fat_g, t.fat_g);
  if (parts.length === 0) return 0;
  return Math.sqrt(parts.reduce((a, b) => a + b, 0) / parts.length);
}

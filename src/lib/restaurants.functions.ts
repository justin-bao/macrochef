import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const KEY = () => process.env.SPOONACULAR_API_KEY;
const BASE = "https://api.spoonacular.com";

function requireKey() {
  const k = KEY();
  if (!k) throw new Error("SPOONACULAR_API_KEY is not configured");
  return k;
}

export type MenuItem = {
  id: number;
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

// List the chains we expose to users. Spoonacular's menu item DB skews toward
// these large US chains, so a curated allow-list keeps the UX coherent.
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
    const key = requireKey();

    const params = new URLSearchParams({
      apiKey: key,
      number: "60",
      addMenuItemInformation: "true",
    });
    // Spoonacular requires `query`; pass the chain as the search query and
    // filter by exact chain client-side. If user provided a free-text query,
    // include it too.
    params.set("query", data.query ? `${data.chain} ${data.query}` : data.chain);

    const res = await fetch(`${BASE}/food/menuItems/search?${params}`);
    if (!res.ok) {
      const text = await res.text();
      console.error("Spoonacular menuItems failed", res.status, text);
      return { combos: [] as Combo[], items: [] as MenuItem[], error: `Search failed (${res.status})` };
    }
    const json = (await res.json()) as { menuItems?: any[] };

    const chainLower = data.chain.toLowerCase();
    const items: MenuItem[] = (json.menuItems ?? [])
      .map((m): MenuItem | null => {
        const restaurant = String(m.restaurantChain ?? "");
        if (!restaurant.toLowerCase().includes(chainLower) &&
            !chainLower.includes(restaurant.toLowerCase())) {
          return null;
        }
        const nut = m.nutrition?.nutrients ?? [];
        const find = (n: string) => {
          const hit = nut.find((x: any) => String(x.name).toLowerCase() === n.toLowerCase());
          return hit ? Number(hit.amount) || 0 : 0;
        };
        const kcal = find("Calories");
        // Drop items without nutrition data — they can't be ranked.
        if (kcal <= 0) return null;
        return {
          id: Number(m.id),
          title: String(m.title ?? "Untitled"),
          restaurantChain: restaurant,
          image: m.image ? String(m.image) : undefined,
          servings: m.servings?.number ?? 1,
          kcal: Math.round(kcal),
          protein_g: Math.round(find("Protein") * 10) / 10,
          carbs_g: Math.round(find("Carbohydrates") * 10) / 10,
          fat_g: Math.round(find("Fat") * 10) / 10,
        };
      })
      .filter((m): m is MenuItem => m !== null);

    // De-dupe by id.
    const seen = new Set<number>();
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

    // If no targets, just return individual items sorted alphabetically.
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

    // To bound combinatorics, prune the candidate pool. Sort by per-item
    // distance to the target proportions, keep top N, then enumerate combos
    // up to maxItems in size.
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
    // Keep variety: avoid returning many combos that are simple supersets of
    // the same base item. Dedupe by sorted-id signature is implicit; we just
    // limit to top N.
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
  t: { kcal: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null },
): number {
  // Normalized squared error across whichever targets the user supplied.
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

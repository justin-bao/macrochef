import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const TOKEN_URL = "https://oauth.fatsecret.com/connect/token";
const SEARCH_URL = "https://platform.fatsecret.com/rest/foods/search/v1";

let tokenCache: { accessToken: string; expiresAt: number } | null = null;

function requireFatSecretCredentials() {
  const clientId = process.env.FATSECRET_CLIENT_ID;
  const clientSecret = process.env.FATSECRET_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("FATSECRET_CLIENT_ID and FATSECRET_CLIENT_SECRET are not configured");
  }
  return { clientId, clientSecret };
}

function basicAuth(clientId: string, clientSecret: string) {
  const raw = `${clientId}:${clientSecret}`;
  if (typeof btoa !== "undefined") return btoa(raw);
  return Buffer.from(raw, "utf-8").toString("base64");
}

async function getFatSecretToken() {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 60_000) return tokenCache.accessToken;

  const { clientId, clientSecret } = requireFatSecretCredentials();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth(clientId, clientSecret)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials", scope: "basic" }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("FatSecret token request failed", res.status, text);
    const detail = parseFatSecretAuthError(text);
    throw new Error(
      detail === "invalid_client"
        ? "FatSecret rejected the OAuth client credentials (invalid_client). Check that FATSECRET_CLIENT_ID/FATSECRET_CLIENT_SECRET are the OAuth 2 Client ID/Secret, and that this server's outbound IP is whitelisted in your FatSecret app."
        : `FatSecret authentication failed (${res.status})${detail ? `: ${detail}` : ""}`,
    );
  }

  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) throw new Error("FatSecret authentication did not return a token");
  tokenCache = {
    accessToken: json.access_token,
    expiresAt: now + Math.max(60, json.expires_in ?? 3600) * 1000,
  };
  return tokenCache.accessToken;
}

function parseFatSecretAuthError(text: string) {
  try {
    const json = JSON.parse(text) as { error?: string; error_description?: string };
    return json.error_description ?? json.error ?? text;
  } catch {
    return text;
  }
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

type FatSecretFood = {
  food_id?: string;
  food_name?: string;
  brand_name?: string;
  food_description?: string;
};

type FatSecretSearchResponse = {
  foods?: {
    food?: FatSecretFood | FatSecretFood[];
  };
};

// List the chains we expose to users. FatSecret coverage is strongest for
// larger brands, so a curated allow-list keeps the UX coherent.
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
    const token = await getFatSecretToken();

    const params = new URLSearchParams({
      search_expression: data.query ? `${data.chain} ${data.query}` : data.chain,
      max_results: "50",
      page_number: "0",
      format: "json",
    });

    const res = await fetch(`${SEARCH_URL}?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("FatSecret foods.search failed", res.status, text);
      return {
        combos: [] as Combo[],
        items: [] as MenuItem[],
        error: `Search failed (${res.status})`,
      };
    }
    const json = (await res.json()) as FatSecretSearchResponse;
    const foods = Array.isArray(json.foods?.food)
      ? json.foods.food
      : json.foods?.food
        ? [json.foods.food]
        : [];

    const chainLower = data.chain.toLowerCase();
    const items: MenuItem[] = foods
      .map((food): MenuItem | null => {
        const title = String(food.food_name ?? "Untitled");
        const brand = String(food.brand_name ?? "");
        const searchable = `${title} ${brand}`.toLowerCase();
        if (!searchable.includes(chainLower) && !chainLower.includes(brand.toLowerCase())) {
          return null;
        }
        const macros = parseFatSecretDescription(food.food_description ?? "");
        const kcal = macros.kcal;
        // Drop items without nutrition data — they can't be ranked.
        if (kcal <= 0) return null;
        return {
          id: Number(food.food_id),
          title:
            brand && !title.toLowerCase().includes(brand.toLowerCase())
              ? `${brand} ${title}`
              : title,
          restaurantChain: brand || data.chain,
          servings: 1,
          kcal: Math.round(kcal),
          protein_g: Math.round(macros.protein_g * 10) / 10,
          carbs_g: Math.round(macros.carbs_g * 10) / 10,
          fat_g: Math.round(macros.fat_g * 10) / 10,
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
  t: {
    kcal: number | null;
    protein_g: number | null;
    carbs_g: number | null;
    fat_g: number | null;
  },
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

function parseFatSecretDescription(description: string): Macros {
  const calories =
    description.match(/Calories:\s*([0-9.]+)\s*k?cal/i)?.[1] ??
    description.match(/([0-9.]+)\s*kcal/i)?.[1];
  const fat = description.match(/Fat:\s*([0-9.]+)\s*g/i)?.[1];
  const carbs = description.match(/Carbs?:\s*([0-9.]+)\s*g/i)?.[1];
  const protein = description.match(/Protein:\s*([0-9.]+)\s*g/i)?.[1];

  return {
    kcal: Number(calories) || 0,
    protein_g: Number(protein) || 0,
    carbs_g: Number(carbs) || 0,
    fat_g: Number(fat) || 0,
  };
}

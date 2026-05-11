import { c as createServerRpc } from "./createServerRpc-wV0Vk4NU.mjs";
import { c as createServerFn } from "./index.mjs";
import "../_libs/seroval.mjs";
import "../_libs/react.mjs";
import { o as objectType, n as numberType, s as stringType } from "../_libs/zod.mjs";
import "node:async_hooks";
import "../_libs/h3-v2.mjs";
import "../_libs/rou3.mjs";
import "../_libs/srvx.mjs";
import "node:stream";
import "../_libs/tanstack__router-core.mjs";
import "../_libs/tanstack__history.mjs";
import "../_libs/cookie-es.mjs";
import "../_libs/seroval-plugins.mjs";
import "node:stream/web";
import "../_libs/tanstack__react-router.mjs";
import "../_libs/react-dom.mjs";
import "util";
import "crypto";
import "async_hooks";
import "stream";
import "../_libs/isbot.mjs";
const KEY = () => process.env.SPOONACULAR_API_KEY;
const BASE = "https://api.spoonacular.com";
function requireKey() {
  const k = KEY();
  if (!k) throw new Error("SPOONACULAR_API_KEY is not configured");
  return k;
}
const searchRestaurantCombos_createServerFn_handler = createServerRpc({
  id: "f635dc7bf7e2c59bf393e64905411452d1277acee013567b2b7aace652895de3",
  name: "searchRestaurantCombos",
  filename: "src/lib/restaurants.functions.ts"
}, (opts) => searchRestaurantCombos.__executeServer(opts));
const searchRestaurantCombos = createServerFn({
  method: "POST"
}).inputValidator(objectType({
  chain: stringType().min(1).max(60),
  query: stringType().trim().max(120).optional().default(""),
  kcal: numberType().positive().nullable().optional(),
  protein_g: numberType().positive().nullable().optional(),
  carbs_g: numberType().positive().nullable().optional(),
  fat_g: numberType().positive().nullable().optional(),
  // Max number of items per combo (1 = single item, 4 = up to a meal of 4).
  maxItems: numberType().int().min(1).max(4).default(3),
  // How many top combos to return.
  number: numberType().int().min(1).max(20).default(8)
}).parse).handler(searchRestaurantCombos_createServerFn_handler, async ({
  data
}) => {
  const key = requireKey();
  const params = new URLSearchParams({
    apiKey: key,
    number: "60",
    addMenuItemInformation: "true"
  });
  params.set("query", data.query ? `${data.chain} ${data.query}` : data.chain);
  const res = await fetch(`${BASE}/food/menuItems/search?${params}`);
  if (!res.ok) {
    const text = await res.text();
    console.error("Spoonacular menuItems failed", res.status, text);
    return {
      combos: [],
      items: [],
      error: `Search failed (${res.status})`
    };
  }
  const json = await res.json();
  const chainLower = data.chain.toLowerCase();
  const items = (json.menuItems ?? []).map((m) => {
    const restaurant = String(m.restaurantChain ?? "");
    if (!restaurant.toLowerCase().includes(chainLower) && !chainLower.includes(restaurant.toLowerCase())) {
      return null;
    }
    const nut = m.nutrition?.nutrients ?? [];
    const find = (n) => {
      const hit = nut.find((x) => String(x.name).toLowerCase() === n.toLowerCase());
      return hit ? Number(hit.amount) || 0 : 0;
    };
    const kcal = find("Calories");
    if (kcal <= 0) return null;
    return {
      id: Number(m.id),
      title: String(m.title ?? "Untitled"),
      restaurantChain: restaurant,
      image: m.image ? String(m.image) : void 0,
      servings: m.servings?.number ?? 1,
      kcal: Math.round(kcal),
      protein_g: Math.round(find("Protein") * 10) / 10,
      carbs_g: Math.round(find("Carbohydrates") * 10) / 10,
      fat_g: Math.round(find("Fat") * 10) / 10
    };
  }).filter((m) => m !== null);
  const seen = /* @__PURE__ */ new Set();
  const uniqueItems = items.filter((i) => {
    if (seen.has(i.id)) return false;
    seen.add(i.id);
    return true;
  });
  const targets = {
    kcal: data.kcal ?? null,
    protein_g: data.protein_g ?? null,
    carbs_g: data.carbs_g ?? null,
    fat_g: data.fat_g ?? null
  };
  const anyTarget = targets.kcal != null || targets.protein_g != null || targets.carbs_g != null || targets.fat_g != null;
  if (!anyTarget) {
    return {
      combos: uniqueItems.slice(0, data.number).map((it) => ({
        items: [it],
        totals: {
          kcal: it.kcal,
          protein_g: it.protein_g,
          carbs_g: it.carbs_g,
          fat_g: it.fat_g
        },
        score: 0
      })),
      items: uniqueItems,
      error: null
    };
  }
  const POOL_SIZE = 20;
  const itemScore = (m) => macroDistance(m, targets);
  const pool = [...uniqueItems].sort((a, b) => itemScore(a) - itemScore(b)).slice(0, POOL_SIZE);
  const combos = [];
  const enumerate = (start, picked) => {
    if (picked.length >= 1) {
      const totals = sumMacros(picked);
      combos.push({
        items: picked.slice(),
        totals,
        score: macroDistance(totals, targets)
      });
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
    error: null
  };
});
function sumMacros(items) {
  return items.reduce((acc, it) => ({
    kcal: acc.kcal + it.kcal,
    protein_g: Math.round((acc.protein_g + it.protein_g) * 10) / 10,
    carbs_g: Math.round((acc.carbs_g + it.carbs_g) * 10) / 10,
    fat_g: Math.round((acc.fat_g + it.fat_g) * 10) / 10
  }), {
    kcal: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0
  });
}
function macroDistance(m, t) {
  const parts = [];
  const push = (actual, target) => {
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
export {
  searchRestaurantCombos_createServerFn_handler
};

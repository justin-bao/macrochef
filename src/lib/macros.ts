export type Macros = { kcal: number; protein_g: number; carbs_g: number; fat_g: number };

export type Ingredient = {
  id: number;
  name: string;
  original: string;
  amount: number;
  unit: string;
  // per-ingredient nutrition for the original amount
  kcal?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
};

export type Swap = {
  from: string;
  to: string;
  reason: string;
  delta: Partial<Macros>;
  applied?: boolean;
};

export function scaleIngredients(
  ingredients: Ingredient[],
  factor: number,
): Ingredient[] {
  return ingredients.map((i) => ({
    ...i,
    amount: Math.round(i.amount * factor * 100) / 100,
    kcal: i.kcal != null ? Math.round(i.kcal * factor) : undefined,
    protein_g: i.protein_g != null ? Math.round(i.protein_g * factor * 10) / 10 : undefined,
    carbs_g: i.carbs_g != null ? Math.round(i.carbs_g * factor * 10) / 10 : undefined,
    fat_g: i.fat_g != null ? Math.round(i.fat_g * factor * 10) / 10 : undefined,
  }));
}

export function sumMacros(ingredients: Ingredient[]): Macros {
  return ingredients.reduce(
    (acc, i) => ({
      kcal: acc.kcal + (i.kcal ?? 0),
      protein_g: acc.protein_g + (i.protein_g ?? 0),
      carbs_g: acc.carbs_g + (i.carbs_g ?? 0),
      fat_g: acc.fat_g + (i.fat_g ?? 0),
    }),
    { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
}

export function applySwaps(
  ingredients: Ingredient[],
  swaps: Swap[],
): Ingredient[] {
  const active = swaps.filter((s) => s.applied);
  return ingredients.map((i) => {
    const swap = active.find(
      (s) => i.name.toLowerCase().includes(s.from.toLowerCase()) || s.from.toLowerCase().includes(i.name.toLowerCase()),
    );
    if (!swap) return i;
    return {
      ...i,
      name: swap.to,
      kcal: i.kcal != null && swap.delta.kcal != null ? Math.max(0, i.kcal + swap.delta.kcal) : i.kcal,
      protein_g: i.protein_g != null && swap.delta.protein_g != null ? Math.max(0, i.protein_g + swap.delta.protein_g) : i.protein_g,
      carbs_g: i.carbs_g != null && swap.delta.carbs_g != null ? Math.max(0, i.carbs_g + swap.delta.carbs_g) : i.carbs_g,
      fat_g: i.fat_g != null && swap.delta.fat_g != null ? Math.max(0, i.fat_g + swap.delta.fat_g) : i.fat_g,
    };
  });
}

import type { MealIngredient } from "@/lib/meal-ingredients";
import { NutritionEvidence } from "./NutritionEvidence";

export function IngredientBreakdown({ ingredients, published = false }: { ingredients?: MealIngredient[]; published?: boolean }) {
  if (!ingredients?.length) return null;
  return <details className="mt-3 border-t pt-3 text-sm"><summary className="cursor-pointer font-medium">Ingredient breakdown · {ingredients.length}</summary>
    {published && <p className="mt-2 text-xs text-muted-foreground">Ingredient amounts are inferred; the meal total uses published nutrition.</p>}
    <div className="mt-3 divide-y">{ingredients.map((i, index) => <section key={`${i.name}-${index}`} className="min-w-0 py-3">
      <h5 className="break-words font-medium">{i.name}</h5><p className="mt-1 text-xs text-muted-foreground">{i.quantity} {i.unit} · {i.portionConfirmed ? "Provided quantity" : "Estimated quantity"}</p>
      <dl className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">{([["kcal", "Calories", "kcal"], ["protein_g", "Protein", "g"], ["carbs_g", "Carbs", "g"], ["fat_g", "Fat", "g"]] as const).map(([key, label, unit]) => <div key={key}><dt className="text-muted-foreground">{label}</dt><dd className="font-medium">≈ {i[key]} {unit}</dd></div>)}</dl>
      <p className="mt-2 text-xs text-muted-foreground">{i.portionAssumption}</p><NutritionEvidence evidence={i.evidence} />
    </section>)}</div>
  </details>;
}
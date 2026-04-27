import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { getRecipe, suggestSwaps, type RecipeDetail } from "@/lib/recipes.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MacroBar } from "@/components/MacroBar";
import { MacroInputs } from "@/components/MacroInputs";
import { Sparkles, Calculator, BookmarkPlus, Clock, ExternalLink, RotateCcw, CheckCircle2 } from "lucide-react";
import {
  applySwaps,
  scaleIngredients,
  sumMacros,
  type Ingredient,
  type Macros,
  type Swap,
} from "@/lib/macros";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const searchSchema = z.object({
  kcal: z.coerce.number().catch(600),
  p: z.coerce.number().catch(40),
  c: z.coerce.number().catch(60),
  f: z.coerce.number().catch(20),
});

export const Route = createFileRoute("/recipe/$id")({
  validateSearch: searchSchema.parse,
  head: ({ params }) => ({
    meta: [
      { title: `Recipe ${params.id} — MacroChef` },
      { name: "description", content: "Tune this recipe to your macronutrient targets." },
    ],
  }),
  component: RecipePage,
});

function RecipePage() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const { user } = useAuth();

  const target: Macros = {
    kcal: search.kcal,
    protein_g: search.p,
    carbs_g: search.c,
    fat_g: search.f,
  };
  const [editingTarget, setEditingTarget] = useState(target);
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [swaps, setSwaps] = useState<Swap[]>([]);
  const [loadingSwaps, setLoadingSwaps] = useState(false);
  const [scaleFactor, setScaleFactor] = useState(1);
  const [scaleMode, setScaleMode] = useState<"perServing" | "total">("perServing");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getRecipe({ data: { id: Number(id) } })
      .then((r) => {
        if (cancelled) return;
        setRecipe(r.recipe);
        setError(r.error);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Working ingredient list = scaled + swapped
  const workingIngredients: Ingredient[] = useMemo(() => {
    if (!recipe) return [];
    return applySwaps(scaleIngredients(recipe.ingredients, scaleFactor), swaps);
  }, [recipe, scaleFactor, swaps]);

  const totalMacros = useMemo(() => sumMacros(workingIngredients), [workingIngredients]);
  const perServing = useMemo(() => {
    const s = recipe?.servings || 1;
    return {
      kcal: totalMacros.kcal / s,
      protein_g: totalMacros.protein_g / s,
      carbs_g: totalMacros.carbs_g / s,
      fat_g: totalMacros.fat_g / s,
    };
  }, [totalMacros, recipe]);

  const generateSwaps = async () => {
    if (!recipe) return;
    setLoadingSwaps(true);
    const res = await suggestSwaps({
      data: {
        title: recipe.title,
        ingredients: recipe.ingredients.map((i) => ({ name: i.name, amount: i.amount, unit: i.unit })),
        current: totalMacros,
        target: editingTarget,
        servings: recipe.servings,
      },
    });
    setLoadingSwaps(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setSwaps(res.swaps.map((s: any) => ({ ...s, applied: false })));
    if (res.swaps.length === 0) toast.info("No useful swaps found.");
  };

  const scaleToTarget = () => {
    if (!recipe || perServing.kcal === 0) return;
    const factor = editingTarget.kcal / (recipe.macros.kcal / recipe.servings);
    setScaleFactor(factor);
    toast.success(`Ingredients scaled to ${editingTarget.kcal} kcal/serving`);
  };

  const reset = () => {
    setSwaps((prev) => prev.map((s) => ({ ...s, applied: false })));
    setScaleFactor(1);
  };

  const save = async () => {
    if (!user || !recipe) return;
    const { error: e } = await supabase.from("saved_recipes").insert({
      user_id: user.id,
      spoonacular_id: recipe.id,
      title: recipe.title,
      image: recipe.image,
      servings: recipe.servings,
      target_macros: editingTarget,
      applied_swaps: swaps.filter((s) => s.applied),
      scaled_ingredients: workingIngredients,
      computed_macros: { total: totalMacros, perServing },
    });
    if (e) toast.error(e.message);
    else toast.success("Recipe saved.");
  };

  if (loading) return <div className="mx-auto max-w-5xl p-6 space-y-4"><Skeleton className="h-64 w-full" /><Skeleton className="h-32 w-full" /></div>;
  if (error || !recipe) return <div className="mx-auto max-w-5xl p-6 text-destructive">{error || "Recipe not found"}</div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        {/* Left: recipe */}
        <div className="space-y-6">
          <div className="overflow-hidden rounded-2xl">
            <img src={recipe.image} alt={recipe.title} className="aspect-[16/9] w-full object-cover" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{recipe.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {recipe.readyInMinutes} min</span>
              <span>·</span>
              <span>{recipe.servings} servings</span>
              {recipe.sourceUrl && (
                <>
                  <span>·</span>
                  <a href={recipe.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
                    Source <ExternalLink className="h-3 w-3" />
                  </a>
                </>
              )}
            </div>
          </div>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Ingredients</h2>
              <div className="flex gap-1 rounded-md bg-secondary p-0.5 text-xs">
                <button
                  onClick={() => setScaleMode("perServing")}
                  className={`rounded px-2 py-1 ${scaleMode === "perServing" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
                >
                  Per serving
                </button>
                <button
                  onClick={() => setScaleMode("total")}
                  className={`rounded px-2 py-1 ${scaleMode === "total" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
                >
                  Total
                </button>
              </div>
            </div>
            <ul className="divide-y">
              {workingIngredients.map((i, idx) => {
                const orig = recipe.ingredients[idx];
                const factor = scaleMode === "perServing" ? 1 / recipe.servings : 1;
                const amt = i.amount * factor;
                const changed = i.name !== orig.name || scaleFactor !== 1;
                return (
                  <li key={idx} className="flex items-baseline justify-between gap-3 py-2.5">
                    <div className="text-sm">
                      <span className="tabular-nums font-medium">
                        {amt < 1 ? amt.toFixed(2) : amt.toFixed(1)} {i.unit}
                      </span>{" "}
                      <span className={changed ? "text-primary font-medium" : ""}>{i.name}</span>
                      {changed && i.name !== orig.name && (
                        <span className="ml-1 text-xs text-muted-foreground line-through">{orig.name}</span>
                      )}
                    </div>
                    {i.kcal != null && (
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {Math.round((i.kcal ?? 0) * factor)} kcal
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>

          {recipe.instructions.length > 0 && (
            <Card className="p-5">
              <h2 className="mb-3 font-semibold">Instructions</h2>
              <ol className="space-y-3 text-sm">
                {recipe.instructions.map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{i + 1}</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </div>

        {/* Right: tuning panel */}
        <div className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <Card className="p-5">
            <h3 className="font-semibold">Your target (per serving)</h3>
            <div className="mt-3">
              <MacroInputs value={editingTarget} onChange={setEditingTarget} />
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Per serving · current</h3>
              {(scaleFactor !== 1 || swaps.some((s) => s.applied)) && (
                <Button size="sm" variant="ghost" onClick={reset} className="h-7 px-2 text-xs">
                  <RotateCcw className="mr-1 h-3 w-3" /> Reset
                </Button>
              )}
            </div>
            <div className="space-y-3">
              <MacroBar label="Calories" value={perServing.kcal} target={editingTarget.kcal} unit="kcal" color="kcal" />
              <MacroBar label="Protein" value={perServing.protein_g} target={editingTarget.protein_g} color="protein" />
              <MacroBar label="Carbs" value={perServing.carbs_g} target={editingTarget.carbs_g} color="carbs" />
              <MacroBar label="Fat" value={perServing.fat_g} target={editingTarget.fat_g} color="fat" />
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold">Tune to target</h3>
            <p className="mt-1 text-sm text-muted-foreground">Two ways to hit your numbers.</p>
            <div className="mt-3 space-y-2">
              <Button onClick={scaleToTarget} variant="secondary" className="w-full justify-start">
                <Calculator className="mr-2 h-4 w-4" /> Scale ingredients to {editingTarget.kcal} kcal
              </Button>
              <Button onClick={generateSwaps} disabled={loadingSwaps} className="w-full justify-start">
                <Sparkles className="mr-2 h-4 w-4" />
                {loadingSwaps ? "Finding swaps…" : "Suggest substitutions"}
              </Button>
            </div>

            {swaps.length > 0 && (
              <div className="mt-4 space-y-2">
                {swaps.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => setSwaps((prev) => prev.map((x, j) => (j === i ? { ...x, applied: !x.applied } : x)))}
                    className={`w-full rounded-lg border p-3 text-left text-sm transition ${
                      s.applied ? "border-primary bg-primary/5" : "hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium">
                          {s.from} <span className="text-muted-foreground">→</span> {s.to}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{s.reason}</p>
                      </div>
                      {s.applied && <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                      <DeltaPill v={s.delta.kcal} unit="kcal" />
                      <DeltaPill v={s.delta.protein_g} unit="P" />
                      <DeltaPill v={s.delta.carbs_g} unit="C" />
                      <DeltaPill v={s.delta.fat_g} unit="F" />
                      {(s as any).verified && (
                        <span className="ml-auto rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                          DB-verified
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>

          {user ? (
            <Button onClick={save} variant="outline" className="w-full">
              <BookmarkPlus className="mr-2 h-4 w-4" /> Save tuned recipe
            </Button>
          ) : (
            <Link to="/auth"><Button variant="outline" className="w-full"><BookmarkPlus className="mr-2 h-4 w-4" /> Sign in to save</Button></Link>
          )}
        </div>
      </div>
    </div>
  );
}

function DeltaPill({ v, unit }: { v?: number; unit: string }) {
  if (v == null) return null;
  const positive = v > 0;
  const zero = v === 0;
  return (
    <span
      className={`rounded-full px-1.5 py-0.5 tabular-nums ${
        zero
          ? "bg-muted text-muted-foreground"
          : positive
            ? "bg-[var(--carbs)]/15 text-[oklch(0.45_0.13_75)]"
            : "bg-primary/10 text-primary"
      }`}
    >
      {positive ? "+" : ""}
      {Math.round(v * 10) / 10}
      {unit}
    </span>
  );
}

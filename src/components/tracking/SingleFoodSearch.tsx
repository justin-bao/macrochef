import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { searchSingleFoods } from "@/lib/food-nutrition.functions";
import { assessNutritionEvidence, confidenceLabel } from "@/lib/nutrition-evidence";
import { type FoodLogItem } from "@/lib/tracking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NutritionEvidence } from "@/components/NutritionEvidence";
import { Search, Plus } from "lucide-react";

type Match = Awaited<ReturnType<typeof searchSingleFoods>>["matches"][number];
export function SingleFoodSearch({ onAdd }: { onAdd: (items: FoodLogItem[]) => void }) {
  const search = useServerFn(searchSingleFoods);
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [selected, setSelected] = useState<Match | null>(null);
  const [grams, setGrams] = useState("100");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lookup = async () => {
    setBusy(true); setError(null); setSelected(null); setMatches([]);
    try { const result = await search({ data: { query } }); setMatches(result.matches); if (!result.matches.length) setError("No complete nutrition matches found. Try a different food name."); }
    catch { setError("Food search is unavailable. Try again."); }
    finally { setBusy(false); }
  };
  const quantity = Number(grams);
  const valid = Number.isFinite(quantity) && quantity > 0;
  const evidence = selected ? assessNutritionEvidence({ sources: [selected.source], portionKnown: true }) : undefined;
  return <div className="space-y-4">
    {!selected ? <>
      <form className="flex gap-2" onSubmit={e => { e.preventDefault(); if (query.trim() && !busy) void lookup(); }}>
        <Input aria-label="Single food search" placeholder="Food or brand name" value={query} onChange={e => setQuery(e.target.value)} />
        <Button type="submit" disabled={!query.trim() || busy}><Search className="mr-2 h-4 w-4" />{busy ? "Searching…" : "Search foods"}</Button>
      </form>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="divide-y">{matches.map(match => <Button key={match.source.id} variant="ghost" className="h-auto w-full justify-start whitespace-normal py-3 text-left" onClick={() => { setSelected(match); setGrams("100"); }}><span><span className="block font-medium">{match.name}</span><span className="block text-xs text-muted-foreground">{match.source.label.split(":")[0]} · {match.kcal_per_100g} kcal / 100 g · {match.protein_g_per_100g}P · {match.carbs_g_per_100g}C · {match.fat_g_per_100g}F</span></span></Button>)}</div>
    </> : <>
      <h3 className="font-semibold">{selected.name}</h3>
      <Label htmlFor="single-food-grams">Serving weight (g)</Label><Input id="single-food-grams" type="number" value={grams} onChange={e => setGrams(e.target.value)} />
      <div className="grid grid-cols-2 gap-2 text-sm"><span>{valid ? Math.round(selected.kcal_per_100g * quantity / 100) : 0} kcal</span><span>{valid ? Math.round(selected.protein_g_per_100g * quantity / 10) / 10 : 0} g protein</span></div>
      <NutritionEvidence evidence={evidence} />
      <div className="flex gap-2"><Button variant="outline" onClick={() => setSelected(null)}>Back</Button><Button disabled={!valid} onClick={() => { if (!evidence) return; onAdd([{ id: crypto.randomUUID(), name: selected.name, quantity, unit: "g", kcal: Math.round(selected.kcal_per_100g * quantity / 100), protein_g: Math.round(selected.protein_g_per_100g * quantity / 10) / 10, carbs_g: Math.round(selected.carbs_g_per_100g * quantity / 10) / 10, fat_g: Math.round(selected.fat_g_per_100g * quantity / 10) / 10, source: "usda", confidence: confidenceLabel(evidence.score), evidence, loggedAt: new Date().toISOString() }]); }}><Plus className="mr-2 h-4 w-4" />Add food</Button></div>
    </>}
  </div>;
}
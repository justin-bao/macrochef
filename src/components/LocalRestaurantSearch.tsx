import { useCallback, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Search, MapPin, ExternalLink, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { MacroInputs, type MacrosOptional } from "./MacroInputs";
import { RestaurantMap } from "./RestaurantMap";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { findLocalRestaurants, getLocalRestaurantMeals, type LocalRestaurant } from "@/lib/local-restaurants.functions";
import { rankMeals, type EstimatedDish } from "@/lib/meal-matching";
import { NutritionEvidence } from "./NutritionEvidence";

export function LocalRestaurantSearch({ initialTargets }: { initialTargets: MacrosOptional }) {
  const { user, loading: authLoading } = useAuth();
  const findRestaurants = useServerFn(findLocalRestaurants);
  const getMeals = useServerFn(getLocalRestaurantMeals);
  const [query, setQuery] = useState("");
  const [targets, setTargets] = useState(initialTargets);
  const [restaurants, setRestaurants] = useState<LocalRestaurant[]>([]);
  const [selected, setSelected] = useState<LocalRestaurant | null>(null);
  const [dishes, setDishes] = useState<EstimatedDish[]>([]);
  const [sourceUrls, setSourceUrls] = useState<string[]>([]);
  const [estimatedAt, setEstimatedAt] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuError, setMenuError] = useState<string | null>(null);
  const requestId = useRef(0);
  const selectRestaurant = useCallback((r: LocalRestaurant) => {
    requestId.current += 1;
    setSelected(r); setDishes([]); setSourceUrls([]); setEstimatedAt(null); setMenuError(null); setEstimating(false);
  }, []);
  const best = useMemo(() => rankMeals(dishes, targets), [dishes, targets]);
  const hasTargets = Object.values(targets).some((v) => v !== null);
  const search = async (e: React.FormEvent) => {
    e.preventDefault(); if (!user || searching) return;
    requestId.current += 1; setSearching(true); setError(null); setSelected(null); setDishes([]); setRestaurants([]);
    try { const result = await findRestaurants({ data: { query } }); setRestaurants(result.restaurants); setError(result.error); setSearched(true); }
    catch (e) { setError(e instanceof Error ? e.message : "Restaurant search failed."); }
    finally { setSearching(false); }
  };
  const estimate = async () => {
    if (!selected || estimating) return;
    const id = ++requestId.current; setEstimating(true); setMenuError(null);
    try {
      const result = await getMeals({ data: { placeId: selected.id, targets } });
      if (id !== requestId.current) return;
      setDishes(result.dishes); setSourceUrls(result.sourceUrls); setEstimatedAt(result.estimatedAt); setMenuError(result.error);
    } catch (e) { if (id === requestId.current) setMenuError(e instanceof Error ? e.message : "Menu estimation failed."); }
    finally { if (id === requestId.current) setEstimating(false); }
  };
  return <section className="space-y-6">
    <div className="flex items-center gap-3"><MapPin className="h-6 w-6 text-primary" /><h1 className="text-2xl font-semibold">Nearby meals</h1></div>
    <form onSubmit={search} className="space-y-4 border-b pb-6">
      <div className="flex flex-col gap-2 sm:flex-row"><Input aria-label="Restaurant or cuisine and location" placeholder="Restaurants, cuisine + city or neighborhood" value={query} onChange={(e) => setQuery(e.target.value)} className="flex-1" maxLength={200} /><Button type="submit" disabled={!user || searching || query.trim().length < 2} className="gap-2">{searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}Find restaurants</Button></div>
      <div><h2 className="mb-3 text-sm font-medium">Per-meal targets <span className="text-muted-foreground">· optional</span></h2><MacroInputs value={targets} onChange={setTargets} /></div>
      {!authLoading && !user && <Button asChild variant="outline"><Link to="/auth">Sign in to find restaurant meals</Link></Button>}
    </form>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {searched && !searching && !error && !restaurants.length && <p className="text-sm text-muted-foreground">No restaurants found. Try a nearby city or another cuisine.</p>}
    {restaurants.length > 0 && <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <RestaurantMap restaurants={restaurants} selectedId={selected?.id ?? null} onSelect={selectRestaurant} />
      <div className="max-h-[420px] space-y-2 overflow-y-auto" aria-label="Restaurants"><p className="mb-2 text-xs text-muted-foreground">Restaurant information from Google Maps</p>{restaurants.map((r, i) => <Button key={r.id} variant={selected?.id === r.id ? "secondary" : "outline"} onClick={() => selectRestaurant(r)} className="h-auto w-full justify-start whitespace-normal py-3 text-left"><span className="mr-3 shrink-0 text-primary">{i + 1}</span><span className="min-w-0"><span className="block font-medium">{r.name}</span><span className="mt-1 block text-xs font-normal text-muted-foreground">{r.address}</span></span></Button>)}</div>
    </div>}
    {selected && <div className="space-y-5 border-t pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">{selected.name}</h2><p className="mt-1 text-sm text-muted-foreground">{selected.address}</p></div><div className="flex flex-wrap gap-2">{selected.mapsUrl && <Button asChild variant="outline" size="sm"><a href={selected.mapsUrl} target="_blank" rel="noreferrer">Google Maps<ExternalLink className="ml-2 h-3 w-3" /></a></Button>}<Button onClick={estimate} disabled={estimating} className="gap-2">{estimating && <Loader2 className="h-4 w-4 animate-spin" />}{estimating ? "Reading menu & estimating…" : "Find meal matches"}</Button></div></div>
      {menuError && <p role="alert" className="text-sm text-destructive">{menuError}</p>}
      {best.length > 0 && <><div><h3 className="text-lg font-semibold">{hasTargets ? "Closest single-dish matches" : "Menu meals"}</h3><p className="mt-1 text-xs text-muted-foreground">Estimated per standard serving · Portions and preparation vary. Confirm with the restaurant before ordering.</p>{estimatedAt && <p className="mt-1 text-xs text-muted-foreground">Estimated {new Date(estimatedAt).toLocaleDateString()}</p>}</div><div className="grid gap-4 md:grid-cols-3">{best.map((dish, i) => <MealCard key={`${dish.name}-${i}`} dish={dish} targets={targets} rank={hasTargets ? i + 1 : null} />)}</div><details className="border-t pt-4"><summary className="cursor-pointer text-sm font-medium">Full menu · {dishes.length} meals</summary><div className="mt-4 grid gap-4 md:grid-cols-3">{dishes.map((dish, i) => <MealCard key={`${dish.name}-${i}`} dish={dish} targets={targets} rank={null} />)}</div></details><div className="flex flex-wrap gap-3">{sourceUrls.map((url, i) => <a className="text-xs text-primary underline" href={url} key={url} target="_blank" rel="noreferrer">{i === 0 ? "Restaurant website" : "Menu source"}</a>)}</div></>}
    </div>}
  </section>;
}

function MealCard({ dish, targets, rank }: { dish: EstimatedDish; targets: MacrosOptional; rank: number | null }) {
  const values = [["kcal", "Calories", "kcal"], ["protein_g", "Protein", "g"], ["carbs_g", "Carbs", "g"], ["fat_g", "Fat", "g"]] as const;
  return <Card className="p-4"><div className="mb-2 text-xs text-muted-foreground">{rank ? `#${rank} match` : "One dish"}</div><h4 className="font-semibold">{dish.name}</h4><p className="mt-2 text-sm text-muted-foreground">{dish.description}</p><p className="mt-2 text-xs">{dish.portion}</p><dl className="mt-4 grid grid-cols-2 gap-3 border-t pt-3">{values.map(([key, label, unit]) => { const delta = targets[key] === null ? null : Math.round(dish[key] - (targets[key] ?? 0)); return <div key={key}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="text-sm font-semibold">≈ {Math.round(dish[key])} {unit}</dd>{delta !== null && <p className="text-xs text-muted-foreground">{delta > 0 ? "+" : ""}{delta} {unit} vs goal</p>}</div>; })}</dl><NutritionEvidence evidence={dish.evidence} /><details className="mt-4 text-xs text-muted-foreground"><summary className="cursor-pointer">Estimate assumptions</summary><p className="mt-2">{dish.assumptions}</p></details></Card>;
}
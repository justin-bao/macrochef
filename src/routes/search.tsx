import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { searchRecipes, type SearchResult } from "@/lib/recipes.functions";
import {
  searchRestaurantCombos,
  SUPPORTED_CHAINS,
  type Combo,
  type MenuItem,
} from "@/lib/restaurants.functions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MacroInputs, type MacrosOptional } from "@/components/MacroInputs";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, ChevronDown, UtensilsCrossed, Store } from "lucide-react";

const searchSchema = z.object({
  mode: z.enum(["recipes", "restaurants"]).optional().catch(undefined).default("recipes"),
  q: z.string().catch(""),
  kcal: z.coerce.number().optional().catch(undefined),
  p: z.coerce.number().optional().catch(undefined),
  c: z.coerce.number().optional().catch(undefined),
  f: z.coerce.number().optional().catch(undefined),
  subs: z.coerce.boolean().catch(true),
  chain: z.string().optional().catch(undefined),
  maxItems: z.coerce.number().optional().catch(undefined),
});

export const Route = createFileRoute("/search")({
  validateSearch: searchSchema.parse,
  head: () => ({
    meta: [
      { title: "Search recipes & restaurants — MacroChef" },
      { name: "description", content: "Search recipes or fast food combos tuned to your macro targets." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const mode = search.mode;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Tabs
        value={mode}
        onValueChange={(v) =>
          navigate({ search: (prev: any) => ({ ...prev, mode: v as "recipes" | "restaurants" }) })
        }
      >
        <TabsList className="mb-4 grid w-full grid-cols-2 sm:w-auto sm:inline-grid">
          <TabsTrigger value="recipes" className="gap-2">
            <UtensilsCrossed className="h-4 w-4" />
            Recipes
          </TabsTrigger>
          <TabsTrigger value="restaurants" className="gap-2">
            <Store className="h-4 w-4" />
            Restaurants
          </TabsTrigger>
        </TabsList>
        <TabsContent value="recipes" className="mt-0">
          <RecipesTab />
        </TabsContent>
        <TabsContent value="restaurants" className="mt-0">
          <RestaurantsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RecipesTab() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [q, setQ] = useState(search.q);
  const [macros, setMacros] = useState<MacrosOptional>({
    kcal: search.kcal ?? null,
    protein_g: search.p ?? null,
    carbs_g: search.c ?? null,
    fat_g: search.f ?? null,
  });
  const [allowSubs, setAllowSubs] = useState(search.subs);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasMacros =
    search.kcal != null || search.p != null || search.c != null || search.f != null;
  const hasCriteria = !!search.q || hasMacros;

  useEffect(() => {
    if (search.mode !== "recipes") return;
    if (!hasCriteria) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    searchRecipes({
      data: {
        query: search.q,
        number: 12,
        kcal: search.kcal ?? null,
        protein_g: search.p ?? null,
        carbs_g: search.c ?? null,
        fat_g: search.f ?? null,
        allowSubs: search.subs,
      },
    })
      .then((r) => {
        if (cancelled) return;
        setResults(r.results);
        setError(r.error);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [search.mode, search.q, search.kcal, search.p, search.c, search.f, search.subs, hasCriteria]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({
      search: (prev: any) => ({
        ...prev,
        mode: "recipes",
        q: q.trim(),
        kcal: macros.kcal ?? undefined,
        p: macros.protein_g ?? undefined,
        c: macros.carbs_g ?? undefined,
        f: macros.fat_g ?? undefined,
        subs: allowSubs,
      }),
    });
  };

  return (
    <>
      <Card className="p-5">
        <form onSubmit={submit} className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Dish, cuisine, or leave blank…" className="pl-9 h-10" />
            </div>
            <Button type="submit" disabled={!q.trim() && !(macros.kcal != null || macros.protein_g != null || macros.carbs_g != null || macros.fat_g != null)}>Search</Button>
          </div>
          <div>
            <p className="mb-2 text-xs text-muted-foreground">Leave any macro blank to ignore it.</p>
            <MacroInputs value={macros} onChange={setMacros} />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 p-3">
            <div>
              <Label htmlFor="allow-subs" className="text-sm font-medium">Allow substitutions</Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {allowSubs
                  ? "Show recipes that can be tuned with swaps to fit your macros."
                  : "Only show recipes that already fit — no swaps needed."}
              </p>
            </div>
            <Switch id="allow-subs" checked={allowSubs} onCheckedChange={setAllowSubs} />
          </div>
        </form>
      </Card>

      <div className="mt-8">
        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-72 w-full" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
        )}

        {!loading && !error && results.length === 0 && hasCriteria && (
          <p className="text-center text-muted-foreground">
            No recipes found.{" "}
            {!allowSubs && "Try enabling substitutions or relaxing some macros."}
          </p>
        )}

        {!loading && !error && !hasCriteria && (
          <p className="text-center text-muted-foreground">Enter a dish, cuisine, or set some macro targets to start.</p>
        )}

        {!loading && results.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((r) => (
              <ResultCard
                key={r.id}
                result={r}
                target={macros}
                allowSubs={allowSubs}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function RestaurantsTab() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [chain, setChain] = useState<string>(search.chain ?? SUPPORTED_CHAINS[0]);
  const [q, setQ] = useState(search.q);
  const [macros, setMacros] = useState<MacrosOptional>({
    kcal: search.kcal ?? null,
    protein_g: search.p ?? null,
    carbs_g: search.c ?? null,
    fat_g: search.f ?? null,
  });
  const [maxItems, setMaxItems] = useState<number>(search.maxItems ?? 3);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeChain = search.chain;
  const hasMacros =
    search.kcal != null || search.p != null || search.c != null || search.f != null;

  useEffect(() => {
    if (search.mode !== "restaurants") return;
    if (!activeChain) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    searchRestaurantCombos({
      data: {
        chain: activeChain,
        query: search.q,
        kcal: search.kcal ?? null,
        protein_g: search.p ?? null,
        carbs_g: search.c ?? null,
        fat_g: search.f ?? null,
        maxItems: search.maxItems ?? 3,
        number: 8,
      },
    })
      .then((r) => {
        if (cancelled) return;
        setCombos(r.combos);
        setError(r.error);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [search.mode, activeChain, search.q, search.kcal, search.p, search.c, search.f, search.maxItems]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({
      search: (prev: any) => ({
        ...prev,
        mode: "restaurants",
        q: q.trim(),
        chain,
        maxItems,
        kcal: macros.kcal ?? undefined,
        p: macros.protein_g ?? undefined,
        c: macros.carbs_g ?? undefined,
        f: macros.fat_g ?? undefined,
      }),
    });
  };

  const target: MacrosOptional = macros;

  return (
    <>
      <Card className="p-5">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-[minmax(0,200px)_1fr_auto]">
            <Select value={chain} onValueChange={setChain}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Pick a restaurant" />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_CHAINS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Optional: 'chicken', 'salad'…"
                className="pl-9 h-10"
              />
            </div>
            <Button type="submit">Build combos</Button>
          </div>
          <div>
            <p className="mb-2 text-xs text-muted-foreground">
              Set the macros you want the combo to total. Leave blank to ignore.
            </p>
            <MacroInputs value={macros} onChange={setMacros} />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 p-3">
            <div>
              <Label className="text-sm font-medium">Max items per combo</Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Higher = more combinations, slower but more flexible.
              </p>
            </div>
            <Select value={String(maxItems)} onValueChange={(v) => setMaxItems(Number(v))}>
              <SelectTrigger className="h-9 w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </form>
      </Card>

      <div className="mt-8">
        {loading && (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && !activeChain && (
          <p className="text-center text-muted-foreground">
            Pick a restaurant and hit “Build combos”.
          </p>
        )}

        {!loading && !error && activeChain && combos.length === 0 && (
          <p className="text-center text-muted-foreground">
            No menu items found for {activeChain}. Try another chain or clearing the search term.
          </p>
        )}

        {!loading && combos.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2">
            {combos.map((combo, i) => (
              <ComboCard key={i} combo={combo} target={target} hasTarget={hasMacros} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function ComboCard({
  combo,
  target,
  hasTarget,
}: {
  combo: Combo;
  target: MacrosOptional;
  hasTarget: boolean;
}) {
  const fitLabel = hasTarget ? fitFromScore(combo.score) : null;
  return (
    <Card className="p-4 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-medium text-muted-foreground">
          {combo.items[0]?.restaurantChain}
        </div>
        {fitLabel && (
          <span
            className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ${fitLabel.cls}`}
          >
            {fitLabel.label}
          </span>
        )}
      </div>
      <ul className="mt-2 space-y-2">
        {combo.items.map((it) => (
          <ComboItem key={it.id} item={it} />
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2 border-t pt-3 text-xs">
        <Badge label={`${combo.totals.kcal} kcal`} c="kcal" />
        <Badge label={`${Math.round(combo.totals.protein_g)}P`} c="protein" />
        <Badge label={`${Math.round(combo.totals.carbs_g)}C`} c="carbs" />
        <Badge label={`${Math.round(combo.totals.fat_g)}F`} c="fat" />
        {hasTarget && <DeltaSummary totals={combo.totals} target={target} />}
      </div>
    </Card>
  );
}

function ComboItem({ item }: { item: MenuItem }) {
  return (
    <li className="flex items-center gap-2 rounded-md bg-muted/40 px-2 py-1.5 text-sm">
      {item.image && (
        <img
          src={item.image}
          alt={item.title}
          className="h-8 w-8 shrink-0 rounded object-cover"
          loading="lazy"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">{item.title}</div>
        <div className="text-[11px] text-muted-foreground">
          {item.kcal} kcal · {Math.round(item.protein_g)}P · {Math.round(item.carbs_g)}C · {Math.round(item.fat_g)}F
        </div>
      </div>
    </li>
  );
}

function DeltaSummary({
  totals,
  target,
}: {
  totals: { kcal: number; protein_g: number; carbs_g: number; fat_g: number };
  target: MacrosOptional;
}) {
  const parts: string[] = [];
  if (target.kcal != null) parts.push(`${signed(totals.kcal - target.kcal)} kcal`);
  if (target.protein_g != null) parts.push(`${signed(totals.protein_g - target.protein_g)}P`);
  if (target.carbs_g != null) parts.push(`${signed(totals.carbs_g - target.carbs_g)}C`);
  if (target.fat_g != null) parts.push(`${signed(totals.fat_g - target.fat_g)}F`);
  if (parts.length === 0) return null;
  return (
    <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
      vs goal: {parts.join(", ")}
    </span>
  );
}

function signed(v: number): string {
  const r = Math.round(v * 10) / 10;
  return r > 0 ? `+${r}` : `${r}`;
}

function fitFromScore(score: number): { label: string; cls: string } {
  if (score < 0.1) return { label: "Great fit", cls: "bg-[var(--protein)]/15 text-[var(--protein)]" };
  if (score < 0.25) return { label: "Close fit", cls: "bg-amber-500/15 text-amber-700" };
  return { label: "Off goal", cls: "bg-muted text-muted-foreground" };
}

function ResultCard({
  result: r,
  target,
  allowSubs,
}: {
  result: SearchResult;
  target: MacrosOptional;
  allowSubs: boolean;
}) {
  const [showSwaps, setShowSwaps] = useState(false);
  // Normalize macros to the user's calorie target so values across recipes are
  // comparable on the requested-portion scale. Falls back to per-serving.
  const baseKcal = r.adjustedKcal ?? r.kcal;
  const factor =
    target.kcal != null && baseKcal != null && baseKcal > 0 ? target.kcal / baseKcal : 1;
  const normalized = {
    kcal: baseKcal != null ? baseKcal * factor : undefined,
    protein_g: (r.adjustedProtein_g ?? r.protein_g) != null
      ? (r.adjustedProtein_g ?? r.protein_g)! * factor
      : undefined,
    carbs_g: (r.adjustedCarbs_g ?? r.carbs_g) != null
      ? (r.adjustedCarbs_g ?? r.carbs_g)! * factor
      : undefined,
    fat_g: (r.adjustedFat_g ?? r.fat_g) != null
      ? (r.adjustedFat_g ?? r.fat_g)! * factor
      : undefined,
  };
  const showingNormalized = factor !== 1;
  const hasSwaps = (r.swaps?.length ?? 0) > 0;

  return (
    <Card className="overflow-hidden p-0 h-full transition hover:-translate-y-0.5 hover:shadow-md">
      <Link
        to="/recipe/$id"
        params={{ id: String(r.id) }}
        search={{
          kcal: target.kcal ?? undefined,
          p: target.protein_g ?? undefined,
          c: target.carbs_g ?? undefined,
          f: target.fat_g ?? undefined,
          subs: allowSubs,
        }}
        className="block"
      >
        <div className="aspect-[4/3] bg-muted overflow-hidden">
          {r.image && (
            <img src={r.image} alt={r.title} className="h-full w-full object-cover" loading="lazy" />
          )}
        </div>
        <div className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold line-clamp-2">{r.title}</h3>
            {r.fitKind && <FitBadge kind={r.fitKind} swapCount={r.swapCount ?? 0} />}
          </div>
          {normalized.kcal != null && (
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge label={`${Math.round(normalized.kcal)} kcal`} c="kcal" />
              <Badge label={`${Math.round(normalized.protein_g ?? 0)}P`} c="protein" />
              <Badge label={`${Math.round(normalized.carbs_g ?? 0)}C`} c="carbs" />
              <Badge label={`${Math.round(normalized.fat_g ?? 0)}F`} c="fat" />
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">
            {showingNormalized
              ? `Scaled to ${target.kcal} kcal${hasSwaps ? " · with estimated swaps" : ""}`
              : hasSwaps
                ? "Per serving · with estimated swaps"
                : "Per serving"}
            {r.source === "kaggle" && " · from community archive"}
          </p>
        </div>
      </Link>
      {hasSwaps && (
        <div className="border-t">
          <button
            type="button"
            onClick={() => setShowSwaps((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50"
            aria-expanded={showSwaps}
          >
            <span>{showSwaps ? "Hide swaps" : `View ${r.swaps!.length} swap${r.swaps!.length > 1 ? "s" : ""}`}</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showSwaps ? "rotate-180" : ""}`} />
          </button>
          {showSwaps && (
            <ul className="space-y-2 px-4 pb-3 pt-1 text-xs">
              {r.swaps!.map((s, i) => (
                <li key={i} className="rounded-md bg-muted/40 p-2">
                  <div className="font-medium text-foreground">
                    <span className="capitalize">{s.from}</span>{" "}
                    <span className="text-muted-foreground">→</span> {s.to}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <DeltaPill v={s.delta.kcal} unit="kcal" />
                    <DeltaPill v={s.delta.protein_g} unit="P" />
                    <DeltaPill v={s.delta.carbs_g} unit="C" />
                    <DeltaPill v={s.delta.fat_g} unit="F" />
                  </div>
                </li>
              ))}
              <li className="pt-1 text-[10px] italic text-muted-foreground">
                Estimates per serving — verified on the recipe page.
              </li>
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}

function DeltaPill({ v, unit }: { v?: number; unit: string }) {
  if (v == null) return null;
  if (v === 0) return null;
  const positive = v > 0;
  return (
    <span
      className={`rounded-full px-1.5 py-0.5 tabular-nums text-[10px] ${
        positive ? "bg-[var(--carbs)]/15 text-[oklch(0.45_0.13_75)]" : "bg-primary/10 text-primary"
      }`}
    >
      {positive ? "+" : ""}
      {Math.round(v * 10) / 10}
      {unit}
    </span>
  );
}

function Badge({ label, c }: { label: string; c: "kcal" | "protein" | "carbs" | "fat" }) {
  const cls = {
    kcal: "bg-[var(--kcal)]/10 text-[var(--kcal)]",
    protein: "bg-[var(--protein)]/10 text-[var(--protein)]",
    carbs: "bg-[var(--carbs)]/15 text-[oklch(0.45_0.13_75)]",
    fat: "bg-[var(--fat)]/10 text-[var(--fat)]",
  }[c];
  return <span className={`rounded-full px-2 py-0.5 font-medium ${cls}`}>{label}</span>;
}

function FitBadge({ kind, swapCount }: { kind: "fits" | "swaps" | "close"; swapCount: number }) {
  const map = {
    fits: { label: "Fits", cls: "bg-[var(--protein)]/15 text-[var(--protein)]" },
    swaps: {
      label: swapCount > 0 ? `Fits w/ ${swapCount} swap${swapCount > 1 ? "s" : ""}` : "Fits w/ swaps",
      cls: "bg-amber-500/15 text-amber-700",
    },
    close: { label: "Close", cls: "bg-muted text-muted-foreground" },
  }[kind];
  return (
    <span className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ${map.cls}`}>
      {map.label}
    </span>
  );
}

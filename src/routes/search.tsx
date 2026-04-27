import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { searchRecipes, type SearchResult } from "@/lib/recipes.functions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MacroInputs } from "@/components/MacroInputs";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import type { Macros } from "@/lib/macros";

const searchSchema = z.object({
  q: z.string().catch(""),
  kcal: z.coerce.number().catch(600),
  p: z.coerce.number().catch(40),
  c: z.coerce.number().catch(60),
  f: z.coerce.number().catch(20),
});

export const Route = createFileRoute("/search")({
  validateSearch: searchSchema.parse,
  head: () => ({
    meta: [
      { title: "Search recipes — MacroChef" },
      { name: "description", content: "Search a recipe database and tune to your macro targets." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [q, setQ] = useState(search.q);
  const [macros, setMacros] = useState<Macros>({
    kcal: search.kcal,
    protein_g: search.p,
    carbs_g: search.c,
    fat_g: search.f,
  });
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!search.q) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    searchRecipes({ data: { query: search.q, number: 12 } })
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
  }, [search.q]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({
      search: { q: q.trim(), kcal: macros.kcal, p: macros.protein_g, c: macros.carbs_g, f: macros.fat_g },
    });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Card className="p-5">
        <form onSubmit={submit} className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search recipes…" className="pl-9 h-10" />
            </div>
            <Button type="submit">Search</Button>
          </div>
          <MacroInputs value={macros} onChange={setMacros} />
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

        {!loading && !error && results.length === 0 && search.q && (
          <p className="text-center text-muted-foreground">No recipes found. Try a different search.</p>
        )}

        {!loading && !error && !search.q && (
          <p className="text-center text-muted-foreground">Enter a dish above to start.</p>
        )}

        {!loading && results.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((r) => (
              <Link
                key={r.id}
                to="/recipe/$id"
                params={{ id: String(r.id) }}
                search={{ kcal: macros.kcal, p: macros.protein_g, c: macros.carbs_g, f: macros.fat_g }}
              >
                <Card className="overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md p-0 h-full">
                  <div className="aspect-[4/3] bg-muted overflow-hidden">
                    {r.image && <img src={r.image} alt={r.title} className="h-full w-full object-cover" loading="lazy" />}
                  </div>
                  <div className="p-4 space-y-2">
                    <h3 className="font-semibold line-clamp-2">{r.title}</h3>
                    {r.kcal != null && (
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge label={`${Math.round(r.kcal)} kcal`} c="kcal" />
                        <Badge label={`${Math.round(r.protein_g ?? 0)}P`} c="protein" />
                        <Badge label={`${Math.round(r.carbs_g ?? 0)}C`} c="carbs" />
                        <Badge label={`${Math.round(r.fat_g ?? 0)}F`} c="fat" />
                      </div>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
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

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MacroInputs } from "@/components/MacroInputs";
import { Search, Sparkles, Target, Calculator } from "lucide-react";
import type { Macros } from "@/lib/macros";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MacroChef — Recipes tuned to your macros" },
      { name: "description", content: "Search recipes and tune ingredients to hit your calorie and macronutrient targets." },
      { property: "og:title", content: "MacroChef — Recipes tuned to your macros" },
      { property: "og:description", content: "Search recipes and tune ingredients to hit your calorie and macronutrient targets." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [macros, setMacros] = useState<Macros>({ kcal: 600, protein_g: 40, carbs_g: 60, fat_g: 20 });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    navigate({
      to: "/search",
      search: { q: q.trim(), kcal: macros.kcal, p: macros.protein_g, c: macros.carbs_g, f: macros.fat_g },
    });
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-secondary/60 to-background" />
        <div className="mx-auto max-w-4xl px-4 pt-16 pb-10 text-center sm:pt-24">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3 w-3" /> AI-tuned nutrition
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-6xl">
            Recipes that hit <span className="text-primary">your</span> macros
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Type a dish, set your calorie and macronutrient targets, and we'll suggest substitutions and scale ingredients to match.
          </p>
        </div>
      </section>

      {/* Search */}
      <section className="mx-auto max-w-3xl px-4 pb-16">
        <Card className="p-6 sm:p-8 shadow-lg shadow-foreground/5">
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="text-sm font-medium">What do you want to cook?</label>
              <div className="mt-1.5 flex gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="grilled chicken bowl, pad thai, lentil curry…"
                    className="pl-9 h-11"
                    autoFocus
                  />
                </div>
                <Button type="submit" size="lg">Find recipes</Button>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Target className="h-4 w-4 text-primary" /> Target macros (per serving)
              </div>
              <MacroInputs value={macros} onChange={setMacros} />
            </div>
          </form>
        </Card>

        {/* Feature cards */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <FeatureCard
            icon={<Sparkles className="h-5 w-5" />}
            title="Smart substitutions"
            text="AI suggests ingredient swaps that move the dish toward your macro targets, with each swap re-priced against a real nutrition database."
          />
          <FeatureCard
            icon={<Calculator className="h-5 w-5" />}
            title="Auto ingredient scaling"
            text="Recompute amounts so a recipe matches your exact caloric goal — for one serving or the whole batch."
          />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <Card className="p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </Card>
  );
}

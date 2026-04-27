import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/saved")({
  head: () => ({
    meta: [
      { title: "Saved recipes — MacroChef" },
      { name: "description", content: "Your saved tuned recipes." },
    ],
  }),
  component: SavedPage,
});

type Saved = {
  id: string;
  spoonacular_id: number;
  title: string;
  image: string | null;
  computed_macros: any;
};

function SavedPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Saved[]>([]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("saved_recipes")
      .select("id, spoonacular_id, title, image, computed_macros")
      .order("created_at", { ascending: false })
      .then(({ data }) => setItems((data ?? []) as Saved[]));
  }, [user]);

  const remove = async (id: string) => {
    const { error } = await supabase.from("saved_recipes").delete().eq("id", id);
    if (error) toast.error(error.message);
    else setItems((p) => p.filter((i) => i.id !== id));
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Saved recipes</h1>

      {items.length === 0 ? (
        <p className="mt-8 text-muted-foreground">No saved recipes yet. Tune one and hit save.</p>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((r) => {
            const ps = r.computed_macros?.perServing;
            return (
              <Card key={r.id} className="overflow-hidden p-0">
                <Link to="/recipe/$id" params={{ id: String(r.spoonacular_id) }} search={{ subs: true }}>
                  <div className="aspect-[4/3] overflow-hidden bg-muted">
                    {r.image && <img src={r.image} alt={r.title} className="h-full w-full object-cover" />}
                  </div>
                </Link>
                <div className="p-4">
                  <h3 className="font-semibold line-clamp-2">{r.title}</h3>
                  {ps && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {Math.round(ps.kcal)} kcal · {Math.round(ps.protein_g)}P · {Math.round(ps.carbs_g)}C · {Math.round(ps.fat_g)}F per serving
                    </p>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => remove(r.id)} className="mt-2 text-muted-foreground hover:text-destructive">
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

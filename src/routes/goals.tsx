import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MacroInputs } from "@/components/MacroInputs";
import type { Macros } from "@/lib/macros";
import { toast } from "sonner";

export const Route = createFileRoute("/goals")({
  head: () => ({
    meta: [
      { title: "Macro goals — MacroChef" },
      { name: "description", content: "Set your default daily calorie and macronutrient targets." },
    ],
  }),
  component: GoalsPage,
});

function GoalsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [macros, setMacros] = useState<Macros>({ kcal: 2000, protein_g: 150, carbs_g: 200, fat_g: 65 });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("macro_goals")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setMacros({ kcal: data.kcal, protein_g: data.protein_g, carbs_g: data.carbs_g, fat_g: data.fat_g });
      });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("macro_goals").upsert({
      user_id: user.id,
      ...macros,
      updated_at: new Date().toISOString(),
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Goals saved.");
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight">Daily macro goals</h1>
      <p className="mt-1 text-muted-foreground">These will pre-fill on every recipe search.</p>

      <Card className="mt-6 p-6 space-y-5">
        <MacroInputs value={macros} onChange={setMacros} />
        <div className="flex justify-end gap-2">
          <Link to="/"><Button variant="ghost">Cancel</Button></Link>
          <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save goals"}</Button>
        </div>
      </Card>
    </div>
  );
}

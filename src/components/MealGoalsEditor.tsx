import { useEffect, useState } from "react";
import { Save, Target } from "lucide-react";
import { toast } from "sonner";
import { useMealGoals } from "@/hooks/useMealGoals";
import { goalsFromRows, MEALS, MEAL_LABELS, optionalMealMacrosSchema } from "@/lib/per-meal-goals";
import { MacroInputs } from "./MacroInputs";
import { Button } from "./ui/button";

export function MealGoalsEditor() {
  const { data, error, isLoading, saveGoals } = useMealGoals();
  const [goals, setGoals] = useState(() => goalsFromRows([]));
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  useEffect(() => { if (data && !dirty) setGoals(data); }, [data, dirty]);
  const valid = MEALS.every((meal) => optionalMealMacrosSchema.safeParse(goals[meal]).success);
  const save = async () => {
    setSaving(true);
    try { await saveGoals(goals); setDirty(false); toast.success("Meal goals saved."); }
    catch { toast.error("Could not save meal goals. Please try again."); }
    finally { setSaving(false); }
  };
  return <section className="mt-6 border-t pt-6" aria-label="Per-meal goals">
    <h2 className="mb-4 flex items-center gap-2 font-semibold"><Target className="h-4 w-4 text-primary" />Per-meal goals</h2>
    {error && <p role="alert" className="mb-3 text-sm text-destructive">Could not load meal goals. Try refreshing.</p>}
    <div className="space-y-5">
      {MEALS.map((meal) => <fieldset key={meal} disabled={isLoading || saving || Boolean(error)}>
        <legend className="mb-2 text-sm font-medium">{MEAL_LABELS[meal]}</legend>
        <MacroInputs value={goals[meal]} onChange={(values) => { setDirty(true); setGoals((prev) => ({ ...prev, [meal]: values })); }} />
      </fieldset>)}
    </div>
    {!valid && <p role="alert" className="mt-3 text-sm text-destructive">Meal targets must be zero or greater, or blank.</p>}
    <div className="mt-5 flex justify-end"><Button onClick={save} disabled={saving || isLoading || Boolean(error) || !valid || !dirty} className="gap-2"><Save className="h-4 w-4" />{saving ? "Saving…" : "Save meal goals"}</Button></div>
  </section>;
}
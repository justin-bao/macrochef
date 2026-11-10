import { Link } from "@tanstack/react-router";
import { useMealGoals } from "@/hooks/useMealGoals";
import { goalForMeal, MEALS, MEAL_LABELS, type GoalMeal } from "@/lib/per-meal-goals";
import type { MacrosOptional } from "./MacroInputs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

export function MealGoalPicker({ meal, onChange }: {
  meal: GoalMeal | "custom";
  onChange: (meal: GoalMeal | "custom", targets?: MacrosOptional) => void;
}) {
  const { data, signedIn, isLoading, error } = useMealGoals();
  return <div className="space-y-2">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Select value={meal} onValueChange={(value) => {
        if (value === "custom") { onChange("custom"); return; }
        const selected = MEALS.find((m) => m === value);
        if (selected && data) onChange(selected, goalForMeal(data, selected));
      }}>
        <SelectTrigger aria-label="Meal goals" className="w-48"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="custom">Custom targets</SelectItem>
          {MEALS.map((m) => <SelectItem key={m} value={m} disabled={!signedIn || isLoading || !data}>{MEAL_LABELS[m]}</SelectItem>)}
        </SelectContent>
      </Select>
      <Link to={signedIn ? "/profile" : "/auth"} className="text-xs text-primary underline">{signedIn ? "Edit meal goals" : "Sign in for saved goals"}</Link>
    </div>
    {error && <p role="alert" className="text-xs text-destructive">Could not load saved meal goals.</p>}
  </div>;
}
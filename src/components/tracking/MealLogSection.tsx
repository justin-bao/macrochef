import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MEAL_LABELS, sumFood, type MealLog, type MealType } from "@/lib/tracking";
import { ChevronDown, Plus, X } from "lucide-react";

export function MealLogSection({
  meal,
  onAdd,
  onRemove,
}: {
  meal: MealLog;
  onAdd: (mealType: MealType) => void;
  onRemove: (mealType: MealType, itemId: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const totals = sumFood(meal.items);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border bg-card">
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40">
        <div className="flex min-w-0 items-center gap-3">
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition ${open ? "" : "-rotate-90"}`}
          />
          <span className="font-semibold">{MEAL_LABELS[meal.type]}</span>
          {meal.items.length > 0 && (
            <span className="truncate text-xs text-muted-foreground">
              {Math.round(totals.kcal)} kcal · {Math.round(totals.protein_g)}P
            </span>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 shrink-0 gap-1 text-primary"
          onClick={(event) => {
            event.stopPropagation();
            onAdd(meal.type);
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-3">
          {meal.items.length === 0 ? (
            <p className="rounded-md bg-muted/35 px-3 py-4 text-center text-sm text-muted-foreground">
              Nothing logged yet.
            </p>
          ) : (
            <div className="divide-y">
              {meal.items.map((item) => (
                <div key={item.id} className="group flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {item.quantity} {item.unit}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs">
                      <span className="font-semibold">{Math.round(item.kcal)} kcal</span>
                      <MacroPill label={`${Math.round(item.protein_g)}P`} color="protein" />
                      <MacroPill label={`${Math.round(item.carbs_g)}C`} color="carbs" />
                      <MacroPill label={`${Math.round(item.fat_g)}F`} color="fat" />
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                        {item.source}
                      </span>
                    </div>
                    {item.note && <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 opacity-70 transition hover:opacity-100"
                    onClick={() => onRemove(meal.type, item.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function MacroPill({ label, color }: { label: string; color: "protein" | "carbs" | "fat" }) {
  const cls = {
    protein: "bg-[var(--protein)]/10 text-[var(--protein)]",
    carbs: "bg-[var(--carbs)]/15 text-[oklch(0.45_0.13_75)]",
    fat: "bg-[var(--fat)]/10 text-[var(--fat)]",
  }[color];
  return <span className={`rounded-full px-2 py-0.5 font-medium ${cls}`}>{label}</span>;
}

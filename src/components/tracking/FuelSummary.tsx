import { Card } from "@/components/ui/card";
import {
  getBurnedCalories,
  getDayTotals,
  type TrackingDay,
  type TrackingSettings,
} from "@/lib/tracking";

function MacroMeter({
  label,
  value,
  target,
  className,
}: {
  label: string;
  value: number;
  target: number;
  className: string;
}) {
  const pct = target > 0 ? Math.min((value / target) * 100, 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {Math.round(value)} / {target}g
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div className={`h-2 rounded-full ${className}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function FuelSummary({ day, settings }: { day: TrackingDay; settings: TrackingSettings }) {
  const totals = getDayTotals(day);
  const burned = getBurnedCalories(day);
  const net = totals.kcal - burned;
  const remaining = settings.dailyCalorieTarget - net;
  const caloriePct =
    settings.dailyCalorieTarget > 0
      ? Math.min((Math.max(net, 0) / settings.dailyCalorieTarget) * 100, 100)
      : 0;

  return (
    <Card className="p-5">
      <div className="grid gap-5 md:grid-cols-[220px_1fr]">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Daily fuel
          </p>
          <div className="mt-1 flex items-end gap-2">
            <span className="text-4xl font-bold tabular-nums">{Math.round(net)}</span>
            <span className="pb-1 text-sm text-muted-foreground">net kcal</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{Math.round(totals.kcal)} eaten</span>
            <span>{burned} burned</span>
            <span
              className={
                remaining < 0 ? "font-semibold text-destructive" : "font-semibold text-primary"
              }
            >
              {Math.abs(Math.round(remaining))} {remaining < 0 ? "over" : "left"}
            </span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-[var(--kcal)]"
              style={{ width: `${caloriePct}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Target {settings.dailyCalorieTarget} kcal after activity
          </p>
        </div>

        <div className="grid content-center gap-3 sm:grid-cols-3">
          <MacroMeter
            label="Protein"
            value={totals.protein_g}
            target={settings.dailyProteinTarget}
            className="bg-[var(--protein)]"
          />
          <MacroMeter
            label="Carbs"
            value={totals.carbs_g}
            target={settings.dailyCarbsTarget}
            className="bg-[var(--carbs)]"
          />
          <MacroMeter
            label="Fat"
            value={totals.fat_g}
            target={settings.dailyFatTarget}
            className="bg-[var(--fat)]"
          />
        </div>
      </div>
    </Card>
  );
}

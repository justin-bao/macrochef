import { Card } from "@/components/ui/card";
import { getGarminCalorieBreakdown } from "@/lib/garmin-calories";
import {
  getDayTotals,
  type TrackingDay,
  type TrackingSettings,
  type UserActivityProfile,
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

function settingsToProfile(settings: TrackingSettings): UserActivityProfile {
  return {
    weight: settings.weight,
    height: settings.height,
    age: settings.age,
    sex: settings.sex,
    unitSystem: settings.unitSystem,
  };
}

export function FuelSummary({ day, settings }: { day: TrackingDay; settings: TrackingSettings }) {
  const totals = getDayTotals(day);
  const profile = settingsToProfile(settings);
  const bd = getGarminCalorieBreakdown(day, profile);

  // Net target mode: remaining = projectedBurn + netTarget − eaten
  // netTarget > 0 = surplus; = 0 = maintain; < 0 = deficit
  const netTarget = settings.dailyCalorieTarget;
  const remainingKcal = Math.round(bd.projectedDayBurn + netTarget - totals.kcal);

  // Progress bar: how far eaten is toward (projectedBurn + netTarget)
  const foodTarget = bd.projectedDayBurn + netTarget;
  const eatPct = foodTarget > 0 ? Math.min((totals.kcal / foodTarget) * 100, 100) : 0;

  return (
    <Card className="p-5">
      <div className="grid gap-5 md:grid-cols-[220px_1fr]">
        {/* Left column: burn & balance */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Daily fuel
          </p>

          {/* Remaining — hero metric */}
          <div className="mt-1 flex items-end gap-2">
            <span
              className={`text-4xl font-bold tabular-nums ${remainingKcal < 0 ? "text-destructive" : ""}`}
            >
              {Math.abs(remainingKcal)}
            </span>
            <span className={`pb-1 text-sm ${remainingKcal < 0 ? "text-destructive" : "text-muted-foreground"}`}>
              kcal {remainingKcal < 0 ? "over goal" : "remaining"}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{Math.round(totals.kcal)} eaten</span>
            <span>{bd.projectedDayBurn} projected burn</span>
          </div>

          {/* Intake vs food-target progress bar */}
          <div className="mt-3 h-2 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-[var(--kcal)]"
              style={{ width: `${eatPct}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {netTarget === 0
              ? "Target: break even"
              : netTarget < 0
                ? `Target: ${Math.abs(netTarget)} kcal deficit`
                : `Target: ${netTarget} kcal surplus`}
            {" · "}eat ~{Math.max(0, Math.round(bd.projectedDayBurn + netTarget))} kcal
          </p>

          {/* Burn breakdown */}
          <div className="mt-3 rounded-md bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
            <div className="flex justify-between">
              <span>BMR</span>
              <span className="tabular-nums">{bd.bmrPerDay} kcal/day</span>
            </div>
            {bd.walkingCalories > 0 && (
              <div className="flex justify-between">
                <span>Walking ({bd.effectiveWalkingDistanceMi} mi)</span>
                <span className="tabular-nums">+{bd.walkingCalories} kcal</span>
              </div>
            )}
            {bd.activityActiveCalories > 0 && (
              <div className="flex justify-between">
                <span>Activities</span>
                <span className="tabular-nums">+{bd.activityActiveCalories} kcal</span>
              </div>
            )}
          </div>
        </div>

        {/* Right column: macro meters */}
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

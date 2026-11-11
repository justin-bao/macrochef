import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getGarminCalorieBreakdown } from "@/lib/garmin-calories";
import { workoutActiveCalories } from "@/lib/activity-energy";
import type { ActivityLogItem, AppleHealthSummary, TrackingDay, UserActivityProfile } from "@/lib/tracking";
import { Activity, Dumbbell, Flame, Footprints, Plus, RotateCcw, Route, X } from "lucide-react";

const LABELS: Record<string, string> = {
  run: "Run",
  walk: "Walk",
  bike: "Bike",
  stairmaster: "Stairmaster",
  strength: "Strength",
  gym: "Gym",
  other: "Activity",
};

const SOURCE_LABELS: Record<string, string> = {
  manual: "Manual",
  apple_health: "Apple Health",
  strava: "Strava",
  garmin: "Garmin",
};

export function ActivityPanel({
  day,
  profile,
  onSetAppleHealthSummary,
  onAdd,
  onRemove,
  onUpdate,
  // legacy prop name support
  onSetGarminSummary,
}: {
  day: TrackingDay;
  profile: UserActivityProfile;
  onSetAppleHealthSummary?: (summary: AppleHealthSummary | undefined) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (activity: ActivityLogItem) => void;
  /** @deprecated use onSetAppleHealthSummary */
  onSetGarminSummary?: (summary: AppleHealthSummary | undefined) => void;
}) {
  const setHealthSummary = onSetAppleHealthSummary ?? onSetGarminSummary ?? (() => {});
  const { activities } = day;
  // Resolve from either field name
  const healthSummary = day.appleHealthSummary ?? day.garminSummary;

  const [distanceInput, setDistanceInput] = useState(
    healthSummary ? String(healthSummary.totalDistanceMi * (profile.unitSystem === "metric" ? 1.60934 : 1)) : "",
  );
  const [activeCalInput, setActiveCalInput] = useState(
    healthSummary?.activeCalories != null ? String(healthSummary.activeCalories) : "",
  );
  const [stepsInput, setStepsInput] = useState(healthSummary?.totalSteps != null ? String(healthSummary.totalSteps) : "");
  const [movementMode, setMovementMode] = useState<"distance" | "steps">(healthSummary?.movementInput ?? "distance");

  const bd = getGarminCalorieBreakdown(day, profile);

  const liftingCount = activities.filter((a) => a.kind === "strength" || a.kind === "gym").length;
  const cardioCount = activities.length - liftingCount;

  function commitHealthInputs(newDistStr?: string, newCalStr?: string, mode = movementMode) {
    const distStr = newDistStr ?? distanceInput;
    const calStr  = newCalStr  ?? activeCalInput;
    const dist    = parseFloat(distStr);
    const cal     = parseFloat(calStr);
    const steps = Number(stepsInput);
    const hasSteps = stepsInput.trim() !== "" && Number.isInteger(steps) && steps >= 0;

    const hasDistance = distStr.trim() !== "" && !isNaN(dist) && dist >= 0;
    const hasCal      = calStr.trim()  !== "" && !isNaN(cal)  && cal  >= 0;

    if (!(mode === "distance" ? hasDistance : hasSteps) && !hasCal) {
      setHealthSummary(undefined);
    } else {
      setHealthSummary({
        totalDistanceMi: mode === "distance" && hasDistance ? (profile.unitSystem === "metric" ? dist / 1.60934 : dist) : 0,
        totalSteps: mode === "steps" && hasSteps ? steps : undefined,
        movementInput: mode,
        ...(hasCal ? { activeCalories: cal } : {}),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  function clearHealthData() {
    setDistanceInput("");
    setActiveCalInput("");
    setStepsInput("");
    setHealthSummary(undefined);
  }

  return (
    <Card className="p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Activity
          </p>
          <h2 className="mt-1 text-xl font-semibold">Cardio and lifting</h2>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-destructive" />
              {bd.projectedDayBurn} kcal projected
            </span>
            <span className="inline-flex items-center gap-1">
              <Route className="h-3.5 w-3.5" />
              {cardioCount} cardio
            </span>
            <span className="inline-flex items-center gap-1">
              <Dumbbell className="h-3.5 w-3.5" />
              {liftingCount} gym
            </span>
          </div>
        </div>
        <Button size="sm" className="gap-1" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </div>

      {/* Apple Health input panel */}
      <div className="mt-4 rounded-md border border-dashed bg-muted/20 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <Route className="h-3.5 w-3.5 text-primary" />
            Daily movement
          </div>
          {healthSummary && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px] text-muted-foreground"
              onClick={clearHealthData}
            >
              <X className="mr-1 h-3 w-3" /> Clear
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Distance */}
          <div>
            <div className="mb-1 flex gap-1" role="group" aria-label="Daily movement input">
              <Button variant={movementMode === "distance" ? "secondary" : "ghost"} size="sm" className="h-6 px-2 text-xs" aria-pressed={movementMode === "distance"} onClick={() => { setMovementMode("distance"); commitHealthInputs(undefined, undefined, "distance"); }}><Route className="mr-1 h-3 w-3" />Distance</Button>
              <Button variant={movementMode === "steps" ? "secondary" : "ghost"} size="sm" className="h-6 px-2 text-xs" aria-pressed={movementMode === "steps"} onClick={() => { setMovementMode("steps"); commitHealthInputs(undefined, undefined, "steps"); }}><Footprints className="mr-1 h-3 w-3" />Steps</Button>
            </div>
            <div className="relative">
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="h-8 pr-8 text-sm"
                aria-label={movementMode === "distance" ? "Total daily walking and running distance" : "Total daily steps"}
                value={movementMode === "distance" ? distanceInput : stepsInput}
                onChange={(e) => movementMode === "distance" ? setDistanceInput(e.target.value) : setStepsInput(e.target.value)}
                onBlur={() => commitHealthInputs()}
                onKeyDown={(e) => e.key === "Enter" && commitHealthInputs()}
              />
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                {movementMode === "steps" ? "steps" : profile.unitSystem === "metric" ? "km" : "mi"}
              </span>
            </div>
          </div>

          {/* Active calories (optional) */}
          <div>
            <p className="mb-1 text-[10px] text-muted-foreground">
              Daily active calories{" "}
              <span className="text-muted-foreground/60">(optional)</span>
            </p>
            <div className="relative">
              <Input
                type="number"
                min="0"
                placeholder="auto"
                className="h-8 pr-9 text-sm"
                value={activeCalInput}
                aria-label="Whole-day active calories including workouts"
                onChange={(e) => setActiveCalInput(e.target.value)}
                onBlur={() => commitHealthInputs()}
                onKeyDown={(e) => e.key === "Enter" && commitHealthInputs()}
              />
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                kcal
              </span>
            </div>
          </div>
        </div>

        {/* Burn summary */}
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground">
          <span>Estimated RMR</span>
          <span className="text-right tabular-nums">{bd.bmrPerDay} kcal/day</span>
          {bd.walkingCalories > 0 && (
            <>
              <span>
                {bd.activeCaloriesFromHealthKit
                  ? "Non-workout active"
                  : `Walking (${bd.effectiveWalkingDistanceMi} mi)`}
              </span>
              <span className="text-right tabular-nums text-primary">
                +{bd.walkingCalories} kcal
              </span>
            </>
          )}
          {bd.activityActiveCalories > 0 && (
            <>
              <span>Workouts · active only</span>
              <span className="text-right tabular-nums">+{bd.activityActiveCalories} kcal</span>
            </>
          )}
          <span className="border-t border-border/40 pt-0.5 font-medium text-foreground/70">
            Projected total burn
          </span>
          <span className="border-t border-border/40 pt-0.5 text-right font-medium tabular-nums text-foreground/70">
            {bd.projectedDayBurn} kcal
          </span>
        </div>
      </div>

      {/* Activity list */}
      <div className="mt-4">
        {activities.length === 0 && !healthSummary ? (
          <p className="rounded-md bg-muted/35 px-3 py-5 text-center text-sm text-muted-foreground">
            No workouts logged.
          </p>
        ) : (
          <div className="divide-y">
            {/* Synthetic Apple Health distance / active cal row */}
            {healthSummary && bd.walkingCalories > 0 && (
              <div className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Footprints className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="font-medium">
                      {bd.activeCaloriesFromHealthKit
                        ? "Non-workout active calories"
                        : "Daily steps / walking"}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                      Daily total
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {healthSummary.totalDistanceMi > 0 && (
                      <>
                        {!bd.activeCaloriesFromHealthKit && (
                          <span>{bd.effectiveWalkingDistanceMi} mi effective</span>
                        )}
                        <span>{healthSummary.totalDistanceMi} mi total</span>
                      </>
                    )}
                    {bd.activeCaloriesFromHealthKit && (
                      <span>Workouts excluded</span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 pr-2 text-sm font-semibold text-primary tabular-nums">
                  {bd.walkingCalories} kcal
                </div>
              </div>
            )}

            {activities.map((activity) => (
              <div
                key={activity.id}
                className="group flex items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Activity className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="font-medium">{activity.name || LABELS[activity.kind]}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                      {LABELS[activity.kind]}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{activity.durationMin} min</span>
                    <span>Active calories{activity.source === "strava" && activity.estimateMethod !== "provider_reported_active" ? " · estimated" : ""}</span>
                    {activity.distance != null && (
                      <span>
                        {activity.distance} {activity.distanceUnit}
                      </span>
                    )}
                    {activity.sets != null && (
                      <span>
                        {activity.sets}×{activity.reps ?? "-"}
                        {activity.load ? ` @ ${activity.load}${activity.loadUnit}` : ""}
                      </span>
                    )}
                    {activity.source && (
                      <span>{SOURCE_LABELS[activity.source] ?? activity.source}</span>
                    )}
                    {activity.manualCaloriesBurned != null && (
                      <span>estimate {activity.estimatedCaloriesBurned ?? activity.caloriesBurned} kcal</span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <div className="relative w-20">
                    <Input
                      type="number"
                      min="0"
                      className="h-8 pr-8 text-right text-sm font-semibold text-destructive"
                      aria-label={`Active calories for ${activity.name}`}
                      value={workoutActiveCalories(activity, profile)}
                      onChange={(event) => {
                        const caloriesBurned = Math.max(0, Number(event.target.value) || 0);
                        onUpdate({
                          ...activity,
                          caloriesBurned,
                          calorieBasis: "active",
                          estimatedCaloriesBurned:
                            workoutActiveCalories(activity, profile),
                          manualCaloriesBurned: caloriesBurned,
                          estimateMethod:
                            activity.estimateMethod === "provider_reported"
                              ? "provider_reported_adjusted"
                              : "manual_adjusted",
                        });
                      }}
                    />
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                      kcal
                    </span>
                  </div>
                  {activity.manualCaloriesBurned != null && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        const estimatedCaloriesBurned =
                          activity.estimatedCaloriesBurned ?? activity.caloriesBurned;
                        onUpdate({
                          ...activity,
                          caloriesBurned: estimatedCaloriesBurned,
                          estimatedCaloriesBurned,
                          manualCaloriesBurned: undefined,
                        });
                      }}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-70 transition hover:opacity-100"
                    onClick={() => onRemove(activity.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

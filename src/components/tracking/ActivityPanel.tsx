import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getGarminCalorieBreakdown } from "@/lib/garmin-calories";
import type { ActivityLogItem, AppleHealthSummary, TrackingDay, UserActivityProfile } from "@/lib/tracking";
import { Activity, Dumbbell, Flame, Heart, Plus, RotateCcw, Route, X } from "lucide-react";

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
    healthSummary ? String(healthSummary.totalDistanceMi) : "",
  );
  const [activeCalInput, setActiveCalInput] = useState(
    healthSummary?.activeCalories != null ? String(healthSummary.activeCalories) : "",
  );

  const bd = getGarminCalorieBreakdown(day, profile);

  const liftingCount = activities.filter((a) => a.kind === "strength" || a.kind === "gym").length;
  const cardioCount = activities.length - liftingCount;

  function commitHealthInputs(newDistStr?: string, newCalStr?: string) {
    const distStr = newDistStr ?? distanceInput;
    const calStr  = newCalStr  ?? activeCalInput;
    const dist    = parseFloat(distStr);
    const cal     = parseFloat(calStr);

    const hasDistance = distStr.trim() !== "" && !isNaN(dist) && dist >= 0;
    const hasCal      = calStr.trim()  !== "" && !isNaN(cal)  && cal  >= 0;

    if (!hasDistance && !hasCal) {
      setHealthSummary(undefined);
    } else {
      setHealthSummary({
        totalDistanceMi: hasDistance ? dist : 0,
        ...(hasCal ? { activeCalories: cal } : {}),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  function clearHealthData() {
    setDistanceInput("");
    setActiveCalInput("");
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
            <Heart className="h-3.5 w-3.5 text-pink-500" />
            Apple Health / manual entry
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
            <p className="mb-1 text-[10px] text-muted-foreground">Distance</p>
            <div className="relative">
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="h-8 pr-8 text-sm"
                value={distanceInput}
                onChange={(e) => setDistanceInput(e.target.value)}
                onBlur={() => commitHealthInputs()}
                onKeyDown={(e) => e.key === "Enter" && commitHealthInputs()}
              />
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                mi
              </span>
            </div>
          </div>

          {/* Active calories (optional) */}
          <div>
            <p className="mb-1 text-[10px] text-muted-foreground">
              Active calories{" "}
              <span className="text-muted-foreground/60">(optional)</span>
            </p>
            <div className="relative">
              <Input
                type="number"
                min="0"
                placeholder="auto"
                className="h-8 pr-9 text-sm"
                value={activeCalInput}
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
          <span>BMR</span>
          <span className="text-right tabular-nums">{bd.bmrPerDay} kcal/day</span>
          {bd.walkingCalories > 0 && (
            <>
              <span>
                {bd.activeCaloriesFromHealthKit
                  ? "Apple Health active"
                  : `Walking (${bd.effectiveWalkingDistanceMi} mi)`}
              </span>
              <span className="text-right tabular-nums text-pink-600">
                +{bd.walkingCalories} kcal
              </span>
            </>
          )}
          {bd.activityActiveCalories > 0 && (
            <>
              <span>Logged activities</span>
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
                    <Heart className="h-3.5 w-3.5 shrink-0 text-pink-500" />
                    <span className="font-medium">
                      {bd.activeCaloriesFromHealthKit
                        ? "Apple Health active calories"
                        : "Daily steps / walking"}
                    </span>
                    <span className="rounded-full bg-pink-100 px-2 py-0.5 text-[10px] text-pink-700 dark:bg-pink-950 dark:text-pink-300">
                      Apple Health
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
                      <span>Direct from Apple Health</span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 pr-2 text-sm font-semibold text-pink-600 tabular-nums">
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
                    <Activity className="h-3.5 w-3.5 shrink-0 text-orange-500" />
                    <span className="font-medium">{activity.name || LABELS[activity.kind]}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                      {LABELS[activity.kind]}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{activity.durationMin} min</span>
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
                      value={activity.caloriesBurned}
                      onChange={(event) => {
                        const caloriesBurned = Math.max(0, Number(event.target.value) || 0);
                        onUpdate({
                          ...activity,
                          caloriesBurned,
                          estimatedCaloriesBurned:
                            activity.estimatedCaloriesBurned ?? activity.caloriesBurned,
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

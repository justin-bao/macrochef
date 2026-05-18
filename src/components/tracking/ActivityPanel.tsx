import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getGarminCalorieBreakdown } from "@/lib/garmin-calories";
import type { ActivityLogItem, GarminDaySummary, TrackingDay, UserActivityProfile } from "@/lib/tracking";
import { Dumbbell, Flame, MapPin, Plus, RotateCcw, Route, X } from "lucide-react";

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
  apple_health: "Apple Watch",
  strava: "Strava",
  garmin: "Garmin",
};

export function ActivityPanel({
  day,
  profile,
  onSetGarminSummary,
  onAdd,
  onRemove,
  onUpdate,
}: {
  day: TrackingDay;
  profile: UserActivityProfile;
  onSetGarminSummary: (summary: GarminDaySummary | undefined) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (activity: ActivityLogItem) => void;
}) {
  const { activities, garminSummary } = day;

  const [distanceInput, setDistanceInput] = useState(
    garminSummary ? String(garminSummary.totalDistanceMi) : "",
  );

  const bd = getGarminCalorieBreakdown(day, profile);

  const liftingCount = activities.filter(
    (a) => a.kind === "strength" || a.kind === "gym",
  ).length;
  const cardioCount = activities.length - liftingCount;

  function commitDistance() {
    const val = parseFloat(distanceInput);
    if (!distanceInput.trim() || isNaN(val) || val < 0) {
      onSetGarminSummary(undefined);
    } else {
      onSetGarminSummary({ totalDistanceMi: val, updatedAt: new Date().toISOString() });
    }
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

      {/* Garmin daily distance input */}
      <div className="mt-4 rounded-md border border-dashed bg-muted/20 p-3">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          Garmin total distance today
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              className="h-8 pr-8 text-sm"
              value={distanceInput}
              onChange={(e) => setDistanceInput(e.target.value)}
              onBlur={commitDistance}
              onKeyDown={(e) => e.key === "Enter" && commitDistance()}
            />
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
              mi
            </span>
          </div>
          {garminSummary && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => {
                setDistanceInput("");
                onSetGarminSummary(undefined);
              }}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Calorie breakdown */}
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-muted-foreground">
          <span>BMR ({Math.round(bd.bmrPerHour)} kcal/hr)</span>
          <span className="text-right tabular-nums">{bd.bmrPerDay} kcal/day</span>
          {bd.walkingCalories > 0 && (
            <>
              <span>
                Walking{" "}
                {bd.effectiveWalkingDistanceMi > 0
                  ? `(${bd.effectiveWalkingDistanceMi} mi effective)`
                  : ""}
              </span>
              <span className="text-right tabular-nums">+{bd.walkingCalories} kcal</span>
            </>
          )}
          {bd.activityActiveCalories > 0 && (
            <>
              <span>Activities (active cal)</span>
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
        {activities.length === 0 ? (
          <p className="rounded-md bg-muted/35 px-3 py-5 text-center text-sm text-muted-foreground">
            No workouts logged.
          </p>
        ) : (
          <div className="divide-y">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="group flex items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
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

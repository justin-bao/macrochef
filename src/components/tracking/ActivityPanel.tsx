import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { ActivityLogItem } from "@/lib/tracking";
import { Dumbbell, Flame, Plus, Route, X } from "lucide-react";

const LABELS: Record<string, string> = {
  run: "Run",
  walk: "Walk",
  bike: "Bike",
  stairmaster: "Stairmaster",
  strength: "Strength",
  gym: "Gym",
  other: "Activity",
};

export function ActivityPanel({
  activities,
  onAdd,
  onRemove,
}: {
  activities: ActivityLogItem[];
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  const burned = activities.reduce((sum, activity) => sum + activity.caloriesBurned, 0);
  const liftingCount = activities.filter(
    (activity) => activity.kind === "strength" || activity.kind === "gym",
  ).length;
  const cardioCount = activities.length - liftingCount;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Activity
          </p>
          <h2 className="mt-1 text-xl font-semibold">Cardio and lifting</h2>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-destructive" />
              {burned} kcal
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

      <div className="mt-4">
        {activities.length === 0 ? (
          <p className="rounded-md bg-muted/35 px-3 py-5 text-center text-sm text-muted-foreground">
            No workouts logged.
          </p>
        ) : (
          <div className="divide-y">
            {activities.map((activity) => (
              <div key={activity.id} className="group flex items-center justify-between gap-3 py-3">
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
                        {activity.sets}x{activity.reps ?? "-"}
                        {activity.load ? ` @ ${activity.load}${activity.loadUnit}` : ""}
                      </span>
                    )}
                    <span>{activity.intensity}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-semibold text-destructive">
                    -{activity.caloriesBurned}
                  </span>
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

import { useState } from "react";
import { calculateCaloriesBurned, calculateDistanceCalories } from "@/lib/activity-calculator";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ActivityIntensity, ActivityKind, ActivityLogItem } from "@/lib/tracking";

const ACTIVITY_LABELS: Record<ActivityKind, string> = {
  run: "Run",
  walk: "Walk",
  bike: "Bike",
  stairmaster: "Stairmaster",
  strength: "Strength training",
  gym: "Gym session",
  other: "Other activity",
};

export function ActivityLogger({
  open,
  onOpenChange,
  onAdd,
  weight,
  unitSystem,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (activity: ActivityLogItem) => void;
  weight: number;
  unitSystem: "imperial" | "metric";
}) {
  const [kind, setKind] = useState<ActivityKind>("run");
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("");
  const [distance, setDistance] = useState("");
  const [intensity, setIntensity] = useState<ActivityIntensity>("moderate");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [load, setLoad] = useState("");

  const isDistanceActivity = kind === "run" || kind === "walk" || kind === "bike";
  const isLiftingActivity = kind === "strength" || kind === "gym";
  const distanceUnit = unitSystem === "imperial" ? "mi" : "km";
  const loadUnit = unitSystem === "imperial" ? "lb" : "kg";

  const reset = () => {
    setName("");
    setDuration("");
    setDistance("");
    setIntensity("moderate");
    setSets("");
    setReps("");
    setLoad("");
  };

  const submit = () => {
    const durationMin = Number(duration);
    if (!durationMin) return;

    const distanceValue = Number(distance);
    const burned =
      isDistanceActivity && distanceValue > 0
        ? calculateDistanceCalories(kind, distanceValue, durationMin, weight, unitSystem)
        : calculateCaloriesBurned(kind, intensity, durationMin, weight, unitSystem);

    onAdd({
      id: crypto.randomUUID(),
      kind,
      name: name.trim() || ACTIVITY_LABELS[kind],
      durationMin,
      distance: distanceValue || undefined,
      distanceUnit: isDistanceActivity ? distanceUnit : undefined,
      intensity,
      caloriesBurned: burned,
      sets: Number(sets) || undefined,
      reps: Number(reps) || undefined,
      load: Number(load) || undefined,
      loadUnit: isLiftingActivity ? loadUnit : undefined,
      loggedAt: new Date().toISOString(),
    });

    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) reset();
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Log activity</DialogTitle>
        </DialogHeader>
        <div className="mt-2 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={kind} onValueChange={(value) => setKind(value as ActivityKind)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ACTIVITY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={ACTIVITY_LABELS[kind]}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Duration (min)</Label>
              <Input
                type="number"
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
                placeholder="45"
              />
            </div>
            {isDistanceActivity ? (
              <div className="space-y-2">
                <Label>Distance ({distanceUnit})</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={distance}
                  onChange={(event) => setDistance(event.target.value)}
                  placeholder="3.0"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Intensity</Label>
                <Select
                  value={intensity}
                  onValueChange={(value) => setIntensity(value as ActivityIntensity)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="vigorous">Vigorous</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {isDistanceActivity && (
            <div className="space-y-2">
              <Label>Intensity</Label>
              <Select
                value={intensity}
                onValueChange={(value) => setIntensity(value as ActivityIntensity)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="vigorous">Vigorous</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {isLiftingActivity && (
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Sets</Label>
                <Input
                  type="number"
                  value={sets}
                  onChange={(event) => setSets(event.target.value)}
                  placeholder="4"
                />
              </div>
              <div className="space-y-2">
                <Label>Reps</Label>
                <Input
                  type="number"
                  value={reps}
                  onChange={(event) => setReps(event.target.value)}
                  placeholder="8"
                />
              </div>
              <div className="space-y-2">
                <Label>Load ({loadUnit})</Label>
                <Input
                  type="number"
                  value={load}
                  onChange={(event) => setLoad(event.target.value)}
                  placeholder="135"
                />
              </div>
            </div>
          )}

          <Button className="w-full" disabled={!duration} onClick={submit}>
            Log activity
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

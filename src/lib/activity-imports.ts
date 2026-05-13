import { estimateActivityCalories } from "@/lib/activity-calculator";
import type {
  ActivityKind,
  ActivityLogItem,
  ActivitySource,
  UserActivityProfile,
} from "@/lib/tracking";

export type ImportedActivity = {
  provider: Exclude<ActivitySource, "manual">;
  providerActivityId: string;
  kind: ActivityKind;
  name?: string;
  startedAt: string;
  durationMin: number;
  distance?: number;
  distanceUnit?: "mi" | "km";
  caloriesBurned?: number;
};

export function normalizeImportedActivity(
  activity: ImportedActivity,
  profile: UserActivityProfile,
): ActivityLogItem {
  const distance =
    activity.distance &&
    activity.distanceUnit &&
    activity.distanceUnit !== (profile.unitSystem === "imperial" ? "mi" : "km")
      ? activity.distanceUnit === "mi"
        ? activity.distance * 1.60934
        : activity.distance / 1.60934
      : activity.distance;
  const estimate = estimateActivityCalories({
    activityKind: activity.kind,
    durationMinutes: activity.durationMin,
    distance,
    profile,
  });

  return {
    id: `${activity.provider}:${activity.providerActivityId}`,
    kind: activity.kind,
    name: activity.name?.trim() || activity.kind,
    durationMin: activity.durationMin,
    caloriesBurned: Math.round(activity.caloriesBurned ?? estimate.calories),
    estimatedCaloriesBurned: estimate.calories,
    manualCaloriesBurned: activity.caloriesBurned == null ? undefined : Math.round(activity.caloriesBurned),
    source: activity.provider,
    estimateMethod: activity.caloriesBurned == null ? estimate.method : "provider_reported",
    loggedAt: activity.startedAt,
    distance,
    distanceUnit: distance ? (profile.unitSystem === "imperial" ? "mi" : "km") : undefined,
  };
}

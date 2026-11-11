import { estimateActivityCalories } from "./activity-calculator";
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
  calorieBasis?: "active" | "total" | "unknown";
  steps?: number;
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
  const trustedCalories = activity.calorieBasis === "active" && Number.isFinite(activity.caloriesBurned) && (activity.caloriesBurned ?? -1) >= 0 ? activity.caloriesBurned : undefined;

  return {
    id: `${activity.provider}:${activity.providerActivityId}`,
    kind: activity.kind,
    name: activity.name?.trim() || activity.kind,
    durationMin: activity.durationMin,
    caloriesBurned: Math.round(trustedCalories ?? estimate.calories),
    calorieBasis: "active",
    estimatedCaloriesBurned: estimate.calories,
    source: activity.provider,
    estimateMethod: trustedCalories == null ? estimate.method : "provider_reported_active",
    loggedAt: activity.startedAt,
    distance,
    distanceUnit: distance ? (profile.unitSystem === "imperial" ? "mi" : "km") : undefined,
    steps: activity.steps,
  };
}

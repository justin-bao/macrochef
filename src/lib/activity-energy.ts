import { calculateBMR, estimateActivityCalories } from "./activity-calculator";
import type { ActivityLogItem, UserActivityProfile } from "./tracking";

export function stepLengthMeters(profile: UserActivityProfile): number {
  const heightCm = profile.unitSystem === "imperial" ? profile.height * 2.54 : profile.height;
  return heightCm * 0.414 / 100;
}

export function stepsToMiles(steps: number, profile: UserActivityProfile): number {
  return Math.max(0, steps) * stepLengthMeters(profile) / 1609.34;
}

// Saved pre-active-only estimates included resting energy. Convert without mutating history.
export function workoutActiveCalories(activity: ActivityLogItem, profile: UserActivityProfile): number {
  if (activity.calorieBasis === "active") return Math.max(0, activity.caloriesBurned);
  if (activity.manualCaloriesBurned != null && activity.source === "manual") return Math.max(0, activity.manualCaloriesBurned);
  if (activity.estimateMethod?.startsWith("profile_") && activity.source === "manual") {
    return Math.max(0, Math.round(activity.caloriesBurned - calculateBMR(profile) * activity.durationMin / 1440));
  }
  const distance = activity.distanceUnit === "km" && profile.unitSystem === "imperial" ? (activity.distance ?? 0) / 1.60934 : activity.distanceUnit === "mi" && profile.unitSystem === "metric" ? (activity.distance ?? 0) * 1.60934 : activity.distance;
  return estimateActivityCalories({ activityKind: activity.kind, durationMinutes: activity.durationMin, distance, sets: activity.sets, reps: activity.reps, load: activity.load, profile }).calories;
}
import type { ActivityIntensity, ActivityKind } from "@/lib/tracking";

const MET_VALUES: Record<ActivityKind, Record<ActivityIntensity, number>> = {
  run: { low: 7, moderate: 9.8, high: 11.5, vigorous: 14.5 },
  walk: { low: 2.5, moderate: 3.5, high: 4.5, vigorous: 5 },
  bike: { low: 4, moderate: 6.8, high: 10, vigorous: 14 },
  stairmaster: { low: 4, moderate: 6, high: 9, vigorous: 12 },
  strength: { low: 3, moderate: 4.5, high: 6, vigorous: 8 },
  gym: { low: 2.8, moderate: 4.8, high: 6.5, vigorous: 8.5 },
  other: { low: 3, moderate: 5, high: 7, vigorous: 10 },
};

export function calculateCaloriesBurned(
  activityKind: ActivityKind,
  intensity: ActivityIntensity,
  durationMinutes: number,
  weight: number,
  unitSystem: "imperial" | "metric" = "imperial",
): number {
  const weightKg = unitSystem === "imperial" ? weight * 0.453592 : weight;
  const durationHours = durationMinutes / 60;
  const met = MET_VALUES[activityKind]?.[intensity] ?? MET_VALUES.other[intensity];
  return Math.round(met * weightKg * durationHours);
}

export function calculateDistanceCalories(
  activityKind: ActivityKind,
  distance: number,
  durationMinutes: number,
  weight: number,
  unitSystem: "imperial" | "metric" = "imperial",
): number {
  if (durationMinutes <= 0 || distance <= 0) {
    return calculateCaloriesBurned(activityKind, "moderate", durationMinutes, weight, unitSystem);
  }

  const weightKg = unitSystem === "imperial" ? weight * 0.453592 : weight;
  const distanceKm = unitSystem === "imperial" ? distance * 1.60934 : distance;
  const speedKmh = distanceKm / (durationMinutes / 60);

  let met = activityKind === "bike" ? 6.8 : 3.5;
  if (activityKind === "run") {
    if (speedKmh < 8) met = 6;
    else if (speedKmh < 9.7) met = 8.3;
    else if (speedKmh < 11.3) met = 9.8;
    else if (speedKmh < 12.9) met = 11;
    else if (speedKmh < 14.5) met = 11.8;
    else if (speedKmh < 16.1) met = 12.8;
    else met = 14.5;
  } else if (activityKind === "bike") {
    if (speedKmh < 16) met = 4;
    else if (speedKmh < 19) met = 6.8;
    else if (speedKmh < 22) met = 8;
    else if (speedKmh < 26) met = 10;
    else met = 12;
  } else if (activityKind === "walk") {
    if (speedKmh < 4) met = 2.5;
    else if (speedKmh < 5.6) met = 3.5;
    else if (speedKmh < 6.5) met = 4.5;
    else met = 5;
  }

  return Math.round(met * weightKg * (durationMinutes / 60));
}

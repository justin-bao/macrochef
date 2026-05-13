import type { ActivityIntensity, ActivityKind, UserActivityProfile } from "@/lib/tracking";

type EstimateInput = {
  activityKind: ActivityKind;
  durationMinutes: number;
  profile: UserActivityProfile;
  distance?: number;
  sets?: number;
  reps?: number;
  load?: number;
};

type EstimateResult = {
  calories: number;
  met: number;
  method: string;
};

const FALLBACK_MET_VALUES: Record<ActivityKind, number> = {
  run: 9.8,
  walk: 3.5,
  bike: 6.8,
  stairmaster: 8,
  strength: 4.5,
  gym: 5,
  other: 4,
};

const LEGACY_INTENSITY_MULTIPLIER: Record<ActivityIntensity, number> = {
  low: 0.75,
  moderate: 1,
  high: 1.25,
  vigorous: 1.5,
};

function toKg(weight: number, unitSystem: UserActivityProfile["unitSystem"]) {
  return unitSystem === "imperial" ? weight * 0.453592 : weight;
}

function toCm(height: number, unitSystem: UserActivityProfile["unitSystem"]) {
  return unitSystem === "imperial" ? height * 2.54 : height;
}

function toKm(distance: number, unitSystem: UserActivityProfile["unitSystem"]) {
  return unitSystem === "imperial" ? distance * 1.60934 : distance;
}

function restingVo2(profile: UserActivityProfile) {
  const weightKg = toKg(profile.weight, profile.unitSystem);
  const heightCm = toCm(profile.height, profile.unitSystem);
  const sexOffset = profile.sex === "male" ? 5 : profile.sex === "female" ? -161 : -78;
  const bmrKcalDay = 10 * weightKg + 6.25 * heightCm - 5 * profile.age + sexOffset;

  return Math.max(2.6, Math.min(4.6, (bmrKcalDay * 1000) / (1440 * 5 * weightKg)));
}

function caloriesFromVo2(vo2MlKgMin: number, weightKg: number, durationMinutes: number) {
  return Math.round((vo2MlKgMin * weightKg * durationMinutes) / 200);
}

function caloriesFromMet(met: number, profile: UserActivityProfile, durationMinutes: number) {
  const weightKg = toKg(profile.weight, profile.unitSystem);
  const personalizedMet = met * (restingVo2(profile) / 3.5);

  return {
    calories: Math.round(personalizedMet * weightKg * (durationMinutes / 60)),
    met: Number(personalizedMet.toFixed(1)),
  };
}

function bikeMetFromSpeed(speedKmh: number) {
  if (speedKmh < 16) return 4;
  if (speedKmh < 19) return 6.8;
  if (speedKmh < 22) return 8;
  if (speedKmh < 26) return 10;
  if (speedKmh < 31) return 12;
  return 14;
}

function strengthMet(input: EstimateInput) {
  const volume = (input.sets ?? 0) * (input.reps ?? 0) * (input.load ?? 0);
  const volumeBump = Math.min(2.5, volume / 8000);
  const densityBump =
    input.durationMinutes > 0 ? Math.min(1.5, volume / input.durationMinutes / 250) : 0;

  return 3.8 + volumeBump + densityBump;
}

export function estimateActivityCalories(input: EstimateInput): EstimateResult {
  const durationMinutes = Math.max(0, input.durationMinutes);
  const weightKg = toKg(input.profile.weight, input.profile.unitSystem);
  const restVo2 = restingVo2(input.profile);

  if (durationMinutes <= 0 || weightKg <= 0) {
    return { calories: 0, met: 0, method: "profile_met" };
  }

  if (input.distance && input.distance > 0) {
    const distanceKm = toKm(input.distance, input.profile.unitSystem);
    const speedKmh = distanceKm / (durationMinutes / 60);
    const speedMetersMin = (distanceKm * 1000) / durationMinutes;

    if (input.activityKind === "walk") {
      const vo2 = 0.1 * speedMetersMin + restVo2;
      const met = vo2 / 3.5;
      return {
        calories: caloriesFromVo2(vo2, weightKg, durationMinutes),
        met: Number(met.toFixed(1)),
        method: "profile_acsm_walk",
      };
    }

    if (input.activityKind === "run") {
      const vo2 = 0.2 * speedMetersMin + restVo2;
      const met = vo2 / 3.5;
      return {
        calories: caloriesFromVo2(vo2, weightKg, durationMinutes),
        met: Number(met.toFixed(1)),
        method: "profile_acsm_run",
      };
    }

    if (input.activityKind === "bike") {
      const met = bikeMetFromSpeed(speedKmh);
      const result = caloriesFromMet(met, input.profile, durationMinutes);
      return { ...result, method: "profile_speed_met_bike" };
    }
  }

  const met =
    input.activityKind === "strength" || input.activityKind === "gym"
      ? strengthMet(input)
      : FALLBACK_MET_VALUES[input.activityKind];
  const result = caloriesFromMet(met, input.profile, durationMinutes);

  return {
    ...result,
    method:
      input.activityKind === "strength" || input.activityKind === "gym"
        ? "profile_volume_met"
        : "profile_met",
  };
}

export function calculateCaloriesBurned(
  activityKind: ActivityKind,
  intensity: ActivityIntensity,
  durationMinutes: number,
  weight: number,
  unitSystem: "imperial" | "metric" = "imperial",
): number {
  const profile = {
    weight,
    height: unitSystem === "imperial" ? 70 : 178,
    age: 35,
    sex: "unspecified" as const,
    unitSystem,
  };
  const result = caloriesFromMet(
    FALLBACK_MET_VALUES[activityKind] * LEGACY_INTENSITY_MULTIPLIER[intensity],
    profile,
    durationMinutes,
  );
  return result.calories;
}

export function calculateDistanceCalories(
  activityKind: ActivityKind,
  distance: number,
  durationMinutes: number,
  weight: number,
  unitSystem: "imperial" | "metric" = "imperial",
): number {
  return estimateActivityCalories({
    activityKind,
    distance,
    durationMinutes,
    profile: {
      weight,
      height: unitSystem === "imperial" ? 70 : 178,
      age: 35,
      sex: "unspecified",
      unitSystem,
    },
  }).calories;
}

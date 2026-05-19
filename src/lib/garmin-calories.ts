import { calculateBMR, caloriesPerMileWalking } from "@/lib/activity-calculator";
import type { AppleHealthSummary, TrackingDay, UserActivityProfile } from "@/lib/tracking";

export interface GarminCalorieBreakdown {
  bmrPerDay: number;
  bmrPerHour: number;
  /** Distance after subtracting explicit activity distances (miles). */
  effectiveWalkingDistanceMi: number;
  /** Active calories from walking/movement (not including BMR). */
  walkingCalories: number;
  /** Sum of caloriesBurned for all logged explicit activities. */
  activityActiveCalories: number;
  totalActiveCalories: number;
  /** BMR + all active calories — use this for food-budget calculations. */
  projectedDayBurn: number;
  /** Whether active calories came directly from Apple Health (vs computed from distance). */
  activeCaloriesFromHealthKit: boolean;
}

/** Resolve the Apple Health summary from either the new or legacy field name. */
function getHealthSummary(day: TrackingDay): AppleHealthSummary | undefined {
  return day.appleHealthSummary ?? day.garminSummary;
}

export function getGarminCalorieBreakdown(
  day: TrackingDay,
  profile: UserActivityProfile,
): GarminCalorieBreakdown {
  const bmrPerDay = Math.round(calculateBMR(profile));
  const calPerMile = caloriesPerMileWalking(profile);

  const healthSummary = getHealthSummary(day);
  const totalDayDistanceMi = healthSummary?.totalDistanceMi ?? 0;
  const directActiveCalories = healthSummary?.activeCalories;

  // Sum distances from logged activities (normalise to miles)
  const activityDistanceMi = day.activities.reduce((sum, act) => {
    if (!act.distance) return sum;
    const mi = act.distanceUnit === "km" ? act.distance / 1.60934 : act.distance;
    return sum + mi;
  }, 0);

  // Walking distance = total day minus miles already covered during explicit activities
  const effectiveWalkingDistanceMi =
    Math.round(Math.max(0, totalDayDistanceMi - activityDistanceMi) * 100) / 100;

  // If Apple Health reports active calories directly, use that; otherwise compute from distance
  const activeCaloriesFromHealthKit = directActiveCalories != null && directActiveCalories > 0;
  const walkingCalories = activeCaloriesFromHealthKit
    ? Math.round(directActiveCalories)
    : Math.round(effectiveWalkingDistanceMi * calPerMile);

  const activityActiveCalories = day.activities.reduce((sum, a) => sum + a.caloriesBurned, 0);
  const totalActiveCalories = walkingCalories + activityActiveCalories;

  return {
    bmrPerDay,
    bmrPerHour: bmrPerDay / 24,
    effectiveWalkingDistanceMi,
    walkingCalories,
    activityActiveCalories,
    totalActiveCalories,
    projectedDayBurn: bmrPerDay + totalActiveCalories,
    activeCaloriesFromHealthKit,
  };
}

/**
 * Calories burned from midnight up to `nowHours` (fractional hours since midnight).
 * BMR accrues linearly; walking calories spread 6am–10pm; activity calories credited
 * when the activity ends.
 */
export function getBurnedToPoint(
  day: TrackingDay,
  profile: UserActivityProfile,
  nowHours: number = new Date().getHours() + new Date().getMinutes() / 60,
): number {
  const bd = getGarminCalorieBreakdown(day, profile);

  const bmrSoFar = bd.bmrPerHour * nowHours;

  // Walking spread linearly across waking hours (6am–10pm = 16 h)
  const walkingProgress = Math.min(1, Math.max(0, (nowHours - 6) / 16));
  const walkingSoFar = bd.walkingCalories * walkingProgress;

  // Activities: credit the full active-calorie amount once the activity has ended
  const activitiesSoFar = day.activities.reduce((sum, activity) => {
    try {
      const d = new Date(activity.loggedAt);
      const endHours = d.getHours() + d.getMinutes() / 60 + activity.durationMin / 60;
      return endHours <= nowHours ? sum + activity.caloriesBurned : sum;
    } catch {
      return sum + activity.caloriesBurned;
    }
  }, 0);

  return Math.round(bmrSoFar + walkingSoFar + activitiesSoFar);
}

/** Time-series of cumulative calories burned throughout the day, for graphing. */
export function getBurnTimeSeries(
  day: TrackingDay,
  profile: UserActivityProfile,
): Array<{ time: string; burned: number }> {
  const bd = getGarminCalorieBreakdown(day, profile);
  const healthSummary = getHealthSummary(day);
  if (bd.projectedDayBurn === bd.bmrPerDay && !healthSummary) return [];

  // Build a deduplicated list of notable hours
  const hourSet = new Set<number>();
  for (let h = 0; h <= 24; h += 2) hourSet.add(h);
  hourSet.add(6);
  hourSet.add(22);
  for (const act of day.activities) {
    try {
      const d = new Date(act.loggedAt);
      const endH = d.getHours() + d.getMinutes() / 60 + act.durationMin / 60;
      hourSet.add(Math.round(endH * 4) / 4); // quarter-hour precision
    } catch {
      // skip
    }
  }

  return [...hourSet]
    .sort((a, b) => a - b)
    .map((hours) => {
      const h = Math.floor(hours);
      const m = Math.round((hours % 1) * 60);
      const base = h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`;
      const timeStr = m > 0 ? `${base}:${m.toString().padStart(2, "0")}` : base;
      return { time: timeStr, burned: getBurnedToPoint(day, profile, hours) };
    });
}

import { describe, expect, it } from "vitest";
import { estimateActivityCalories, caloriesPerMileWalking, calculateBMR } from "./activity-calculator";
import { getGarminCalorieBreakdown } from "./garmin-calories";
import { normalizeImportedActivity } from "./activity-imports";
import { stepsToMiles, workoutActiveCalories } from "./activity-energy";
import { createEmptyTrackingDay, type UserActivityProfile, type ActivityLogItem } from "./tracking";

const profile: UserActivityProfile = { weight: 80, height: 180, age: 35, sex: "male", unitSystem: "metric" };
const run: ActivityLogItem = { id: "run", kind: "run", name: "Run", durationMin: 30, distance: 5, distanceUnit: "km", caloriesBurned: 400, calorieBasis: "active", loggedAt: "2026-11-11T10:00:00Z" };

describe("active-only calorie accounting", () => {
  it("adds all workout active calories and only distance outside walking/running workouts", () => {
    const day = createEmptyTrackingDay();
    day.activities = [run, { ...run, id: "lift", kind: "strength", distance: undefined, caloriesBurned: 200 }];
    day.appleHealthSummary = { totalDistanceMi: 5, updatedAt: "today" };
    const result = getGarminCalorieBreakdown(day, profile);
    expect(result.effectiveWalkingDistanceMi).toBe(1.89);
    expect(result.activityActiveCalories).toBe(600);
    expect(result.totalActiveCalories).toBe(600 + Math.round(1.89 * caloriesPerMileWalking(profile)));
    expect(result.projectedDayBurn).toBe(Math.round(calculateBMR(profile)) + result.totalActiveCalories);
  });
  it("floors remaining distance at zero when workouts exceed the daily distance", () => {
    const day = createEmptyTrackingDay(); day.activities = [run];
    day.appleHealthSummary = { totalDistanceMi: 1, updatedAt: "today" };
    expect(getGarminCalorieBreakdown(day, profile).totalActiveCalories).toBe(400);
  });
  it("never subtracts cycling miles from daily walking distance", () => {
    const day = createEmptyTrackingDay(); day.activities = [{ ...run, kind: "bike", distance: 50 }];
    day.appleHealthSummary = { totalDistanceMi: 5, updatedAt: "today" };
    expect(getGarminCalorieBreakdown(day, profile).effectiveWalkingDistanceMi).toBe(5);
  });
  it("accepts daily steps as an alternative to distance and excludes run distance", () => {
    const day = createEmptyTrackingDay(); day.activities = [run];
    day.appleHealthSummary = { totalDistanceMi: 999, totalSteps: 10000, movementInput: "steps", updatedAt: "today" };
    expect(stepsToMiles(10000, profile)).toBeCloseTo(4.63, 2);
    expect(getGarminCalorieBreakdown(day, profile).effectiveWalkingDistanceMi).toBe(1.52);
  });
  it("does not add workouts twice to a whole-day active energy reading", () => {
    const day = createEmptyTrackingDay(); day.activities = [run];
    day.appleHealthSummary = { totalDistanceMi: 5, activeCalories: 750, updatedAt: "today" };
    const result = getGarminCalorieBreakdown(day, profile);
    expect(result.walkingCalories).toBe(350);
    expect(result.totalActiveCalories).toBe(750);
  });
  it("uses net ACSM run energy, excluding resting expenditure", () => {
    expect(estimateActivityCalories({ activityKind: "run", durationMinutes: 30, distance: 5, profile }).calories).toBe(400);
    expect(estimateActivityCalories({ activityKind: "walk", durationMinutes: 60, distance: 5, profile }).calories).toBe(200);
    expect(caloriesPerMileWalking(profile)).toBe(64.4);
  });
  it("refuses unclassified provider calories but accepts explicitly active energy", () => {
    const imported = { provider: "strava" as const, providerActivityId: "1", kind: "run" as const, durationMin: 30, distance: 5, distanceUnit: "km" as const, startedAt: "2026-11-11T10:00:00Z", caloriesBurned: 999 };
    expect(normalizeImportedActivity(imported, profile).caloriesBurned).toBe(400);
    expect(normalizeImportedActivity({ ...imported, calorieBasis: "total" }, profile).caloriesBurned).toBe(400);
    expect(normalizeImportedActivity({ ...imported, calorieBasis: "active" }, profile).caloriesBurned).toBe(999);
  });
  it("converts legacy gross manual workout estimates without altering stored entries", () => {
    const legacy = { ...run, source: "manual" as const, calorieBasis: undefined, caloriesBurned: 437, estimateMethod: "profile_acsm_run" };
    expect(workoutActiveCalories(legacy, profile)).toBe(400);
    expect(legacy.caloriesBurned).toBe(437);
  });
});
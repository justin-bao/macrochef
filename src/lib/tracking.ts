export type MealType = "breakfast" | "lunch" | "dinner" | "snacks";

export type ActivityKind = "run" | "walk" | "bike" | "stairmaster" | "strength" | "gym" | "other";

export type ActivityIntensity = "low" | "moderate" | "high" | "vigorous";

export type FoodSource = "manual" | "recipe" | "restaurant" | "ai";

export interface FoodLogItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  source: FoodSource;
  confidence?: "high" | "medium" | "low";
  note?: string;
  loggedAt: string;
}

export interface MealLog {
  type: MealType;
  items: FoodLogItem[];
}

export interface ActivityLogItem {
  id: string;
  kind: ActivityKind;
  name: string;
  durationMin: number;
  caloriesBurned: number;
  intensity: ActivityIntensity;
  loggedAt: string;
  distance?: number;
  distanceUnit?: "mi" | "km";
  sets?: number;
  reps?: number;
  load?: number;
  loadUnit?: "lb" | "kg";
  notes?: string;
}

export interface TrackingDay {
  meals: MealLog[];
  activities: ActivityLogItem[];
}

export type TrackingData = Record<string, TrackingDay>;

export interface TrackingSettings {
  weight: number;
  unitSystem: "imperial" | "metric";
  dailyCalorieTarget: number;
  dailyProteinTarget: number;
  dailyCarbsTarget: number;
  dailyFatTarget: number;
}

export const DEFAULT_TRACKING_SETTINGS: TrackingSettings = {
  weight: 180,
  unitSystem: "imperial",
  dailyCalorieTarget: 2500,
  dailyProteinTarget: 180,
  dailyCarbsTarget: 280,
  dailyFatTarget: 80,
};

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snacks: "Snacks",
};

export function createEmptyTrackingDay(): TrackingDay {
  return {
    meals: [
      { type: "breakfast", items: [] },
      { type: "lunch", items: [] },
      { type: "dinner", items: [] },
      { type: "snacks", items: [] },
    ],
    activities: [],
  };
}

export function sumFood(items: FoodLogItem[]) {
  return items.reduce(
    (acc, item) => ({
      kcal: acc.kcal + item.kcal,
      protein_g: acc.protein_g + item.protein_g,
      carbs_g: acc.carbs_g + item.carbs_g,
      fat_g: acc.fat_g + item.fat_g,
    }),
    { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
}

export function getDayTotals(day: TrackingDay) {
  return sumFood(day.meals.flatMap((meal) => meal.items));
}

export function getBurnedCalories(day: TrackingDay) {
  return day.activities.reduce((sum, activity) => sum + activity.caloriesBurned, 0);
}

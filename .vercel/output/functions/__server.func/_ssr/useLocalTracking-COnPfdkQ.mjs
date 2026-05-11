import { r as reactExports } from "../_libs/react.mjs";
import { f as format } from "../_libs/date-fns.mjs";
const DEFAULT_TRACKING_SETTINGS = {
  weight: 180,
  unitSystem: "imperial",
  dailyCalorieTarget: 2500,
  dailyProteinTarget: 180,
  dailyCarbsTarget: 280,
  dailyFatTarget: 80
};
const MEAL_LABELS = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snacks: "Snacks"
};
function createEmptyTrackingDay() {
  return {
    meals: [
      { type: "breakfast", items: [] },
      { type: "lunch", items: [] },
      { type: "dinner", items: [] },
      { type: "snacks", items: [] }
    ],
    activities: []
  };
}
function sumFood(items) {
  return items.reduce(
    (acc, item) => ({
      kcal: acc.kcal + item.kcal,
      protein_g: acc.protein_g + item.protein_g,
      carbs_g: acc.carbs_g + item.carbs_g,
      fat_g: acc.fat_g + item.fat_g
    }),
    { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );
}
function getDayTotals(day) {
  return sumFood(day.meals.flatMap((meal) => meal.items));
}
function getBurnedCalories(day) {
  return day.activities.reduce((sum, activity) => sum + activity.caloriesBurned, 0);
}
const DIARY_KEY = "macrochef-tracking-diary";
const SETTINGS_KEY = "macrochef-tracking-settings";
function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}
function loadDiary() {
  if (!canUseStorage()) return {};
  try {
    const raw = window.localStorage.getItem(DIARY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function loadSettings() {
  if (!canUseStorage()) return DEFAULT_TRACKING_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_TRACKING_SETTINGS, ...JSON.parse(raw) } : DEFAULT_TRACKING_SETTINGS;
  } catch {
    return DEFAULT_TRACKING_SETTINGS;
  }
}
function keyForDate(date) {
  return format(date, "yyyy-MM-dd");
}
function useLocalTracking() {
  const [diary, setDiary] = reactExports.useState(loadDiary);
  const [settings, setSettings] = reactExports.useState(loadSettings);
  reactExports.useEffect(() => {
    if (canUseStorage()) window.localStorage.setItem(DIARY_KEY, JSON.stringify(diary));
  }, [diary]);
  reactExports.useEffect(() => {
    if (canUseStorage()) window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);
  const getDay = reactExports.useCallback(
    (date) => diary[keyForDate(date)] ?? createEmptyTrackingDay(),
    [diary]
  );
  const addFoodItems = reactExports.useCallback((date, mealType, items) => {
    setDiary((prev) => {
      const key = keyForDate(date);
      const day = prev[key] ?? createEmptyTrackingDay();
      const meals = day.meals.map(
        (meal) => meal.type === mealType ? { ...meal, items: [...meal.items, ...items] } : meal
      );
      return { ...prev, [key]: { ...day, meals } };
    });
  }, []);
  const removeFoodItem = reactExports.useCallback((date, mealType, itemId) => {
    setDiary((prev) => {
      const key = keyForDate(date);
      const day = prev[key];
      if (!day) return prev;
      const meals = day.meals.map(
        (meal) => meal.type === mealType ? { ...meal, items: meal.items.filter((item) => item.id !== itemId) } : meal
      );
      return { ...prev, [key]: { ...day, meals } };
    });
  }, []);
  const addActivity = reactExports.useCallback((date, activity) => {
    setDiary((prev) => {
      const key = keyForDate(date);
      const day = prev[key] ?? createEmptyTrackingDay();
      return { ...prev, [key]: { ...day, activities: [...day.activities, activity] } };
    });
  }, []);
  const removeActivity = reactExports.useCallback((date, activityId) => {
    setDiary((prev) => {
      const key = keyForDate(date);
      const day = prev[key];
      if (!day) return prev;
      return {
        ...prev,
        [key]: {
          ...day,
          activities: day.activities.filter((activity) => activity.id !== activityId)
        }
      };
    });
  }, []);
  const updateSettings = reactExports.useCallback((updates) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);
  return {
    diary,
    settings,
    getDay,
    addFoodItems,
    removeFoodItem,
    addActivity,
    removeActivity,
    updateSettings
  };
}
export {
  MEAL_LABELS as M,
  getBurnedCalories as a,
  getDayTotals as g,
  sumFood as s,
  useLocalTracking as u
};

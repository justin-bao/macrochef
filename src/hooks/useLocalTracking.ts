import { format } from "date-fns";
import { useCallback, useEffect, useState } from "react";
import {
  createEmptyTrackingDay,
  DEFAULT_TRACKING_SETTINGS,
  type ActivityLogItem,
  type FoodLogItem,
  type MealType,
  type TrackingData,
  type TrackingSettings,
} from "@/lib/tracking";

const DIARY_KEY = "macrochef-tracking-diary";
const SETTINGS_KEY = "macrochef-tracking-settings";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function loadDiary(): TrackingData {
  if (!canUseStorage()) return {};
  try {
    const raw = window.localStorage.getItem(DIARY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function loadSettings(): TrackingSettings {
  if (!canUseStorage()) return DEFAULT_TRACKING_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_TRACKING_SETTINGS, ...JSON.parse(raw) } : DEFAULT_TRACKING_SETTINGS;
  } catch {
    return DEFAULT_TRACKING_SETTINGS;
  }
}

function keyForDate(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function useLocalTracking() {
  const [diary, setDiary] = useState<TrackingData>(loadDiary);
  const [settings, setSettings] = useState<TrackingSettings>(loadSettings);

  useEffect(() => {
    if (canUseStorage()) window.localStorage.setItem(DIARY_KEY, JSON.stringify(diary));
  }, [diary]);

  useEffect(() => {
    if (canUseStorage()) window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  const getDay = useCallback(
    (date: Date) => diary[keyForDate(date)] ?? createEmptyTrackingDay(),
    [diary],
  );

  const addFoodItems = useCallback((date: Date, mealType: MealType, items: FoodLogItem[]) => {
    setDiary((prev) => {
      const key = keyForDate(date);
      const day = prev[key] ?? createEmptyTrackingDay();
      const meals = day.meals.map((meal) =>
        meal.type === mealType ? { ...meal, items: [...meal.items, ...items] } : meal,
      );
      return { ...prev, [key]: { ...day, meals } };
    });
  }, []);

  const removeFoodItem = useCallback((date: Date, mealType: MealType, itemId: string) => {
    setDiary((prev) => {
      const key = keyForDate(date);
      const day = prev[key];
      if (!day) return prev;
      const meals = day.meals.map((meal) =>
        meal.type === mealType
          ? { ...meal, items: meal.items.filter((item) => item.id !== itemId) }
          : meal,
      );
      return { ...prev, [key]: { ...day, meals } };
    });
  }, []);

  const addActivity = useCallback((date: Date, activity: ActivityLogItem) => {
    setDiary((prev) => {
      const key = keyForDate(date);
      const day = prev[key] ?? createEmptyTrackingDay();
      return { ...prev, [key]: { ...day, activities: [...day.activities, activity] } };
    });
  }, []);

  const removeActivity = useCallback((date: Date, activityId: string) => {
    setDiary((prev) => {
      const key = keyForDate(date);
      const day = prev[key];
      if (!day) return prev;
      return {
        ...prev,
        [key]: {
          ...day,
          activities: day.activities.filter((activity) => activity.id !== activityId),
        },
      };
    });
  }, []);

  const updateSettings = useCallback((updates: Partial<TrackingSettings>) => {
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
    updateSettings,
  };
}

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useLocalTracking } from "@/hooks/useLocalTracking";
import { getGarminCalorieBreakdown } from "@/lib/garmin-calories";
import { goalsFromRows, MEALS, optionalMealMacrosSchema, type PerMealGoals } from "@/lib/per-meal-goals";

export function useMealGoals() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { settings, getDay } = useLocalTracking();
  const burn = getGarminCalorieBreakdown(getDay(new Date()), settings).projectedDayBurn;
  const dailyKcal = Math.max(0, burn + settings.dailyCalorieTarget);
  const queryKey = ["meal-goals", user?.id];
  const query = useQuery({
    queryKey,
    enabled: Boolean(user),
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from("meal_goals").select("meal,kcal,protein_g,carbs_g,fat_g").eq("user_id", user.id);
      if (error) throw error;
      return data ?? [];
    },
  });
  const data = useMemo(() => goalsFromRows(query.data ?? [], {
    kcal: dailyKcal, protein_g: settings.dailyProteinTarget,
    carbs_g: settings.dailyCarbsTarget, fat_g: settings.dailyFatTarget,
  }), [query.data, dailyKcal, settings.dailyProteinTarget, settings.dailyCarbsTarget, settings.dailyFatTarget]);
  const saveGoals = async (goals: PerMealGoals) => {
    if (!user) throw new Error("Sign in to save meal goals.");
    const rows = MEALS.filter((meal) => JSON.stringify(goals[meal]) !== JSON.stringify(data[meal])).map((meal) => ({
      user_id: user.id, meal, ...optionalMealMacrosSchema.parse(goals[meal]), updated_at: new Date().toISOString(),
    }));
    if (!rows.length) return;
    const { error } = await supabase.from("meal_goals").upsert(rows, { onConflict: "user_id,meal" });
    if (error) throw error;
    await queryClient.invalidateQueries({ queryKey });
  };
  return { ...query, data, saveGoals, signedIn: Boolean(user) };
}
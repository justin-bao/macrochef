import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { goalsFromRows, MEALS, optionalMealMacrosSchema, type PerMealGoals } from "@/lib/per-meal-goals";

export function useMealGoals() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["meal-goals", user?.id];
  const query = useQuery({
    queryKey,
    enabled: Boolean(user),
    queryFn: async () => {
      if (!user) return goalsFromRows([]);
      const { data, error } = await supabase.from("meal_goals").select("meal,kcal,protein_g,carbs_g,fat_g").eq("user_id", user.id);
      if (error) throw error;
      return goalsFromRows(data ?? []);
    },
  });
  const saveGoals = async (goals: PerMealGoals) => {
    if (!user) throw new Error("Sign in to save meal goals.");
    const rows = MEALS.map((meal) => ({
      user_id: user.id, meal, ...optionalMealMacrosSchema.parse(goals[meal]), updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from("meal_goals").upsert(rows, { onConflict: "user_id,meal" });
    if (error) throw error;
    queryClient.setQueryData(queryKey, goalsFromRows(rows));
  };
  return { ...query, saveGoals, signedIn: Boolean(user) };
}